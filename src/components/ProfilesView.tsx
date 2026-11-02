import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { calculatePlayerStats, calculateTeamStats } from '../utils/ranking';
import { MODALITY_NAMES, POSITIONS } from '../constants';
import { PeerRatingSkills, Player } from '../types';
import {
  UserCheck,
  Search,
  Camera,
  ArrowLeft,
  Star,
  Sliders,
  Sparkles,
  Shield,
  Send,
  Eye,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';

export const ProfilesView: React.FC = () => {
  const {
    teams,
    players,
    matches,
    updatePlayer,
    updateTeam,
    peerRatings,
    submitPeerRating,
    playerClaims,
    addPlayerClaim,
  } = useData();

  const { user, userProfile, isRealAdmin, activeRole, activeTeam } = useAuth();

  const isAdmin = isRealAdmin || activeRole === 'admin';
  const isCaptain = activeRole === 'capitan';

  const [activeProfile, setActiveProfile] = useState<{ type: 'p' | 't'; id: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Admin stats adjustment
  const [adjStatKey, setAdjStatKey] = useState('g');
  const [adjStatVal, setAdjStatVal] = useState<number>(1);

  // Teammate rating draft state
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [ratingDraft, setRatingDraft] = useState<PeerRatingSkills>({
    regate: 3,
    defensa: 3,
    pase: 3,
    disparo: 3,
    velocidad: 3,
    responsabilidad: 4,
    condicion: 3,
    agresividad: 3,
    companerismo: 4,
    puntualidad: 4,
    porteria: 3,
  });

  // Photo compression & upload handler
  const handlePhotoUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    colName: 'players' | 'teams',
    id: string
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 180;
        canvas.height = 180;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const s = Math.min(img.width, img.height);
        ctx.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, 180, 180);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

        if (colName === 'players') updatePlayer(id, { foto: dataUrl });
        else updateTeam(id, { foto: dataUrl });
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleExpelPlayer = async (playerId: string) => {
    if (confirm('¿Expulsar al jugador del equipo? Quedará disponible en la bolsa como agente libre.')) {
      await updatePlayer(playerId, { team: '', dorsal: 0, userId: '' });
      setActiveProfile(null);
      alert('Jugador liberado como agente libre.');
    }
  };

  const handleApplyAdjustment = async (playerId: string) => {
    const p = players.find(x => x.id === playerId);
    if (!p) return;
    const currentAdj = { ...(p.adj || {}) };
    const val = Number(adjStatVal);

    if (adjStatKey === 'gj') {
      currentAdj.g = (currentAdj.g || 0) + val;
    } else {
      currentAdj[adjStatKey] = (currentAdj[adjStatKey] || 0) + val;
      if (adjStatKey === 'gp' || adjStatKey === 'gl') {
        currentAdj.g = (currentAdj.g || 0) + val;
      }
    }

    await updatePlayer(playerId, { adj: currentAdj });
    alert('Ajuste estadístico aplicado correctamente.');
  };

  // Submit claim request
  const handleClaimPlayer = async (player: Player) => {
    if (!user) {
      alert('Debes iniciar sesión con Google para solicitar tu vinculación.');
      return;
    }

    const existingClaim = playerClaims.find(
      c => c.playerId === player.id && c.userId === user.uid && c.status === 'pend'
    );
    if (existingClaim) {
      alert('Ya tienes una solicitud pendiente enviada al administrador para este jugador.');
      return;
    }

    try {
      await addPlayerClaim({
        userId: user.uid,
        userName: user.displayName || user.email || 'Usuario',
        userEmail: user.email || '',
        playerId: player.id,
        playerName: player.name,
        teamId: player.team,
        status: 'pend',
      });
      alert('Solicitud enviada al Administrador. Una vez aprobada, podrás gestionar tu foto de perfil y calificar a tus compañeros.');
    } catch (err: any) {
      alert('Error al enviar solicitud: ' + err.message);
    }
  };

  // Submit peer review
  const handleSubmitTeammateRating = async (targetPlayer: Player) => {
    if (!user) return;

    try {
      await submitPeerRating({
        fromUserId: user.uid,
        fromPlayerId: userProfile?.playerId || '',
        fromUserName: user.displayName || user.email || 'Compañero',
        toPlayerId: targetPlayer.id,
        teamId: targetPlayer.team,
        ratings: ratingDraft,
      });
      setShowRatingModal(false);
      alert('¡Valoración de compañero registrada con éxito de forma anónima!');
    } catch (err: any) {
      alert('Error al registrar valoración: ' + err.message);
    }
  };

  // Render individual player profile
  if (activeProfile?.type === 'p') {
    const player = players.find(p => p.id === activeProfile.id);
    if (!player) return null;

    const team = teams.find(t => t.id === player.team);
    const S = calculatePlayerStats(player, matches);

    // Permission checks
    const isSelfPlayer = userProfile?.playerId === player.id || player.userId === user?.uid;
    const canEditPhoto = isAdmin || (isCaptain && activeTeam === player.team) || isSelfPlayer;
    const isPortero = player.pos === 'POR';

    // Teammate rating eligibility:
    // User must belong to the same team and not be rating themselves
    const myTeamId =
      userProfile?.team ||
      (isCaptain ? activeTeam : '') ||
      players.find(p => p.id === userProfile?.playerId)?.team ||
      '';
    const isTeammate = player.team && myTeamId === player.team;
    const canRateTeammate = user && isTeammate && !isSelfPlayer;

    // Fetch peer ratings for this player
    const peerReviews = peerRatings.filter(r => r.toPlayerId === player.id);
    const reviewCount = peerReviews.length;

    // Calculate skill averages
    const skillKeys: { key: keyof PeerRatingSkills; label: string; onlyGk?: boolean }[] = [
      { key: 'regate', label: 'Regate' },
      { key: 'defensa', label: 'Defensa' },
      { key: 'pase', label: 'Pase' },
      { key: 'disparo', label: 'Disparo' },
      { key: 'velocidad', label: 'Velocidad' },
      { key: 'responsabilidad', label: 'Responsabilidad' },
      { key: 'condicion', label: 'Condición Física' },
      { key: 'agresividad', label: 'Agresividad' },
      { key: 'companerismo', label: 'Compañerismo' },
      { key: 'puntualidad', label: 'Puntualidad' },
      { key: 'porteria', label: 'Portería', onlyGk: true },
    ];

    const activeSkills = skillKeys.filter(s => !s.onlyGk || isPortero);

    const skillAverages: Record<string, number> = {};
    activeSkills.forEach(s => {
      if (reviewCount === 0) {
        skillAverages[s.key] = 0;
      } else {
        const sum = peerReviews.reduce((acc, r) => acc + (r.ratings[s.key] || 0), 0);
        skillAverages[s.key] = sum / reviewCount;
      }
    });

    const overallAverage =
      reviewCount > 0
        ? Object.values(skillAverages).reduce((a, b) => a + b, 0) / activeSkills.length
        : 0;

    // User's own existing rating for this teammate
    const myExistingRating = peerReviews.find(r => r.fromUserId === user?.uid);

    // Claim request status for this player
    const myPendingClaim = playerClaims.find(
      c => c.playerId === player.id && c.userId === user?.uid && c.status === 'pend'
    );

    const mainStats = [
      ['Partidos Jugados', S.pj],
      ['Goles Totales', S.g],
      ['Hattricks (3+)', S.ht],
      ['Asistencias', S.s],
      ['Tarjetas Amarillas', S.y],
      ['Tarjetas Rojas', S.r],
      ['Veces MVP', S.m],
      ['Autogoles', S.og],
      ['Penales Fallados', S.pf],
    ];

    if (isPortero) {
      mainStats.push(
        ['Goles Recibidos', S.gr],
        ['Vallas Invictas', S.pc],
        ['Penales Atajados', S.pa],
        ['Tandas Ganadas', S.tg],
        ['Tandas Perdidas', S.tp]
      );
    }

    const goalBreakdown = [
      ['De jugada normal', S.gj],
      ['De penal', S.gp],
      ['De tiro libre', S.gl],
    ];

    return (
      <div className="bg-white dark:bg-[#16262f] p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6 animate-in fade-in">
        <button
          onClick={() => setActiveProfile(null)}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
        >
          <ArrowLeft size={15} />
          <span>Volver a la lista de perfiles</span>
        </button>

        {/* Profile Card Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-4">
            <div className="relative group shrink-0">
              {player.foto ? (
                <img
                  src={player.foto}
                  alt={player.name}
                  className="w-18 h-18 rounded-full object-cover border-2 border-[#0e8a5f] shadow-md"
                />
              ) : (
                <div className="w-18 h-18 rounded-full bg-[#0e8a5f] text-white font-black text-2xl flex items-center justify-center shadow-md">
                  {player.dorsal ? `#${player.dorsal}` : player.name[0]?.toUpperCase() || 'J'}
                </div>
              )}

              {canEditPhoto && (
                <label
                  className="absolute bottom-0 right-0 bg-white dark:bg-slate-800 p-1.5 rounded-full border border-slate-300 dark:border-slate-600 shadow cursor-pointer hover:bg-slate-100 transition-transform active:scale-90"
                  title="Cambiar foto de perfil"
                >
                  <Camera size={14} className="text-[#0e8a5f]" />
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => handlePhotoUpload(e, 'players', player.id)}
                  />
                </label>
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-[#142433] dark:text-[#e8f1ee]">
                  {player.name}
                </h2>
                {isSelfPlayer && (
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                    Tu Perfil
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-600 dark:text-slate-400">
                <span className="font-semibold text-[#0e8a5f] dark:text-[#6fe3ae]">
                  {team ? team.name : 'Agente Libre'}
                </span>
                <span>·</span>
                <span className="font-bold">#{player.dorsal || '-'}</span>
                <span>·</span>
                <span>
                  {player.pos || 'Sin posición'}
                  {player.sec && player.sec.length > 0 ? ` (${player.sec.join(', ')})` : ''}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Claim Profile Button if user has no player linked */}
            {user && !isSelfPlayer && !player.userId && (
              <button
                onClick={() => handleClaimPlayer(player)}
                disabled={!!myPendingClaim}
                className="bg-sky-600 hover:bg-sky-700 disabled:opacity-60 text-white px-3 py-1.5 rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all"
              >
                <CheckCircle size={14} />
                <span>
                  {myPendingClaim ? 'Solicitud Enviada' : 'Soy este jugador'}
                </span>
              </button>
            )}

            {/* Rate teammate button */}
            {canRateTeammate && (
              <button
                onClick={() => {
                  if (myExistingRating) {
                    setRatingDraft({ ...myExistingRating.ratings });
                  }
                  setShowRatingModal(true);
                }}
                className="bg-[#0e8a5f] hover:bg-[#0b7a43] text-white px-3.5 py-1.5 rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all"
              >
                <Star size={14} className="fill-white" />
                <span>
                  {myExistingRating ? 'Modificar mi valoración' : 'Valorar compañero'}
                </span>
              </button>
            )}

            {(isAdmin || (isCaptain && activeTeam === player.team)) && (
              <button
                onClick={() => handleExpelPlayer(player.id)}
                className="text-xs text-rose-600 dark:text-rose-400 border border-rose-300 dark:border-rose-800 hover:bg-rose-50 dark:hover:bg-rose-950/20 px-3 py-1.5 rounded-xl font-semibold transition-all"
              >
                Liberar
              </button>
            )}
          </div>
        </div>

        {/* TEAMMATE SKILL EVALUATION CARD */}
        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-700 pb-2.5">
            <div>
              <div className="font-bold text-sm text-[#142433] dark:text-[#e8f1ee] flex items-center gap-2">
                <Sparkles className="text-amber-500" size={17} />
                <span>Valoración según sus compañeros de equipo</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Votaciones anónimas de 1 a 5 estrellas emitidas exclusivamente por miembros de su club
              </p>
            </div>

            <div className="flex items-center gap-2 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
              <Star size={17} className="text-amber-500 fill-amber-500" />
              <span className="font-extrabold text-base text-slate-800 dark:text-slate-100">
                {overallAverage > 0 ? overallAverage.toFixed(1) : '—'}
              </span>
              <span className="text-[11px] text-slate-400">
                ({reviewCount} {reviewCount === 1 ? 'voto' : 'votos'})
              </span>
            </div>
          </div>

          {/* Skill Breakdown Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 pt-1">
            {activeSkills.map(s => {
              const score = skillAverages[s.key] || 0;
              return (
                <div
                  key={s.key}
                  className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs"
                >
                  <span className="text-slate-600 dark:text-slate-400 font-medium">{s.label}</span>
                  <span className="font-bold text-[#0e8a5f] dark:text-[#6fe3ae] flex items-center gap-1">
                    <Star size={12} className="text-amber-500 fill-amber-500" />
                    {score > 0 ? score.toFixed(1) : '—'}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Admin breakdown view */}
          {isAdmin && peerReviews.length > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-400">
              <div className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 mb-1.5">
                <Eye size={13} />
                <span>Desglose confidencial de votos (Solo visible para el Administrador):</span>
              </div>
              <div className="space-y-1">
                {peerReviews.map((r, rIdx) => (
                  <div key={r.id || rIdx} className="bg-white dark:bg-slate-900 p-2 rounded-lg border">
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {r.fromUserName || 'Compañero'}:
                    </span>{' '}
                    {Object.entries(r.ratings)
                      .map(([k, v]) => `${k}: ${v}★`)
                      .join(' · ')}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Stats Grid */}
        <div>
          <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400 mb-3">
            Estadísticas Oficiales Acumuladas
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {mainStats.map(([label, val]) => (
              <div
                key={label as string}
                className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-center"
              >
                <div className="text-xl font-extrabold text-[#0e8a5f] dark:text-[#6fe3ae]">
                  {val as number}
                </div>
                <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                  {label as string}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Goal Breakdown */}
        <div>
          <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400 mb-2">
            Desglose de Goles Anotados
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {goalBreakdown.map(([label, val]) => (
              <div
                key={label as string}
                className="bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs"
              >
                <span className="font-medium text-slate-600 dark:text-slate-400">{label as string}</span>
                <span className="font-bold text-[#0e8a5f] dark:text-[#6fe3ae]">{val as number}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Admin manual adjustments */}
        {isAdmin && (
          <div className="bg-amber-500/10 p-4 rounded-xl border border-amber-500/30 space-y-3 text-xs">
            <div className="font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
              <Sliders size={15} />
              <span>Ajuste Manual Administrativo</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 font-semibold text-xs"
                value={adjStatKey}
                onChange={e => setAdjStatKey(e.target.value)}
              >
                <option value="g">Goles Totales</option>
                <option value="gj">Goles de Jugada</option>
                <option value="gp">Goles de Penal</option>
                <option value="gl">Goles de Tiro Libre</option>
                <option value="s">Asistencias</option>
                <option value="y">Amarillas</option>
                <option value="r">Rojas</option>
                <option value="m">MVP</option>
                <option value="ht">Hattricks</option>
              </select>

              <input
                type="number"
                placeholder="+ / -"
                className="w-16 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1.5 text-center font-bold text-xs"
                value={adjStatVal}
                onChange={e => setAdjStatVal(Number(e.target.value))}
              />

              <button
                type="button"
                onClick={() => handleApplyAdjustment(player.id)}
                className="bg-amber-600 text-white font-bold px-3 py-1.5 rounded-lg hover:bg-amber-700 transition-colors"
              >
                Aplicar Ajuste
              </button>
            </div>
          </div>
        )}

        {/* Teammate Rating Modal */}
        {showRatingModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white dark:bg-[#16262f] max-w-md w-full rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-2">
                <h3 className="font-bold text-base text-[#142433] dark:text-[#e8f1ee] flex items-center gap-2">
                  <Star className="text-amber-500 fill-amber-500" size={18} />
                  <span>Valorar a {player.name}</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Califica cada cualidad de 1 a 5 estrellas. Tu voto es anónimo para el jugador y compañeros.
                </p>
              </div>

              <div className="space-y-2.5 text-xs">
                {activeSkills.map(s => {
                  const curVal = ratingDraft[s.key] || 3;
                  return (
                    <div key={s.key} className="flex items-center justify-between py-1">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {s.label}
                      </span>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map(star => (
                          <button
                            key={star}
                            type="button"
                            onClick={() =>
                              setRatingDraft({ ...ratingDraft, [s.key]: star })
                            }
                            className={`p-1 transition-transform ${
                              star <= curVal ? 'text-amber-500' : 'text-slate-300 dark:text-slate-700'
                            }`}
                          >
                            <Star size={18} className={star <= curVal ? 'fill-amber-500' : ''} />
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowRatingModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => handleSubmitTeammateRating(player)}
                  className="bg-[#0e8a5f] hover:bg-[#0b7a43] text-white px-5 py-2 text-xs font-bold rounded-xl shadow-sm"
                >
                  Guardar Valoración
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Render individual team profile
  if (activeProfile?.type === 't') {
    const team = teams.find(t => t.id === activeProfile.id);
    if (!team) return null;

    const S = calculateTeamStats(team.id, matches);
    const squad = players.filter(p => p.team === team.id);
    const canEdit = isAdmin || (isCaptain && activeTeam === team.id);

    return (
      <div className="bg-white dark:bg-[#16262f] p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6 animate-in fade-in">
        <button
          onClick={() => setActiveProfile(null)}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
        >
          <ArrowLeft size={15} />
          <span>Volver a la lista de perfiles</span>
        </button>

        {/* Team Profile Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-4">
            <div className="relative group shrink-0">
              {team.foto ? (
                <img
                  src={team.foto}
                  alt={team.name}
                  className="w-16 h-16 rounded-full object-cover border-2 border-[#0e8a5f] shadow-md"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-[#0e8a5f] text-white font-black text-2xl flex items-center justify-center shadow-md">
                  {team.name[0]?.toUpperCase() || 'E'}
                </div>
              )}

              {canEdit && (
                <label className="absolute bottom-0 right-0 bg-white dark:bg-slate-800 p-1.5 rounded-full border border-slate-300 dark:border-slate-600 shadow cursor-pointer hover:bg-slate-100">
                  <Camera size={13} className="text-[#0e8a5f]" />
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => handlePhotoUpload(e, 'teams', team.id)}
                  />
                </label>
              )}
            </div>

            <div>
              <h2 className="text-xl font-bold text-[#142433] dark:text-[#e8f1ee]">{team.name}</h2>
              <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 dark:text-slate-400">
                <span className="font-semibold text-[#0e8a5f] dark:text-[#6fe3ae]">
                  {MODALITY_NAMES[team.mod]}
                </span>
                <span>·</span>
                <span>{team.cat || 'Masculino'}</span>
                <span>·</span>
                <span>{squad.length}/30 jugadores</span>
              </div>
            </div>
          </div>
        </div>

        {/* Team Stats */}
        <div>
          <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400 mb-3">
            Rendimiento del Club
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {[
              ['Partidos', S.pj],
              ['Victorias', S.w],
              ['Empates', S.e],
              ['Derrotas', S.l],
              ['Goles a Favor', S.gf],
              ['Goles en Contra', S.gc],
            ].map(([label, val]) => (
              <div
                key={label as string}
                className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-center"
              >
                <div className="text-xl font-extrabold text-[#0e8a5f] dark:text-[#6fe3ae]">
                  {val as number}
                </div>
                <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                  {label as string}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Squad roster */}
        <div>
          <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400 mb-2">
            Plantilla de Jugadores
          </h3>
          <div className="flex flex-wrap gap-2">
            {squad.map(p => (
              <button
                key={p.id}
                onClick={() => setActiveProfile({ type: 'p', id: p.id })}
                className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 px-3 py-1.5 rounded-xl text-xs font-semibold border border-slate-300 dark:border-slate-700 transition-colors flex items-center gap-1.5"
              >
                {p.foto ? (
                  <img src={p.foto} alt={p.name} className="w-4 h-4 rounded-full object-cover" />
                ) : null}
                <span>#{p.dorsal || '-'} {p.name}</span>
                <small className="text-slate-400">({p.pos})</small>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // General Profiles Browser
  const filteredPlayers = players.filter(p => {
    const q = searchQuery.toLowerCase();
    const teamName = teams.find(t => t.id === p.team)?.name || '';
    return p.name.toLowerCase().includes(q) || teamName.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-[#16262f] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-[#142433] dark:text-[#e8f1ee] flex items-center gap-2">
            <UserCheck className="text-[#0e8a5f]" size={22} />
            <span>Perfiles, Valoraciones y Expedientes</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Valoraciones anónimas entre compañeros, fotos de perfil y estadísticas por club
          </p>
        </div>
      </div>

      {/* Teams grid */}
      <div>
        <h3 className="text-sm font-bold text-[#142433] dark:text-[#e8f1ee] mb-3">
          Clubes y Equipos
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {teams.map(t => (
            <div
              key={t.id}
              onClick={() => setActiveProfile({ type: 't', id: t.id })}
              className="bg-white dark:bg-[#16262f] p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs hover:border-[#0e8a5f] cursor-pointer transition-all flex items-center gap-3"
            >
              {t.foto ? (
                <img
                  src={t.foto}
                  alt={t.name}
                  className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-[#0e8a5f] text-white font-bold flex items-center justify-center">
                  {t.name[0]?.toUpperCase()}
                </div>
              )}
              <div className="truncate">
                <div className="font-bold text-sm text-[#142433] dark:text-[#e8f1ee] truncate">
                  {t.name}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  {MODALITY_NAMES[t.mod]} · {t.cat || 'Masculino'}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Players browser */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <h3 className="text-sm font-bold text-[#142433] dark:text-[#e8f1ee]">
            Buscador de Jugadores ({players.length})
          </h3>

          <div className="relative w-full sm:w-64">
            <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por jugador o equipo..."
              className="w-full bg-white dark:bg-[#16262f] border border-slate-300 dark:border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-[#0e8a5f]"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {filteredPlayers.map(p => {
            const team = teams.find(t => t.id === p.team);
            return (
              <button
                key={p.id}
                onClick={() => setActiveProfile({ type: 'p', id: p.id })}
                className="bg-white dark:bg-[#16262f] hover:bg-slate-50 dark:hover:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-left transition-colors flex items-center justify-between"
              >
                <div className="flex items-center gap-2 truncate pr-2">
                  {p.foto ? (
                    <img
                      src={p.foto}
                      alt={p.name}
                      className="w-7 h-7 rounded-full object-cover shrink-0 border border-slate-200"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-bold flex items-center justify-center shrink-0">
                      {p.dorsal ? `#${p.dorsal}` : p.name[0]?.toUpperCase()}
                    </div>
                  )}

                  <div className="truncate">
                    <div className="font-semibold text-xs text-slate-900 dark:text-slate-100 truncate">
                      {p.name}
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                      {team ? team.name : 'Agente Libre'}
                    </div>
                  </div>
                </div>

                <span className="text-[11px] font-bold text-[#0e8a5f] bg-[#0e8a5f]/10 px-2 py-0.5 rounded-md shrink-0">
                  #{p.dorsal || '-'}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
