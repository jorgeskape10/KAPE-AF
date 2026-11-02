import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Modality } from '../types';
import { MODALITY_NAMES } from '../constants';
import { MapPin, Plus, Lightbulb, Trash2 } from 'lucide-react';

export const VenuesView: React.FC = () => {
  const { venues, addVenue, deleteVenue } = useData();
  const { isRealAdmin, activeRole } = useAuth();
  const isAdmin = isRealAdmin || activeRole === 'admin';

  const [showAddVenue, setShowAddVenue] = useState(false);
  const [venueName, setVenueName] = useState('');
  const [venueAddr, setVenueAddr] = useState('');
  const [venueSurf, setVenueSurf] = useState('Sintética');
  const [venueLights, setVenueLights] = useState(true);
  const [selectedMods, setSelectedMods] = useState<Modality[]>(['F7', 'F5']);

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const toggleMod = (m: Modality) => {
    if (selectedMods.includes(m)) {
      setSelectedMods(selectedMods.filter(x => x !== m));
    } else {
      setSelectedMods([...selectedMods, m]);
    }
  };

  const handleCreateVenue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!venueName.trim() || selectedMods.length === 0) {
      alert('Indica el nombre de la cancha y al menos una modalidad habilitada.');
      return;
    }
    try {
      await addVenue({
        name: venueName.trim(),
        addr: venueAddr.trim() || 'Dirección no especificada',
        surf: venueSurf,
        lights: venueLights,
        mods: selectedMods,
      });
      setVenueName('');
      setVenueAddr('');
      setShowAddVenue(false);
    } catch (err: any) {
      alert('Error al registrar cancha: ' + err.message);
    }
  };

  const handleDeleteVenue = async (id: string) => {
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id);
      setTimeout(() => setConfirmDeleteId(null), 5000);
      return;
    }
    try {
      await deleteVenue(id);
      setConfirmDeleteId(null);
    } catch (err: any) {
      alert('Error al eliminar cancha: ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white dark:bg-[#16262f] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-[#142433] dark:text-[#e8f1ee] flex items-center gap-2">
            <MapPin className="text-[#0e8a5f]" size={22} />
            <span>Sedes y Canchas Deportivas</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Campos habilitados por modalidad, iluminación y superficie de juego
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => setShowAddVenue(!showAddVenue)}
            className="flex items-center gap-1.5 bg-[#0e8a5f] hover:bg-[#0b7a43] text-white px-3.5 py-2 rounded-xl text-xs font-semibold shadow-sm"
          >
            <Plus size={16} />
            <span>{showAddVenue ? 'Cancelar' : 'Registrar Cancha'}</span>
          </button>
        )}
      </div>

      {isAdmin && showAddVenue && (
        <form
          onSubmit={handleCreateVenue}
          className="bg-white dark:bg-[#16262f] p-5 rounded-2xl border-2 border-[#0e8a5f]/40 shadow-sm space-y-4 animate-in fade-in"
        >
          <div className="font-bold text-sm text-[#142433] dark:text-[#e8f1ee] pb-2 border-b border-slate-100 dark:border-slate-800">
            Ficha de Nueva Cancha
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Nombre de la Cancha
              </label>
              <input
                type="text"
                required
                placeholder="Ej. Complejo Deportivo Norte"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 outline-none"
                value={venueName}
                onChange={e => setVenueName(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Dirección o Referencia
              </label>
              <input
                type="text"
                placeholder="Ej. Av. Principal, Sector 3"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 outline-none"
                value={venueAddr}
                onChange={e => setVenueAddr(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Tipo de Superficie
              </label>
              <select
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 outline-none"
                value={venueSurf}
                onChange={e => setVenueSurf(e.target.value)}
              >
                <option value="Sintética">Grama Sintética</option>
                <option value="Grama natural">Grama Natural</option>
                <option value="Cemento">Cemento / Tabloncillo</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 text-xs pt-1">
            <div className="flex items-center gap-3">
              <span className="font-semibold text-slate-600 dark:text-slate-400">
                Modalidades que soporta:
              </span>
              {(['F5', 'F7', 'F11'] as Modality[]).map(m => (
                <label key={m} className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedMods.includes(m)}
                    onChange={() => toggleMod(m)}
                  />
                  <span>{MODALITY_NAMES[m]}</span>
                </label>
              ))}
            </div>

            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={venueLights}
                onChange={e => setVenueLights(e.target.checked)}
              />
              <span className="flex items-center gap-1">
                <Lightbulb size={13} className="text-amber-500" /> Iluminación Nocturna
              </span>
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowAddVenue(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="bg-[#0e8a5f] hover:bg-[#0b7a43] text-white px-5 py-2 text-xs font-semibold rounded-xl shadow-sm"
            >
              Guardar Cancha
            </button>
          </div>
        </form>
      )}

      {/* Venues Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {venues.map(v => (
          <div
            key={v.id}
            className="bg-white dark:bg-[#16262f] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between gap-3 text-xs"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-[#142433] dark:text-[#e8f1ee]">
                  {v.name}
                </span>
                {v.lights ? (
                  <span className="text-[10px] bg-amber-500/15 text-amber-700 dark:text-amber-400 font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5">
                    <Lightbulb size={10} /> Con luz
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-400">Sin luz</span>
                )}
              </div>

              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                {v.addr} · {v.surf}
              </div>

              <div className="flex flex-wrap gap-1 mt-2">
                {v.mods.map(m => (
                  <span
                    key={m}
                    className="bg-[#0e8a5f]/10 text-[#0e8a5f] dark:text-[#6fe3ae] font-semibold text-[10px] px-2 py-0.5 rounded"
                  >
                    {MODALITY_NAMES[m]}
                  </span>
                ))}
              </div>
            </div>

            {isAdmin && (
              <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => handleDeleteVenue(v.id)}
                  className={`text-rose-600 px-2 py-1 rounded text-[11px] font-semibold ${
                    confirmDeleteId === v.id ? 'bg-rose-600 text-white animate-pulse' : ''
                  }`}
                >
                  {confirmDeleteId === v.id ? '¿Seguro?' : <Trash2 size={13} />}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
