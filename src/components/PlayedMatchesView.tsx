import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { History, ChevronDown, ChevronUp, Star, MapPin, Clock, Vote, CheckCircle2, Lock } from 'lucide-react';

export const PlayedMatchesView: React.FC = () => {
  const { matches, teams, venues, players, torneos, mvpVotes, submitMvpVote } = useData();
  const { user, userProfile, isRealAdmin, activeRole, activeRef } = useAuth();

  const isAdmin = isRealAdmin || activeRole === 'admin';
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  const [expandedMatchId, setExpandedMatchId] = useState<string | null>(null);

  // Voting draft state
  const [selectedVotePlayer, setSelectedVotePlayer] = useState<Record<string, string>>({});

  const playedMatches = matches
    .filter(m => m.played)
    .filter(m => !selectedTeam || m.a === selectedTeam || m.b === selectedTeam)
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  const getPlayerName = (id?: string) => {
    if (!id) return '—';
    return players.find(p => p.id === id)?.name || 'Jugador desconocido';
  };

  const handleCastMvpVote = async (matchId: string) => {
    const votedId = selectedVotePlayer[matchId];
    if (!votedId) {
      alert('Selecciona un jugador candidato para emitir tu voto.');
      return;
    }

    const match = matches.find(m => m.id === matchId);
    if (!match) return;

    const isRef = activeRole === 'arbitro' && activeRef === match.ref;

    try {
      await submitMvpVote(matchId, votedId, userProfile?.playerId, isRef);
      alert('¡Tu voto para MVP del partido ha sido registrado con éxito!');
    } catch (err: any) {
      alert('Error al votar: ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Filter */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white dark:bg-[#16262f] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-[#142433] dark:text-[#e8f1ee] flex items-center gap-2">
            <History className="text-[#0e8a5f]" size={22} />
            <span>Historial de Partidos Jugados</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Resultados oficiales, actas cerradas, votaciones democráticas de MVP y eventos
          </p>
        </div>

        {/* Filter by Team */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Filtrar:</span>
          <select
            className="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 outline-none w-full sm:w-auto"
            value={selectedTeam}
            onChange={e => setSelectedTeam(e.target.value)}
          >
            <option value="">Todos los equipos ({matches.filter(m => m.played).length})</option>
            {teams.map(t => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Match Results List */}
      <div className="space-y-4">
        {playedMatches.length > 0 ? (
          playedMatches.map(m => {
            const teamA = teams.find(t => t.id === m.a);
            const teamB = teams.find(t => t.id === m.b);
            const venue = venues.find(v => v.id === m.venue);
            const tournament = torneos.find(t => t.id === m.torneo);
            const isExpanded = expandedMatchId === m.id;

            const participants = m.part || [];
            const mvpPlayer = players.find(p => p.id === m.mvp);
            const democraticMvpPlayer = players.find(p => p.id === m.democraticMvp);

            // Compute all candidate players who actually participated
            const subPlayerIds = (m.subs || []).flatMap(s => [s.in, s.out]).filter(Boolean);
            const candidatePlayerIds = Array.from(
              new Set([
                ...participants.map(x => x.p),
                ...subPlayerIds,
              ])
            );

            // 24-hour voting window calculation
            const MVP_VOTING_WINDOW_MS = 24 * 60 * 60 * 1000;
            const recordedTime = m.resultRecordedAt || m.updatedAt || m.createdAt || 0;
            const timeSinceResult = recordedTime ? Date.now() - recordedTime : MVP_VOTING_WINDOW_MS + 1;
            const isVotingOpen = recordedTime > 0 && timeSinceResult < MVP_VOTING_WINDOW_MS;
            const remainingMs = Math.max(0, MVP_VOTING_WINDOW_MS - timeSinceResult);
            const remainingHours = Math.floor(remainingMs / (1000 * 60 * 60));
            const remainingMins = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));

            // Check if current user is an eligible voter
            const isMatchRef = (activeRole === 'arbitro' && activeRef === m.ref) || (userProfile?.ref === m.ref);
            const userPlayerId = userProfile?.playerId;
            const isParticipatingPlayer = !!(userPlayerId && candidatePlayerIds.includes(userPlayerId));
            const canVote = user && (isAdmin || isMatchRef || isParticipatingPlayer);

            // Check if user already voted
            const userVote = mvpVotes.find(v => v.matchId === m.id && v.voterUserId === user?.uid);
            const matchVotes = mvpVotes.filter(v => v.matchId === m.id);

            return (
              <div
                key={m.id}
                className="bg-white dark:bg-[#16262f] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-all"
              >
                {/* Meta header */}
                <div className="bg-slate-50/80 dark:bg-slate-800/40 px-4 py-2 border-b border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-[#0e8a5f] dark:text-[#6fe3ae]">
                      {tournament ? tournament.name : 'Partido Amistoso'}
                    </span>
                    <span>·</span>
                    <span className="flex items-center gap-1">
                      <Clock size={12} /> {m.date} {m.time}
                    </span>
                    {venue && (
                      <>
                        <span>·</span>
                        <span className="flex items-center gap-1">
                          <MapPin size={12} /> {venue.name}
                        </span>
                      </>
                    )}
                  </div>

                  <div className="font-medium">
                    {m.sede === 'a'
                      ? `Local: ${teamA?.name || 'A'}`
                      : m.sede === 'b'
                      ? `Local: ${teamB?.name || 'B'}`
                      : 'Sede neutral'}
                  </div>
                </div>

                {/* Scoreboard */}
                <div className="p-4 sm:p-5 flex items-center justify-between gap-4">
                  <div className="flex-1 text-right flex items-center justify-end gap-2.5">
                    <span className="text-base sm:text-lg font-bold text-[#142433] dark:text-[#e8f1ee] truncate">
                      {teamA?.name || 'Equipo A'}
                    </span>
                    {teamA?.foto ? (
                      <img
                        src={teamA.foto}
                        alt={teamA.name}
                        className="w-8 h-8 rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-[#0e8a5f] text-white font-extrabold text-xs flex items-center justify-center shrink-0">
                        {teamA?.name[0]?.toUpperCase() || 'A'}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-center justify-center px-4 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 min-w-[100px]">
                    <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0e8a5f] dark:text-[#6fe3ae]">
                      {m.ga ?? 0} - {m.gb ?? 0}
                    </div>
                    {m.pk && (
                      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-700 px-2 py-0.5 rounded-full mt-0.5 shadow-xs">
                        Penales {m.pk.a} - {m.pk.b}
                      </span>
                    )}
                  </div>

                  <div className="flex-1 text-left flex items-center justify-start gap-2.5">
                    {teamB?.foto ? (
                      <img
                        src={teamB.foto}
                        alt={teamB.name}
                        className="w-8 h-8 rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-[#0e8a5f] text-white font-extrabold text-xs flex items-center justify-center shrink-0">
                        {teamB?.name[0]?.toUpperCase() || 'B'}
                      </div>
                    )}
                    <span className="text-base sm:text-lg font-bold text-[#142433] dark:text-[#e8f1ee] truncate">
                      {teamB?.name || 'Equipo B'}
                    </span>
                  </div>
                </div>

                {/* Badges bar */}
                <div className="px-4 pb-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800/60 pt-2 text-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    {democraticMvpPlayer && (
                      <span className="inline-flex items-center gap-1 bg-[#0e8a5f]/15 text-[#0e8a5f] dark:text-[#6fe3ae] border border-[#0e8a5f]/30 px-2.5 py-0.5 rounded-full text-[11px] font-bold">
                        <Vote size={12} className="text-[#0e8a5f]" />
                        MVP Votado: {democraticMvpPlayer.name} ({matchVotes.length} votos)
                      </span>
                    )}

                    {mvpPlayer && !democraticMvpPlayer && (
                      <span className="inline-flex items-center gap-1 bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 px-2.5 py-0.5 rounded-full text-[11px] font-bold">
                        <Star size={12} className="text-amber-500 fill-amber-500" />
                        MVP Acta: {mvpPlayer.name}
                      </span>
                    )}

                    {isVotingOpen ? (
                      <span className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30 px-2.5 py-0.5 rounded-full text-[11px] font-semibold">
                        <Clock size={11} className="text-amber-600 dark:text-amber-400" />
                        Votación MVP abierta ({remainingHours}h {remainingMins}m restantes)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 px-2.5 py-0.5 rounded-full text-[11px] font-medium">
                        <Lock size={11} />
                        Votación 24h finalizada
                      </span>
                    )}

                    {m.rate && m.rate > 0 && (
                      <span className="inline-flex items-center gap-1 bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-500/30 px-2 py-0.5 rounded-full text-[11px] font-semibold">
                        ★ {m.rate} Árbitro
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => setExpandedMatchId(isExpanded ? null : m.id)}
                    className="flex items-center gap-1 text-[#0e8a5f] dark:text-[#6fe3ae] font-semibold hover:underline"
                  >
                    <span>{isExpanded ? 'Ocultar detalles' : 'Ver detalle del partido'}</span>
                    {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                  </button>
                </div>

                {/* Democratic MVP Voting Box for Eligible Voters */}
                {canVote && (
                  <div className="bg-amber-500/5 dark:bg-amber-500/10 p-3.5 border-t border-amber-500/20 text-xs">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                      <div className="flex items-center gap-2">
                        <Vote size={16} className="text-amber-600 dark:text-amber-400 shrink-0" />
                        <div>
                          <span className="font-bold text-amber-900 dark:text-amber-200">
                            Votación Democrática de MVP del Partido:
                          </span>
                          <span className="text-slate-500 dark:text-slate-400 ml-1.5">
                            {isVotingOpen ? (
                              userVote
                                ? `Ya votaste por ${getPlayerName(userVote.votedPlayerId)} (puedes cambiarlo hasta el cierre).`
                                : `Válido para quienes disputaron el partido y árbitro. Cierra en ${remainingHours}h ${remainingMins}m.`
                            ) : (
                              `Plazo de 24 horas cerrado.${userVote ? ` Votaste por ${getPlayerName(userVote.votedPlayerId)}.` : ''}`
                            )}
                          </span>
                        </div>
                      </div>

                      {isVotingOpen && (
                        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                          <select
                            className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-2.5 py-1 text-xs text-slate-800 dark:text-slate-200 outline-none flex-1 sm:flex-none"
                            value={selectedVotePlayer[m.id] || userVote?.votedPlayerId || ''}
                            onChange={e =>
                              setSelectedVotePlayer({ ...selectedVotePlayer, [m.id]: e.target.value })
                            }
                          >
                            <option value="">Selecciona candidato...</option>
                            {candidatePlayerIds.map(pId => {
                              const pObj = players.find(p => p.id === pId);
                              const tObj = teams.find(t => t.id === pObj?.team);
                              return (
                                <option key={pId} value={pId}>
                                  {pObj?.name || 'Jugador'} ({tObj?.name || 'Equipo'})
                                </option>
                              );
                            })}
                          </select>

                          <button
                            onClick={() => handleCastMvpVote(m.id)}
                            className="bg-[#0e8a5f] hover:bg-[#0b7a43] text-white px-3 py-1 rounded-xl text-xs font-bold transition-all shadow-xs"
                          >
                            {userVote ? 'Cambiar voto' : 'Votar MVP'}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Admin breakdown of votes */}
                    {isAdmin && matchVotes.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-amber-500/20 text-[11px] text-slate-600 dark:text-slate-400">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          Escrutinio administrativo ({matchVotes.length} votos totales):
                        </span>{' '}
                        {(() => {
                          const tally: Record<string, number> = {};
                          matchVotes.forEach(v => {
                            tally[v.votedPlayerId] = (tally[v.votedPlayerId] || 0) + 1;
                          });
                          return Object.entries(tally)
                            .map(([pid, count]) => `${getPlayerName(pid)} (${count} votos)`)
                            .join(' · ');
                        })()}
                      </div>
                    )}
                  </div>
                )}

                {/* Expanded Detailed Events */}
                {isExpanded && (
                  <div className="bg-slate-50/60 dark:bg-slate-900/40 p-4 border-t border-slate-200 dark:border-slate-800 space-y-4 text-xs animate-in fade-in">
                    <div>
                      <div className="font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider text-[11px]">
                        Eventos y Rendimiento Individual
                      </div>

                      {participants.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {/* Team A Events */}
                          <div className="bg-white dark:bg-[#16262f] p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                            <div className="font-bold text-xs text-[#142433] dark:text-[#e8f1ee] border-b pb-1.5 mb-2 border-slate-100 dark:border-slate-800">
                              {teamA?.name}
                            </div>
                            <div className="space-y-1.5">
                              {participants
                                .filter(x => x.t === m.a)
                                .map(x => {
                                  const tags = [];
                                  if (x.g && x.g > 0)
                                    tags.push(
                                      `⚽ ${x.g} ${
                                        x.gp || x.gl
                                          ? `(${[
                                              x.gp ? `${x.gp} penal` : '',
                                              x.gl ? `${x.gl} tiro libre` : '',
                                            ]
                                              .filter(Boolean)
                                              .join(', ')})`
                                          : ''
                                      }`
                                    );
                                  if (x.g && x.g >= 3) tags.push('🎩 Hattrick');
                                  if (x.s && x.s > 0) tags.push(`🅰️ ${x.s} asist.`);
                                  if (x.y && x.y > 0) tags.push(`🟨 ${x.y}`);
                                  if (x.r && x.r > 0) tags.push(`🟥 ${x.r}`);
                                  if (x.og && x.og > 0) tags.push(`🥅 Autogol (${x.og})`);
                                  if (x.pa && x.pa > 0) tags.push(`🧤 Atajó penal (${x.pa})`);
                                  if (x.pf && x.pf > 0) tags.push(`❌ Falló penal (${x.pf})`);

                                  if (tags.length === 0) return null;

                                  const pObj = players.find(p => p.id === x.p);

                                  return (
                                    <div key={x.p} className="flex items-center justify-between text-xs py-0.5">
                                      <div className="flex items-center gap-1.5 truncate max-w-[150px]">
                                        {pObj?.foto ? (
                                          <img
                                            src={pObj.foto}
                                            alt={pObj.name}
                                            className="w-5 h-5 rounded-full object-cover shrink-0"
                                          />
                                        ) : (
                                          <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[9px] font-bold flex items-center justify-center shrink-0">
                                            {pObj?.dorsal ? `#${pObj.dorsal}` : pObj?.name[0]?.toUpperCase()}
                                          </span>
                                        )}
                                        <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                                          {getPlayerName(x.p)}
                                        </span>
                                      </div>
                                      <span className="text-slate-600 dark:text-slate-400 font-medium">
                                        {tags.join(' · ')}
                                      </span>
                                    </div>
                                  );
                                })}
                            </div>
                          </div>

                          {/* Team B Events */}
                          <div className="bg-white dark:bg-[#16262f] p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                            <div className="font-bold text-xs text-[#142433] dark:text-[#e8f1ee] border-b pb-1.5 mb-2 border-slate-100 dark:border-slate-800">
                              {teamB?.name}
                            </div>
                            <div className="space-y-1.5">
                              {participants
                                .filter(x => x.t === m.b)
                                .map(x => {
                                  const tags = [];
                                  if (x.g && x.g > 0)
                                    tags.push(
                                      `⚽ ${x.g} ${
                                        x.gp || x.gl
                                          ? `(${[
                                              x.gp ? `${x.gp} penal` : '',
                                              x.gl ? `${x.gl} tiro libre` : '',
                                            ]
                                              .filter(Boolean)
                                              .join(', ')})`
                                          : ''
                                      }`
                                    );
                                  if (x.g && x.g >= 3) tags.push('🎩 Hattrick');
                                  if (x.s && x.s > 0) tags.push(`🅰️ ${x.s} asist.`);
                                  if (x.y && x.y > 0) tags.push(`🟨 ${x.y}`);
                                  if (x.r && x.r > 0) tags.push(`🟥 ${x.r}`);
                                  if (x.og && x.og > 0) tags.push(`🥅 Autogol (${x.og})`);
                                  if (x.pa && x.pa > 0) tags.push(`🧤 Atajó penal (${x.pa})`);
                                  if (x.pf && x.pf > 0) tags.push(`❌ Falló penal (${x.pf})`);

                                  if (tags.length === 0) return null;

                                  const pObj = players.find(p => p.id === x.p);

                                  return (
                                    <div key={x.p} className="flex items-center justify-between text-xs py-0.5">
                                      <div className="flex items-center gap-1.5 truncate max-w-[150px]">
                                        {pObj?.foto ? (
                                          <img
                                            src={pObj.foto}
                                            alt={pObj.name}
                                            className="w-5 h-5 rounded-full object-cover shrink-0"
                                          />
                                        ) : (
                                          <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[9px] font-bold flex items-center justify-center shrink-0">
                                            {pObj?.dorsal ? `#${pObj.dorsal}` : pObj?.name[0]?.toUpperCase()}
                                          </span>
                                        )}
                                        <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                                          {getPlayerName(x.p)}
                                        </span>
                                      </div>
                                      <span className="text-slate-600 dark:text-slate-400 font-medium">
                                        {tags.join(' · ')}
                                      </span>
                                    </div>
                                  );
                                })}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <p className="text-slate-400">Sin eventos detallados registrados en el acta.</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="bg-white dark:bg-[#16262f] p-8 rounded-2xl border border-slate-200 dark:border-slate-800 text-center text-slate-400 text-sm">
            {selectedTeam
              ? 'No hay partidos jugados para este equipo.'
              : 'Aún no hay partidos jugados en la liga.'}
          </div>
        )}
      </div>
    </div>
  );
};
