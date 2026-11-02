export type Modality = 'F5' | 'F7' | 'F11';
export type Category = 'Masculino' | 'Femenino' | 'Mixto';
export type UserRole = 'admin' | 'capitan' | 'arbitro' | 'visitante';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  team?: string;
  ref?: string;
  playerId?: string; // Linked player identity once approved
  photoURL?: string;
  createdAt?: number;
  updatedAt?: number;
}

export interface Team {
  id: string;
  name: string;
  mod: Modality;
  cat: Category;
  foto?: string;
  createdAt?: number;
  updatedAt?: number;
}

export interface Player {
  id: string;
  name: string;
  team: string; // empty string for free agent
  dorsal: number;
  pos: string;
  sec?: string[];
  foto?: string;
  cedula?: string;
  userId?: string; // Linked user account once claim approved
  adj?: Record<string, number>;
  createdAt?: number;
  updatedAt?: number;
}

export interface Referee {
  id: string;
  name: string;
  playerId?: string;
  ok: boolean;
  fed: boolean;
  createdAt?: number;
  updatedAt?: number;
}

export interface Venue {
  id: string;
  name: string;
  addr: string;
  mods: Modality[];
  surf: string;
  lights: boolean;
  createdAt?: number;
  updatedAt?: number;
}

export interface MatchPart {
  p: string; // player id
  t: string; // team id
  st?: number; // 1 = titular, 0 = banca
  g?: number; // goals
  s?: number; // assists
  gp?: number; // penalty goals
  gl?: number; // free-kick goals
  y?: number; // yellow cards
  r?: number; // red cards
  pa?: number; // penalties stopped
  pf?: number; // penalties missed
  og?: number; // own goals
}

export interface MatchSub {
  t: 'a' | 'b';
  min: number | string;
  out: string;
  in: string;
}

export interface Match {
  id: string;
  a: string; // team A id
  b: string; // team B id
  date: string;
  time: string;
  venue?: string;
  mod: Modality;
  sede?: 'neutral' | 'a' | 'b';
  ref?: string;
  played: boolean;
  ga?: number;
  gb?: number;
  ya?: number;
  yb?: number;
  ra?: number;
  rb?: number;
  mvp?: string;
  democraticMvp?: string;
  resultRecordedAt?: number;
  rate?: number;
  part?: MatchPart[];
  fmt?: number; // 1 = 1 tiempo, 2 = 2 tiempos
  mins?: number;
  pk?: { a: number; b: number } | null;
  pen?: { a?: string[]; b?: string[] };
  subs?: MatchSub[];
  lu?: { a?: Record<string, string>; b?: Record<string, string> };
  form?: { a?: string; b?: string };
  ben?: { a?: number; b?: number };
  torneo?: string;
  fase?: string;
  grupo?: string;
  ronda?: number;
  leg?: number;
  jornada?: number;
  disputa?: boolean;
  createdAt?: number;
  updatedAt?: number;
}

export interface Transfer {
  id: string;
  p: string; // player id
  from: string; // team id
  to: string; // team id
  date: string;
  createdAt?: number;
}

export type TournamentFormat = 'liga' | 'copa' | 'gl' | 'gc' | 'ch';

export interface Tournament {
  id: string;
  name: string;
  mod: Modality;
  cat: Category;
  fmt: TournamentFormat;
  teams: string[];
  ida?: boolean;
  idaKO?: boolean;
  crit: string;
  emode: 'azar' | 'manual';
  gmode?: 'azar' | 'manual';
  G?: number;
  qual?: number;
  k?: number;
  Q?: number;
  estado: 'en curso' | 'finalizado';
  pts: { champ: number; part: number };
  fase: string;
  ronda: number;
  byes?: Record<number, string[]>;
  clasif?: string[];
  grupos?: Record<string, string[]>;
  premios?: Record<string, number>;
  campeon?: string;
  createdAt?: number;
  updatedAt?: number;
}

export interface TrainingPart {
  p: string;
  sd: 'a' | 'b';
  g?: number;
  a?: number;
}

export interface Training {
  id: string;
  team: string;
  date: string;
  na: string;
  nb: string;
  ga: number;
  gb: number;
  mins?: number;
  part: TrainingPart[];
  createdAt?: number;
}

export interface TransferRequest {
  id: string;
  p: string;
  from: string;
  to: string;
  st: 'pend' | 'ok' | 'rech';
  createdAt?: number;
}

export interface MatchEvent {
  k: 'gol' | 'card' | 'pen' | 'og' | 'mvp';
  p: string;
  t?: 'j' | 'l'; // jugada o tiro libre
  a?: string; // asistente
  c?: 'y' | 'r'; // amarilla o roja
  res?: 'gol' | 'atajado' | 'fallado';
  gk?: string;
}

export interface MatchReport {
  id: string;
  m: string; // match id
  src: string; // team id or 'adm' or 'arb'
  ga: number;
  gb: number;
  pka?: number;
  pkb?: number;
  ev: MatchEvent[];
  att: Record<string, number>;
  createdAt?: number;
}

export interface TournamentProposal {
  id: string;
  cfg: any;
  by: string; // team id
  resp: Record<string, boolean | null>;
  st: 'abierta' | 'cancelada' | 'creada';
  createdAt?: number;
}

export interface AuditRecord {
  id: string;
  u: string;
  a: string;
  c: string;
  id_target?: string;
  k?: string;
  t: number;
}

export interface PlayerClaim {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  playerId: string;
  playerName: string;
  teamId: string;
  status: 'pend' | 'approved' | 'rejected';
  createdAt?: number;
  updatedAt?: number;
}

export interface PeerRatingSkills {
  regate: number;
  defensa: number;
  pase: number;
  disparo: number;
  velocidad: number;
  responsabilidad: number;
  condicion: number;
  agresividad: number;
  companerismo: number;
  puntualidad: number;
  porteria?: number; // only applicable if goalkeeper
}

export interface PeerRating {
  id: string;
  fromUserId: string;
  fromPlayerId?: string;
  fromUserName?: string;
  toPlayerId: string;
  teamId: string;
  ratings: PeerRatingSkills;
  createdAt?: number;
  updatedAt?: number;
}

export interface MvpVote {
  id: string;
  matchId: string;
  voterUserId: string;
  voterPlayerId?: string;
  voterIsRef?: boolean;
  votedPlayerId: string;
  createdAt?: number;
}
