import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, Plus, Check, X, Trash2 } from 'lucide-react';

export const RefereesView: React.FC = () => {
  const { referees, players, teams, addReferee, updateReferee, deleteReferee } = useData();
  const { isRealAdmin, activeRole } = useAuth();
  const isAdmin = isRealAdmin || activeRole === 'admin';

  const [showAddRef, setShowAddRef] = useState(false);
  const [refName, setRefName] = useState('');
  const [refPlayerId, setRefPlayerId] = useState('');
  const [isApproved, setIsApproved] = useState(true);
  const [isFederated, setIsFederated] = useState(false);

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleCreateReferee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refName.trim()) return;
    try {
      await addReferee({
        name: refName.trim(),
        playerId: refPlayerId || undefined,
        ok: isApproved,
        fed: isFederated,
      });
      setRefName('');
      setRefPlayerId('');
      setShowAddRef(false);
    } catch (err: any) {
      alert('Error al registrar árbitro: ' + err.message);
    }
  };

  const handleDeleteReferee = async (id: string) => {
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id);
      setTimeout(() => setConfirmDeleteId(null), 5000);
      return;
    }
    try {
      await deleteReferee(id);
      setConfirmDeleteId(null);
    } catch (err: any) {
      alert('Error al eliminar árbitro: ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white dark:bg-[#16262f] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-[#142433] dark:text-[#e8f1ee] flex items-center gap-2">
            <ShieldCheck className="text-[#0e8a5f]" size={22} />
            <span>Colegio y Directorio de Árbitros</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Registro oficial de jueces, federación y prevención de conflicto de intereses
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => setShowAddRef(!showAddRef)}
            className="flex items-center gap-1.5 bg-[#0e8a5f] hover:bg-[#0b7a43] text-white px-3.5 py-2 rounded-xl text-xs font-semibold shadow-sm"
          >
            <Plus size={16} />
            <span>{showAddRef ? 'Cancelar' : 'Registrar Árbitro'}</span>
          </button>
        )}
      </div>

      {isAdmin && showAddRef && (
        <form
          onSubmit={handleCreateReferee}
          className="bg-white dark:bg-[#16262f] p-5 rounded-2xl border-2 border-[#0e8a5f]/40 shadow-sm space-y-4 animate-in fade-in"
        >
          <div className="font-bold text-sm text-[#142433] dark:text-[#e8f1ee] pb-2 border-b border-slate-100 dark:border-slate-800">
            Ficha de Nuevo Árbitro
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Nombre Completo
              </label>
              <input
                type="text"
                required
                placeholder="Nombre del árbitro"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 outline-none"
                value={refName}
                onChange={e => setRefName(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                ¿Es también jugador inscrito? (Para evitar conflicto de intereses)
              </label>
              <select
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 outline-none"
                value={refPlayerId}
                onChange={e => setRefPlayerId(e.target.value)}
              >
                <option value="">No es jugador (Árbitro exclusivo)</option>
                {players.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({teams.find(t => t.id === p.team)?.name || 'Agente libre'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 dark:text-slate-400">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={isApproved}
                onChange={e => setIsApproved(e.target.checked)}
              />
              <span>Aprobado por el Administrador</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={isFederated}
                onChange={e => setIsFederated(e.target.checked)}
              />
              <span>Árbitro Federado</span>
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowAddRef(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="bg-[#0e8a5f] hover:bg-[#0b7a43] text-white px-5 py-2 text-xs font-semibold rounded-xl shadow-sm"
            >
              Guardar Árbitro
            </button>
          </div>
        </form>
      )}

      {/* Directory Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {referees.map(r => {
          const associatedPlayer = players.find(p => p.id === r.playerId);
          const playerTeam = teams.find(t => t.id === associatedPlayer?.team);

          return (
            <div
              key={r.id}
              className="bg-white dark:bg-[#16262f] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between gap-3 text-xs"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-[#142433] dark:text-[#e8f1ee]">
                    {r.name}
                  </span>
                  <div className="flex items-center gap-1">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        r.ok
                          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                          : 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                      }`}
                    >
                      {r.ok ? 'Aprobado' : 'Pendiente'}
                    </span>
                    {r.fed && (
                      <span className="text-[10px] bg-sky-500/15 text-sky-700 dark:text-sky-300 font-bold px-1.5 py-0.5 rounded-full">
                        Fed.
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  {associatedPlayer && playerTeam ? (
                    <span className="text-amber-600 dark:text-amber-400 font-medium">
                      ⚠️ Es jugador de {playerTeam.name} (inhabilitado para dirigir sus partidos)
                    </span>
                  ) : (
                    <span>Árbitro exclusivo de la asociación</span>
                  )}
                </div>
              </div>

              {isAdmin && (
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-1.5">
                    {!r.ok && (
                      <button
                        onClick={() => updateReferee(r.id, { ok: true })}
                        className="bg-emerald-600 text-white font-bold px-2 py-1 rounded text-[11px]"
                      >
                        Aprobar
                      </button>
                    )}
                    <button
                      onClick={() => updateReferee(r.id, { fed: !r.fed })}
                      className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-medium px-2 py-1 rounded text-[11px]"
                    >
                      {r.fed ? 'Quitar Fed.' : 'Marcar Fed.'}
                    </button>
                  </div>

                  <button
                    onClick={() => handleDeleteReferee(r.id)}
                    className={`text-rose-600 px-2 py-1 rounded text-[11px] font-semibold ${
                      confirmDeleteId === r.id ? 'bg-rose-600 text-white animate-pulse' : ''
                    }`}
                  >
                    {confirmDeleteId === r.id ? '¿Seguro?' : <Trash2 size={13} />}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
