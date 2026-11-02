import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Match, Player, MatchPart, MatchSub } from '../types';
import { FORMATIONS } from '../constants';
import { ClipboardList, Check, Star, AlertCircle } from 'lucide-react';

export const MatchSheetView: React.FC = () => {
  const { matches, teams, players, referees, updateMatch } = useData();
  const { isRealAdmin, activeRole, activeRef } = useAuth();

  const isAdmin = isRealAdmin || activeRole === 'admin';
  const isReferee = activeRole === 'arbitro';

  // Selected referee filter or all matches
  const [filterRefId, setFilterRefId] = useState<string>(isReferee ? activeRef : '');
  const [activeMatchId, setActiveMatchId] = useState<string | null>(null);

  // Match sheet editing state
  const [currentSide, setCurrentSide] = useState<'a' | 'b'>('a');
  const [scoreA, setScoreA] = useState<string>('');
  const [scoreB, setScoreB] = useState<string>('');
  const [matchFormat, setMatchFormat] = useState<number>(2); // 2 = 2 tiempos, 1 = 1 tiempo
  const [matchMinutes, setMatchMinutes] = useState<number>(45);
  const [hasPenalties, setHasPenalties] = useState<boolean>(false);
  const [pkScoreA, setPkScoreA] = useState<string>('');
  const [pkScoreB, setPkScoreB] = useState<string>('');

  const [formationA, setFormationA] = useState<string>('4-3-3');
  const [formationB, setFormationB] = useState<string>('4-3-3');
  const [lineupA, setLineupA] = useState<Record<string, string>>({});
  const [lineupB, setLineupB] = useState<Record<string, string>>({});
  const [benchA, setBenchA] = useState<Record<string, boolean>>({});
  const [benchB, setBenchB] = useState<Record<string, boolean>>({});

  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  // Substitutions
  const [subs, setSubs] = useState<MatchSub[]>([]);

  // Individual goals and assists
  const [goalsMap, setGoalsMap] = useState<Record<string, number>>({});
  const [assistsMap, setAssistsMap] = useState<Record<string, number>>({});
  const [penaltyGoalsMap, setPenaltyGoalsMap] = useState<Record<string, number>>({});
  const [freeKickGoalsMap, setFreeKickGoalsMap] = useState<Record<string, number>>({});

  // Cards & Ratings
  const [yellowsA, setYellowsA] = useState<number>(0);
  const [yellowsB, setYellowsB] = useState<number>(0);
  const [redsA, setRedsA] = useState<number>(0);
  const [redsB, setRedsB] = useState<number>(0);
  const [mvpPlayerId, setMvpPlayerId] = useState<string>('');
  const [refRating, setRefRating] = useState<number>(5);

  // Optional penalties
  const [penaltiesA, setPenaltiesA] = useState<string[]>([]);
  const [penaltiesB, setPenaltiesB] = useState<string[]>([]);

  const pendingMatches = matches.filter(m => !m.played && (!filterRefId || m.ref === filterRefId));

  const startMatchSheet = (m: Match) => {
    setActiveMatchId(m.id);
    setCurrentSide('a');
    setScoreA(m.ga !== undefined ? String(m.ga) : '');
    setScoreB(m.gb !== undefined ? String(m.gb) : '');
    setMatchFormat(m.fmt || 2);
    setMatchMinutes(m.mins || (m.mod === 'F11' ? 45 : m.mod === 'F7' ? 25 : 20));
    setHasPenalties(!!m.pk);
    setPkScoreA(m.pk ? String(m.pk.a) : '');
    setPkScoreB(m.pk ? String(m.pk.b) : '');

    const defaultFmt = FORMATIONS[m.mod]?.[0] || '4-3-3';
    setFormationA(m.form?.a || defaultFmt);
    setFormationB(m.form?.b || defaultFmt);
    setLineupA(m.lu?.a || {});
    setLineupB(m.lu?.b || {});
    setBenchA({});
    setBenchB({});
    setSelectedSlot(null);
    setSubs(m.subs || []);

    const gMap: Record<string, number> = {};
    const sMap: Record<string, number> = {};
    (m.part || []).forEach(x => {
      if (x.g) gMap[x.p] = x.g;
      if (x.s) sMap[x.p] = x.s;
    });
    setGoalsMap(gMap);
    setAssistsMap(sMap);

    setYellowsA(m.ya || 0);
    setYellowsB(m.yb || 0);
    setRedsA(m.ra || 0);
    setRedsB(m.rb || 0);
    setMvpPlayerId(m.mvp || '');
    setRefRating(m.rate || 5);
    setPenaltiesA(m.pen?.a || []);
    setPenaltiesB(m.pen?.b || []);
  };

  const activeMatch = matches.find(m => m.id === activeMatchId);
  const teamA = teams.find(t => t.id === activeMatch?.a);
  const teamB = teams.find(t => t.id === activeMatch?.b);

  const activeTeamId = currentSide === 'a' ? activeMatch?.a : activeMatch?.b;
  const activeFormation = currentSide === 'a' ? formationA : formationB;
  const activeLineup = currentSide === 'a' ? lineupA : lineupB;
  const activeBench = currentSide === 'a' ? benchA : benchB;

  const currentRoster = players
    .filter(p => p.team === activeTeamId)
    .sort((x, y) => (x.dorsal || 99) - (y.dorsal || 99));

  // Pitch slots generation
  const getFormationSlots = (fmt: string) => {
    const s = ['gk'];
    fmt.split('-').forEach((n, i) => {
      for (let k = 0; k < +n; k++) s.push(`${i}_${k}`);
    });
    return s;
  };

  const handlePlacePlayer = (playerId: string) => {
    const curLineup = { ...(currentSide === 'a' ? lineupA : lineupB) };
    const curBench = { ...(currentSide === 'a' ? benchA : benchB) };

    const existingSlot = Object.keys(curLineup).find(s => curLineup[s] === playerId);

    if (!selectedSlot) {
      if (existingSlot) {
        delete curLineup[existingSlot];
      } else {
        curBench[playerId] = !curBench[playerId];
      }
    } else {
      if (existingSlot) delete curLineup[existingSlot];
      curLineup[selectedSlot] = playerId;
      curBench[playerId] = false;

      // Select next empty slot
      const slots = getFormationSlots(activeFormation);
      const nextEmpty = slots.find(s => !curLineup[s]) || null;
      setSelectedSlot(nextEmpty);
    }

    if (currentSide === 'a') {
      setLineupA(curLineup);
      setBenchA(curBench);
    } else {
      setLineupB(curLineup);
      setBenchB(curBench);
    }
  };

  const handleAutofill = () => {
    if (!activeMatch) return;
    const isPortero = (pos: string) => pos === 'POR';
    const gk = currentRoster.filter(p => isPortero(p.pos));
    const outfield = currentRoster.filter(p => !isPortero(p.pos));
    const pool = [...outfield, ...gk.slice(1)];

    const newLineup: Record<string, string> = {};
    let idx = 0;
    const slots = getFormationSlots(activeFormation);

    slots.forEach(s => {
      if (s === 'gk') {
        if (gk[0]) newLineup.gk = gk[0].id;
      } else if (pool[idx]) {
        newLineup[s] = pool[idx++].id;
      }
    });

    if (currentSide === 'a') setLineupA(newLineup);
    else setLineupB(newLineup);
    setSelectedSlot(null);
  };

  const handleSaveMatchSheet = async () => {
    if (!activeMatch) return;
    if (scoreA === '' || scoreB === '') {
      alert('Debes indicar el marcador final del partido.');
      return;
    }

    const gA = parseInt(scoreA, 10);
    const gB = parseInt(scoreB, 10);

    // Validate starter lineups
    if (Object.keys(lineupA).length === 0) {
      alert(`Debes asignar la alineación titular de ${teamA?.name || 'Equipo A'}.`);
      return;
    }
    if (Object.keys(lineupB).length === 0) {
      alert(`Debes asignar la alineación titular de ${teamB?.name || 'Equipo B'}.`);
      return;
    }

    // Build participants
    const participants: MatchPart[] = [];
    let benchCountA = 0;
    let benchCountB = 0;

    const buildTeamParts = (
      tId: string,
      lu: Record<string, string>,
      bn: Record<string, boolean>,
      isSideA: boolean
    ) => {
      const starterIds = Object.values(lu);
      const teamPlayers = players.filter(
        p => p.team === tId && (starterIds.includes(p.id) || bn[p.id])
      );

      teamPlayers.forEach(p => {
        const isStarter = starterIds.includes(p.id);
        if (!isStarter) {
          if (isSideA) benchCountA++;
          else benchCountB++;
        }
        participants.push({
          p: p.id,
          t: tId,
          st: isStarter ? 1 : 0,
          g: goalsMap[p.id] || 0,
          s: assistsMap[p.id] || 0,
          gp: penaltyGoalsMap[p.id] || 0,
          gl: freeKickGoalsMap[p.id] || 0,
        });
      });
    };

    buildTeamParts(activeMatch.a, lineupA, benchA, true);
    buildTeamParts(activeMatch.b, lineupB, benchB, false);

    // Validate goals sum
    const sumA = participants.filter(x => x.t === activeMatch.a).reduce((s, x) => s + (x.g || 0), 0);
    const sumB = participants.filter(x => x.t === activeMatch.b).reduce((s, x) => s + (x.g || 0), 0);

    if (sumA > gA) {
      alert(`La suma de goles individuales de ${teamA?.name} (${sumA}) supera los goles anotados (${gA}).`);
      return;
    }
    if (sumB > gB) {
      alert(`La suma de goles individuales de ${teamB?.name} (${sumB}) supera los goles anotados (${gB}).`);
      return;
    }

    try {
      await updateMatch(activeMatch.id, {
        played: true,
        resultRecordedAt: activeMatch.resultRecordedAt || Date.now(),
        ga: gA,
        gb: gB,
        ya: yellowsA,
        yb: yellowsB,
        ra: redsA,
        rb: redsB,
        mvp: mvpPlayerId,
        rate: refRating,
        part: participants,
        fmt: matchFormat,
        mins: matchMinutes,
        pk: hasPenalties ? { a: parseInt(pkScoreA || '0', 10), b: parseInt(pkScoreB || '0', 10) } : null,
        pen: { a: penaltiesA, b: penaltiesB },
        subs: subs.filter(s => s.out && s.in),
        lu: { a: lineupA, b: lineupB },
        form: { a: formationA, b: formationB },
        ben: { a: benchCountA, b: benchCountB },
      });
      setActiveMatchId(null);
      alert('¡Acta digital registrada y publicada con éxito!');
    } catch (err: any) {
      alert('Error al guardar acta: ' + (err.message || err));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white dark:bg-[#16262f] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-[#142433] dark:text-[#e8f1ee] flex items-center gap-2">
            <ClipboardList className="text-[#0e8a5f]" size={22} />
            <span>Actas Digitales y Alineaciones Tácticas</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Registro visual del partido, pizarrón táctico, titulares, suplentes y eventos
          </p>
        </div>

        {/* Referee selector */}
        {!activeMatchId && (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Árbitro:</span>
            <select
              className="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 outline-none w-full sm:w-auto"
              value={filterRefId}
              onChange={e => setFilterRefId(e.target.value)}
            >
              <option value="">Todos los partidos</option>
              {referees
                .filter(r => r.ok)
                .map(r => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
            </select>
          </div>
        )}
      </div>

      {/* Editor Modal / Container */}
      {activeMatch ? (
        <div className="bg-white dark:bg-[#16262f] rounded-2xl border-2 border-[#0e8a5f]/40 p-5 shadow-lg space-y-6 animate-in fade-in">
          {/* Match header */}
          <div className="flex flex-wrap items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 gap-2">
            <span className="font-bold text-sm text-[#142433] dark:text-[#e8f1ee]">
              Acta Oficial: {teamA?.name} vs {teamB?.name}
            </span>
            <button
              onClick={() => setActiveMatchId(null)}
              className="text-xs text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 font-semibold"
            >
              Cancelar
            </button>
          </div>

          {/* Score & Timing */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="flex items-center justify-center gap-4 text-center">
              <div className="flex-1 text-right">
                <span className="font-bold text-base text-[#142433] dark:text-[#e8f1ee]">
                  {teamA?.name}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  placeholder="Goles"
                  className="w-16 bg-white dark:bg-slate-900 border-2 border-[#0e8a5f] rounded-xl px-2 py-1.5 text-center text-xl font-bold text-[#0e8a5f] outline-none"
                  value={scoreA}
                  onChange={e => setScoreA(e.target.value)}
                />
                <span className="font-extrabold text-slate-400">-</span>
                <input
                  type="number"
                  min="0"
                  placeholder="Goles"
                  className="w-16 bg-white dark:bg-slate-900 border-2 border-[#0e8a5f] rounded-xl px-2 py-1.5 text-center text-xl font-bold text-[#0e8a5f] outline-none"
                  value={scoreB}
                  onChange={e => setScoreB(e.target.value)}
                />
              </div>

              <div className="flex-1 text-left">
                <span className="font-bold text-base text-[#142433] dark:text-[#e8f1ee]">
                  {teamB?.name}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-4 pt-2 text-xs text-slate-600 dark:text-slate-400">
              <div className="flex items-center gap-2">
                <span>Formato:</span>
                <select
                  className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1 outline-none"
                  value={matchFormat}
                  onChange={e => setMatchFormat(Number(e.target.value))}
                >
                  <option value={2}>2 Tiempos</option>
                  <option value={1}>1 Tiempo</option>
                </select>
                <input
                  type="number"
                  min="1"
                  className="w-16 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1 text-center"
                  value={matchMinutes}
                  onChange={e => setMatchMinutes(Number(e.target.value))}
                />
                <span>min {matchFormat === 2 ? 'por tiempo' : 'totales'}</span>
              </div>

              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasPenalties}
                  onChange={e => setHasPenalties(e.target.checked)}
                />
                <span>Definición por penales</span>
              </label>

              {hasPenalties && (
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="0"
                    placeholder="Pen A"
                    className="w-14 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1 text-center font-bold"
                    value={pkScoreA}
                    onChange={e => setPkScoreA(e.target.value)}
                  />
                  <span>-</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="Pen B"
                    className="w-14 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1 text-center font-bold"
                    value={pkScoreB}
                    onChange={e => setPkScoreB(e.target.value)}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Tactical Pitch & Lineups */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2 border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setCurrentSide('a');
                    setSelectedSlot(null);
                  }}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all ${
                    currentSide === 'a'
                      ? 'bg-[#0e8a5f] text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {teamA?.name}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCurrentSide('b');
                    setSelectedSlot(null);
                  }}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all ${
                    currentSide === 'b'
                      ? 'bg-[#0e8a5f] text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {teamB?.name}
                </button>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="font-semibold text-slate-500">Táctica:</span>
                <select
                  className="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1 outline-none font-semibold text-[#0e8a5f]"
                  value={activeFormation}
                  onChange={e => {
                    if (currentSide === 'a') setFormationA(e.target.value);
                    else setFormationB(e.target.value);
                    setSelectedSlot(null);
                  }}
                >
                  {(FORMATIONS[activeMatch.mod] || FORMATIONS.F11).map(f => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={handleAutofill}
                  className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-2.5 py-1 rounded-lg font-medium text-xs transition-colors"
                >
                  Autocompletar
                </button>
              </div>
            </div>

            {/* Football Pitch Layout */}
            <div className="bg-[#2e7d32] p-4 rounded-2xl border-4 border-[#1b5e20] shadow-inner relative overflow-hidden flex flex-col justify-between min-h-[300px]">
              {/* Pitch markings */}
              <div className="absolute inset-0 border-2 border-white/30 m-3 pointer-events-none rounded-lg" />
              <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-white/30 -translate-y-1/2 pointer-events-none" />
              <div className="absolute top-1/2 left-1/2 w-24 h-24 -translate-x-1/2 -translate-y-1/2 border-2 border-white/30 rounded-full pointer-events-none" />

              {/* Rows of formation (Attack, Midfield, Defense) */}
              {activeFormation
                .split('-')
                .slice()
                .reverse()
                .map((rowNumStr, rIdx) => {
                  const actualRowIdx = activeFormation.split('-').length - 1 - rIdx;
                  const count = parseInt(rowNumStr, 10);
                  return (
                    <div key={actualRowIdx} className="flex justify-around items-center z-10 py-1">
                      {Array.from({ length: count }, (_, j) => {
                        const slotKey = `${actualRowIdx}_${j}`;
                        const assignedPlayerId = activeLineup[slotKey];
                        const player = players.find(p => p.id === assignedPlayerId);
                        const isSelected = selectedSlot === slotKey;

                        return (
                          <button
                            key={slotKey}
                            type="button"
                            onClick={() => setSelectedSlot(isSelected ? null : slotKey)}
                            className={`w-14 h-14 rounded-full flex flex-col items-center justify-center transition-all relative overflow-hidden ${
                              player
                                ? 'bg-white text-slate-900 shadow-md border-2 border-[#1b5e20]'
                                : 'bg-white/20 text-white border-2 border-dashed border-white/60 hover:bg-white/30'
                            } ${isSelected ? 'ring-4 ring-amber-400 scale-105' : ''}`}
                          >
                            {player?.foto ? (
                              <>
                                <img
                                  src={player.foto}
                                  alt={player.name}
                                  className="absolute inset-0 w-full h-full object-cover"
                                />
                                <div className="absolute inset-x-0 bottom-0 bg-black/75 text-white text-[8px] font-bold text-center truncate px-0.5 z-10 leading-tight">
                                  #{player.dorsal || '-'} {player.name.split(' ')[0]}
                                </div>
                              </>
                            ) : (
                              <>
                                <span className="font-extrabold text-xs">
                                  {player ? `#${player.dorsal || '-'}` : '+'}
                                </span>
                                <span className="text-[9px] font-semibold truncate max-w-[48px]">
                                  {player ? player.name.split(' ')[0] : 'VACANTE'}
                                </span>
                              </>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  );
                })}

              {/* Goalkeeper row */}
              <div className="flex justify-center items-center z-10 pt-2">
                {(() => {
                  const gkSlot = 'gk';
                  const gkPlayerId = activeLineup[gkSlot];
                  const gkPlayer = players.find(p => p.id === gkPlayerId);
                  const isSelected = selectedSlot === gkSlot;

                  return (
                    <button
                      type="button"
                      onClick={() => setSelectedSlot(isSelected ? null : gkSlot)}
                      className={`w-14 h-14 rounded-full flex flex-col items-center justify-center transition-all relative overflow-hidden ${
                        gkPlayer
                          ? 'bg-amber-300 text-amber-950 shadow-md border-2 border-amber-600'
                          : 'bg-white/20 text-white border-2 border-dashed border-white/60 hover:bg-white/30'
                      } ${isSelected ? 'ring-4 ring-amber-400 scale-105' : ''}`}
                    >
                      {gkPlayer?.foto ? (
                        <>
                          <img
                            src={gkPlayer.foto}
                            alt={gkPlayer.name}
                            className="absolute inset-0 w-full h-full object-cover"
                          />
                          <div className="absolute inset-x-0 bottom-0 bg-amber-950/85 text-amber-200 text-[8px] font-bold text-center truncate px-0.5 z-10 leading-tight">
                            #{gkPlayer.dorsal || '-'} {gkPlayer.name.split(' ')[0]}
                          </div>
                        </>
                      ) : (
                        <>
                          <span className="font-extrabold text-xs">
                            {gkPlayer ? `#${gkPlayer.dorsal || '-'}` : 'POR'}
                          </span>
                          <span className="text-[9px] font-semibold truncate max-w-[48px]">
                            {gkPlayer ? gkPlayer.name.split(' ')[0] : 'Portero'}
                          </span>
                        </>
                      )}
                    </button>
                  );
                })()}
              </div>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 italic">
              {selectedSlot
                ? 'Casilla marcada en la cancha: presiona un jugador de abajo para asignarlo.'
                : 'Presiona una casilla en la cancha y luego un jugador de la plantilla para ubicarlo.'}
            </p>

            {/* Roster chips */}
            <div className="space-y-1">
              <div className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                Plantilla de {currentSide === 'a' ? teamA?.name : teamB?.name}:
              </div>
              <div className="flex flex-wrap gap-1.5">
                {currentRoster.map(p => {
                  const isStarter = Object.values(activeLineup).includes(p.id);
                  const isBench = !!activeBench[p.id] && !isStarter;

                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handlePlacePlayer(p.id)}
                      className={`text-xs px-2.5 py-1 rounded-xl font-medium border transition-all ${
                        isStarter
                          ? 'bg-[#0e8a5f] text-white border-[#0e8a5f] shadow-xs'
                          : isBench
                          ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      <span>#{p.dorsal || '-'}</span> <b>{p.name}</b> <small>({p.pos || 'JUG'})</small>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Substitutions */}
            <div className="pt-2">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-xs text-[#142433] dark:text-[#e8f1ee]">
                  Sustituciones Realizadas ({currentSide === 'a' ? teamA?.name : teamB?.name})
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setSubs([...subs, { t: currentSide, min: 45, out: '', in: '' }])
                  }
                  className="text-xs font-semibold text-[#0e8a5f] dark:text-[#6fe3ae] hover:underline"
                >
                  + Agregar cambio
                </button>
              </div>

              <div className="space-y-2">
                {subs
                  .filter(s => s.t === currentSide)
                  .map((sub, sIdx) => (
                    <div key={sIdx} className="flex items-center gap-2 text-xs">
                      <span className="text-slate-400">Min:</span>
                      <input
                        type="number"
                        min="1"
                        max="120"
                        className="w-14 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1 text-center"
                        value={sub.min}
                        onChange={e => {
                          const updated = [...subs];
                          const realIdx = subs.indexOf(sub);
                          updated[realIdx].min = e.target.value;
                          setSubs(updated);
                        }}
                      />
                      <span className="text-rose-500 font-semibold">Sale:</span>
                      <select
                        className="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1"
                        value={sub.out}
                        onChange={e => {
                          const updated = [...subs];
                          const realIdx = subs.indexOf(sub);
                          updated[realIdx].out = e.target.value;
                          setSubs(updated);
                        }}
                      >
                        <option value="">Selecciona jugador...</option>
                        {currentRoster.map(p => (
                          <option key={p.id} value={p.id}>
                            #{p.dorsal || '-'} {p.name}
                          </option>
                        ))}
                      </select>

                      <span className="text-emerald-500 font-semibold">Entra:</span>
                      <select
                        className="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1"
                        value={sub.in}
                        onChange={e => {
                          const updated = [...subs];
                          const realIdx = subs.indexOf(sub);
                          updated[realIdx].in = e.target.value;
                          setSubs(updated);
                        }}
                      >
                        <option value="">Selecciona jugador...</option>
                        {currentRoster.map(p => (
                          <option key={p.id} value={p.id}>
                            #{p.dorsal || '-'} {p.name}
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        onClick={() => {
                          const updated = subs.filter(x => x !== sub);
                          setSubs(updated);
                        }}
                        className="text-rose-500 font-bold px-1.5"
                      >
                        ×
                      </button>
                    </div>
                  ))}
              </div>
            </div>

            {/* Individual goals & assists table for this team */}
            <div className="pt-2">
              <div className="font-bold text-xs text-[#142433] dark:text-[#e8f1ee] mb-1.5">
                Goles y Asistencias ({currentSide === 'a' ? teamA?.name : teamB?.name})
              </div>

              <div className="overflow-x-auto bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 p-2">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-500 text-left">
                      <th className="py-1 px-2">Jugador</th>
                      <th className="py-1 px-2 text-center">Goles Totales</th>
                      <th className="py-1 px-2 text-center">Penal</th>
                      <th className="py-1 px-2 text-center">Tiro Libre</th>
                      <th className="py-1 px-2 text-center">Asistencias</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentRoster
                      .filter(
                        p =>
                          Object.values(activeLineup).includes(p.id) || !!activeBench[p.id]
                      )
                      .map(p => (
                        <tr key={p.id} className="border-b border-slate-100 dark:border-slate-800/60">
                          <td className="py-1 px-2 font-medium">
                            #{p.dorsal || '-'} {p.name}
                          </td>
                          <td className="py-1 px-2 text-center">
                            <input
                              type="number"
                              min="0"
                              className="w-12 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md px-1 py-0.5 text-center font-bold text-[#0e8a5f]"
                              value={goalsMap[p.id] || ''}
                              onChange={e =>
                                setGoalsMap({ ...goalsMap, [p.id]: parseInt(e.target.value, 10) || 0 })
                              }
                            />
                          </td>
                          <td className="py-1 px-2 text-center">
                            <input
                              type="number"
                              min="0"
                              className="w-12 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md px-1 py-0.5 text-center"
                              value={penaltyGoalsMap[p.id] || ''}
                              onChange={e =>
                                setPenaltyGoalsMap({
                                  ...penaltyGoalsMap,
                                  [p.id]: parseInt(e.target.value, 10) || 0,
                                })
                              }
                            />
                          </td>
                          <td className="py-1 px-2 text-center">
                            <input
                              type="number"
                              min="0"
                              className="w-12 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md px-1 py-0.5 text-center"
                              value={freeKickGoalsMap[p.id] || ''}
                              onChange={e =>
                                setFreeKickGoalsMap({
                                  ...freeKickGoalsMap,
                                  [p.id]: parseInt(e.target.value, 10) || 0,
                                })
                              }
                            />
                          </td>
                          <td className="py-1 px-2 text-center">
                            <input
                              type="number"
                              min="0"
                              className="w-12 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md px-1 py-0.5 text-center font-semibold text-sky-600"
                              value={assistsMap[p.id] || ''}
                              onChange={e =>
                                setAssistsMap({ ...assistsMap, [p.id]: parseInt(e.target.value, 10) || 0 })
                              }
                            />
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Cards, MVP, Referee Rating */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3 text-xs">
            <div className="font-bold text-[#142433] dark:text-[#e8f1ee] uppercase tracking-wider text-[11px]">
              Tarjetas, Jugador del Partido y Calificación
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-slate-500 mb-1">
                  Amarillas ({teamA?.name})
                </label>
                <input
                  type="number"
                  min="0"
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1 text-center font-bold text-amber-500"
                  value={yellowsA}
                  onChange={e => setYellowsA(Number(e.target.value))}
                />
              </div>

              <div>
                <label className="block text-slate-500 mb-1">
                  Amarillas ({teamB?.name})
                </label>
                <input
                  type="number"
                  min="0"
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1 text-center font-bold text-amber-500"
                  value={yellowsB}
                  onChange={e => setYellowsB(Number(e.target.value))}
                />
              </div>

              <div>
                <label className="block text-slate-500 mb-1">
                  Rojas ({teamA?.name})
                </label>
                <input
                  type="number"
                  min="0"
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1 text-center font-bold text-rose-500"
                  value={redsA}
                  onChange={e => setRedsA(Number(e.target.value))}
                />
              </div>

              <div>
                <label className="block text-slate-500 mb-1">
                  Rojas ({teamB?.name})
                </label>
                <input
                  type="number"
                  min="0"
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1 text-center font-bold text-rose-500"
                  value={redsB}
                  onChange={e => setRedsB(Number(e.target.value))}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div>
                <label className="block text-slate-500 mb-1">
                  Jugador Más Valioso (MVP del Partido)
                </label>
                <select
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200"
                  value={mvpPlayerId}
                  onChange={e => setMvpPlayerId(e.target.value)}
                >
                  <option value="">Selecciona MVP...</option>
                  {players
                    .filter(p => p.team === activeMatch.a || p.team === activeMatch.b)
                    .map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({teams.find(t => t.id === p.team)?.name})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-500 mb-1">
                  Calificación del Desempeño Arbitral (1 - 5)
                </label>
                <select
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200"
                  value={refRating}
                  onChange={e => setRefRating(Number(e.target.value))}
                >
                  <option value={5}>★★★★★ (5 - Excelente)</option>
                  <option value={4}>★★★★☆ (4 - Bueno)</option>
                  <option value={3}>★★★☆☆ (3 - Regular)</option>
                  <option value={2}>★★☆☆☆ (2 - Deficiente)</option>
                  <option value={1}>★☆☆☆☆ (1 - Malo)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setActiveMatchId(null)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSaveMatchSheet}
              className="bg-[#0e8a5f] hover:bg-[#0b7a43] text-white px-6 py-2.5 text-xs font-bold rounded-xl shadow-md transition-all transform active:scale-95 flex items-center gap-2"
            >
              <Check size={16} />
              <span>Guardar y Validar Acta Oficial</span>
            </button>
          </div>
        </div>
      ) : (
        /* List of matches pending match sheet */
        <div className="space-y-3">
          {pendingMatches.length > 0 ? (
            pendingMatches.map(m => {
              const tA = teams.find(t => t.id === m.a);
              const tB = teams.find(t => t.id === m.b);
              const assignedRef = referees.find(r => r.id === m.ref);

              const canEditThisSheet =
                isAdmin || (isReferee && m.ref === activeRef);

              return (
                <div
                  key={m.id}
                  className="bg-white dark:bg-[#16262f] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                >
                  <div>
                    <div className="font-bold text-sm text-[#142433] dark:text-[#e8f1ee]">
                      {tA?.name} vs {tB?.name}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {m.date || 'Sin fecha'} · {m.time || 'Sin hora'} · Árbitro:{' '}
                      <b>{assignedRef?.name || 'Sin asignar'}</b>
                    </div>
                  </div>

                  <div>
                    {canEditThisSheet ? (
                      <button
                        onClick={() => startMatchSheet(m)}
                        className="bg-[#0e8a5f] hover:bg-[#0b7a43] text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-sm transition-all"
                      >
                        Llenar Acta Digital
                      </button>
                    ) : (
                      <span className="text-xs text-slate-400 italic">
                        Solo árbitro designado o administrador
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="bg-white dark:bg-[#16262f] p-8 rounded-2xl border border-slate-200 dark:border-slate-800 text-center text-slate-400 text-sm">
              No hay partidos pendientes de acta oficial para el filtro seleccionado.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
