import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  collection,
  onSnapshot,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from './AuthContext';
import {
  Team,
  Player,
  Referee,
  Venue,
  Match,
  Transfer,
  Tournament,
  Training,
  TransferRequest,
  MatchReport,
  TournamentProposal,
  UserProfile,
  AuditRecord,
  PlayerClaim,
  PeerRating,
  MvpVote,
} from '../types';
import { hashCedula, normalizeCedula } from '../utils/rules';

interface DataContextType {
  teams: Team[];
  players: Player[];
  referees: Referee[];
  venues: Venue[];
  matches: Match[];
  transfers: Transfer[];
  torneos: Tournament[];
  trainings: Training[];
  solicitudes: TransferRequest[];
  reportes: MatchReport[];
  propuestas: TournamentProposal[];
  users: UserProfile[];
  auditoria: AuditRecord[];
  playerClaims: PlayerClaim[];
  peerRatings: PeerRating[];
  mvpVotes: MvpVote[];
  loadingData: boolean;

  // Actions
  addTeam: (data: Omit<Team, 'id'>) => Promise<string>;
  updateTeam: (id: string, data: Partial<Team>) => Promise<void>;
  deleteTeam: (id: string) => Promise<void>;

  addPlayer: (data: Omit<Player, 'id'>) => Promise<string>;
  updatePlayer: (id: string, data: Partial<Player>) => Promise<void>;
  deletePlayer: (id: string) => Promise<void>;

  addReferee: (data: Omit<Referee, 'id'>) => Promise<string>;
  updateReferee: (id: string, data: Partial<Referee>) => Promise<void>;
  deleteReferee: (id: string) => Promise<void>;

  addVenue: (data: Omit<Venue, 'id'>) => Promise<string>;
  updateVenue: (id: string, data: Partial<Venue>) => Promise<void>;
  deleteVenue: (id: string) => Promise<void>;

  addMatch: (data: Omit<Match, 'id'>) => Promise<string>;
  updateMatch: (id: string, data: Partial<Match>) => Promise<void>;
  deleteMatch: (id: string) => Promise<void>;

  addTransfer: (data: Omit<Transfer, 'id'>) => Promise<string>;

  addTournament: (data: Omit<Tournament, 'id'>) => Promise<string>;
  updateTournament: (id: string, data: Partial<Tournament>) => Promise<void>;
  deleteTournament: (id: string) => Promise<void>;

  addTraining: (data: Omit<Training, 'id'>) => Promise<string>;
  deleteTraining: (id: string) => Promise<void>;

  addTransferRequest: (data: Omit<TransferRequest, 'id'>) => Promise<string>;
  updateTransferRequest: (id: string, data: Partial<TransferRequest>) => Promise<void>;

  saveMatchReport: (reportId: string, data: Omit<MatchReport, 'id'>) => Promise<void>;

  addProposal: (data: Omit<TournamentProposal, 'id'>) => Promise<string>;
  updateProposal: (id: string, data: Partial<TournamentProposal>) => Promise<void>;

  updateUserRole: (userId: string, role: string, team?: string, ref?: string) => Promise<void>;
  checkCedulaDuplicate: (cedula: string, excludePlayerId?: string) => Promise<Player | null>;

  // Player identity claiming
  addPlayerClaim: (data: Omit<PlayerClaim, 'id'>) => Promise<string>;
  approvePlayerClaim: (claimId: string) => Promise<void>;
  rejectPlayerClaim: (claimId: string) => Promise<void>;

  // Peer review ratings
  submitPeerRating: (data: Omit<PeerRating, 'id'>) => Promise<void>;

  // Democratic MVP voting
  submitMvpVote: (
    matchId: string,
    votedPlayerId: string,
    voterPlayerId?: string,
    voterIsRef?: boolean
  ) => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isRealAdmin } = useAuth();

  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [referees, setReferees] = useState<Referee[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [torneos, setTorneos] = useState<Tournament[]>([]);
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [solicitudes, setSolicitudes] = useState<TransferRequest[]>([]);
  const [reportes, setReportes] = useState<MatchReport[]>([]);
  const [propuestas, setPropuestas] = useState<TournamentProposal[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [auditoria, setAuditoria] = useState<AuditRecord[]>([]);
  const [playerClaims, setPlayerClaims] = useState<PlayerClaim[]>([]);
  const [peerRatings, setPeerRatings] = useState<PeerRating[]>([]);
  const [mvpVotes, setMvpVotes] = useState<MvpVote[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Helper for audit logging
  const logAudit = async (action: string, collectionName: string, id: string, keys?: string) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'auditoria'), {
        u: user.email || user.displayName || 'user',
        a: action,
        c: collectionName,
        id_target: id,
        k: keys || '',
        t: Date.now(),
      });
    } catch {
      // Audit non-fatal
    }
  };

  useEffect(() => {
    const unsubscribes: (() => void)[] = [];

    const sub = <T,>(colName: string, setter: React.Dispatch<React.SetStateAction<T[]>>) => {
      try {
        const u = onSnapshot(
          collection(db, colName),
          snap => {
            const list = snap.docs.map(d => ({ id: d.id, ...d.data() })) as T[];
            setter(list);
          },
          err => {
            handleFirestoreError(err, OperationType.GET, colName);
          }
        );
        unsubscribes.push(u);
      } catch (e) {
        console.warn(`Failed listening to ${colName}:`, e);
      }
    };

    sub<Team>('teams', setTeams);
    sub<Player>('players', setPlayers);
    sub<Referee>('referees', setReferees);
    sub<Venue>('venues', setVenues);
    sub<Match>('matches', setMatches);
    sub<Transfer>('transfers', setTransfers);
    sub<Tournament>('torneos', setTorneos);
    sub<Training>('trainings', setTrainings);

    if (user) {
      sub<TransferRequest>('solicitudes', setSolicitudes);
      sub<MatchReport>('reportes', setReportes);
      sub<TournamentProposal>('propuestas', setPropuestas);
      sub<UserProfile>('users', setUsers);
      sub<PlayerClaim>('player_claims', setPlayerClaims);
      sub<PeerRating>('peer_ratings', setPeerRatings);
      sub<MvpVote>('mvp_votes', setMvpVotes);

      if (isRealAdmin) {
        try {
          const auditQuery = query(collection(db, 'auditoria'), orderBy('t', 'desc'), limit(100));
          const u = onSnapshot(
            auditQuery,
            snap => {
              setAuditoria(snap.docs.map(d => ({ id: d.id, ...d.data() })) as AuditRecord[]);
            },
            err => console.warn('Audit query:', err)
          );
          unsubscribes.push(u);
        } catch {}
      }
    }

    setLoadingData(false);

    return () => {
      unsubscribes.forEach(u => u());
    };
  }, [user, isRealAdmin]);

  // Cédula duplicate verification
  const checkCedulaDuplicate = async (cedula: string, excludePlayerId?: string): Promise<Player | null> => {
    const norm = normalizeCedula(cedula);
    if (!norm) return null;
    const hash = await hashCedula(norm);
    try {
      const snap = await getDoc(doc(db, 'cedulas', hash));
      if (snap.exists()) {
        const data = snap.data();
        if (data.p !== excludePlayerId) {
          return players.find(p => p.id === data.p) || ({ id: data.p, name: 'otro jugador', team: '' } as Player);
        }
      }
    } catch {
      const dup = players.find(p => p.id !== excludePlayerId && normalizeCedula(p.cedula || '') === norm);
      if (dup) return dup;
    }
    return null;
  };

  // Actions: Teams
  const addTeam = async (data: Omit<Team, 'id'>) => {
    const ref = await addDoc(collection(db, 'teams'), { ...data, createdAt: Date.now() });
    await logAudit('crear', 'teams', ref.id, Object.keys(data).join(','));
    return ref.id;
  };
  const updateTeam = async (id: string, data: Partial<Team>) => {
    await updateDoc(doc(db, 'teams', id), { ...data, updatedAt: Date.now() });
    await logAudit('editar', 'teams', id, Object.keys(data).join(','));
  };
  const deleteTeam = async (id: string) => {
    await deleteDoc(doc(db, 'teams', id));
    await logAudit('eliminar', 'teams', id);
  };

  // Actions: Players
  const addPlayer = async (data: Omit<Player, 'id'>) => {
    const ref = await addDoc(collection(db, 'players'), { ...data, createdAt: Date.now() });
    if (data.cedula) {
      const hash = await hashCedula(data.cedula);
      await setDoc(doc(db, 'cedulas', hash), { p: ref.id, c: data.cedula });
    }
    await logAudit('crear', 'players', ref.id, Object.keys(data).join(','));
    return ref.id;
  };
  const updatePlayer = async (id: string, data: Partial<Player>) => {
    const existing = players.find(p => p.id === id);
    if (data.cedula && existing?.cedula && data.cedula !== existing.cedula) {
      const oldHash = await hashCedula(existing.cedula);
      await deleteDoc(doc(db, 'cedulas', oldHash)).catch(() => {});
      const newHash = await hashCedula(data.cedula);
      await setDoc(doc(db, 'cedulas', newHash), { p: id, c: data.cedula });
    } else if (data.cedula && !existing?.cedula) {
      const newHash = await hashCedula(data.cedula);
      await setDoc(doc(db, 'cedulas', newHash), { p: id, c: data.cedula });
    }
    await updateDoc(doc(db, 'players', id), { ...data, updatedAt: Date.now() });
    await logAudit('editar', 'players', id, Object.keys(data).join(','));
  };
  const deletePlayer = async (id: string) => {
    const existing = players.find(p => p.id === id);
    if (existing?.cedula) {
      const hash = await hashCedula(existing.cedula);
      await deleteDoc(doc(db, 'cedulas', hash)).catch(() => {});
    }
    await deleteDoc(doc(db, 'players', id));
    await logAudit('eliminar', 'players', id);
  };

  // Actions: Referees
  const addReferee = async (data: Omit<Referee, 'id'>) => {
    const ref = await addDoc(collection(db, 'referees'), { ...data, createdAt: Date.now() });
    await logAudit('crear', 'referees', ref.id, Object.keys(data).join(','));
    return ref.id;
  };
  const updateReferee = async (id: string, data: Partial<Referee>) => {
    await updateDoc(doc(db, 'referees', id), { ...data, updatedAt: Date.now() });
    await logAudit('editar', 'referees', id, Object.keys(data).join(','));
  };
  const deleteReferee = async (id: string) => {
    await deleteDoc(doc(db, 'referees', id));
    await logAudit('eliminar', 'referees', id);
  };

  // Actions: Venues
  const addVenue = async (data: Omit<Venue, 'id'>) => {
    const ref = await addDoc(collection(db, 'venues'), { ...data, createdAt: Date.now() });
    await logAudit('crear', 'venues', ref.id, Object.keys(data).join(','));
    return ref.id;
  };
  const updateVenue = async (id: string, data: Partial<Venue>) => {
    await updateDoc(doc(db, 'venues', id), { ...data, updatedAt: Date.now() });
    await logAudit('editar', 'venues', id, Object.keys(data).join(','));
  };
  const deleteVenue = async (id: string) => {
    await deleteDoc(doc(db, 'venues', id));
    await logAudit('eliminar', 'venues', id);
  };

  // Actions: Matches
  const addMatch = async (data: Omit<Match, 'id'>) => {
    const ref = await addDoc(collection(db, 'matches'), { ...data, createdAt: Date.now() });
    await logAudit('crear', 'matches', ref.id, `${data.a} vs ${data.b}`);
    return ref.id;
  };
  const updateMatch = async (id: string, data: Partial<Match>) => {
    await updateDoc(doc(db, 'matches', id), { ...data, updatedAt: Date.now() });
    await logAudit('editar', 'matches', id, Object.keys(data).join(','));
  };
  const deleteMatch = async (id: string) => {
    await deleteDoc(doc(db, 'matches', id));
    await logAudit('eliminar', 'matches', id);
  };

  // Actions: Transfers
  const addTransfer = async (data: Omit<Transfer, 'id'>) => {
    const ref = await addDoc(collection(db, 'transfers'), { ...data, createdAt: Date.now() });
    await logAudit('crear', 'transfers', ref.id, `${data.p}: ${data.from} -> ${data.to}`);
    return ref.id;
  };

  // Actions: Tournaments
  const addTournament = async (data: Omit<Tournament, 'id'>) => {
    const ref = await addDoc(collection(db, 'torneos'), { ...data, createdAt: Date.now() });
    await logAudit('crear', 'torneos', ref.id, data.name);
    return ref.id;
  };
  const updateTournament = async (id: string, data: Partial<Tournament>) => {
    await updateDoc(doc(db, 'torneos', id), { ...data, updatedAt: Date.now() });
    await logAudit('editar', 'torneos', id, Object.keys(data).join(','));
  };
  const deleteTournament = async (id: string) => {
    const relatedMatches = matches.filter(m => m.torneo === id);
    for (const m of relatedMatches) {
      await deleteDoc(doc(db, 'matches', m.id)).catch(() => {});
    }
    await deleteDoc(doc(db, 'torneos', id));
    await logAudit('eliminar', 'torneos', id);
  };

  // Actions: Trainings
  const addTraining = async (data: Omit<Training, 'id'>) => {
    const ref = await addDoc(collection(db, 'trainings'), { ...data, createdAt: Date.now() });
    await logAudit('crear', 'trainings', ref.id, data.team);
    return ref.id;
  };
  const deleteTraining = async (id: string) => {
    await deleteDoc(doc(db, 'trainings', id));
    await logAudit('eliminar', 'trainings', id);
  };

  // Actions: Requests & Reports
  const addTransferRequest = async (data: Omit<TransferRequest, 'id'>) => {
    const ref = await addDoc(collection(db, 'solicitudes'), { ...data, createdAt: Date.now() });
    return ref.id;
  };
  const updateTransferRequest = async (id: string, data: Partial<TransferRequest>) => {
    await updateDoc(doc(db, 'solicitudes', id), data);
  };

  const saveMatchReport = async (reportId: string, data: Omit<MatchReport, 'id'>) => {
    await setDoc(doc(db, 'reportes', reportId), { ...data, createdAt: Date.now() });
  };

  const addProposal = async (data: Omit<TournamentProposal, 'id'>) => {
    const ref = await addDoc(collection(db, 'propuestas'), { ...data, createdAt: Date.now() });
    return ref.id;
  };
  const updateProposal = async (id: string, data: Partial<TournamentProposal>) => {
    await updateDoc(doc(db, 'propuestas', id), data);
  };

  // User Role Management (Admin only)
  const updateUserRole = async (userId: string, role: string, team?: string, ref?: string) => {
    await updateDoc(doc(db, 'users', userId), {
      role,
      team: team || '',
      ref: ref || '',
      updatedAt: Date.now(),
    });
    await logAudit('editar_rol', 'users', userId, `${role} (team:${team || '-'}, ref:${ref || '-'})`);
  };

  // Player identity claiming
  const addPlayerClaim = async (data: Omit<PlayerClaim, 'id'>) => {
    const ref = await addDoc(collection(db, 'player_claims'), {
      ...data,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    await logAudit('solicitar_vinculacion', 'player_claims', ref.id, `${data.userName} -> ${data.playerName}`);
    return ref.id;
  };

  const approvePlayerClaim = async (claimId: string) => {
    const claim = playerClaims.find(c => c.id === claimId);
    if (!claim) return;

    // Update claim status
    await updateDoc(doc(db, 'player_claims', claimId), {
      status: 'approved',
      updatedAt: Date.now(),
    });

    // Update user document
    await updateDoc(doc(db, 'users', claim.userId), {
      playerId: claim.playerId,
      team: claim.teamId,
      updatedAt: Date.now(),
    });

    // Update player document
    await updateDoc(doc(db, 'players', claim.playerId), {
      userId: claim.userId,
      updatedAt: Date.now(),
    });

    await logAudit('aprobar_vinculacion', 'player_claims', claimId, `${claim.userName} <-> ${claim.playerName}`);
  };

  const rejectPlayerClaim = async (claimId: string) => {
    await updateDoc(doc(db, 'player_claims', claimId), {
      status: 'rejected',
      updatedAt: Date.now(),
    });
    await logAudit('rechazar_vinculacion', 'player_claims', claimId);
  };

  // Peer review ratings
  const submitPeerRating = async (data: Omit<PeerRating, 'id'>) => {
    const docId = `${data.fromUserId}_${data.toPlayerId}`;
    await setDoc(doc(db, 'peer_ratings', docId), {
      ...data,
      updatedAt: Date.now(),
      createdAt: Date.now(),
    });
    await logAudit('calificar_companero', 'peer_ratings', docId, `to:${data.toPlayerId}`);
  };

  // Democratic MVP voting
  const submitMvpVote = async (
    matchId: string,
    votedPlayerId: string,
    voterPlayerId?: string,
    voterIsRef?: boolean
  ) => {
    if (!user) return;

    const targetMatch = matches.find(m => m.id === matchId);
    if (targetMatch) {
      const recordedAt = targetMatch.resultRecordedAt || targetMatch.updatedAt || targetMatch.createdAt;
      const MVP_LIMIT_MS = 24 * 60 * 60 * 1000;
      if (recordedAt && Date.now() - recordedAt > MVP_LIMIT_MS) {
        throw new Error('El plazo de 24 horas para votar el MVP de este partido ha finalizado.');
      }
    }

    const voteDocId = `${matchId}_${user.uid}`;
    await setDoc(doc(db, 'mvp_votes', voteDocId), {
      matchId,
      voterUserId: user.uid,
      voterPlayerId: voterPlayerId || '',
      voterIsRef: !!voterIsRef,
      votedPlayerId,
      createdAt: Date.now(),
    });

    // Recalculate democratic MVP for this match
    // Fetch all votes for this match
    const votesQuery = query(collection(db, 'mvp_votes'), where('matchId', '==', matchId));
    const votesSnap = await getDocs(votesQuery);
    const tallies: Record<string, number> = {};
    votesSnap.docs.forEach(d => {
      const v = d.data() as MvpVote;
      tallies[v.votedPlayerId] = (tallies[v.votedPlayerId] || 0) + 1;
    });

    let topPlayerId = '';
    let maxVotes = 0;
    Object.entries(tallies).forEach(([pid, count]) => {
      if (count > maxVotes) {
        maxVotes = count;
        topPlayerId = pid;
      }
    });

    if (topPlayerId) {
      await updateDoc(doc(db, 'matches', matchId), {
        democraticMvp: topPlayerId,
      });
    }

    await logAudit('votar_mvp', 'mvp_votes', voteDocId, `match:${matchId}, voted:${votedPlayerId}`);
  };

  return (
    <DataContext.Provider
      value={{
        teams,
        players,
        referees,
        venues,
        matches,
        transfers,
        torneos,
        trainings,
        solicitudes,
        reportes,
        propuestas,
        users,
        auditoria,
        playerClaims,
        peerRatings,
        mvpVotes,
        loadingData,
        addTeam,
        updateTeam,
        deleteTeam,
        addPlayer,
        updatePlayer,
        deletePlayer,
        addReferee,
        updateReferee,
        deleteReferee,
        addVenue,
        updateVenue,
        deleteVenue,
        addMatch,
        updateMatch,
        deleteMatch,
        addTransfer,
        addTournament,
        updateTournament,
        deleteTournament,
        addTraining,
        deleteTraining,
        addTransferRequest,
        updateTransferRequest,
        saveMatchReport,
        addProposal,
        updateProposal,
        updateUserRole,
        checkCedulaDuplicate,
        addPlayerClaim,
        approvePlayerClaim,
        rejectPlayerClaim,
        submitPeerRating,
        submitMvpVote,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used within a DataProvider');
  return context;
};
