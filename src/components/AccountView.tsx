import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { UserRole } from '../types';
import { downloadFile } from '../utils/export';
import {
  User,
  Shield,
  KeyRound,
  Download,
  LogOut,
  Check,
  X,
  UserCheck,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

export const AccountView: React.FC = () => {
  const {
    user,
    userProfile,
    activeRole,
    isRealAdmin,
    signInWithGoogle,
    logout,
  } = useAuth();

  const {
    users,
    teams,
    referees,
    players,
    venues,
    matches,
    transfers,
    torneos,
    trainings,
    solicitudes,
    reportes,
    propuestas,
    playerClaims,
    approvePlayerClaim,
    rejectPlayerClaim,
    addPlayerClaim,
    updateUserRole,
  } = useData();

  // Role edit draft for users table
  const [editingRoles, setEditingRoles] = useState<
    Record<string, { role: string; team: string; ref: string }>
  >({});

  // Quick player claim draft
  const [claimPlayerId, setClaimPlayerId] = useState('');

  const handleRoleChange = (userId: string, field: 'role' | 'team' | 'ref', value: string) => {
    const existing = users.find(u => u.id === userId);
    const cur = editingRoles[userId] || {
      role: existing?.role || 'visitante',
      team: existing?.team || '',
      ref: existing?.ref || '',
    };
    setEditingRoles({
      ...editingRoles,
      [userId]: { ...cur, [field]: value },
    });
  };

  const handleSaveUserRole = async (userId: string) => {
    const edit = editingRoles[userId];
    if (!edit) return;
    try {
      await updateUserRole(userId, edit.role, edit.team, edit.ref);
      alert('Rol y asignación actualizados exitosamente en la base de datos.');
    } catch (err: any) {
      alert('Error al actualizar rol: ' + err.message);
    }
  };

  const handleSelfClaim = async () => {
    if (!user || !claimPlayerId) return;
    const targetPlayer = players.find(p => p.id === claimPlayerId);
    if (!targetPlayer) return;

    try {
      await addPlayerClaim({
        userId: user.uid,
        userName: user.displayName || user.email || 'Usuario',
        userEmail: user.email || '',
        playerId: targetPlayer.id,
        playerName: targetPlayer.name,
        teamId: targetPlayer.team,
        status: 'pend',
      });
      setClaimPlayerId('');
      alert('Solicitud de vinculación enviada al Administrador.');
    } catch (err: any) {
      alert('Error al enviar solicitud: ' + err.message);
    }
  };

  const handleExportBackup = () => {
    const backupData = {
      version: 1,
      timestamp: new Date().toISOString(),
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
    };
    downloadFile(
      `kape-af-respaldo-${new Date().toISOString().slice(0, 10)}.json`,
      JSON.stringify(backupData, null, 2),
      'application/json'
    );
  };

  const linkedPlayer = players.find(p => p.id === userProfile?.playerId);
  const linkedTeam = teams.find(t => t.id === linkedPlayer?.team);

  const pendingClaims = playerClaims.filter(c => c.status === 'pend');

  return (
    <div className="space-y-6">
      {/* User Google Account Card */}
      <div className="bg-white dark:bg-[#16262f] p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <h2 className="text-xl font-bold text-[#142433] dark:text-[#e8f1ee] flex items-center gap-2">
          <User className="text-[#0e8a5f]" size={22} />
          <span>Mi Cuenta y Perfil de Acceso</span>
        </h2>

        {user ? (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-4">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'Avatar'}
                    className="w-14 h-14 rounded-full object-cover border-2 border-[#0e8a5f]"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-[#0e8a5f] text-white font-bold text-xl flex items-center justify-center">
                    {(user.displayName || user.email || 'U')[0].toUpperCase()}
                  </div>
                )}

                <div>
                  <div className="font-bold text-base text-[#142433] dark:text-[#e8f1ee]">
                    {user.displayName || 'Usuario de Google'}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">{user.email}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-bold bg-[#0e8a5f]/15 text-[#0e8a5f] dark:text-[#6fe3ae] px-2.5 py-0.5 rounded-full border border-[#0e8a5f]/30 uppercase">
                      Rol: {activeRole}
                    </span>
                    {isRealAdmin && (
                      <span className="text-[11px] font-bold bg-amber-500/20 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full border border-amber-500/40">
                        Super Administrador
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={logout}
                className="flex items-center gap-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 px-4 py-2 rounded-xl text-xs font-semibold transition-all"
              >
                <LogOut size={15} />
                <span>Cerrar Sesión</span>
              </button>
            </div>

            {/* Linked Player Status */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-2">
              <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <UserCheck size={16} className="text-[#0e8a5f]" />
                <span>Identidad de Futbolista Vinculada</span>
              </div>

              {linkedPlayer ? (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                      #{linkedPlayer.dorsal || '-'} {linkedPlayer.name}
                    </span>
                    <span className="text-slate-500 ml-2">
                      ({linkedTeam?.name || 'Agente Libre'} · {linkedPlayer.pos})
                    </span>
                    <p className="text-[11px] text-[#0e8a5f] dark:text-[#6fe3ae] mt-0.5">
                      ✓ Vinculación aprobada: Puedes subir tu foto de perfil desde la sección "Perfiles" y calificar a tus compañeros de equipo.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 pt-1">
                  <p className="text-slate-600 dark:text-slate-400">
                    Si eres uno de los jugadores inscritos en las plantillas de la liga, selecciona tu nombre a continuación para solicitar la vinculación a tu cuenta Google:
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 outline-none flex-1 max-w-sm"
                      value={claimPlayerId}
                      onChange={e => setClaimPlayerId(e.target.value)}
                    >
                      <option value="">Buscar mi nombre entre los jugadores...</option>
                      {players
                        .filter(p => !p.userId)
                        .map(p => (
                          <option key={p.id} value={p.id}>
                            #{p.dorsal || '-'} {p.name} ({teams.find(t => t.id === p.team)?.name || 'Sin equipo'})
                          </option>
                        ))}
                    </select>

                    <button
                      onClick={handleSelfClaim}
                      disabled={!claimPlayerId}
                      className="bg-[#0e8a5f] hover:bg-[#0b7a43] disabled:opacity-50 text-white font-bold px-4 py-1.5 rounded-xl text-xs transition-all shadow-xs"
                    >
                      Solicitar Vinculación
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="p-6 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 text-center space-y-3">
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Inicia sesión con tu cuenta de Google para acceder a tus permisos o vincular tu perfil de futbolista.
            </p>
            <button
              onClick={signInWithGoogle}
              className="bg-[#0e8a5f] hover:bg-[#0b7a43] text-white font-bold px-6 py-2.5 rounded-xl text-xs shadow-md transition-all inline-flex items-center gap-2"
            >
              <span>Acceder con Cuenta Google</span>
            </button>
          </div>
        )}
      </div>

      {/* Admin: Player Claim Requests Approval */}
      {isRealAdmin && (
        <div className="bg-white dark:bg-[#16262f] p-5 rounded-2xl border-2 border-[#0e8a5f]/40 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="font-bold text-base text-[#142433] dark:text-[#e8f1ee] flex items-center gap-2">
                <UserCheck className="text-[#0e8a5f]" size={18} />
                <span>Solicitudes de Vinculación de Jugadores</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Aprueba a los usuarios que afirman ser un jugador inscrito para que puedan gestionar su foto y valorar compañeros
              </p>
            </div>
            <span className="text-xs font-bold bg-[#0e8a5f]/15 text-[#0e8a5f] px-2.5 py-1 rounded-lg">
              {pendingClaims.length} pendientes
            </span>
          </div>

          {pendingClaims.length > 0 ? (
            <div className="space-y-2 text-xs">
              {pendingClaims.map(c => {
                const team = teams.find(t => t.id === c.teamId);
                return (
                  <div
                    key={c.id}
                    className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="font-bold text-slate-900 dark:text-slate-100">
                        {c.userName} <span className="text-slate-400 font-normal">({c.userEmail})</span>
                      </div>
                      <div className="text-slate-600 dark:text-slate-400 mt-0.5">
                        Solicita vincularse como: <b className="text-[#0e8a5f]">{c.playerName}</b> en{' '}
                        <b>{team?.name || 'Equipo'}</b>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={async () => {
                          try {
                            await approvePlayerClaim(c.id);
                            alert('Vinculación aprobada exitosamente.');
                          } catch (err: any) {
                            alert('Error: ' + err.message);
                          }
                        }}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 shadow-xs"
                      >
                        <Check size={14} /> Aprobar
                      </button>
                      <button
                        onClick={async () => {
                          try {
                            await rejectPlayerClaim(c.id);
                            alert('Vinculación rechazada.');
                          } catch (err: any) {
                            alert('Error: ' + err.message);
                          }
                        }}
                        className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 shadow-xs"
                      >
                        <X size={14} /> Rechazar
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-4 text-center text-slate-400 text-xs">
              No hay solicitudes de vinculación de jugadores pendientes.
            </div>
          )}
        </div>
      )}

      {/* Role Management (Admin only) */}
      {isRealAdmin && (
        <div className="bg-white dark:bg-[#16262f] p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="font-bold text-base text-[#142433] dark:text-[#e8f1ee] flex items-center gap-2">
                <Shield className="text-[#0e8a5f]" size={18} />
                <span>Aprobación y Asignación de Roles de Acceso</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Asigna a cada usuario de Google el perfil de Capitán (con su equipo), Árbitro o Visitante
              </p>
            </div>
            <span className="text-xs font-bold bg-[#0e8a5f]/15 text-[#0e8a5f] px-2.5 py-1 rounded-lg">
              {users.length} usuarios
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-400 text-[11px] uppercase">
                  <th className="py-2 px-3">Usuario Google</th>
                  <th className="py-2 px-3">Correo</th>
                  <th className="py-2 px-3">Rol Asignado</th>
                  <th className="py-2 px-3">Equipo (si es Capitán)</th>
                  <th className="py-2 px-3">Árbitro (si es Oficial)</th>
                  <th className="py-2 px-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {users.map(u => {
                  const draft = editingRoles[u.id] || {
                    role: u.role || 'visitante',
                    team: u.team || '',
                    ref: u.ref || '',
                  };

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                      <td className="py-2 px-3 font-semibold text-slate-900 dark:text-slate-100">
                        {u.name || 'Sin nombre'}
                      </td>
                      <td className="py-2 px-3 text-slate-500">{u.email}</td>
                      <td className="py-2 px-3">
                        <select
                          className="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1 font-semibold text-xs"
                          value={draft.role}
                          onChange={e => handleRoleChange(u.id, 'role', e.target.value)}
                        >
                          <option value="visitante">Visitante</option>
                          <option value="capitan">Capitán</option>
                          <option value="arbitro">Árbitro</option>
                          <option value="admin">Administrador</option>
                        </select>
                      </td>
                      <td className="py-2 px-3">
                        <select
                          disabled={draft.role !== 'capitan'}
                          className="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1 text-xs disabled:opacity-40"
                          value={draft.team}
                          onChange={e => handleRoleChange(u.id, 'team', e.target.value)}
                        >
                          <option value="">Selecciona equipo...</option>
                          {teams.map(t => (
                            <option key={t.id} value={t.id}>
                              {t.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2 px-3">
                        <select
                          disabled={draft.role !== 'arbitro'}
                          className="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1 text-xs disabled:opacity-40"
                          value={draft.ref}
                          onChange={e => handleRoleChange(u.id, 'ref', e.target.value)}
                        >
                          <option value="">Selecciona árbitro...</option>
                          {referees.map(r => (
                            <option key={r.id} value={r.id}>
                              {r.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2 px-3 text-right">
                        <button
                          onClick={() => handleSaveUserRole(u.id)}
                          className="bg-[#0e8a5f] hover:bg-[#0b7a43] text-white px-3 py-1 rounded-lg font-bold text-[11px] shadow-xs"
                        >
                          Guardar
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Database Tools & Backup */}
      {isRealAdmin && (
        <div className="bg-white dark:bg-[#16262f] p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <h3 className="font-bold text-sm text-[#142433] dark:text-[#e8f1ee] flex items-center gap-2">
            <Download size={16} className="text-[#0e8a5f]" />
            <span>Copia de Respaldo de la Base de Datos</span>
          </h3>
          <p className="text-xs text-slate-500">
            Descarga un respaldo completo en formato JSON de todos los equipos, jugadores, partidos, actas y torneos registrados.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              onClick={handleExportBackup}
              className="bg-[#0e8a5f] hover:bg-[#0b7a43] text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
            >
              <Download size={14} />
              <span>Descargar Respaldo JSON</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
