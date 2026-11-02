import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Tournament, TournamentFormat, Modality, Category, Match } from '../types';
import {
  CRITERIA_CRIT,
  CRITERIA_NAMES,
  FORMAT_NAMES,
  MIN_TEAMS_FOR_FORMAT,
  MODALITY_NAMES,
} from '../constants';
import {
  generateRoundRobin,
  projectTournamentPoints,
  rankGroup,
  shuffleArray,
  GROUP_LETTERS,
} from '../utils/tournament';
import { Trophy, Plus, ArrowLeft, Check, AlertCircle, Award, Calendar, Trash2 } from 'lucide-react';

export const TournamentsView: React.FC = () => {
  const {
    torneos,
    teams,
    matches,
    propuestas,
    addTournament,
    updateTournament,
    deleteTournament,
    addMatch,
    updateMatch,
    addProposal,
    updateProposal,
  } = useData();

  const { isRealAdmin, activeRole, activeTeam } = useAuth();
  const isAdmin = isRealAdmin || activeRole === 'admin';
  const isCaptain = activeRole === 'capitan';

  // Active view: list, creator or tournament detail
  const [activeTournamentId, setActiveTournamentId] = useState<string | null>(null);
  const [showCreator, setShowCreator] = useState(false);

  // Tournament creator form state
  const [tName, setTName] = useState('');
  const [tMod, setTMod] = useState<Modality>('F7');
  const [tCat, setTCat] = useState<Category>('Masculino');
  const [tFormat, setTFormat] = useState<TournamentFormat>('liga');
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [isIda, setIsIda] = useState(false);
  const [isIdaKO, setIsIdaKO] = useState(false);
  const [groupCount, setGroupCount] = useState<number>(2);
  const [qualifiersPerGroup, setQualifiersPerGroup] = useState<number>(2);
  const [championsMatchesPerTeam, setChampionsMatchesPerTeam] = useState<number>(4);
  const [championsQualifiers, setChampionsQualifiers] = useState<number>(8);
  const [tiebreakerKey, setTiebreakerKey] = useState('uefa');
  const [groupAssignmentMode, setGroupAssignmentMode] = useState<'azar' | 'manual'>('azar');
  const [fixtureScheduleMode, setFixtureScheduleMode] = useState<'azar' | 'manual'>('azar');
  const [manualGroupAssignments, setManualGroupAssignments] = useState<Record<string, string>>({});
  const [manualKnockoutOrder, setManualKnockoutOrder] = useState<string[]>([]);

  // Manual fixture adder inside tournament
  const [manualMatchTeamA, setManualMatchTeamA] = useState('');
  const [manualMatchTeamB, setManualMatchTeamB] = useState('');
  const [manualMatchGroup, setManualMatchGroup] = useState('A');
  const [manualMatchJornada, setManualMatchJornada] = useState<number>(1);

  const eligibleTeams = teams.filter(t => t.mod === tMod && (t.cat || 'Masculino') === tCat);

  const toggleTeamSelection = (teamId: string) => {
    if (selectedTeams.includes(teamId)) {
      setSelectedTeams(selectedTeams.filter(id => id !== teamId));
    } else {
      setSelectedTeams([...selectedTeams, teamId]);
    }
  };

  const currentProjection =
    selectedTeams.length >= (MIN_TEAMS_FOR_FORMAT[tFormat] || 2)
      ? projectTournamentPoints({
          teams: selectedTeams,
          fmt: tFormat,
          ida: isIda,
          idaKO: isIdaKO,
          G: groupCount,
          qual: qualifiersPerGroup,
          k: championsMatchesPerTeam,
          Q: championsQualifiers,
        })
      : null;

  const handleCreateTournament = async (e: React.FormEvent) => {
    e.preventDefault();
    const nameClean = tName.trim();
    if (!nameClean) {
      alert('Indica el nombre de la competición.');
      return;
    }
    const N = selectedTeams.length;
    const minRequired = MIN_TEAMS_FOR_FORMAT[tFormat] || 2;
    if (N < minRequired) {
      alert(`Este formato requiere al menos ${minRequired} equipos participantes.`);
      return;
    }

    const isGroupFormat = tFormat === 'gl' || tFormat === 'gc';
    let gruposData: Record<string, string[]> | undefined;

    if (isGroupFormat) {
      if (groupCount < 2 || N < groupCount * 2) {
        alert('Cada grupo debe tener un mínimo de 2 equipos.');
        return;
      }
      gruposData = {};
      for (let i = 0; i < groupCount; i++) gruposData[GROUP_LETTERS[i]] = [];

      if (groupAssignmentMode === 'manual') {
        selectedTeams.forEach(tId => {
          const gLetter = manualGroupAssignments[tId];
          if (gLetter && gruposData![gLetter]) gruposData![gLetter].push(tId);
        });
        if (Object.values(gruposData).some(g => g.length < 2)) {
          alert('Todos los grupos manuales deben tener al menos 2 equipos asignados.');
          return;
        }
      } else {
        shuffleArray(selectedTeams).forEach((tId, idx) => {
          gruposData![GROUP_LETTERS[idx % groupCount]].push(tId);
        });
      }
    }

    // Captain proposal flow
    if (isCaptain && !isAdmin) {
      if (!selectedTeams.includes(activeTeam)) {
        alert('Tu propio equipo debe estar incluido entre los participantes.');
        return;
      }

      const proposalResponses: Record<string, boolean | null> = {};
      selectedTeams.forEach(tId => {
        proposalResponses[tId] = tId === activeTeam ? true : null;
      });

      try {
        await addProposal({
          cfg: {
            name: nameClean,
            mod: tMod,
            cat: tCat,
            fmt: tFormat,
            teams: selectedTeams,
            ida: isIda,
            idaKO: isIdaKO,
            crit: tiebreakerKey,
            emode: fixtureScheduleMode,
            gmode: groupAssignmentMode,
            G: groupCount,
            qual: qualifiersPerGroup,
            k: championsMatchesPerTeam,
            Q: championsQualifiers,
          },
          by: activeTeam,
          resp: proposalResponses,
          st: 'abierta',
        });
        setShowCreator(false);
        alert('Invitaciones enviadas a los capitanes de los clubes seleccionados.');
      } catch (err: any) {
        alert('Error al enviar propuesta: ' + err.message);
      }
      return;
    }

    // Official Direct Creation (Admin)
    const pts = currentProjection || { champ: 10, part: 2 };

    const initialFase = isGroupFormat ? 'grupos' : tFormat === 'copa' ? 'ko' : 'liga';

    try {
      const tournamentId = await addTournament({
        name: nameClean,
        mod: tMod,
        cat: tCat,
        fmt: tFormat,
        teams: selectedTeams,
        ida: isIda,
        idaKO: isIdaKO,
        crit: tiebreakerKey,
        emode: fixtureScheduleMode,
        gmode: groupAssignmentMode,
        G: groupCount,
        qual: qualifiersPerGroup,
        k: championsMatchesPerTeam,
        Q: championsQualifiers,
        estado: 'en curso',
        pts: { champ: pts.champ, part: pts.part },
        fase: initialFase,
        ronda: tFormat === 'copa' ? 1 : 0,
        byes: {},
        clasif: [],
        grupos: gruposData || {},
      });

      // Generate initial fixtures if automated
      if (fixtureScheduleMode === 'azar') {
        if (tFormat === 'liga') {
          const rounds = generateRoundRobin(shuffleArray(selectedTeams), isIda ? 2 : 1);
          for (let rIdx = 0; rIdx < rounds.length; rIdx++) {
            for (const [a, b] of rounds[rIdx]) {
              await addMatch({
                torneo: tournamentId,
                fase: 'liga',
                grupo: '',
                ronda: 0,
                leg: 0,
                jornada: rIdx + 1,
                mod: tMod,
                a,
                b,
                date: '',
                time: '',
                played: false,
              });
            }
          }
        } else if (tFormat === 'ch') {
          const rounds = generateRoundRobin(shuffleArray(selectedTeams), 1).slice(
            0,
            championsMatchesPerTeam
          );
          for (let rIdx = 0; rIdx < rounds.length; rIdx++) {
            for (const [a, b] of rounds[rIdx]) {
              await addMatch({
                torneo: tournamentId,
                fase: 'liga',
                grupo: '',
                ronda: 0,
                leg: 0,
                jornada: rIdx + 1,
                mod: tMod,
                a,
                b,
                date: '',
                time: '',
                played: false,
              });
            }
          }
        } else if (isGroupFormat && gruposData) {
          for (const [gLetter, gTeams] of Object.entries(gruposData)) {
            const rounds = generateRoundRobin(shuffleArray(gTeams), isIda ? 2 : 1);
            for (let rIdx = 0; rIdx < rounds.length; rIdx++) {
              for (const [a, b] of rounds[rIdx]) {
                await addMatch({
                  torneo: tournamentId,
                  fase: 'grupos',
                  grupo: gLetter,
                  ronda: 0,
                  leg: 0,
                  jornada: rIdx + 1,
                  mod: tMod,
                  a,
                  b,
                  date: '',
                  time: '',
                  played: false,
                });
              }
            }
          }
        } else if (tFormat === 'copa') {
          // Knockout initial round
          const ordered = shuffleArray(selectedTeams);
          const P = 2 ** Math.ceil(Math.log2(ordered.length));
          const byeCount = P - ordered.length;
          const byes = ordered.slice(0, byeCount);
          const playing = ordered.slice(byeCount);

          const isLegTwo = isIdaKO && !(playing.length === 2 && byes.length === 0);

          for (let i = 0; i < playing.length / 2; i++) {
            const a = playing[2 * i];
            const b = playing[2 * i + 1];
            await addMatch({
              torneo: tournamentId,
              fase: 'ko',
              ronda: 1,
              leg: isLegTwo ? 1 : 0,
              mod: tMod,
              a,
              b,
              date: '',
              time: '',
              played: false,
            });
            if (isLegTwo) {
              await addMatch({
                torneo: tournamentId,
                fase: 'ko',
                ronda: 1,
                leg: 2,
                mod: tMod,
                a: b,
                b: a,
                date: '',
                time: '',
                played: false,
              });
            }
          }
          await updateTournament(tournamentId, { byes: { 1: byes } });
        }
      }

      setShowCreator(false);
      setActiveTournamentId(tournamentId);
      alert('¡Torneo creado exitosamente!');
    } catch (err: any) {
      alert('Error al crear torneo: ' + err.message);
    }
  };

  // Tournament detailed view logic
  const activeTournament = torneos.find(t => t.id === activeTournamentId);

  const handleManualAddMatch = async () => {
    if (!activeTournament || !manualMatchTeamA || !manualMatchTeamB) return;
    if (manualMatchTeamA === manualMatchTeamB) {
      alert('Selecciona dos equipos diferentes.');
      return;
    }

    try {
      await addMatch({
        torneo: activeTournament.id,
        fase: activeTournament.fase,
        grupo: activeTournament.fase === 'grupos' ? manualMatchGroup : '',
        ronda: activeTournament.ronda || 0,
        leg: 0,
        jornada: manualMatchJornada,
        mod: activeTournament.mod,
        a: manualMatchTeamA,
        b: manualMatchTeamB,
        date: '',
        time: '',
        played: false,
      });
      setManualMatchTeamA('');
      setManualMatchTeamB('');
      alert('Partido añadido a la competición.');
    } catch (err: any) {
      alert('Error al agregar partido: ' + err.message);
    }
  };

  const handleAdvanceTournament = async (t: Tournament) => {
    const tournamentMatches = matches.filter(m => m.torneo === t.id);
    const curPhaseMatches = tournamentMatches.filter(
      m => m.fase === t.fase && (t.fase !== 'ko' || m.ronda === t.ronda)
    );

    if (curPhaseMatches.length === 0) {
      alert('Aún no hay partidos registrados en esta fase.');
      return;
    }

    if (curPhaseMatches.some(m => !m.played)) {
      alert('Faltan partidos por jugar y registrar actas en la fase actual antes de poder avanzar.');
      return;
    }

    // Finalization of League
    if (t.fase === 'liga' && t.fmt === 'liga') {
      const standings = rankGroup(t.teams, curPhaseMatches, t.crit);
      const championId = standings[0].t;
      const premios: Record<string, number> = {};

      standings.forEach((x, idx) => {
        const factor =
          idx === 0
            ? 1
            : Math.max(0.1, 0.6 * ((standings.length - 1 - idx) / Math.max(1, standings.length - 2)));
        premios[x.t] = Math.round(t.pts.champ * factor);
      });

      await updateTournament(t.id, {
        estado: 'finalizado',
        campeon: championId,
        premios,
      });
      alert(`¡Torneo finalizado! Campeón oficial: ${teams.find(x => x.id === championId)?.name}. Los puntos ya se computan al Ranking general.`);
      return;
    }

    // Advance groups
    if (t.fase === 'grupos') {
      const qTeamsByGroup = Object.entries(t.grupos || {}).map(([gLetter, gTeams]) => {
        const gMatches = curPhaseMatches.filter(m => m.grupo === gLetter);
        return rankGroup(gTeams, gMatches, t.crit)
          .slice(0, t.qual || 2)
          .map(x => x.t);
      });

      const qualified: string[] = [];
      for (let p = 0; p < (t.qual || 2); p++) {
        qTeamsByGroup.forEach(gList => {
          if (gList[p]) qualified.push(gList[p]);
        });
      }

      if (t.fmt === 'gl') {
        // Liguilla phase
        const rounds = generateRoundRobin(qualified, t.ida ? 2 : 1);
        for (let rIdx = 0; rIdx < rounds.length; rIdx++) {
          for (const [a, b] of rounds[rIdx]) {
            await addMatch({
              torneo: t.id,
              fase: 'liguilla',
              grupo: '',
              ronda: 0,
              leg: 0,
              jornada: rIdx + 1,
              mod: t.mod,
              a,
              b,
              date: '',
              time: '',
              played: false,
            });
          }
        }
        await updateTournament(t.id, { fase: 'liguilla', clasif: qualified });
        alert('Fase de grupos concluida. Clasificados avanzan a la Liguilla.');
        return;
      } else {
        // Knockout phase from groups
        const isLegTwo = t.idaKO;
        for (let i = 0; i < qualified.length / 2; i++) {
          const a = qualified[2 * i];
          const b = qualified[2 * i + 1];
          await addMatch({
            torneo: t.id,
            fase: 'ko',
            ronda: 1,
            leg: isLegTwo ? 1 : 0,
            mod: t.mod,
            a,
            b,
            date: '',
            time: '',
            played: false,
          });
          if (isLegTwo) {
            await addMatch({
              torneo: t.id,
              fase: 'ko',
              ronda: 1,
              leg: 2,
              mod: t.mod,
              a: b,
              b: a,
              date: '',
              time: '',
              played: false,
            });
          }
        }
        await updateTournament(t.id, { fase: 'ko', ronda: 1 });
        alert('Fase de grupos concluida. Clasificados avanzan al cuadro de Eliminatorias.');
        return;
      }
    }

    // Knockout round progression
    if (t.fase === 'ko') {
      const ties: Record<string, Match[]> = {};
      curPhaseMatches.forEach(m => {
        const key = [m.a, m.b].sort().join('|');
        ties[key] = ties[key] || [];
        ties[key].push(m);
      });

      const winners: string[] = [];
      for (const [key, mList] of Object.entries(ties)) {
        const [xA, xB] = key.split('|');
        let gA = 0;
        let gB = 0;
        let pkWinner: string | null = null;

        mList.forEach(m => {
          const isA = m.a === xA;
          gA += isA ? (m.ga ?? 0) : (m.gb ?? 0);
          gB += isA ? (m.gb ?? 0) : (m.ga ?? 0);
          if (m.pk) {
            pkWinner = (isA ? m.pk.a > m.pk.b : m.pk.b > m.pk.a) ? xA : xB;
          }
        });

        if (gA > gB) winners.push(xA);
        else if (gB > gA) winners.push(xB);
        else if (pkWinner) winners.push(pkWinner);
        else {
          alert(`Empate global no resuelto entre ${teams.find(t => t.id === xA)?.name} y ${teams.find(t => t.id === xB)?.name}. Registra los penales en el acta.`);
          return;
        }
      }

      const byesThisRound = (t.byes || {})[t.ronda] || [];
      const pool = [...winners, ...byesThisRound];

      if (pool.length === 1) {
        // Tournament Finished!
        const champ = pool[0];
        const premios: Record<string, number> = {};
        t.teams.forEach(x => { premios[x] = t.pts.part; });

        const lastRoundPlayed: Record<string, number> = {};
        tournamentMatches.filter(m => m.fase === 'ko').forEach(m => {
          [m.a, m.b].forEach(x => {
            lastRoundPlayed[x] = Math.max(lastRoundPlayed[x] || 0, m.ronda || 1);
          });
        });

        Object.entries(lastRoundPlayed).forEach(([x, r]) => {
          const diff = t.ronda - r;
          const factor = diff === 0 ? 0.6 : diff === 1 ? 0.4 : diff === 2 ? 0.25 : 0.15;
          premios[x] = Math.max(premios[x] || 0, Math.round(t.pts.champ * factor));
        });
        premios[champ] = t.pts.champ;

        await updateTournament(t.id, {
          estado: 'finalizado',
          campeon: champ,
          premios,
        });
        alert(`¡Copa finalizada! Campeón: ${teams.find(x => x.id === champ)?.name}. Puntos adjudicados al ranking.`);
        return;
      }

      // Next round matches
      const nextRoundNum = t.ronda + 1;
      const isFinal = pool.length === 2;
      const isLegTwo = t.idaKO && !isFinal;

      for (let i = 0; i < pool.length / 2; i++) {
        const a = pool[2 * i];
        const b = pool[2 * i + 1];
        await addMatch({
          torneo: t.id,
          fase: 'ko',
          ronda: nextRoundNum,
          leg: isLegTwo ? 1 : 0,
          mod: t.mod,
          a,
          b,
          date: '',
          time: '',
          played: false,
        });
        if (isLegTwo) {
          await addMatch({
            torneo: t.id,
            fase: 'ko',
            ronda: nextRoundNum,
            leg: 2,
            mod: t.mod,
            a: b,
            b: a,
            date: '',
            time: '',
            played: false,
          });
        }
      }

      await updateTournament(t.id, { ronda: nextRoundNum });
      alert(`Ronda ${t.ronda} cerrada con éxito. Partidos de la Ronda ${nextRoundNum} generados.`);
    }
  };

  // Detailed Tournament View
  if (activeTournament) {
    const tournamentMatches = matches.filter(m => m.torneo === activeTournament.id);
    const isFinished = activeTournament.estado === 'finalizado';
    const champTeam = teams.find(t => t.id === activeTournament.campeon);

    return (
      <div className="bg-white dark:bg-[#16262f] p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6 animate-in fade-in">
        <button
          onClick={() => setActiveTournamentId(null)}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
        >
          <ArrowLeft size={15} />
          <span>Volver al listado de torneos</span>
        </button>

        {/* Tournament Banner */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <h2 className="text-xl font-bold text-[#142433] dark:text-[#e8f1ee]">
              {activeTournament.name}
            </h2>
            <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-500">
              <span className="font-semibold bg-[#0e8a5f]/15 text-[#0e8a5f] px-2 py-0.5 rounded">
                {FORMAT_NAMES[activeTournament.fmt]}
              </span>
              <span>·</span>
              <span>{MODALITY_NAMES[activeTournament.mod]}</span>
              <span>·</span>
              <span>{activeTournament.cat}</span>
              <span>·</span>
              <span
                className={`font-bold px-2 py-0.5 rounded ${
                  isFinished
                    ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
                    : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                }`}
              >
                {isFinished ? '🏆 Finalizado' : `En curso · Fase ${activeTournament.fase}`}
              </span>
            </div>
          </div>

          {isAdmin && (
            <button
              onClick={async () => {
                if (confirm('¿Eliminar este torneo y sus partidos asociados?')) {
                  await deleteTournament(activeTournament.id);
                  setActiveTournamentId(null);
                }
              }}
              className="text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700"
            >
              <Trash2 size={13} className="inline mr-1" />
              Eliminar Torneo
            </button>
          )}
        </div>

        {/* Champion banner if finished */}
        {isFinished && champTeam && (
          <div className="bg-amber-500/15 p-4 rounded-xl border border-amber-500/40 flex items-center gap-3">
            <Trophy size={32} className="text-amber-500 shrink-0" />
            <div>
              <div className="font-bold text-amber-800 dark:text-amber-300 text-sm">
                Campeón Oficial: {champTeam.name}
              </div>
              <div className="text-xs text-amber-700/80 dark:text-amber-400 mt-0.5">
                Puntos adjudicados al ranking: {activeTournament.pts.champ} pts al campeón.
              </div>
            </div>
          </div>
        )}

        {/* Groups table view */}
        {activeTournament.fase === 'grupos' && activeTournament.grupos && (
          <div className="space-y-4">
            <h3 className="font-bold text-sm text-[#142433] dark:text-[#e8f1ee]">
              Tablas de Posiciones de Grupos
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(activeTournament.grupos).map(([gLetter, gTeams]) => {
                const gMatches = tournamentMatches.filter(
                  m => m.fase === 'grupos' && m.grupo === gLetter
                );
                const gStandings = rankGroup(gTeams, gMatches, activeTournament.crit);

                return (
                  <div
                    key={gLetter}
                    className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700"
                  >
                    <div className="font-bold text-xs text-[#0e8a5f] uppercase tracking-wider mb-2">
                      Grupo {gLetter}
                    </div>
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-400 text-[10px]">
                          <th className="py-1">Equipo</th>
                          <th className="py-1 text-center">PJ</th>
                          <th className="py-1 text-center">G</th>
                          <th className="py-1 text-center">DG</th>
                          <th className="py-1 text-right">Pts</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {gStandings.map((st, sIdx) => {
                          const isQualifying = sIdx < (activeTournament.qual || 2);
                          return (
                            <tr
                              key={st.t}
                              className={isQualifying ? 'font-semibold text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'}
                            >
                              <td className="py-1.5 truncate max-w-[120px]">
                                {isQualifying && <span className="text-[#0e8a5f] mr-1">✓</span>}
                                {teams.find(t => t.id === st.t)?.name}
                              </td>
                              <td className="py-1.5 text-center">{st.pj}</td>
                              <td className="py-1.5 text-center">{st.w}</td>
                              <td className="py-1.5 text-center">{st.dg}</td>
                              <td className="py-1.5 text-right font-bold text-[#0e8a5f]">
                                {st.pts}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* League table view */}
        {activeTournament.fase === 'liga' && (
          <div className="space-y-3">
            <h3 className="font-bold text-sm text-[#142433] dark:text-[#e8f1ee]">
              Clasificación de la Liga
            </h3>
            <div className="overflow-x-auto bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 p-2">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-400 text-[10px]">
                    <th className="py-1">Pos</th>
                    <th className="py-1">Equipo</th>
                    <th className="py-1 text-center">PJ</th>
                    <th className="py-1 text-center">G</th>
                    <th className="py-1 text-center">E</th>
                    <th className="py-1 text-center">P</th>
                    <th className="py-1 text-center">GF</th>
                    <th className="py-1 text-center">GC</th>
                    <th className="py-1 text-center">DG</th>
                    <th className="py-1 text-right">Pts</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {rankGroup(activeTournament.teams, tournamentMatches, activeTournament.crit).map(
                    (st, sIdx) => (
                      <tr key={st.t}>
                        <td className="py-1.5 font-bold text-slate-400">{sIdx + 1}</td>
                        <td className="py-1.5 font-semibold text-slate-900 dark:text-white">
                          {teams.find(t => t.id === st.t)?.name}
                        </td>
                        <td className="py-1.5 text-center">{st.pj}</td>
                        <td className="py-1.5 text-center">{st.w}</td>
                        <td className="py-1.5 text-center">{st.e}</td>
                        <td className="py-1.5 text-center">{st.l}</td>
                        <td className="py-1.5 text-center">{st.gf}</td>
                        <td className="py-1.5 text-center">{st.gc}</td>
                        <td className="py-1.5 text-center">{st.dg}</td>
                        <td className="py-1.5 text-right font-bold text-[#0e8a5f]">{st.pts}</td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Advance Phase Button (Admin only) */}
        {isAdmin && !isFinished && (
          <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <span className="text-xs text-slate-600 dark:text-slate-400">
              Cuando todos los partidos de la fase tengan resultado, haz clic para avanzar:
            </span>
            <button
              onClick={() => handleAdvanceTournament(activeTournament)}
              className="bg-[#0e8a5f] hover:bg-[#0b7a43] text-white px-4 py-2 rounded-xl text-xs font-bold shadow-sm transition-all"
            >
              {activeTournament.fase === 'ko'
                ? 'Cerrar Ronda de Eliminatoria'
                : activeTournament.fase === 'grupos'
                ? 'Cerrar Grupos y Clasificar'
                : 'Finalizar Torneo y Asignar Puntos'}
            </button>
          </div>
        )}

        {/* Fixtures of tournament */}
        <div className="space-y-3">
          <h3 className="font-bold text-sm text-[#142433] dark:text-[#e8f1ee]">
            Calendario de Partidos de la Competición ({tournamentMatches.length})
          </h3>

          <div className="space-y-2">
            {tournamentMatches.map(m => {
              const tA = teams.find(t => t.id === m.a);
              const tB = teams.find(t => t.id === m.b);

              return (
                <div
                  key={m.id}
                  className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {tA?.name} vs {tB?.name}
                    </span>
                    <span className="text-slate-400 ml-2">
                      {m.fase} {m.grupo ? `(Grupo ${m.grupo})` : ''} {m.jornada ? `Jornada ${m.jornada}` : ''}
                    </span>
                  </div>

                  <div>
                    {m.played ? (
                      <span className="font-extrabold text-[#0e8a5f] bg-[#0e8a5f]/10 px-2 py-1 rounded">
                        {m.ga} - {m.gb}
                      </span>
                    ) : (
                      <span className="text-slate-400 italic">Por disputar</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // General Tournaments Browser
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white dark:bg-[#16262f] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-[#142433] dark:text-[#e8f1ee] flex items-center gap-2">
            <Trophy className="text-amber-500" size={22} />
            <span>Torneos y Copas Oficiales</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Competiciones en formato Liga, Copa eliminatoria, Grupos y Estilo Champions
          </p>
        </div>

        {(isAdmin || (isCaptain && activeTeam)) && (
          <button
            onClick={() => setShowCreator(!showCreator)}
            className="flex items-center gap-1.5 bg-[#0e8a5f] hover:bg-[#0b7a43] text-white px-3.5 py-2 rounded-xl text-xs font-semibold shadow-sm transition-all"
          >
            <Plus size={16} />
            <span>{showCreator ? 'Cancelar' : isAdmin ? 'Crear Torneo' : 'Proponer Torneo'}</span>
          </button>
        )}
      </div>

      {/* Creator Form */}
      {showCreator && (
        <form
          onSubmit={handleCreateTournament}
          className="bg-white dark:bg-[#16262f] p-5 rounded-2xl border-2 border-[#0e8a5f]/40 shadow-md space-y-5 animate-in fade-in"
        >
          <div className="font-bold text-sm text-[#142433] dark:text-[#e8f1ee] pb-2 border-b border-slate-100 dark:border-slate-800">
            {isAdmin ? 'Configurador Oficial de Competición' : 'Propuesta de Torneo (Invitación a Clubes)'}
          </div>

          {/* Step 1: Info */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Nombre de la Competición
              </label>
              <input
                type="text"
                required
                placeholder="Ej. Copa Apertura KAPE"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 outline-none"
                value={tName}
                onChange={e => setTName(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Modalidad
              </label>
              <select
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 outline-none"
                value={tMod}
                onChange={e => {
                  setTMod(e.target.value as Modality);
                  setSelectedTeams([]);
                }}
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
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 outline-none"
                value={tCat}
                onChange={e => {
                  setTCat(e.target.value as Category);
                  setSelectedTeams([]);
                }}
              >
                <option value="Masculino">Masculino</option>
                <option value="Femenino">Femenino</option>
                <option value="Mixto">Mixto</option>
              </select>
            </div>
          </div>

          {/* Step 2: Format */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
              Formato de Competición
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {(['liga', 'copa', 'gl', 'gc', 'ch'] as TournamentFormat[]).map(fmt => (
                <button
                  key={fmt}
                  type="button"
                  onClick={() => setTFormat(fmt)}
                  className={`p-2 rounded-xl text-xs font-bold border transition-all text-center ${
                    tFormat === fmt
                      ? 'bg-[#0e8a5f] text-white border-[#0e8a5f] shadow-sm'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                  }`}
                >
                  {FORMAT_NAMES[fmt]}
                </button>
              ))}
            </div>
          </div>

          {/* Step 3: Participating teams */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                Equipos Participantes ({selectedTeams.length})
              </label>
              <button
                type="button"
                onClick={() =>
                  setSelectedTeams(
                    selectedTeams.length === eligibleTeams.length
                      ? []
                      : eligibleTeams.map(t => t.id)
                  )
                }
                className="text-xs text-[#0e8a5f] font-semibold hover:underline"
              >
                {selectedTeams.length === eligibleTeams.length
                  ? 'Desmarcar todos'
                  : 'Seleccionar todos'}
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {eligibleTeams.map(t => {
                const isSelected = selectedTeams.includes(t.id);
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => toggleTeamSelection(t.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                      isSelected
                        ? 'bg-[#0e8a5f] text-white border-[#0e8a5f]'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                    }`}
                  >
                    {isSelected && '✓ '} {t.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 4: Format details */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
            {(tFormat === 'liga' || tFormat === 'gl' || tFormat === 'gc') && (
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isIda}
                  onChange={e => setIsIda(e.target.checked)}
                />
                <span>Ida y vuelta en fase de todos contra todos</span>
              </label>
            )}

            {(tFormat === 'copa' || tFormat === 'gc' || tFormat === 'ch') && (
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isIdaKO}
                  onChange={e => setIsIdaKO(e.target.checked)}
                />
                <span>Eliminatorias a ida y vuelta (final única)</span>
              </label>
            )}

            {(tFormat === 'gl' || tFormat === 'gc') && (
              <>
                <div>
                  <span className="block text-slate-500 mb-1">Número de Grupos:</span>
                  <input
                    type="number"
                    min="2"
                    max="8"
                    className="w-16 bg-white dark:bg-slate-900 border rounded p-1 text-center font-bold"
                    value={groupCount}
                    onChange={e => setGroupCount(Number(e.target.value))}
                  />
                </div>
                <div>
                  <span className="block text-slate-500 mb-1">Clasifican por grupo:</span>
                  <input
                    type="number"
                    min="1"
                    max="4"
                    className="w-16 bg-white dark:bg-slate-900 border rounded p-1 text-center font-bold"
                    value={qualifiersPerGroup}
                    onChange={e => setQualifiersPerGroup(Number(e.target.value))}
                  />
                </div>
              </>
            )}
          </div>

          {/* Step 5: Tie-break rules */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Criterio Oficial de Desempate
            </label>
            <select
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 outline-none"
              value={tiebreakerKey}
              onChange={e => setTiebreakerKey(e.target.value)}
            >
              {Object.entries(CRITERIA_CRIT).map(([key, item]) => (
                <option key={key} value={key}>
                  {item.n}
                </option>
              ))}
            </select>
          </div>

          {/* Points preview */}
          {currentProjection && (
            <div className="bg-amber-500/10 p-3 rounded-xl border border-amber-500/30 text-xs text-amber-800 dark:text-amber-300 flex items-center justify-between">
              <span>
                Puntos para el Ranking: <b>Campeón {currentProjection.champ} pts</b> · Subcampeón{' '}
                <b>{currentProjection.sub} pts</b> · Por participar <b>{currentProjection.part} pts</b>
              </span>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowCreator(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="bg-[#0e8a5f] hover:bg-[#0b7a43] text-white px-6 py-2 text-xs font-bold rounded-xl shadow-sm"
            >
              {isAdmin ? 'Crear Torneo Oficial' : 'Enviar Propuesta'}
            </button>
          </div>
        </form>
      )}

      {/* Active tournaments list */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {torneos.map(t => (
          <div
            key={t.id}
            className="bg-white dark:bg-[#16262f] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between gap-3"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-base text-[#142433] dark:text-[#e8f1ee]">
                  {t.name}
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    t.estado === 'finalizado'
                      ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30'
                      : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                  }`}
                >
                  {t.estado === 'finalizado' ? 'Finalizado' : 'En Curso'}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 mt-2 text-xs text-slate-500">
                <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                  {FORMAT_NAMES[t.fmt]}
                </span>
                <span>·</span>
                <span>{MODALITY_NAMES[t.mod]}</span>
                <span>·</span>
                <span>{t.teams.length} equipos</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
              <span className="text-xs text-[#0e8a5f] font-bold">
                Campeón: +{t.pts?.champ || 10} pts
              </span>
              <button
                onClick={() => setActiveTournamentId(t.id)}
                className="bg-[#0e8a5f] hover:bg-[#0b7a43] text-white px-3.5 py-1.5 rounded-xl text-xs font-semibold shadow-xs"
              >
                Abrir Torneo
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
