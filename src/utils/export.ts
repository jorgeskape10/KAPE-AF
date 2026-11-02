import { Match, Team, Venue } from '../types';
import { TeamRanking } from './ranking';
import { LOGO_DATA } from '../constants';

export function downloadFile(name: string, content: string | Blob, type: string) {
  const blob = typeof content === 'string' ? new Blob([content], { type }) : content;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function exportMatchesToICS(matches: Match[], teams: Team[], venues: Venue[]) {
  const pad = (n: number) => String(n).padStart(2, '0');
  const formatICSDate = (d: Date) =>
    d.getFullYear() +
    pad(d.getMonth() + 1) +
    pad(d.getDate()) +
    'T' +
    pad(d.getHours()) +
    pad(d.getMinutes()) +
    '00';

  const clean = (s: string) => String(s || '').replace(/[,;\n]/g, ' ');
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//KAPE AF//ES'];

  const upcoming = matches.filter(m => !m.played && m.date);
  if (upcoming.length === 0) {
    throw new Error('No hay partidos programados con fecha definida.');
  }

  upcoming.forEach(m => {
    const d = new Date(`${m.date}T${m.time || '16:00'}:00`);
    if (isNaN(d.getTime())) return;

    const teamA = teams.find(t => t.id === m.a)?.name || 'Equipo A';
    const teamB = teams.find(t => t.id === m.b)?.name || 'Equipo B';
    const venueName = venues.find(v => v.id === m.venue)?.name || 'Por definir';

    lines.push(
      'BEGIN:VEVENT',
      `UID:${m.id}@kape-af`,
      `DTSTAMP:${formatICSDate(new Date())}`,
      `DTSTART:${formatICSDate(d)}`,
      `DTEND:${formatICSDate(new Date(d.getTime() + 60 * 60 * 1000))}`,
      `SUMMARY:${clean(`${teamA} vs ${teamB} (KAPE A.F.)`)}`,
      `LOCATION:${clean(venueName)}`,
      'END:VEVENT'
    );
  });

  lines.push('END:VCALENDAR');
  downloadFile('kape-af-calendario.ics', lines.join('\r\n'), 'text/calendar');
}

export function exportRankingToImage(ranking: TeamRanking[]) {
  if (ranking.length === 0) {
    throw new Error('Aún no hay equipos en el ranking para exportar.');
  }

  const W = 720;
  const H = 160 + ranking.length * 48;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const draw = (img: HTMLImageElement | null) => {
    // Background gradient
    ctx.fillStyle = '#142433';
    ctx.fillRect(0, 0, W, H);

    // Accent line top
    ctx.fillStyle = '#0e8a5f';
    ctx.fillRect(0, 0, W, 8);

    // Header logo
    if (img && img.width) {
      const h = 90;
      const w = (img.width * h) / img.height;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(W - 32 - w / 2, 24 + h / 2, h / 2 + 8, 0, 2 * Math.PI);
      ctx.fill();
      ctx.drawImage(img, W - 32 - w, 24, w, h);
    }

    // Title
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 30px system-ui, -apple-system, sans-serif';
    ctx.fillText('RANKING OFICIAL', 32, 60);

    ctx.font = '600 14px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#6fe3ae';
    ctx.fillText(`KAPE A.F. · ASOCIACIÓN DE FÚTBOL · ${new Date().toLocaleDateString('es-ES')}`, 32, 90);

    // Table headers
    ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#9aa1ab';
    ctx.fillText('POS', 32, 134);
    ctx.fillText('EQUIPO', 88, 134);
    ctx.textAlign = 'right';
    ctx.fillText('MOD', W - 140, 134);
    ctx.fillText('PUNTOS', W - 32, 134);

    // Rows
    ranking.forEach((r, i) => {
      const y = 180 + i * 48;
      ctx.fillStyle = i % 2 === 0 ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.10)';
      ctx.fillRect(24, y - 30, W - 48, 42);

      // Pos
      ctx.textAlign = 'left';
      ctx.font = 'bold 18px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = i === 0 ? '#ffd54f' : i === 1 ? '#e0e0e0' : i === 2 ? '#cd7f32' : '#ffffff';
      ctx.fillText(`${i + 1}`, 36, y - 2);

      // Team name
      ctx.fillStyle = '#ffffff';
      ctx.font = '600 16px system-ui, -apple-system, sans-serif';
      ctx.fillText(r.name.slice(0, 32), 88, y - 2);

      // Modality
      ctx.textAlign = 'right';
      ctx.font = '14px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#6fe3ae';
      ctx.fillText(r.mod, W - 140, y - 2);

      // Points
      ctx.font = 'bold 17px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#6fe3ae';
      ctx.fillText(`${r.pts.toFixed(1)}`, W - 32, y - 2);
    });

    canvas.toBlob(blob => {
      if (blob) {
        downloadFile(`kape-af-ranking-${new Date().toISOString().slice(0, 10)}.png`, blob, 'image/png');
      }
    });
  };

  const img = new Image();
  img.onload = () => draw(img);
  img.onerror = () => draw(null);
  img.src = LOGO_DATA;
}
