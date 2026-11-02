import { Match, Team, Tournament, Player, Referee } from '../types';

export const PENALTY_VAL = (l?: string[]): number =>
  (l || []).reduce((s, k) => s + ({ l: 0.5, u: 0.5, x: 1.0 }[k] || 0), 0);

export interface TeamRanking {
  id: string;
  name: string;
  mod: string;
  pts: number;
}

export function calculateRanking(teams: Team[], matches: Match[], torneos: Tournament[]): TeamRanking[] {
  const played = matches.filter(m => m.played);

  const calc = (bono: boolean, orden: string[]): Record<string, number> => {
    const pts: Record<string, number> = {};
    teams.forEach(t => { pts[t.id] = 0; });

    // Friendly matches (non-tournament matches)
    played.filter(m => !m.torneo).forEach(f => {
      const ga = f.ga ?? 0;
      const gb = f.gb ?? 0;
      const ya = f.ya ?? 0;
      const yb = f.yb ?? 0;
      const ra = f.ra ?? 0;
      const rb = f.rb ?? 0;
      const pena = f.pen?.a;
      const penb = f.pen?.b;

      const pairs: [string, string, number, number, number, number, string[] | undefined][] = [
        [f.a, f.b, ga, gb, ya, ra, pena],
        [f.b, f.a, gb, ga, yb, rb, penb],
      ];

      pairs.forEach(([x, y, gf, gc, am, ro, pn]) => {
        if (!(x in pts)) return;
        let base = gf > gc ? 3 : gf === gc ? 1 : 0;
        if (bono && gf > gc) {
          const pos = orden.indexOf(y);
          base *= pos === 0 ? 1.75 : pos < 3 && pos >= 0 ? 1.5 : 1;
        }
        pts[x] += base + 0.2 * gf - 0.1 * gc - 0.1 * am - 0.2 * ro - PENALTY_VAL(pn);
      });
    });

    // Tournament finish bonuses
    torneos.forEach(t => {
      if (t.premios) {
        Object.entries(t.premios).forEach(([id, v]) => {
          if (id in pts) pts[id] += v;
        });
      }
    });

    return pts;
  };

  const p0 = calc(false, []);
  const ord = Object.keys(p0).sort((a, b) => p0[b] - p0[a]);
  const p1 = calc(true, ord);

  return Object.keys(p1)
    .sort((a, b) => p1[b] - p1[a])
    .map(id => {
      const t = teams.find(x => x.id === id);
      return {
        id,
        name: t?.name || 'Sin equipo',
        mod: t?.mod || 'F11',
        pts: p1[id],
      };
    });
}

export function getTopIndividual(
  key: 'g' | 's' | 'm',
  matches: Match[],
  players: Player[]
): { player: Player; count: number }[] {
  const stats: Record<string, number> = {};
  const played = matches.filter(m => m.played);

  played.forEach(m => {
    (m.part || []).forEach(x => {
      if (key === 'g') stats[x.p] = (stats[x.p] || 0) + (x.g || 0);
      if (key === 's') stats[x.p] = (stats[x.p] || 0) + (x.s || 0);
    });
    if (key === 'm' && m.mvp) {
      stats[m.mvp] = (stats[m.mvp] || 0) + 1;
    }
  });

  return Object.entries(stats)
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([pid, count]) => ({
      player: players.find(p => p.id === pid) || { id: pid, name: '—', team: '', dorsal: 0, pos: '' },
      count,
    }));
}

export function getTopReferees(
  referees: Referee[],
  matches: Match[]
): { referee: Referee; rating: number; count: number }[] {
  const played = matches.filter(m => m.played);
  return referees
    .filter(r => r.ok)
    .map(r => {
      const ratedMatches = played.filter(m => m.ref === r.id && m.rate && m.rate > 0);
      const total = ratedMatches.reduce((s, m) => s + (m.rate || 0), 0);
      const avg = ratedMatches.length > 0 ? total / ratedMatches.length : 0;
      return {
        referee: r,
        rating: avg,
        count: ratedMatches.length,
      };
    })
    .sort((a, b) => b.rating - a.rating);
}

export function calculatePlayerStats(player: Player, matches: Match[]) {
  const S: Record<string, number> = {
    pj: 0, g: 0, gp: 0, gl: 0, s: 0, y: 0, r: 0, m: 0,
    pa: 0, pf: 0, og: 0, ht: 0, gr: 0, pc: 0, tg: 0, tp: 0
  };

  const played = matches.filter(m => m.played);
  played.forEach(m => {
    const x = (m.part || []).find(r => r.p === player.id);
    if (x) {
      S.pj++;
      ['g', 'gp', 'gl', 's', 'y', 'r', 'pa', 'pf', 'og'].forEach(k => {
        S[k] += ((x as any)[k] || 0);
      });
      if ((x.g || 0) >= 3) S.ht++;

      if (player.pos === 'POR') {
        const isA = x.t === m.a;
        const gc = isA ? (m.gb ?? 0) : (m.ga ?? 0);
        S.gr += gc;
        if (gc === 0) S.pc++;
        if (m.pk) {
          const wonPk = isA ? m.pk.a > m.pk.b : m.pk.b > m.pk.a;
          wonPk ? S.tg++ : S.tp++;
        }
      }
    }
    if (m.mvp === player.id) S.m++;
  });

  if (player.adj) {
    Object.entries(player.adj).forEach(([k, v]) => {
      S[k] = (S[k] || 0) + (+v || 0);
    });
  }
  S.gj = S.g - S.gp - S.gl;
  return S;
}

export function calculateTeamStats(teamId: string, matches: Match[]) {
  const S = { pj: 0, w: 0, e: 0, l: 0, gf: 0, gc: 0, pk: 0, pw: 0, pl: 0 };
  const played = matches.filter(m => m.played && (m.a === teamId || m.b === teamId));

  played.forEach(m => {
    const isA = m.a === teamId;
    const f = isA ? (m.ga ?? 0) : (m.gb ?? 0);
    const c = isA ? (m.gb ?? 0) : (m.ga ?? 0);
    S.pj++;
    S.gf += f;
    S.gc += c;
    if (f > c) S.w++;
    else if (f < c) S.l++;
    else S.e++;

    if (m.pk) {
      S.pk++;
      const won = isA ? m.pk.a > m.pk.b : m.pk.b > m.pk.a;
      won ? S.pw++ : S.pl++;
    }
  });

  return S;
}
