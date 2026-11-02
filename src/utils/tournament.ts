import { Match, Tournament } from '../types';
import { CRITERIA_CRIT } from '../constants';

export const GROUP_LETTERS = 'ABCDEFGH';

export function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export interface GroupTeamStat {
  t: string;
  pj: number;
  w: number;
  e: number;
  l: number;
  gf: number;
  gc: number;
  dg: number;
  pts: number;
  gv: number;
  fp: number;
}

export function calculateGroupStats(matches: Match[], teamIds: string[]): Record<string, GroupTeamStat> {
  const s: Record<string, GroupTeamStat> = {};
  teamIds.forEach(t => {
    s[t] = { t, pj: 0, w: 0, e: 0, l: 0, gf: 0, gc: 0, dg: 0, pts: 0, gv: 0, fp: 0 };
  });

  matches.forEach(m => {
    if (!m.played || !s[m.a] || !s[m.b]) return;
    const A = s[m.a];
    const B = s[m.b];
    A.pj++;
    B.pj++;
    const ga = m.ga ?? 0;
    const gb = m.gb ?? 0;
    A.gf += ga;
    A.gc += gb;
    B.gf += gb;
    B.gc += ga;
    B.gv += gb; // away goals

    if (ga > gb) {
      A.w++;
      A.pts += 3;
      B.l++;
    } else if (ga < gb) {
      B.w++;
      B.pts += 3;
      A.l++;
    } else {
      A.e++;
      B.e++;
      A.pts += 1;
      B.pts += 1;
    }

    A.fp += (m.ya || 0) + 3 * (m.ra || 0);
    B.fp += (m.yb || 0) + 3 * (m.rb || 0);
  });

  Object.values(s).forEach(x => {
    x.dg = x.gf - x.gc;
  });

  return s;
}

export function rankGroup(teamIds: string[], matches: Match[], critKey: string): GroupTeamStat[] {
  const critList = CRITERIA_CRIT[critKey]?.d || CRITERIA_CRIT.uefa.d;
  const allStats = calculateGroupStats(matches, teamIds);

  const getMetricVal = (c: string, x: GroupTeamStat): number => {
    if (c === 'fp') return -x.fp;
    if (c === 'rnd') return [...x.t].reduce((h, ch) => ((h * 31 + ch.charCodeAt(0)) | 0), 7);
    return (x as any)[c] || 0;
  };

  const recursiveSort = (currentCluster: string[], remainingCriteria: string[]): string[] => {
    if (currentCluster.length < 2 || remainingCriteria.length === 0) return currentCluster;
    const [c, ...rest] = remainingCriteria;
    let scored: { t: string; k: number[] }[];

    if (c === 'h2h') {
      const h2hMatches = matches.filter(m => currentCluster.includes(m.a) && currentCluster.includes(m.b));
      const h2hStats = calculateGroupStats(h2hMatches, currentCluster);
      scored = currentCluster.map(t => ({
        t,
        k: [h2hStats[t].pts, h2hStats[t].dg, h2hStats[t].gf]
      }));
    } else {
      scored = currentCluster.map(t => ({
        t,
        k: [getMetricVal(c, allStats[t])]
      }));
    }

    scored.sort((a, b) => {
      for (let i = 0; i < a.k.length; i++) {
        if (a.k[i] !== b.k[i]) return b.k[i] - a.k[i];
      }
      return 0;
    });

    const groups: { t: string; k: number[] }[][] = [];
    let curGroup = [scored[0]];
    for (let i = 1; i < scored.length; i++) {
      if (scored[i].k.join() === curGroup[0].k.join()) {
        curGroup.push(scored[i]);
      } else {
        groups.push(curGroup);
        curGroup = [scored[i]];
      }
    }
    groups.push(curGroup);

    return groups.flatMap(g => recursiveSort(g.map(x => x.t), rest));
  };

  return recursiveSort(teamIds, critList).map(t => allStats[t]);
}

export function generateRoundRobin(teams: string[], legs: number = 1): [string, string][][] {
  const a = [...teams];
  if (a.length % 2 !== 0) a.push('__BYE__');
  const n = a.length;
  const rounds: [string, string][][] = [];

  for (let r = 0; r < n - 1; r++) {
    const pairings: [string, string][] = [];
    for (let i = 0; i < n / 2; i++) {
      const x = a[i];
      const y = a[n - 1 - i];
      if (x !== '__BYE__' && y !== '__BYE__') {
        pairings.push(r % 2 ? [y, x] : [x, y]);
      }
    }
    rounds.push(pairings);
    a.splice(1, 0, a.pop()!);
  }

  if (legs === 2) {
    const returnRounds = rounds.map(round => round.map(([x, y]) => [y, x] as [string, string]));
    return [...rounds, ...returnRounds];
  }
  return rounds;
}

export function projectTournamentPoints(c: {
  teams: string[];
  fmt: string;
  ida?: boolean;
  idaKO?: boolean;
  G?: number;
  qual?: number;
  k?: number;
  Q?: number;
}) {
  const N = c.teams.length;
  const l = c.ida ? 2 : 1;
  const lk = c.idaKO ? 2 : 1;
  const g = c.G ? Math.ceil(N / c.G) : 0;
  const L2 = (x: number) => Math.ceil(Math.log2(Math.max(2, x)));
  const f = c.idaKO ? 1 : 0;

  let M = 0;
  if (c.fmt === 'liga') M = (N - 1) * l;
  else if (c.fmt === 'copa') M = L2(N) * lk - f;
  else if (c.fmt === 'gl') M = (g - 1) * l + ((c.G || 2) * (c.qual || 2) - 1) * l;
  else if (c.fmt === 'gc') M = (g - 1) * l + L2((c.G || 2) * (c.qual || 2)) * lk - f;
  else if (c.fmt === 'ch') M = (c.k || 4) + L2(c.Q || 8) * lk - f;

  const champ = Math.max(10, Math.round(8 * Math.log2(Math.max(2, N)) * (1 + M / 10)));
  return {
    N,
    M,
    champ,
    sub: Math.round(champ * 0.6),
    semi: Math.round(champ * 0.4),
    part: Math.max(2, Math.round(champ * 0.1)),
  };
}
