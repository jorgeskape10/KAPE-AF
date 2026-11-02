import { Match, Player, Referee, Team, Transfer } from '../types';

export function normalizeCedula(s: string): string {
  const clean = String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  return /^\d/.test(clean) ? 'V' + clean : clean;
}

export async function hashCedula(cedula: string): Promise<string> {
  const norm = normalizeCedula(cedula);
  const encoder = new TextEncoder();
  const data = encoder.encode(norm);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export function validateRefereeDesignation(
  refId: string,
  match: Match,
  referees: Referee[],
  players: Player[],
  teams: Team[],
  matches: Match[]
): { ok: boolean; msg: string } {
  const ref = referees.find(r => r.id === refId);
  if (!ref) return { ok: false, msg: 'Árbitro no encontrado.' };
  if (!ref.ok) return { ok: false, msg: 'El árbitro aún no ha sido aprobado por el administrador.' };

  // Conflict of interest: referee plays in one of the teams
  if (ref.playerId) {
    const player = players.find(p => p.id === ref.playerId);
    if (player && (player.team === match.a || player.team === match.b)) {
      const team = teams.find(t => t.id === player.team);
      return {
        ok: false,
        msg: `Conflicto de intereses: ${ref.name} es jugador inscrito de ${team?.name || 'uno de los equipos'}.`,
      };
    }
  }

  // Schedule collision: same referee at same date and time
  if (match.date && match.time) {
    const clash = matches.find(
      m => m.id !== match.id && m.ref === ref.id && m.date === match.date && m.time === match.time
    );
    if (clash) {
      return { ok: false, msg: 'El árbitro ya tiene otra designación programada en ese mismo horario.' };
    }
  }

  return { ok: true, msg: 'Designación válida y aprobada.' };
}

export function validateTransfer(
  playerId: string,
  destinationTeamId: string,
  dateStr: string,
  matches: Match[],
  transfers: Transfer[]
): { ok: boolean; msg: string } {
  const d = new Date(dateStr + 'T00:00:00');
  const DAY_MS = 864e5;

  // Weekly restriction: Monday to Sunday of the match date
  const dayOfWeek = (d.getDay() + 6) % 7; // Monday = 0, Sunday = 6
  const monday = new Date(d.getTime() - dayOfWeek * DAY_MS);
  const sunday = new Date(monday.getTime() + 6 * DAY_MS);

  // Check if played with another team this week
  const playedMatches = matches.filter(m => m.played);
  const appearances = playedMatches.flatMap(m =>
    (m.part || []).map(x => ({ p: x.p, team: x.t, date: m.date }))
  );

  const playedWithOtherTeam = appearances.find(a => {
    if (a.p !== playerId || a.team === destinationTeamId) return false;
    const matchDate = new Date(a.date + 'T00:00:00');
    return matchDate >= monday && matchDate <= sunday;
  });

  if (playedWithOtherTeam) {
    return {
      ok: false,
      msg: `Restricción semanal: el jugador ya disputó partido con otro equipo el ${playedWithOtherTeam.date} (semana lunes a domingo).`,
    };
  }

  // Monthly restriction: maximum 2 team changes in the last 30 days
  const recentTransfersCount = transfers.filter(t => {
    if (t.p !== playerId) return false;
    const tDate = new Date(t.date + 'T00:00:00');
    const diffDays = (d.getTime() - tDate.getTime()) / DAY_MS;
    return diffDays >= 0 && diffDays <= 30;
  }).length;

  if (recentTransfersCount >= 2) {
    return {
      ok: false,
      msg: `Restricción mensual: el jugador ya realizó ${recentTransfersCount} cambios de equipo en los últimos 30 días.`,
    };
  }

  return { ok: true, msg: 'Traspaso reglamentario permitido.' };
}
