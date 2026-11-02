import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Dumbbell, Plus, Trash2 } from 'lucide-react';

export const TrainingsView: React.FC = () => {
  const { teams, players, trainings, addTraining, deleteTraining } = useData();
  const { isRealAdmin, activeRole, activeTeam } = useAuth();

  const isAdmin = isRealAdmin || activeRole === 'admin';
  const isCaptain = activeRole === 'capitan';

  const defaultTeam = isCaptain && activeTeam ? activeTeam : teams[0]?.id || '';
  const [selectedTeamId, setSelectedTeamId] = useState(defaultTeam);

  // New training form state
  const [trainingDate, setTrainingDate] = useState(new Date().toISOString().slice(0, 10));
  const [teamSideAName, setTeamSideAName] = useState('Chalecos');
  const [teamSideBName, setTeamSideBName] = useState('Sin chalecos');
  const [playerSides, setPlayerSides] = useState<Record<string, 'a' | 'b'>>({});
  const [trainingGoalsA, setTrainingGoalsA] = useState<string>('');
  const [trainingGoalsB, setTrainingGoalsB] = useState<string>('');
  const [trainingMins, setTrainingMins] = useState<number>(60);
  const [goalsMap, setGoalsMap] = useState<Record<string, number>>({});
  const [assistsMap, setAssistsMap] = useState<Record<string, number>>({});

  const teamRoster = players.filter(p => p.team === selectedTeamId);
  const teamTrainings = trainings.filter(t => t.team === selectedTeamId);

  const canManage = isAdmin || (isCaptain && activeTeam === selectedTeamId);

  // Cycle player side on click: none -> a -> b -> none
  const cyclePlayerSide = (pId: string) => {
    const cur = playerSides[pId];
    const updated = { ...playerSides };
    if (!cur) updated[pId] = 'a';
    else if (cur === 'a') updated[pId] = 'b';
    else delete updated[pId];
    setPlayerSides(updated);
  };

  const handleSaveTraining = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeamId) return;

    const assignedPlayers = teamRoster.filter(p => playerSides[p.id]);
    const hasSideA = assignedPlayers.some(p => playerSides[p.id] === 'a');
    const hasSideB = assignedPlayers.some(p => playerSides[p.id] === 'b');

    if (!hasSideA || !hasSideB) {
      alert('Debes asignar jugadores a ambos bandos del entrenamiento.');
      return;
    }
    if (trainingGoalsA === '' || trainingGoalsB === '') {
      alert('Indica el marcador final de la práctica.');
      return;
    }

    try {
      await addTraining({
        team: selectedTeamId,
        date: trainingDate,
        na: teamSideAName || 'Bando A',
        nb: teamSideBName || 'Bando B',
        ga: Number(trainingGoalsA),
        gb: Number(trainingGoalsB),
        mins: Number(trainingMins),
        part: assignedPlayers.map(p => ({
          p: p.id,
          sd: playerSides[p.id],
          g: goalsMap[p.id] || 0,
          a: assistsMap[p.id] || 0,
        })),
      });

      setPlayerSides({});
      setGoalsMap({});
      setAssistsMap({});
      setTrainingGoalsA('');
      setTrainingGoalsB('');
      alert('Entrenamiento interno guardado con éxito.');
    } catch (err: any) {
      alert('Error al guardar entrenamiento: ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white dark:bg-[#16262f] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-[#142433] dark:text-[#e8f1ee] flex items-center gap-2">
            <Dumbbell className="text-[#0e8a5f]" size={22} />
            <span>Entrenamientos Internos</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Partidillos entre jugadores del mismo club. No alteran el ranking general de la liga
          </p>
        </div>

        {/* Team selector */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-slate-500 font-medium">Equipo:</span>
          <select
            disabled={isCaptain && !isAdmin}
            className="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 outline-none w-full sm:w-auto"
            value={selectedTeamId}
            onChange={e => {
              setSelectedTeamId(e.target.value);
              setPlayerSides({});
            }}
          >
            {teams.map(t => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* New training form */}
      {canManage && (
        <form
          onSubmit={handleSaveTraining}
          className="bg-white dark:bg-[#16262f] p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4"
        >
          <div className="font-bold text-sm text-[#142433] dark:text-[#e8f1ee] pb-2 border-b border-slate-100 dark:border-slate-800">
            Registrar Sesión de Entrenamiento
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Fecha
              </label>
              <input
                type="date"
                required
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 outline-none"
                value={trainingDate}
                onChange={e => setTrainingDate(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Nombre Bando A
              </label>
              <input
                type="text"
                placeholder="Chalecos"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 outline-none"
                value={teamSideAName}
                onChange={e => setTeamSideAName(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Nombre Bando B
              </label>
              <input
                type="text"
                placeholder="Sin chalecos"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 outline-none"
                value={teamSideBName}
                onChange={e => setTeamSideBName(e.target.value)}
              />
            </div>
          </div>

          {/* Player side assignment */}
          <div>
            <div className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Asignar Bandos (Toca cada jugador: 1 vez = Bando A, 2 veces = Bando B, 3 = Fuera):
            </div>
            <div className="flex flex-wrap gap-1.5">
              {teamRoster.map(p => {
                const side = playerSides[p.id];
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => cyclePlayerSide(p.id)}
                    className={`px-2.5 py-1 text-xs rounded-xl font-medium border transition-all ${
                      side === 'a'
                        ? 'bg-[#0e8a5f] text-white border-[#0e8a5f] shadow-xs'
                        : side === 'b'
                        ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                    }`}
                  >
                    {side ? `[${side.toUpperCase()}] ` : ''} #{p.dorsal || '-'} {p.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Scores & Minutes */}
          <div className="flex flex-wrap items-center justify-center gap-4 py-2 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700">
            <span className="font-bold text-xs">{teamSideAName || 'Bando A'}</span>
            <input
              type="number"
              min="0"
              required
              placeholder="Goles"
              className="w-16 bg-white dark:bg-slate-900 border rounded-lg p-1 text-center font-bold text-[#0e8a5f]"
              value={trainingGoalsA}
              onChange={e => setTrainingGoalsA(e.target.value)}
            />
            <span className="font-bold text-slate-400">-</span>
            <input
              type="number"
              min="0"
              required
              placeholder="Goles"
              className="w-16 bg-white dark:bg-slate-900 border rounded-lg p-1 text-center font-bold text-[#0e8a5f]"
              value={trainingGoalsB}
              onChange={e => setTrainingGoalsB(e.target.value)}
            />
            <span className="font-bold text-xs">{teamSideBName || 'Bando B'}</span>

            <div className="flex items-center gap-1.5 text-xs text-slate-500 ml-4">
              <input
                type="number"
                min="10"
                className="w-16 bg-white dark:bg-slate-900 border rounded-lg p-1 text-center"
                value={trainingMins}
                onChange={e => setTrainingMins(Number(e.target.value))}
              />
              <span>minutos</span>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="bg-[#0e8a5f] hover:bg-[#0b7a43] text-white px-6 py-2 text-xs font-bold rounded-xl shadow-sm"
            >
              Guardar Entrenamiento
            </button>
          </div>
        </form>
      )}

      {/* History of trainings */}
      <div className="space-y-3">
        <h3 className="font-bold text-sm text-[#142433] dark:text-[#e8f1ee]">
          Sesiones Anteriores ({teamTrainings.length})
        </h3>

        {teamTrainings.length > 0 ? (
          <div className="space-y-2">
            {teamTrainings
              .slice()
              .reverse()
              .map(t => (
                <div
                  key={t.id}
                  className="bg-white dark:bg-[#16262f] p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {t.na} <b>{t.ga} - {t.gb}</b> {t.nb}
                    </span>
                    <span className="text-slate-400 ml-2">
                      · {t.date} {t.mins ? `· ${t.mins} min` : ''}
                    </span>
                  </div>

                  {canManage && (
                    <button
                      onClick={() => deleteTraining(t.id)}
                      className="text-rose-500 hover:text-rose-700 p-1"
                      title="Eliminar registro"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-[#16262f] p-6 rounded-2xl border border-slate-200 dark:border-slate-800 text-center text-slate-400 text-xs">
            No hay entrenamientos internos registrados para este equipo.
          </div>
        )}
      </div>
    </div>
  );
};
