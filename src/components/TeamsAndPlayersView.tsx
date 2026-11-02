import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Player, Team, Modality, Category } from '../types';
import { POSITIONS, MODALITY_NAMES } from '../constants';
import { Users, Plus, Shield, Edit3, Trash2, Check, AlertCircle } from 'lucide-react';

export const TeamsAndPlayersView: React.FC = () => {
  const {
    teams,
    players,
    addTeam,
    deleteTeam,
    addPlayer,
    updatePlayer,
    deletePlayer,
    checkCedulaDuplicate,
  } = useData();

  const { isRealAdmin, activeRole, activeTeam } = useAuth();
  const isAdmin = isRealAdmin || activeRole === 'admin';
  const isCaptain = activeRole === 'capitan';

  // New Team form
  const [showAddTeam, setShowAddTeam] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [teamMod, setTeamMod] = useState<Modality>('F11');
  const [teamCat, setTeamCat] = useState<Category>('Masculino');

  // Player enrollment/edit form
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [playerName, setPlayerName] = useState('');
  const [playerCedula, setPlayerCedula] = useState('');
  const [playerDorsal, setPlayerDorsal] = useState<number | ''>('');
  const [playerTeamId, setPlayerTeamId] = useState(isCaptain && activeTeam ? activeTeam : '');
  const [playerPos, setPlayerPos] = useState('MC');
  const [playerSec, setPlayerSec] = useState<string[]>([]);
  const [showSecAccordion, setShowSecAccordion] = useState(false);

  // Confirmation state for deletes
  const [confirmDeleteKey, setConfirmDeleteKey] = useState<string | null>(null);

  const startEditPlayer = (p: Player) => {
    setEditingPlayerId(p.id);
    setPlayerName(p.name);
    setPlayerCedula(p.cedula || '');
    setPlayerDorsal(p.dorsal || '');
    setPlayerTeamId(p.team);
    setPlayerPos(p.pos || 'MC');
    setPlayerSec(p.sec || []);
    setShowSecAccordion(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingPlayerId(null);
    setPlayerName('');
    setPlayerCedula('');
    setPlayerDorsal('');
    setPlayerTeamId(isCaptain && activeTeam ? activeTeam : '');
    setPlayerPos('MC');
    setPlayerSec([]);
    setShowSecAccordion(false);
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim()) return;
    try {
      await addTeam({
        name: teamName.trim(),
        mod: teamMod,
        cat: teamCat,
      });
      setTeamName('');
      setShowAddTeam(false);
    } catch (err: any) {
      alert('Error al crear equipo: ' + err.message);
    }
  };

  const handleSavePlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    const nameClean = playerName.trim();
    const cedulaClean = playerCedula.trim();
    const targetTeam = editingPlayerId ? players.find(p => p.id === editingPlayerId)?.team : playerTeamId;

    if (!nameClean) {
      alert('Indica el nombre del jugador.');
      return;
    }
    if (!cedulaClean || cedulaClean.replace(/\D/g, '').length < 5) {
      alert('Indica una cédula de identidad válida (ej. V-12345678).');
      return;
    }

    if (!targetTeam) {
      alert('Selecciona el equipo al que pertenece el jugador.');
      return;
    }

    // Check squad limit (max 30: 25 base + 5 optional)
    if (!editingPlayerId) {
      const currentSquadSize = players.filter(p => p.team === targetTeam).length;
      if (currentSquadSize >= 30) {
        alert('El equipo ya cuenta con el cupo máximo de 30 jugadores reglamentarios.');
        return;
      }
    }

    // Validate dorsal (1 - 99, unique within team)
    const dNum = Number(playerDorsal);
    if (!dNum || dNum < 1 || dNum > 99) {
      alert('Indica un número de dorsal reglamentario entre 1 y 99.');
      return;
    }

    const dorsalTaken = players.some(
      p => p.id !== editingPlayerId && p.team === targetTeam && p.dorsal === dNum
    );
    if (dorsalTaken) {
      alert(`El dorsal #${dNum} ya está en uso por otro jugador en este equipo.`);
      return;
    }

    // Check league-wide cédula uniqueness
    const duplicate = await checkCedulaDuplicate(cedulaClean, editingPlayerId || undefined);
    if (duplicate) {
      const dupTeam = teams.find(t => t.id === duplicate.team);
      alert(
        `Esa cédula ya está registrada en KAPE A.F. a nombre de ${duplicate.name} (${
          dupTeam?.name || 'Agente libre'
        }). Una persona no puede registrarse dos veces en la asociación; para cambiarla de equipo utiliza la sección Fichajes.`
      );
      return;
    }

    try {
      if (editingPlayerId) {
        await updatePlayer(editingPlayerId, {
          name: nameClean,
          cedula: cedulaClean,
          dorsal: dNum,
          pos: playerPos,
          sec: playerSec,
        });
      } else {
        await addPlayer({
          name: nameClean,
          cedula: cedulaClean,
          dorsal: dNum,
          team: targetTeam,
          pos: playerPos,
          sec: playerSec,
        });
      }
      cancelEdit();
    } catch (err: any) {
      alert('Error al guardar jugador: ' + err.message);
    }
  };

  const handleDeleteTeam = async (teamId: string) => {
    const hasPlayers = players.some(p => p.team === teamId);
    if (hasPlayers) {
      alert('Este equipo tiene jugadores inscritos. Pásalos a otro equipo en Traspasos o elimínalos antes de eliminar el equipo.');
      return;
    }

    const key = `t_${teamId}`;
    if (confirmDeleteKey !== key) {
      setConfirmDeleteKey(key);
      setTimeout(() => setConfirmDeleteKey(null), 5000);
      return;
    }

    try {
      await deleteTeam(teamId);
      setConfirmDeleteKey(null);
    } catch (err: any) {
      alert('Error al eliminar equipo: ' + err.message);
    }
  };

  const handleDeletePlayer = async (playerId: string) => {
    const key = `p_${playerId}`;
    if (confirmDeleteKey !== key) {
      setConfirmDeleteKey(key);
      setTimeout(() => setConfirmDeleteKey(null), 5000);
      return;
    }

    try {
      await deletePlayer(playerId);
      setConfirmDeleteKey(null);
    } catch (err: any) {
      alert('Error al eliminar jugador: ' + err.message);
    }
  };

  const toggleSecPosition = (posCode: string) => {
    if (playerSec.includes(posCode)) {
      setPlayerSec(playerSec.filter(c => c !== posCode));
    } else {
      if (playerSec.length >= 3) {
        alert('Máximo 3 posiciones secundarias permitidas por el reglamento.');
        return;
      }
      setPlayerSec([...playerSec, posCode]);
    }
  };

  const canInscribePlayers = isAdmin || (isCaptain && !!activeTeam);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white dark:bg-[#16262f] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-[#142433] dark:text-[#e8f1ee] flex items-center gap-2">
            <Users className="text-[#0e8a5f]" size={22} />
            <span>Equipos y Plantillas Oficiales</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Registro de clubes, modalidades, dorsales únicos y verificación de cédulas
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => setShowAddTeam(!showAddTeam)}
            className="flex items-center gap-1.5 bg-[#0e8a5f] hover:bg-[#0b7a43] text-white px-3.5 py-2 rounded-xl text-xs font-semibold shadow-sm transition-all"
          >
            <Plus size={16} />
            <span>{showAddTeam ? 'Cerrar' : 'Nuevo Equipo'}</span>
          </button>
        )}
      </div>

      {/* New Team Modal (Admin only) */}
      {isAdmin && showAddTeam && (
        <form
          onSubmit={handleCreateTeam}
          className="bg-white dark:bg-[#16262f] p-5 rounded-2xl border-2 border-[#0e8a5f]/40 shadow-md space-y-4 animate-in fade-in"
        >
          <div className="font-bold text-sm text-[#142433] dark:text-[#e8f1ee] pb-2 border-b border-slate-100 dark:border-slate-800">
            Registrar Nuevo Equipo en la Asociación
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Nombre del Equipo
              </label>
              <input
                type="text"
                required
                placeholder="Ej. Deportivo Kape"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-[#0e8a5f]"
                value={teamName}
                onChange={e => setTeamName(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Modalidad
              </label>
              <select
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-[#0e8a5f]"
                value={teamMod}
                onChange={e => setTeamMod(e.target.value as Modality)}
              >
                <option value="F11">Fútbol 11</option>
                <option value="F7">Fútbol 7</option>
                <option value="F5">Fútbol 5</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Categoría
              </label>
              <select
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-[#0e8a5f]"
                value={teamCat}
                onChange={e => setTeamCat(e.target.value as Category)}
              >
                <option value="Masculino">Masculino</option>
                <option value="Femenino">Femenino</option>
                <option value="Mixto">Mixto</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowAddTeam(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="bg-[#0e8a5f] hover:bg-[#0b7a43] text-white px-5 py-2 text-xs font-semibold rounded-xl shadow-sm"
            >
              Crear Equipo
            </button>
          </div>
        </form>
      )}

      {/* Inscribe or Edit Player Form */}
      {canInscribePlayers && (
        <form
          onSubmit={handleSavePlayer}
          className="bg-white dark:bg-[#16262f] p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4"
        >
          <div className="font-bold text-sm text-[#142433] dark:text-[#e8f1ee] pb-2 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span>
              {editingPlayerId
                ? 'Editar Datos del Jugador (Para cambiar de equipo usa Fichajes)'
                : 'Inscribir Nuevo Jugador en Plantilla'}
            </span>
            {editingPlayerId && (
              <button
                type="button"
                onClick={cancelEdit}
                className="text-xs text-slate-500 hover:text-slate-900 font-semibold"
              >
                Cancelar edición
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Nombre Completo
              </label>
              <input
                type="text"
                required
                placeholder="Nombre y apellido"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-[#0e8a5f]"
                value={playerName}
                onChange={e => setPlayerName(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Cédula de Identidad (Única)
              </label>
              <input
                type="text"
                required
                placeholder="V-12345678"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-[#0e8a5f]"
                value={playerCedula}
                onChange={e => setPlayerCedula(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Dorsal (1 - 99)
              </label>
              <input
                type="number"
                min="1"
                max="99"
                required
                placeholder="Ej. 10"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-[#0e8a5f]"
                value={playerDorsal}
                onChange={e =>
                  setPlayerDorsal(e.target.value === '' ? '' : parseInt(e.target.value, 10))
                }
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Equipo Destino
              </label>
              <select
                disabled={!!editingPlayerId || (isCaptain && !isAdmin)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-[#0e8a5f] disabled:opacity-60"
                value={playerTeamId}
                onChange={e => setPlayerTeamId(e.target.value)}
              >
                <option value="">Selecciona equipo...</option>
                {teams.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Posición Principal
              </label>
              <select
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-[#0e8a5f]"
                value={playerPos}
                onChange={e => setPlayerPos(e.target.value)}
              >
                {POSITIONS.map(([code, label]) => (
                  <option key={code} value={code}>
                    {code} · {label}
                  </option>
                ))}
              </select>
            </div>

            <div className="pt-4 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowSecAccordion(!showSecAccordion)}
                className="text-xs font-semibold text-[#0e8a5f] dark:text-[#6fe3ae] hover:underline"
              >
                {showSecAccordion ? 'Ocultar' : 'Desplegar'} posiciones secundarias ({playerSec.length}/3)
              </button>

              <button
                type="submit"
                className="bg-[#0e8a5f] hover:bg-[#0b7a43] text-white px-5 py-2 text-xs font-semibold rounded-xl shadow-sm transition-all"
              >
                {editingPlayerId ? 'Guardar Cambios' : 'Inscribir Jugador'}
              </button>
            </div>
          </div>

          {/* Secondary positions selector */}
          {showSecAccordion && (
            <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 animate-in fade-in">
              <span className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">
                Selecciona hasta 3 posiciones secundarias:
              </span>
              <div className="flex flex-wrap gap-2 text-xs">
                {POSITIONS.filter(([c]) => c !== playerPos).map(([code, label]) => {
                  const isChecked = playerSec.includes(code);
                  return (
                    <button
                      key={code}
                      type="button"
                      onClick={() => toggleSecPosition(code)}
                      className={`px-2.5 py-1 rounded-lg border font-medium transition-all ${
                        isChecked
                          ? 'bg-[#0e8a5f] text-white border-[#0e8a5f]'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-100'
                      }`}
                      title={label}
                    >
                      {code}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </form>
      )}

      {/* Teams and Squads list */}
      <div className="space-y-4">
        {teams.length > 0 ? (
          teams.map(t => {
            const squad = players.filter(p => p.team === t.id);
            const canManageThisTeam = isAdmin || (isCaptain && activeTeam === t.id);
            const delTeamKey = `t_${t.id}`;

            return (
              <div
                key={t.id}
                className="bg-white dark:bg-[#16262f] p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4"
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-3">
                    {t.foto ? (
                      <img
                        src={t.foto}
                        alt={t.name}
                        className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700 shadow-xs"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-[#0e8a5f] text-white font-extrabold text-base flex items-center justify-center shadow-xs">
                        {t.name[0]?.toUpperCase() || 'E'}
                      </div>
                    )}
                    <div>
                      <h3 className="font-bold text-base text-[#142433] dark:text-[#e8f1ee]">
                        {t.name}
                      </h3>
                      <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                        <span className="text-[11px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded font-medium text-slate-600 dark:text-slate-400">
                          {MODALITY_NAMES[t.mod] || t.mod}
                        </span>
                        <span className="text-[11px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded font-medium text-slate-600 dark:text-slate-400">
                          {t.cat || 'Masculino'}
                        </span>
                        <span
                          className={`text-[11px] px-2 py-0.5 rounded font-semibold ${
                            squad.length >= 30
                              ? 'bg-rose-500/15 text-rose-700 dark:text-rose-400'
                              : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                          }`}
                        >
                          {squad.length}/30 jugadores
                        </span>
                      </div>
                    </div>
                  </div>

                  {isAdmin && (
                    <button
                      onClick={() => handleDeleteTeam(t.id)}
                      className={`text-xs px-2.5 py-1.5 rounded-xl border transition-all ${
                        confirmDeleteKey === delTeamKey
                          ? 'bg-rose-600 text-white border-rose-600 animate-pulse font-bold'
                          : 'border-slate-200 dark:border-slate-700 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20'
                      }`}
                    >
                      {confirmDeleteKey === delTeamKey ? '¿Confirmar?' : 'Eliminar Equipo'}
                    </button>
                  )}
                </div>

                {/* Squad list */}
                <div className="space-y-2">
                  <div className="font-semibold text-xs text-slate-500 dark:text-slate-400">
                    Plantel de Jugadores ({squad.length}):
                  </div>

                  {squad.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                      {squad
                        .sort((a, b) => (a.dorsal || 99) - (b.dorsal || 99))
                        .map(p => {
                          const delPlayerKey = `p_${p.id}`;
                          return (
                            <div
                              key={p.id}
                              className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs"
                            >
                              <div className="flex items-center gap-2 truncate">
                                <span className="font-bold text-[#0e8a5f] dark:text-[#6fe3ae] w-6 text-center">
                                  #{p.dorsal || '-'}
                                </span>
                                <div className="truncate">
                                  <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                                    {p.name}
                                  </div>
                                  <div className="text-[10px] text-slate-500 dark:text-slate-400">
                                    {p.pos || 'JUG'}
                                    {p.sec && p.sec.length > 0 ? ` (${p.sec.join(', ')})` : ''}
                                  </div>
                                </div>
                              </div>

                              {canManageThisTeam && (
                                <div className="flex items-center gap-1 shrink-0 ml-2">
                                  <button
                                    onClick={() => startEditPlayer(p)}
                                    className="p-1 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
                                    title="Editar jugador"
                                  >
                                    <Edit3 size={13} />
                                  </button>
                                  {isAdmin && (
                                    <button
                                      onClick={() => handleDeletePlayer(p.id)}
                                      className={`p-1 transition-colors ${
                                        confirmDeleteKey === delPlayerKey
                                          ? 'text-rose-600 font-bold animate-pulse'
                                          : 'text-slate-400 hover:text-rose-600'
                                      }`}
                                      title="Eliminar de la liga"
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 py-2">
                      Aún no hay jugadores inscritos en este equipo.
                    </p>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="bg-white dark:bg-[#16262f] p-8 rounded-2xl border border-slate-200 dark:border-slate-800 text-center text-slate-400 text-sm">
            Aún no hay equipos creados.
          </div>
        )}
      </div>
    </div>
  );
};
