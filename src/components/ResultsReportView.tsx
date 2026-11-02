import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Match, MatchEvent, MatchReport } from '../types';
import { FileText, Send, AlertTriangle, CheckCircle2, ShieldCheck } from 'lucide-react';

export const ResultsReportView: React.FC = () => {
  const { matches, teams, players, reportes, saveMatchReport, updateMatch } = useData();
  const { isRealAdmin, activeRole, activeTeam, activeRef } = useAuth();

  const isAdmin = isRealAdmin || activeRole === 'admin';
  const isCaptain = activeRole === 'capitan';
  const isReferee = activeRole === 'arbitro';

  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);

  // Report state
  const [goalsA, setGoalsA] = useState<string>('');
  const [goalsB, setGoalsB] = useState<string>('');
  const [pkA, setPkA] = useState<string>('');
  const [pkB, setPkB] = useState<string>('');
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [attendance, setAttendance] = useState<Record<string, number>>({});

  // Event draft inputs
  const [eventKind, setEventKind] = useState<'gol' | 'card' | 'pen' | 'og' | 'mvp'>('gol');
  const [eventPlayer, setEventPlayer] = useState('');
  const [eventAssist, setEventAssist] = useState('');
  const [eventGoalType, setEventGoalType] = useState<'j' | 'l'>('j');
  const [eventCard, setEventCard] = useState<'y' | 'r'>('y');
  const [eventPenRes, setEventPenRes] = useState<'gol' | 'atajado' | 'fallado'>('gol');
  const [eventPenGk, setEventPenGk] = useState('');

  // Eligible matches for the user to report
  const reportableMatches = matches.filter(m => {
    if (m.played) return false;
    if (isAdmin) return true;
    if (isCaptain && activeTeam && (m.a === activeTeam || m.b === activeTeam)) return true;
    if (isReferee && activeRef && m.ref === activeRef) return true;
    return false;
  });

  const activeMatch = matches.find(m => m.id === selectedMatchId);
  const teamA = teams.find(t => t.id === activeMatch?.a);
  const teamB = teams.find(t => t.id === activeMatch?.b);

  const matchPlayers = players.filter(
    p => p.team === activeMatch?.a || p.team === activeMatch?.b
  );

  const startReport = (m: Match) => {
    setSelectedMatchId(m.id);
    setGoalsA('');
    setGoalsB('');
    setPkA('');
    setPkB('');
    setEvents([]);
    setAttendance({});
  };

  const addEvent = () => {
    if (!eventPlayer) {
      alert('Selecciona el jugador involucrado.');
      return;
    }

    if (eventKind === 'gol') {
      if (eventAssist && eventAssist === eventPlayer) {
        alert('El goleador no puede asistirse a sí mismo.');
        return;
      }
      events.push({
        k: 'gol',
        p: eventPlayer,
        t: eventGoalType,
        a: eventGoalType === 'j' ? eventAssist : undefined,
      });
    } else if (eventKind === 'card') {
      events.push({
        k: 'card',
        p: eventPlayer,
        c: eventCard,
      });
    } else if (eventKind === 'pen') {
      events.push({
        k: 'pen',
        p: eventPlayer,
        res: eventPenRes,
        gk: eventPenGk || undefined,
      });
    } else if (eventKind === 'og') {
      events.push({
        k: 'og',
        p: eventPlayer,
      });
    } else if (eventKind === 'mvp') {
      events.push({
        k: 'mvp',
        p: eventPlayer,
      });
    }

    setEvents([...events]);
    setEventPlayer('');
    setEventAssist('');
  };

  const removeEvent = (index: number) => {
    const updated = [...events];
    updated.splice(index, 1);
    setEvents(updated);
  };

  const publishResult = async (m: Match, rep: Omit<MatchReport, 'id'>) => {
    const P: Record<string, any> = {};
    let mvp = '';

    const getP = (pid: string) => {
      const q = players.find(x => x.id === pid);
      if (!q) return null;
      if (!P[pid]) {
        P[pid] = {
          p: pid,
          t: q.team,
          st: 1,
          g: 0,
          s: 0,
          gp: 0,
          gl: 0,
          y: 0,
          r: 0,
          pa: 0,
          pf: 0,
          og: 0,
        };
      }
      return P[pid];
    };

    Object.keys(rep.att || {}).forEach(getP);

    rep.ev.forEach(e => {
      if (e.k === 'mvp') mvp = e.p;
      const x = getP(e.p);
      if (!x) return;
      if (e.k === 'gol') {
        x.g++;
        if (e.t === 'l') x.gl++;
        if (e.a) {
          const asst = getP(e.a);
          if (asst) asst.s++;
        }
      } else if (e.k === 'card') {
        if (e.c === 'y') x.y++;
        if (e.c === 'r') x.r++;
      } else if (e.k === 'pen') {
        if (e.res === 'gol') {
          x.g++;
          x.gp++;
        } else if (e.res === 'fallado') {
          x.pf++;
        } else if (e.res === 'atajado' && e.gk) {
          const gk = getP(e.gk);
          if (gk) gk.pa++;
        }
      } else if (e.k === 'og') {
        x.og++;
      }
    });

    const part = Object.values(P);
    const sm = (tId: string, k: string) =>
      part.filter(x => x.t === tId).reduce((s, x) => s + (x[k] || 0), 0);

    await updateMatch(m.id, {
      played: true,
      resultRecordedAt: m.resultRecordedAt || Date.now(),
      disputa: false,
      ga: rep.ga,
      gb: rep.gb,
      ya: sm(m.a, 'y'),
      yb: sm(m.b, 'y'),
      ra: sm(m.a, 'r'),
      rb: sm(m.b, 'r'),
      mvp,
      part,
      pk: rep.pka || rep.pkb ? { a: rep.pka || 0, b: rep.pkb || 0 } : null,
    });
  };

  const handleSubmitReport = async () => {
    if (!activeMatch) return;
    if (goalsA === '' || goalsB === '') {
      alert('Indica el marcador del partido.');
      return;
    }

    const gA = parseInt(goalsA, 10);
    const gB = parseInt(goalsB, 10);
    const pA = parseInt(pkA || '0', 10);
    const pB = parseInt(pkB || '0', 10);

    const source = isAdmin ? 'adm' : isReferee ? 'arb' : activeTeam;

    const rep: Omit<MatchReport, 'id'> = {
      m: activeMatch.id,
      src: source,
      ga: gA,
      gb: gB,
      pka: pA,
      pkb: pB,
      ev: events,
      att: attendance,
    };

    try {
      if (source === 'adm' || source === 'arb') {
        await publishResult(activeMatch, rep);
        await saveMatchReport(`${activeMatch.id}_${source}`, rep);
        setSelectedMatchId(null);
        alert('Resultado oficial publicado con éxito.');
        return;
      }

      // Captain submission: compare with opponent captain's report
      const otherReport = reportes.find(
        x => x.m === activeMatch.id && x.src !== source && x.src !== 'adm' && x.src !== 'arb'
      );

      await saveMatchReport(`${activeMatch.id}_${source}`, rep);
      setSelectedMatchId(null);

      if (!otherReport) {
        alert('Tu reporte ha sido enviado. Queda a la espera del reporte del capitán rival.');
        return;
      }

      // Compare
      const matchesScore = otherReport.ga === gA && otherReport.gb === gB;
      const matchesPK = otherReport.pka === pA && otherReport.pkb === pB;

      if (matchesScore && matchesPK) {
        // Auto-merge & publish!
        const mergedAtt = { ...otherReport.att, ...attendance };
        await publishResult(activeMatch, { ...rep, att: mergedAtt });
        alert('¡Ambos reportes coinciden! El resultado se ha validado y publicado automáticamente.');
      } else {
        await updateMatch(activeMatch.id, { disputa: true });
        alert('Los reportes de ambos capitanes difieren. El partido ha sido marcado "En disputa" para resolución del administrador.');
      }
    } catch (err: any) {
      alert('Error al enviar reporte: ' + (err.message || err));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-[#16262f] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <h2 className="text-xl font-bold text-[#142433] dark:text-[#e8f1ee] flex items-center gap-2">
          <FileText className="text-[#0e8a5f]" size={22} />
          <span>Cargar y Reportar Resultados</span>
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          {isAdmin
            ? 'Modo Administrador: tus reportes validan o resuelven disputas directamente.'
            : isReferee
            ? 'Modo Árbitro: tus reportes se publican directamente como acta oficial.'
            : isCaptain
            ? 'Modo Capitán: envía el marcador y eventos de tu equipo. Si coincide con el rival, se aprueba automáticamente.'
            : 'Solo capitanes, árbitros o el administrador pueden cargar resultados.'}
        </p>
      </div>

      {/* Report Form */}
      {activeMatch ? (
        <div className="bg-white dark:bg-[#16262f] rounded-2xl border-2 border-[#0e8a5f]/40 p-5 shadow-lg space-y-5 animate-in fade-in">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <span className="font-bold text-sm text-[#142433] dark:text-[#e8f1ee]">
              Reportando: {teamA?.name} vs {teamB?.name}
            </span>
            <button
              onClick={() => setSelectedMatchId(null)}
              className="text-xs text-slate-500 hover:text-slate-900 font-semibold"
            >
              Cancelar
            </button>
          </div>

          {/* Score inputs */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-around gap-4 text-center">
            <div>
              <div className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {teamA?.name}
              </div>
              <input
                type="number"
                min="0"
                placeholder="Goles"
                className="w-20 bg-white dark:bg-slate-900 border-2 border-[#0e8a5f] rounded-xl px-2 py-2 text-center text-2xl font-extrabold text-[#0e8a5f] outline-none"
                value={goalsA}
                onChange={e => setGoalsA(e.target.value)}
              />
            </div>

            <div className="text-lg font-bold text-slate-400">VS</div>

            <div>
              <div className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {teamB?.name}
              </div>
              <input
                type="number"
                min="0"
                placeholder="Goles"
                className="w-20 bg-white dark:bg-slate-900 border-2 border-[#0e8a5f] rounded-xl px-2 py-2 text-center text-2xl font-extrabold text-[#0e8a5f] outline-none"
                value={goalsB}
                onChange={e => setGoalsB(e.target.value)}
              />
            </div>

            <div className="w-full pt-2 flex items-center justify-center gap-3 text-xs text-slate-600 dark:text-slate-400">
              <span>Si hubo penales:</span>
              <input
                type="number"
                min="0"
                placeholder="Pen A"
                className="w-16 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-1 text-center font-bold"
                value={pkA}
                onChange={e => setPkA(e.target.value)}
              />
              <span>-</span>
              <input
                type="number"
                min="0"
                placeholder="Pen B"
                className="w-16 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-1 text-center font-bold"
                value={pkB}
                onChange={e => setPkB(e.target.value)}
              />
            </div>
          </div>

          {/* Attendance Selection */}
          <div>
            <div className="font-bold text-xs text-[#142433] dark:text-[#e8f1ee] mb-2">
              Jugadores que Participaron:
            </div>
            <div className="flex flex-wrap gap-1.5">
              {matchPlayers.map(p => {
                const attended = !!attendance[p.id];
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      const updated = { ...attendance };
                      if (attended) delete updated[p.id];
                      else updated[p.id] = 1;
                      setAttendance(updated);
                    }}
                    className={`px-2.5 py-1 text-xs rounded-xl font-medium border transition-all ${
                      attended
                        ? 'bg-[#0e8a5f] text-white border-[#0e8a5f]'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                    }`}
                  >
                    {attended && '✓ '} #{p.dorsal || '-'} {p.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Event Builder */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="font-bold text-xs text-[#142433] dark:text-[#e8f1ee]">
              Agregar Evento al Partido
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <select
                className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 font-semibold"
                value={eventKind}
                onChange={e => setEventKind(e.target.value as any)}
              >
                <option value="gol">⚽ Gol</option>
                <option value="card">🟨/🟥 Tarjeta</option>
                <option value="pen">🎯 Penal</option>
                <option value="og">🥅 Autogol</option>
                <option value="mvp">⭐ MVP</option>
              </select>

              <select
                className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 max-w-[200px]"
                value={eventPlayer}
                onChange={e => setEventPlayer(e.target.value)}
              >
                <option value="">Selecciona jugador...</option>
                {matchPlayers.map(p => (
                  <option key={p.id} value={p.id}>
                    #{p.dorsal || '-'} {p.name} ({teams.find(t => t.id === p.team)?.name})
                  </option>
                ))}
              </select>

              {eventKind === 'gol' && (
                <>
                  <select
                    className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1.5"
                    value={eventGoalType}
                    onChange={e => setEventGoalType(e.target.value as any)}
                  >
                    <option value="j">Jugada normal</option>
                    <option value="l">Tiro libre</option>
                  </select>

                  {eventGoalType === 'j' && (
                    <select
                      className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1.5 max-w-[180px]"
                      value={eventAssist}
                      onChange={e => setEventAssist(e.target.value)}
                    >
                      <option value="">Asistente (opcional)...</option>
                      {matchPlayers.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  )}
                </>
              )}

              {eventKind === 'card' && (
                <select
                  className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1.5"
                  value={eventCard}
                  onChange={e => setEventCard(e.target.value as any)}
                >
                  <option value="y">Tarjeta Amarilla</option>
                  <option value="r">Tarjeta Roja</option>
                </select>
              )}

              {eventKind === 'pen' && (
                <>
                  <select
                    className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1.5"
                    value={eventPenRes}
                    onChange={e => setEventPenRes(e.target.value as any)}
                  >
                    <option value="gol">Gol de penal</option>
                    <option value="atajado">Atajado por portero</option>
                    <option value="fallado">Fallado / desviado</option>
                  </select>

                  {eventPenRes === 'atajado' && (
                    <select
                      className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1.5"
                      value={eventPenGk}
                      onChange={e => setEventPenGk(e.target.value)}
                    >
                      <option value="">Portero que atajó...</option>
                      {matchPlayers
                        .filter(p => p.pos === 'POR')
                        .map(p => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                    </select>
                  )}
                </>
              )}

              <button
                type="button"
                onClick={addEvent}
                className="bg-[#0e8a5f] text-white px-3 py-1.5 rounded-lg font-bold"
              >
                + Agregar
              </button>
            </div>

            {/* List of drafted events */}
            <div className="space-y-1.5 pt-2">
              {events.map((ev, idx) => {
                const player = players.find(p => p.id === ev.p);
                const asst = players.find(p => p.id === ev.a);

                return (
                  <div
                    key={idx}
                    className="flex items-center justify-between bg-white dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs"
                  >
                    <span>
                      {ev.k === 'gol' &&
                        `⚽ Gol de ${player?.name || '—'} (${
                          ev.t === 'l' ? 'Tiro libre' : 'Jugada'
                        })${asst ? ` · Asistencia: ${asst.name}` : ''}`}
                      {ev.k === 'card' &&
                        `${ev.c === 'y' ? '🟨 Amarilla' : '🟥 Roja'} a ${player?.name || '—'}`}
                      {ev.k === 'pen' &&
                        `🎯 Penal de ${player?.name || '—'}: ${ev.res}`}
                      {ev.k === 'og' && `🥅 Autogol de ${player?.name || '—'}`}
                      {ev.k === 'mvp' && `⭐ MVP: ${player?.name || '—'}`}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeEvent(idx)}
                      className="text-rose-500 font-bold hover:underline"
                    >
                      Quitar
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => setSelectedMatchId(null)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSubmitReport}
              className="bg-[#0e8a5f] hover:bg-[#0b7a43] text-white px-6 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-sm"
            >
              <Send size={15} />
              <span>
                {isAdmin
                  ? 'Publicar (Administrador)'
                  : isReferee
                  ? 'Publicar Acta Oficial'
                  : 'Enviar Mi Reporte de Capitán'}
              </span>
            </button>
          </div>
        </div>
      ) : (
        /* Match list */
        <div className="space-y-3">
          {reportableMatches.length > 0 ? (
            reportableMatches.map(m => {
              const tA = teams.find(t => t.id === m.a);
              const tB = teams.find(t => t.id === m.b);
              const reportsForMatch = reportes.filter(r => r.m === m.id);

              return (
                <div
                  key={m.id}
                  className="bg-white dark:bg-[#16262f] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                >
                  <div>
                    <div className="font-bold text-sm text-[#142433] dark:text-[#e8f1ee] flex items-center gap-2">
                      <span>{tA?.name} vs {tB?.name}</span>
                      {m.disputa && (
                        <span className="text-[10px] bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                          <AlertTriangle size={12} /> En Disputa
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {m.date || 'Sin fecha'} · Reportes recibidos:{' '}
                      {reportsForMatch.length > 0
                        ? reportsForMatch
                            .map(r =>
                              r.src === 'arb'
                                ? 'Árbitro'
                                : r.src === 'adm'
                                ? 'Admin'
                                : `${teams.find(t => t.id === r.src)?.name || 'Capitán'}: ${r.ga}-${r.gb}`
                            )
                            .join(' · ')
                        : 'Ninguno aún'}
                    </div>
                  </div>

                  <button
                    onClick={() => startReport(m)}
                    className="bg-[#0e8a5f] hover:bg-[#0b7a43] text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-sm transition-all"
                  >
                    {isAdmin ? 'Cargar / Resolver Disputa' : 'Cargar Reporte'}
                  </button>
                </div>
              );
            })
          ) : (
            <div className="bg-white dark:bg-[#16262f] p-8 rounded-2xl border border-slate-200 dark:border-slate-800 text-center text-slate-400 text-sm">
              No tienes partidos pendientes de reporte asignados a tu rol.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
