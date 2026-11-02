import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Match, Modality } from '../types';
import { validateRefereeDesignation } from '../utils/rules';
import { exportMatchesToICS } from '../utils/export';
import { MODALITY_NAMES } from '../constants';
import { Calendar, Plus, Clock, MapPin, ShieldAlert, Trash2, CheckCircle2, AlertTriangle, Download } from 'lucide-react';

export const MatchesView: React.FC = () => {
  const { matches, teams, venues, referees, players, addMatch, updateMatch, deleteMatch } = useData();
  const { isRealAdmin, activeRole } = useAuth();

  const isAdmin = isRealAdmin || activeRole === 'admin';

  // Scheduling form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [teamAId, setTeamAId] = useState('');
  const [teamBId, setTeamBId] = useState('');
  const [matchDate, setMatchDate] = useState('');
  const [matchTime, setMatchTime] = useState('16:00');
  const [matchSede, setMatchSede] = useState<'neutral' | 'a' | 'b'>('neutral');
  const [venueId, setVenueId] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState<{ id: string; ok: boolean; text: string } | null>(null);

  // Deletion confirmation
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const pendingMatches = matches.filter(m => !m.played);

  const handleScheduleMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamAId || !teamBId) {
      alert('Selecciona ambos equipos.');
      return;
    }
    if (teamAId === teamBId) {
      alert('Los equipos deben ser distintos.');
      return;
    }
    const tA = teams.find(t => t.id === teamAId);
    const tB = teams.find(t => t.id === teamBId);
    if (!tA || !tB) return;

    if (tA.mod !== tB.mod) {
      alert(`Incompatibilidad de modalidad: ${tA.name} juega ${MODALITY_NAMES[tA.mod]} y ${tB.name} juega ${MODALITY_NAMES[tB.mod]}.`);
      return;
    }
    if ((tA.cat || 'Masculino') !== (tB.cat || 'Masculino')) {
      alert(`Incompatibilidad de categoría: ${tA.name} (${tA.cat || 'Masculino'}) vs ${tB.name} (${tB.cat || 'Masculino'}).`);
      return;
    }
    if (!matchDate) {
      alert('Selecciona la fecha del encuentro.');
      return;
    }
    if (!venueId) {
      alert('Selecciona una cancha para el partido.');
      return;
    }

    const v = venues.find(x => x.id === venueId);
    if (v && !v.mods.includes(tA.mod)) {
      alert(`La cancha seleccionada no está habilitada para la modalidad ${MODALITY_NAMES[tA.mod]}.`);
      return;
    }

    try {
      await addMatch({
        a: teamAId,
        b: teamBId,
        date: matchDate,
        time: matchTime || '16:00',
        venue: venueId,
        mod: tA.mod,
        sede: matchSede,
        ref: '',
        played: false,
      });
      setShowAddForm(false);
      setTeamAId('');
      setTeamBId('');
      setMatchDate('');
      setMatchTime('16:00');
      setVenueId('');
    } catch (err: any) {
      alert('Error al programar partido: ' + (err.message || err));
    }
  };

  const handleAssignReferee = async (match: Match, refId: string) => {
    if (!refId) {
      await updateMatch(match.id, { ref: '' });
      setFeedbackMsg(null);
      return;
    }

    const validation = validateRefereeDesignation(refId, match, referees, players, teams, matches);
    if (!validation.ok) {
      setFeedbackMsg({ id: match.id, ok: false, text: validation.msg });
      return;
    }

    try {
      await updateMatch(match.id, { ref: refId });
      setFeedbackMsg({ id: match.id, ok: true, text: 'Árbitro designado exitosamente.' });
    } catch (err: any) {
      setFeedbackMsg({ id: match.id, ok: false, text: err.message || 'Error al asignar árbitro' });
    }
  };

  const handleDeleteMatch = async (id: string) => {
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id);
      setTimeout(() => setConfirmDeleteId(null), 5000);
      return;
    }
    try {
      await deleteMatch(id);
      setConfirmDeleteId(null);
    } catch (err: any) {
      alert('Error al eliminar: ' + err.message);
    }
  };

  const handleExportICS = () => {
    try {
      exportMatchesToICS(matches, teams, venues);
    } catch (err: any) {
      alert(err.message || 'Error al exportar calendario');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white dark:bg-[#16262f] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-[#142433] dark:text-[#e8f1ee] flex items-center gap-2">
            <Calendar className="text-[#0e8a5f]" size={22} />
            <span>Próximos Partidos y Designaciones</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Calendario de partidos oficiales, asignaciones arbitrales y sedes
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportICS}
            className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-3 py-2 rounded-xl text-xs font-semibold border border-slate-300 dark:border-slate-700 transition-all"
          >
            <Download size={15} />
            <span>Sincronizar Calendario (.ics)</span>
          </button>

          {isAdmin && (
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-1.5 bg-[#0e8a5f] hover:bg-[#0b7a43] text-white px-3.5 py-2 rounded-xl text-xs font-semibold shadow-sm transition-all"
            >
              <Plus size={16} />
              <span>{showAddForm ? 'Cancelar' : 'Programar Partido'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Program match form (Admin only) */}
      {isAdmin && showAddForm && (
        <form
          onSubmit={handleScheduleMatch}
          className="bg-white dark:bg-[#16262f] p-5 rounded-2xl border-2 border-[#0e8a5f]/40 shadow-md space-y-4 animate-in fade-in"
        >
          <div className="font-bold text-sm text-[#142433] dark:text-[#e8f1ee] pb-2 border-b border-slate-100 dark:border-slate-800">
            Nuevo Encuentro Oficial
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Equipo A (Local por defecto si aplica)
              </label>
              <select
                required
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-[#0e8a5f]"
                value={teamAId}
                onChange={e => setTeamAId(e.target.value)}
              >
                <option value="">Selecciona equipo...</option>
                {teams.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({MODALITY_NAMES[t.mod]} · {t.cat || 'Masculino'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Equipo B (Visitante por defecto si aplica)
              </label>
              <select
                required
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-[#0e8a5f]"
                value={teamBId}
                onChange={e => setTeamBId(e.target.value)}
              >
                <option value="">Selecciona equipo...</option>
                {teams.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({MODALITY_NAMES[t.mod]} · {t.cat || 'Masculino'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Fecha
              </label>
              <input
                type="date"
                required
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-[#0e8a5f]"
                value={matchDate}
                onChange={e => setMatchDate(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Hora
              </label>
              <input
                type="time"
                required
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-[#0e8a5f]"
                value={matchTime}
                onChange={e => setMatchTime(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Condición de Localía
              </label>
              <select
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-[#0e8a5f]"
                value={matchSede}
                onChange={e => setMatchSede(e.target.value as any)}
              >
                <option value="neutral">Cancha neutral</option>
                <option value="a">Local: Primer equipo</option>
                <option value="b">Local: Segundo equipo</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Cancha / Sede
              </label>
              <select
                required
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-[#0e8a5f]"
                value={venueId}
                onChange={e => setVenueId(e.target.value)}
              >
                <option value="">Selecciona cancha...</option>
                {venues.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.name} ({v.mods.join(', ')})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="bg-[#0e8a5f] hover:bg-[#0b7a43] text-white px-5 py-2 text-xs font-semibold rounded-xl shadow-sm"
            >
              Guardar y Programar
            </button>
          </div>
        </form>
      )}

      {/* Fixtures List */}
      <div className="space-y-3">
        {pendingMatches.length > 0 ? (
          pendingMatches.map(m => {
            const teamA = teams.find(t => t.id === m.a);
            const teamB = teams.find(t => t.id === m.b);
            const venue = venues.find(v => v.id === m.venue);
            const assignedRef = referees.find(r => r.id === m.ref);
            const msg = feedbackMsg?.id === m.id ? feedbackMsg : null;

            return (
              <div
                key={m.id}
                className="bg-white dark:bg-[#16262f] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3"
              >
                {/* Header info */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-2">
                    <span className="bg-[#0e8a5f]/10 text-[#0e8a5f] dark:text-[#6fe3ae] font-bold px-2 py-0.5 rounded-md">
                      {MODALITY_NAMES[m.mod] || m.mod}
                    </span>
                    <span className="flex items-center gap-1 font-medium">
                      <Clock size={13} /> {m.date} · {m.time}
                    </span>
                    {venue && (
                      <span className="flex items-center gap-1">
                        <MapPin size={13} /> {venue.name}
                      </span>
                    )}
                  </div>

                  <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                    {m.sede === 'a'
                      ? `Local: ${teamA?.name || 'Equipo A'}`
                      : m.sede === 'b'
                      ? `Local: ${teamB?.name || 'Equipo B'}`
                      : 'Sede neutral'}
                  </span>
                </div>

                {/* Match Teams Banner */}
                <div className="flex items-center justify-between gap-4 py-2 px-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl">
                  <div className="flex-1 text-base font-bold text-[#142433] dark:text-[#e8f1ee] text-left">
                    {teamA?.name || 'Equipo A'}
                  </div>
                  <div className="text-xs font-extrabold text-slate-400 px-3 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full">
                    VS
                  </div>
                  <div className="flex-1 text-base font-bold text-[#142433] dark:text-[#e8f1ee] text-right">
                    {teamB?.name || 'Equipo B'}
                  </div>
                </div>

                {/* Referee Assignment & Status */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs pt-1">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">Árbitro:</span>
                    {assignedRef ? (
                      <span className="font-bold text-[#142433] dark:text-[#e8f1ee] flex items-center gap-1">
                        <CheckCircle2 size={14} className="text-[#0e8a5f]" />
                        {assignedRef.name}
                        {assignedRef.fed && (
                          <span className="text-[10px] bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 px-1.5 py-0.2 rounded font-semibold">
                            Federado
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className="text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                        <AlertTriangle size={14} /> Sin asignar
                      </span>
                    )}
                  </div>

                  {/* Admin controls */}
                  {isAdmin && (
                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                      <select
                        className="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 outline-none"
                        value={m.ref || ''}
                        onChange={e => handleAssignReferee(m, e.target.value)}
                      >
                        <option value="">Designar árbitro...</option>
                        {referees
                          .filter(r => r.ok)
                          .map(r => {
                            const val = validateRefereeDesignation(r.id, m, referees, players, teams, matches);
                            return (
                              <option key={r.id} value={r.id}>
                                {val.ok ? '✓ ' : '⛔ '} {r.name} {r.fed ? '(Federado)' : ''}
                              </option>
                            );
                          })}
                      </select>

                      <select
                        className="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-800 dark:text-slate-200 outline-none"
                        value={m.sede || 'neutral'}
                        onChange={e => updateMatch(m.id, { sede: e.target.value as any })}
                      >
                        <option value="neutral">Neutral</option>
                        <option value="a">Local: {teamA?.name || 'Equipo A'}</option>
                        <option value="b">Local: {teamB?.name || 'Equipo B'}</option>
                      </select>

                      <button
                        onClick={() => handleDeleteMatch(m.id)}
                        className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                          confirmDeleteId === m.id
                            ? 'bg-rose-600 text-white border-rose-600 animate-pulse'
                            : 'border-slate-300 dark:border-slate-700 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30'
                        }`}
                        title="Eliminar partido programado"
                      >
                        {confirmDeleteId === m.id ? '¿Seguro?' : <Trash2 size={14} />}
                      </button>
                    </div>
                  )}
                </div>

                {/* Validation Feedback Warning */}
                {msg && (
                  <div
                    className={`text-xs px-3 py-2 rounded-xl flex items-center gap-2 ${
                      msg.ok
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                        : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                    }`}
                  >
                    {msg.ok ? <CheckCircle2 size={16} /> : <ShieldAlert size={16} />}
                    <span>{msg.text}</span>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="bg-white dark:bg-[#16262f] p-8 rounded-2xl border border-slate-200 dark:border-slate-800 text-center text-slate-400 text-sm">
            No hay partidos pendientes programados.
          </div>
        )}
      </div>
    </div>
  );
};
