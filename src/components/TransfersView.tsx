import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { validateTransfer } from '../utils/rules';
import { ArrowRightLeft, UserPlus, Check, X, Clock, AlertTriangle, ShieldCheck } from 'lucide-react';

export const TransfersView: React.FC = () => {
  const {
    players,
    teams,
    transfers,
    solicitudes,
    matches,
    referees,
    addTransfer,
    updatePlayer,
    updateMatch,
    addTransferRequest,
    updateTransferRequest,
  } = useData();

  const { isRealAdmin, activeRole, activeTeam } = useAuth();
  const isAdmin = isRealAdmin || activeRole === 'admin';
  const isCaptain = activeRole === 'capitan';

  // Admin direct transfer form
  const [selectedPlayerId, setSelectedPlayerId] = useState('');
  const [targetTeamId, setTargetTeamId] = useState('');
  const [transferDate, setTransferDate] = useState(new Date().toISOString().slice(0, 10));
  const [transferFeedback, setTransferFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

  // Free agent sign dorsal state
  const [freeAgentDorsals, setFreeAgentDorsals] = useState<Record<string, number>>({});

  // Captain request target
  const [reqPlayerId, setReqPlayerId] = useState('');

  // Free agents
  const freeAgents = players.filter(p => !p.team);
  const myTeamPlayers = players.filter(p => p.team === activeTeam);
  const myTeamAvailableSlots = 30 - myTeamPlayers.length;

  const handleAdminTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlayerId || !targetTeamId) {
      alert('Selecciona jugador y equipo de destino.');
      return;
    }
    const player = players.find(p => p.id === selectedPlayerId);
    if (!player) return;

    if (player.team === targetTeamId) {
      setTransferFeedback({ ok: false, msg: 'El jugador ya pertenece al equipo de destino seleccionado.' });
      return;
    }

    const targetTeamSquad = players.filter(p => p.team === targetTeamId);
    if (targetTeamSquad.length >= 30) {
      setTransferFeedback({ ok: false, msg: 'El equipo destino ya cuenta con el cupo máximo de 30 jugadores.' });
      return;
    }

    // Validate fair play rules
    const val = validateTransfer(player.id, targetTeamId, transferDate, matches, transfers);
    if (!val.ok) {
      setTransferFeedback(val);
      return;
    }

    try {
      // Check if dorsal is free in destination team
      const isDorsalFree = !player.dorsal || !targetTeamSquad.some(x => x.dorsal === player.dorsal);

      await updatePlayer(player.id, {
        team: targetTeamId,
        dorsal: isDorsalFree ? player.dorsal : 0,
      });

      await addTransfer({
        p: player.id,
        from: player.team || '',
        to: targetTeamId,
        date: transferDate,
      });

      // Clear any conflicting referee assignments
      const conflicts = matches.filter(
        m =>
          !m.played &&
          m.ref &&
          referees.find(r => r.id === m.ref)?.playerId === player.id &&
          (m.a === targetTeamId || m.b === targetTeamId)
      );

      for (const cm of conflicts) {
        await updateMatch(cm.id, { ref: '' });
      }

      setTransferFeedback({
        ok: true,
        msg: `Traspaso aprobado reglamentariamente.${
          !isDorsalFree ? ' El dorsal anterior estaba ocupado; asígnale uno nuevo en Plantillas.' : ''
        }${conflicts.length > 0 ? ` Se liberaron ${conflicts.length} designaciones arbitrales por conflicto de intereses.` : ''}`,
      });

      setSelectedPlayerId('');
    } catch (err: any) {
      setTransferFeedback({ ok: false, msg: err.message || 'Error al procesar traspaso' });
    }
  };

  const handleSignFreeAgent = async (playerId: string) => {
    if (!activeTeam) {
      alert('Debes ser capitán con equipo asignado para fichar.');
      return;
    }
    if (myTeamAvailableSlots <= 0) {
      alert('Tu equipo no tiene cupos disponibles (máximo 30 jugadores).');
      return;
    }

    const dorsal = freeAgentDorsals[playerId];
    if (!dorsal || dorsal < 1 || dorsal > 99) {
      alert('Indica un dorsal reglamentario entre 1 y 99.');
      return;
    }

    if (myTeamPlayers.some(p => p.dorsal === dorsal)) {
      alert(`El dorsal #${dorsal} ya está ocupado en tu equipo.`);
      return;
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    const val = validateTransfer(playerId, activeTeam, todayStr, matches, transfers);
    if (!val.ok) {
      alert(val.msg);
      return;
    }

    try {
      await updatePlayer(playerId, { team: activeTeam, dorsal });
      await addTransfer({
        p: playerId,
        from: '',
        to: activeTeam,
        date: todayStr,
      });
      alert('¡Jugador fichado con éxito como agente libre!');
    } catch (err: any) {
      alert('Error al fichar agente libre: ' + err.message);
    }
  };

  const handleRequestTransfer = async () => {
    if (!reqPlayerId || !activeTeam) return;
    const player = players.find(p => p.id === reqPlayerId);
    if (!player) return;

    try {
      await addTransferRequest({
        p: player.id,
        from: player.team,
        to: activeTeam,
        st: 'pend',
      });
      setReqPlayerId('');
      alert('Solicitud de fichaje enviada al capitán del equipo actual.');
    } catch (err: any) {
      alert('Error al solicitar fichaje: ' + err.message);
    }
  };

  const handleResolveTransferRequest = async (reqId: string, approve: boolean) => {
    const req = solicitudes.find(s => s.id === reqId);
    if (!req) return;

    if (!approve) {
      await updateTransferRequest(reqId, { st: 'rech' });
      alert('Solicitud de fichaje rechazada.');
      return;
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    const val = validateTransfer(req.p, req.to, todayStr, matches, transfers);
    if (!val.ok) {
      alert(val.msg);
      return;
    }

    try {
      await updatePlayer(req.p, { team: req.to, dorsal: 0 });
      await addTransfer({
        p: req.p,
        from: req.from,
        to: req.to,
        date: todayStr,
      });
      await updateTransferRequest(reqId, { st: 'ok' });
      alert('¡Fichaje aprobado y ejecutado con éxito!');
    } catch (err: any) {
      alert('Error al aprobar fichaje: ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-[#16262f] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <h2 className="text-xl font-bold text-[#142433] dark:text-[#e8f1ee] flex items-center gap-2">
          <ArrowRightLeft className="text-[#0e8a5f]" size={22} />
          <span>Fichajes, Traspasos y Agentes Libres</span>
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Reglamento Fair Play: restricción semanal (1 equipo lunes a domingo) y mensual (máx 2 cambios en 30 días)
        </p>
      </div>

      {/* Admin Transfer Override */}
      {isAdmin && (
        <form
          onSubmit={handleAdminTransfer}
          className="bg-white dark:bg-[#16262f] p-5 rounded-2xl border-2 border-[#0e8a5f]/40 shadow-sm space-y-4"
        >
          <div className="font-bold text-sm text-[#142433] dark:text-[#e8f1ee] pb-2 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
            <ShieldCheck size={16} className="text-[#0e8a5f]" />
            <span>Gestión Administrativa de Traspasos</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Jugador
              </label>
              <select
                required
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 outline-none"
                value={selectedPlayerId}
                onChange={e => setSelectedPlayerId(e.target.value)}
              >
                <option value="">Selecciona jugador...</option>
                {players.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({teams.find(t => t.id === p.team)?.name || 'Agente libre'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Equipo Destino
              </label>
              <select
                required
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 outline-none"
                value={targetTeamId}
                onChange={e => setTargetTeamId(e.target.value)}
              >
                <option value="">Selecciona equipo destino...</option>
                {teams.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Fecha del Traspaso
              </label>
              <input
                type="date"
                required
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 outline-none"
                value={transferDate}
                onChange={e => setTransferDate(e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              className="bg-[#0e8a5f] hover:bg-[#0b7a43] text-white px-5 py-2 text-xs font-bold rounded-xl shadow-sm transition-all"
            >
              Validar y Aprobar Traspaso
            </button>
          </div>

          {transferFeedback && (
            <div
              className={`text-xs px-3 py-2 rounded-xl flex items-center gap-2 ${
                transferFeedback.ok
                  ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-300'
                  : 'bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-300'
              }`}
            >
              {transferFeedback.ok ? <Check size={15} /> : <AlertTriangle size={15} />}
              <span>{transferFeedback.msg}</span>
            </div>
          )}
        </form>
      )}

      {/* Captain Transfer Request */}
      {isCaptain && activeTeam && (
        <div className="bg-white dark:bg-[#16262f] p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <div className="font-bold text-sm text-[#142433] dark:text-[#e8f1ee]">
            Solicitar Fichaje de Jugador desde Otro Equipo
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <select
              className="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 outline-none flex-1 min-w-[200px]"
              value={reqPlayerId}
              onChange={e => setReqPlayerId(e.target.value)}
            >
              <option value="">Selecciona jugador de otro club...</option>
              {players
                .filter(p => p.team && p.team !== activeTeam)
                .map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({teams.find(t => t.id === p.team)?.name})
                  </option>
                ))}
            </select>

            <button
              onClick={handleRequestTransfer}
              disabled={!reqPlayerId}
              className="bg-[#0e8a5f] hover:bg-[#0b7a43] disabled:opacity-50 text-white px-5 py-2 text-xs font-bold rounded-xl shadow-sm transition-all"
            >
              Enviar Solicitud al Club
            </button>
          </div>
        </div>
      )}

      {/* Pending Transfer Requests (Captain of current team or Admin) */}
      <div className="space-y-3">
        <h3 className="font-bold text-sm text-[#142433] dark:text-[#e8f1ee]">
          Solicitudes de Fichaje Pendientes
        </h3>

        {solicitudes.filter(s => s.st === 'pend').length > 0 ? (
          solicitudes
            .filter(s => s.st === 'pend')
            .map(s => {
              const player = players.find(p => p.id === s.p);
              const fromTeam = teams.find(t => t.id === s.from);
              const toTeam = teams.find(t => t.id === s.to);

              const canResolve = isAdmin || (isCaptain && activeTeam === s.from);

              return (
                <div
                  key={s.id}
                  className="bg-white dark:bg-[#16262f] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {player?.name || 'Jugador'}
                    </span>
                    <span className="text-slate-500 mx-2">:</span>
                    <span className="text-slate-600 dark:text-slate-400 font-medium">
                      {fromTeam?.name} → {toTeam?.name}
                    </span>
                  </div>

                  {canResolve ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleResolveTransferRequest(s.id, true)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 shadow-xs"
                      >
                        <Check size={13} /> Aprobar
                      </button>
                      <button
                        onClick={() => handleResolveTransferRequest(s.id, false)}
                        className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 shadow-xs"
                      >
                        <X size={13} /> Rechazar
                      </button>
                    </div>
                  ) : (
                    <span className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 px-2.5 py-0.5 rounded-full font-bold text-[11px]">
                      Pendiente de respuesta
                    </span>
                  )}
                </div>
              );
            })
        ) : (
          <div className="bg-white dark:bg-[#16262f] p-4 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-400 text-xs text-center">
            No hay solicitudes de fichaje pendientes.
          </div>
        )}
      </div>

      {/* Free Agents (Agentes Libres) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm text-[#142433] dark:text-[#e8f1ee] flex items-center gap-2">
            <UserPlus size={17} className="text-[#0e8a5f]" />
            <span>Bolsa de Agentes Libres ({freeAgents.length})</span>
          </h3>
          {isCaptain && activeTeam && (
            <span className="text-xs text-slate-500">
              Cupos libres en tu equipo: <b>{myTeamAvailableSlots}/30</b>
            </span>
          )}
        </div>

        {freeAgents.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {freeAgents.map(p => (
              <div
                key={p.id}
                className="bg-white dark:bg-[#16262f] p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between gap-3 text-xs"
              >
                <div>
                  <div className="font-bold text-slate-900 dark:text-slate-100">{p.name}</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Posición: <b>{p.pos || 'Sin posición'}</b>
                  </div>
                </div>

                {isCaptain && activeTeam && (
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <input
                      type="number"
                      min="1"
                      max="99"
                      placeholder="Dorsal"
                      className="w-16 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1 text-center font-bold"
                      value={freeAgentDorsals[p.id] || ''}
                      onChange={e =>
                        setFreeAgentDorsals({
                          ...freeAgentDorsals,
                          [p.id]: parseInt(e.target.value, 10),
                        })
                      }
                    />
                    <button
                      onClick={() => handleSignFreeAgent(p.id)}
                      disabled={myTeamAvailableSlots <= 0}
                      className="flex-1 bg-[#0e8a5f] hover:bg-[#0b7a43] disabled:opacity-50 text-white font-bold py-1 px-2.5 rounded-lg text-center"
                    >
                      Fichar Directo
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-[#16262f] p-4 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-400 text-xs text-center">
            No hay jugadores libres disponibles en este momento.
          </div>
        )}
      </div>

      {/* Historical Transfers */}
      <div className="space-y-3">
        <h3 className="font-bold text-sm text-[#142433] dark:text-[#e8f1ee]">
          Historial Registrado de Fichajes
        </h3>

        {transfers.length > 0 ? (
          <div className="bg-white dark:bg-[#16262f] rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {transfers
              .slice()
              .reverse()
              .map(t => {
                const player = players.find(p => p.id === t.p);
                const fromTeam = teams.find(x => x.id === t.from);
                const toTeam = teams.find(x => x.id === t.to);

                return (
                  <div key={t.id} className="p-3 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {player?.name || 'Jugador'}
                      </span>
                      <span className="text-slate-500 mx-2">:</span>
                      <span className="text-slate-600 dark:text-slate-400">
                        {fromTeam ? fromTeam.name : 'Agente Libre'} →{' '}
                        <b>{toTeam?.name || 'Equipo'}</b>
                      </span>
                    </div>
                    <span className="text-slate-400 font-medium">{t.date}</span>
                  </div>
                );
              })}
          </div>
        ) : (
          <div className="bg-white dark:bg-[#16262f] p-4 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-400 text-xs text-center">
            Aún no se han registrado traspasos en la asociación.
          </div>
        )}
      </div>
    </div>
  );
};
