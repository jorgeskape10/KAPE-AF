import React from 'react';
import { useData } from '../context/DataContext';
import { calculateRanking, getTopIndividual, getTopReferees } from '../utils/ranking';
import { exportRankingToImage } from '../utils/export';
import { MODALITY_NAMES } from '../constants';
import { Trophy, Image as ImageIcon, Flame, Star, ShieldCheck, UserCheck } from 'lucide-react';

export const RankingView: React.FC = () => {
  const { teams, matches, torneos, players, referees } = useData();

  const ranking = calculateRanking(teams, matches, torneos);
  const topScorers = getTopIndividual('g', matches, players);
  const topAssists = getTopIndividual('s', matches, players);
  const topMvp = getTopIndividual('m', matches, players);
  const topRefs = getTopReferees(referees, matches);

  const handleExportImage = () => {
    try {
      exportRankingToImage(ranking);
    } catch (e: any) {
      alert(e.message || 'Error al exportar imagen');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Export Card */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white dark:bg-[#16262f] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-[#142433] dark:text-[#e8f1ee] flex items-center gap-2">
            <Trophy className="text-amber-500" size={22} />
            <span>Ranking General de Equipos</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Clasificación acumulada de partidos amistosos y bonificaciones de torneos
          </p>
        </div>

        <button
          onClick={handleExportImage}
          className="flex items-center gap-2 bg-[#0e8a5f] hover:bg-[#0b7a43] text-white px-3.5 py-2 rounded-xl text-xs font-semibold shadow-sm transition-all transform active:scale-95"
        >
          <ImageIcon size={16} />
          <span>Descargar como imagen (PNG)</span>
        </button>
      </div>

      {/* Main Ranking Table */}
      <div className="bg-white dark:bg-[#16262f] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {ranking.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider font-semibold">
                  <th className="py-3 px-4 w-12 text-center">#</th>
                  <th className="py-3 px-4">Equipo</th>
                  <th className="py-3 px-4">Modalidad</th>
                  <th className="py-3 px-4 text-right">Puntos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {ranking.map((row, idx) => {
                  const isLeader = idx === 0;
                  const isTop3 = idx < 3;
                  return (
                    <tr
                      key={row.id}
                      className={`transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/40 ${
                        isLeader ? 'bg-amber-500/5' : ''
                      }`}
                    >
                      <td className="py-3 px-4 text-center font-bold">
                        <span
                          className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs ${
                            idx === 0
                              ? 'bg-amber-400 text-amber-950 font-extrabold shadow-sm'
                              : idx === 1
                              ? 'bg-slate-300 text-slate-800 font-bold'
                              : idx === 2
                              ? 'bg-amber-700/60 text-white font-bold'
                              : 'text-slate-500 dark:text-slate-400'
                          }`}
                        >
                          {idx + 1}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-[#142433] dark:text-[#e8f1ee] flex items-center gap-2">
                        {(() => {
                          const teamObj = teams.find(t => t.id === row.id);
                          return teamObj?.foto ? (
                            <img
                              src={teamObj.foto}
                              alt={row.name}
                              className="w-6 h-6 rounded-full object-cover border border-slate-200 dark:border-slate-700 shadow-xs shrink-0"
                            />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-[#0e8a5f] text-white text-[10px] font-extrabold flex items-center justify-center shrink-0">
                              {row.name[0]?.toUpperCase() || 'E'}
                            </div>
                          );
                        })()}
                        <span>{row.name}</span>
                        {isLeader && (
                          <span className="text-[10px] bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/40 px-2 py-0.5 rounded-full font-bold">
                            Líder
                          </span>
                        )}
                        {isTop3 && !isLeader && (
                          <span className="text-[10px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded-full font-semibold">
                            Top 3
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400 text-xs">
                        <span className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700">
                          {MODALITY_NAMES[row.mod] || row.mod}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-base text-[#0e8a5f] dark:text-[#6fe3ae]">
                        {row.pts.toFixed(1)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-slate-500 dark:text-slate-400 text-sm">
            Aún no hay equipos registrados. Crea equipos en la sección "Equipos &gt; Plantillas".
          </div>
        )}

        <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
          <span className="font-semibold text-slate-700 dark:text-slate-300">Sistema de puntuación:</span> Victoria 3 pts, Empate 1 pt. Goles: +0,2 por gol a favor, −0,1 por gol en contra. Bono especial: vencer al líder multiplica los puntos base ×1,75; vencer a un rival del Top 3 multiplica ×1,5. Tarjetas: Amarilla −0,1, Roja −0,2. Penalizaciones de acta aplicables.
        </div>
      </div>

      {/* Individual Top Stats Cards */}
      <div>
        <h3 className="text-base font-bold text-[#142433] dark:text-[#e8f1ee] mb-3 flex items-center gap-2">
          <Flame className="text-rose-500" size={18} />
          <span>Líderes Individuales</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Goleadores */}
          <div className="bg-white dark:bg-[#16262f] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-sm text-[#142433] dark:text-[#e8f1ee] flex items-center gap-1.5">
                <span>⚽</span> Goleadores
              </span>
              <span className="text-[10px] uppercase font-bold text-slate-400">Top 5</span>
            </div>
            <div className="space-y-1.5 text-xs">
              {topScorers.length > 0 ? (
                topScorers.map(({ player, count }, i) => (
                  <div key={player.id} className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800 last:border-0">
                    <div className="flex items-center gap-1.5 truncate max-w-[150px]">
                      <b className="text-slate-400 shrink-0">{i + 1}.</b>
                      {player.foto ? (
                        <img
                          src={player.foto}
                          alt={player.name}
                          className="w-5 h-5 rounded-full object-cover border border-slate-200 shrink-0"
                        />
                      ) : (
                        <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[9px] font-bold flex items-center justify-center shrink-0">
                          {player.dorsal ? `#${player.dorsal}` : player.name[0]?.toUpperCase()}
                        </span>
                      )}
                      <span className="text-slate-700 dark:text-slate-300 truncate">{player.name}</span>
                    </div>
                    <span className="font-bold text-[#0e8a5f] dark:text-[#6fe3ae]">{count} goles</span>
                  </div>
                ))
              ) : (
                <p className="text-slate-400 py-3 text-center">Sin datos registrados</p>
              )}
            </div>
          </div>

          {/* Asistentes */}
          <div className="bg-white dark:bg-[#16262f] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-sm text-[#142433] dark:text-[#e8f1ee] flex items-center gap-1.5">
                <span>🅰️</span> Asistentes
              </span>
              <span className="text-[10px] uppercase font-bold text-slate-400">Top 5</span>
            </div>
            <div className="space-y-1.5 text-xs">
              {topAssists.length > 0 ? (
                topAssists.map(({ player, count }, i) => (
                  <div key={player.id} className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800 last:border-0">
                    <div className="flex items-center gap-1.5 truncate max-w-[150px]">
                      <b className="text-slate-400 shrink-0">{i + 1}.</b>
                      {player.foto ? (
                        <img
                          src={player.foto}
                          alt={player.name}
                          className="w-5 h-5 rounded-full object-cover border border-slate-200 shrink-0"
                        />
                      ) : (
                        <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[9px] font-bold flex items-center justify-center shrink-0">
                          {player.dorsal ? `#${player.dorsal}` : player.name[0]?.toUpperCase()}
                        </span>
                      )}
                      <span className="text-slate-700 dark:text-slate-300 truncate">{player.name}</span>
                    </div>
                    <span className="font-bold text-[#0e8a5f] dark:text-[#6fe3ae]">{count} asist.</span>
                  </div>
                ))
              ) : (
                <p className="text-slate-400 py-3 text-center">Sin datos registrados</p>
              )}
            </div>
          </div>

          {/* MVPs */}
          <div className="bg-white dark:bg-[#16262f] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-sm text-[#142433] dark:text-[#e8f1ee] flex items-center gap-1.5">
                <Star className="text-amber-500" size={15} /> Jugador Más Valioso (MVP)
              </span>
              <span className="text-[10px] uppercase font-bold text-slate-400">Top 5</span>
            </div>
            <div className="space-y-1.5 text-xs">
              {topMvp.length > 0 ? (
                topMvp.map(({ player, count }, i) => (
                  <div key={player.id} className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800 last:border-0">
                    <div className="flex items-center gap-1.5 truncate max-w-[150px]">
                      <b className="text-slate-400 shrink-0">{i + 1}.</b>
                      {player.foto ? (
                        <img
                          src={player.foto}
                          alt={player.name}
                          className="w-5 h-5 rounded-full object-cover border border-slate-200 shrink-0"
                        />
                      ) : (
                        <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[9px] font-bold flex items-center justify-center shrink-0">
                          {player.dorsal ? `#${player.dorsal}` : player.name[0]?.toUpperCase()}
                        </span>
                      )}
                      <span className="text-slate-700 dark:text-slate-300 truncate">{player.name}</span>
                    </div>
                    <span className="font-bold text-amber-600 dark:text-amber-400">★ {count} MVP</span>
                  </div>
                ))
              ) : (
                <p className="text-slate-400 py-3 text-center">Sin datos registrados</p>
              )}
            </div>
          </div>

          {/* Árbitros */}
          <div className="bg-white dark:bg-[#16262f] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-sm text-[#142433] dark:text-[#e8f1ee] flex items-center gap-1.5">
                <ShieldCheck className="text-sky-500" size={15} /> Calificación Arbitral
              </span>
              <span className="text-[10px] uppercase font-bold text-slate-400">Oficiales</span>
            </div>
            <div className="space-y-1.5 text-xs">
              {topRefs.length > 0 ? (
                topRefs.map(({ referee, rating, count }) => (
                  <div key={referee.id} className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800 last:border-0">
                    <span className="text-slate-700 dark:text-slate-300 truncate max-w-[140px]">
                      {referee.name}
                    </span>
                    <span className="font-semibold text-sky-600 dark:text-sky-400">
                      {count > 0 ? `★ ${rating.toFixed(1)} (${count})` : 'Sin calificar'}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-slate-400 py-3 text-center">Sin datos arbitrales</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
