import React from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Bell, ArrowRight, ShieldAlert, AlertCircle } from 'lucide-react';

interface NotificationsViewProps {
  onNavigate: (tab: string) => void;
}

export const NotificationsView: React.FC<NotificationsViewProps> = ({ onNavigate }) => {
  const { matches, teams, players, referees, solicitudes, propuestas, users, playerClaims, mvpVotes } = useData();
  const { user, userProfile, isRealAdmin, activeRole, activeTeam, activeRef } = useAuth();

  const isAdmin = isRealAdmin || activeRole === 'admin';
  const isCaptain = activeRole === 'capitan';
  const isReferee = activeRole === 'arbitro';

  const notifications: { text: string; tab: string; type: 'urgent' | 'info' }[] = [];

  // Admin alerts
  if (isAdmin) {
    // Pending player claims
    playerClaims
      .filter(c => c.status === 'pend')
      .forEach(c => {
        const p = players.find(x => x.id === c.playerId);
        notifications.push({
          text: `Solicitud de identidad de jugador pendiente de aprobación: ${p ? p.name : c.playerId} solicitada por ${c.userName}`,
          tab: 'cuenta',
          type: 'urgent',
        });
      });

    // Disputed matches
    matches
      .filter(m => !m.played && m.disputa)
      .forEach(m => {
        const tA = teams.find(t => t.id === m.a)?.name || 'Equipo A';
        const tB = teams.find(t => t.id === m.b)?.name || 'Equipo B';
        notifications.push({
          text: `Resultado en disputa que requiere resolución: ${tA} vs ${tB}`,
          tab: 'res',
          type: 'urgent',
        });
      });

    // Pending transfer requests
    solicitudes
      .filter(s => s.st === 'pend')
      .forEach(s => {
        const pName = players.find(p => p.id === s.p)?.name || 'Jugador';
        const toTeam = teams.find(t => t.id === s.to)?.name || 'Equipo';
        notifications.push({
          text: `Solicitud de fichaje pendiente de aprobación: ${pName} con destino a ${toTeam}`,
          tab: 'traspasos',
          type: 'info',
        });
      });

    // Referees awaiting approval
    referees
      .filter(r => !r.ok)
      .forEach(r => {
        notifications.push({
          text: `Árbitro registrado pendiente de aprobación oficial: ${r.name}`,
          tab: 'arbitros',
          type: 'info',
        });
      });

    // Users with default 'visitante' role waiting for role assignment
    users
      .filter(u => u.role === 'visitante')
      .forEach(u => {
        notifications.push({
          text: `Nuevo usuario registrado con cuenta Google pendiente de rol: ${u.name || u.email}`,
          tab: 'cuenta',
          type: 'info',
        });
      });
  }

  // Player alerts: Pending MVP votes for matches played (within 24 hours)
  if (user && userProfile?.playerId) {
    const myPid = userProfile.playerId;
    const MVP_LIMIT_MS = 24 * 60 * 60 * 1000;
    const pendingMvpMatches = matches.filter(m => {
      if (!m.played) return false;
      const recTime = m.resultRecordedAt || m.updatedAt || m.createdAt || 0;
      if (!recTime || Date.now() - recTime >= MVP_LIMIT_MS) return false;

      const wasStarter = Array.isArray(m.part) && m.part.some(x => x.p === myPid);
      const wasSub = Array.isArray(m.subs) && m.subs.some(s => s.in === myPid || s.out === myPid);
      if (!wasStarter && !wasSub) return false;
      const alreadyVoted = mvpVotes.some(v => v.matchId === m.id && v.voterUserId === user.uid);
      return !alreadyVoted;
    });

    pendingMvpMatches.forEach(m => {
      const tA = teams.find(t => t.id === m.a)?.name || 'Equipo A';
      const tB = teams.find(t => t.id === m.b)?.name || 'Equipo B';
      const recTime = m.resultRecordedAt || m.updatedAt || m.createdAt || 0;
      const remHours = Math.max(1, Math.floor((MVP_LIMIT_MS - (Date.now() - recTime)) / (1000 * 60 * 60)));
      notifications.push({
        text: `¡Votación democrática de MVP disponible (${remHours}h restantes)! Vota en: ${tA} vs ${tB}`,
        tab: 'jugados',
        type: 'info',
      });
    });
  }

  // Captain alerts
  if (isCaptain && activeTeam) {
    // Solicitudes for players in activeTeam
    solicitudes
      .filter(s => s.st === 'pend' && s.from === activeTeam)
      .forEach(s => {
        const pName = players.find(p => p.id === s.p)?.name || 'Jugador';
        const toTeam = teams.find(t => t.id === s.to)?.name || 'Equipo';
        notifications.push({
          text: `Un club solicita el fichaje de tu jugador ${pName} para ${toTeam}. Responde en Fichajes.`,
          tab: 'traspasos',
          type: 'urgent',
        });
      });

    // Tournament invitations
    propuestas
      .filter(p => p.st === 'abierta' && p.resp && p.resp[activeTeam] === null)
      .forEach(p => {
        notifications.push({
          text: `Has recibido una invitación para participar en el torneo «${p.cfg.name}».`,
          tab: 'torneos',
          type: 'info',
        });
      });

    // Matches pending result
    matches
      .filter(m => !m.played && (m.a === activeTeam || m.b === activeTeam))
      .forEach(m => {
        if (m.disputa) {
          notifications.push({
            text: 'Tu último partido tiene marcadores en disputa entre ambos capitanes.',
            tab: 'res',
            type: 'urgent',
          });
        }
      });
  }

  // Referee alerts
  if (isReferee && activeRef) {
    matches
      .filter(m => !m.played && m.ref === activeRef)
      .forEach(m => {
        const tA = teams.find(t => t.id === m.a)?.name || 'Equipo A';
        const tB = teams.find(t => t.id === m.b)?.name || 'Equipo B';
        notifications.push({
          text: `Tienes un partido programado por dirigir: ${tA} vs ${tB} (${m.date || 'Sin fecha'})`,
          tab: 'res',
          type: 'info',
        });
      });

    // Referee MVP vote alert (within 24 hours)
    if (user) {
      const MVP_LIMIT_MS = 24 * 60 * 60 * 1000;
      matches
        .filter(m => {
          if (!m.played || m.ref !== activeRef) return false;
          const recTime = m.resultRecordedAt || m.updatedAt || m.createdAt || 0;
          if (!recTime || Date.now() - recTime >= MVP_LIMIT_MS) return false;
          return !mvpVotes.some(v => v.matchId === m.id && v.voterUserId === user.uid);
        })
        .forEach(m => {
          const tA = teams.find(t => t.id === m.a)?.name || 'Equipo A';
          const tB = teams.find(t => t.id === m.b)?.name || 'Equipo B';
          notifications.push({
            text: `Votación MVP pendiente como árbitro colegiado: ${tA} vs ${tB}`,
            tab: 'jugados',
            type: 'info',
          });
        });
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-[#16262f] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <h2 className="text-xl font-bold text-[#142433] dark:text-[#e8f1ee] flex items-center gap-2">
          <Bell className="text-[#0e8a5f]" size={22} />
          <span>Centro de Avisos y Notificaciones</span>
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Alertas de partidos en disputa, solicitudes de fichaje y aprobaciones pendientes
        </p>
      </div>

      <div className="space-y-3">
        {notifications.length > 0 ? (
          notifications.map((n, i) => (
            <div
              key={i}
              className={`p-4 rounded-2xl border flex items-center justify-between gap-3 text-xs transition-all ${
                n.type === 'urgent'
                  ? 'bg-rose-50 dark:bg-rose-950/20 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200'
                  : 'bg-white dark:bg-[#16262f] border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-3">
                {n.type === 'urgent' ? (
                  <ShieldAlert className="text-rose-600 shrink-0" size={18} />
                ) : (
                  <AlertCircle className="text-[#0e8a5f] shrink-0" size={18} />
                )}
                <span className="font-semibold leading-relaxed">{n.text}</span>
              </div>

              <button
                onClick={() => onNavigate(n.tab)}
                className="bg-[#0e8a5f] hover:bg-[#0b7a43] text-white px-3 py-1.5 rounded-xl font-bold flex items-center gap-1 shadow-xs shrink-0"
              >
                <span>Revisar</span>
                <ArrowRight size={13} />
              </button>
            </div>
          ))
        ) : (
          <div className="bg-white dark:bg-[#16262f] p-8 rounded-2xl border border-slate-200 dark:border-slate-800 text-center text-slate-400 text-xs">
            No tienes avisos ni acciones pendientes en este momento.
          </div>
        )}
      </div>
    </div>
  );
};
