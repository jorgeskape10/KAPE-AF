import React from 'react';
import { useAuth } from '../context/AuthContext';

interface NavigationProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  unreadCount: number;
}

interface NavGroup {
  id: string;
  label: string;
  subtabs: { id: string; label: string; requiresAdmin?: boolean; requiresNotVisitor?: boolean }[];
}

export const Navigation: React.FC<NavigationProps> = ({ currentTab, onTabChange, unreadCount }) => {
  const { isRealAdmin, activeRole } = useAuth();

  const navGroups: NavGroup[] = [
    {
      id: 'inicio',
      label: 'Ranking',
      subtabs: [{ id: 'inicio', label: 'Ranking General' }],
    },
    {
      id: 'partidos',
      label: 'Partidos',
      subtabs: [
        { id: 'desig', label: 'Próximos' },
        { id: 'jugados', label: 'Jugados' },
        { id: 'res', label: 'Cargar resultado', requiresNotVisitor: true },
        { id: 'panel', label: 'Actas Digitales' },
      ],
    },
    {
      id: 'equipos',
      label: 'Equipos',
      subtabs: [
        { id: 'equipos', label: 'Plantillas' },
        { id: 'perfil', label: 'Perfiles y Stats' },
        { id: 'traspasos', label: 'Fichajes' },
      ],
    },
    {
      id: 'torneos',
      label: 'Torneos',
      subtabs: [{ id: 'torneos', label: 'Torneos' }],
    },
    {
      id: 'avisos',
      label: 'Avisos',
      subtabs: [{ id: 'avisos', label: 'Centro de Avisos' }],
    },
    {
      id: 'mas',
      label: 'Más',
      subtabs: [
        { id: 'arbitros', label: 'Árbitros' },
        { id: 'canchas', label: 'Canchas' },
        { id: 'entreno', label: 'Entrenos' },
        { id: 'reglas', label: 'Reglamento' },
        { id: 'cuenta', label: 'Cuenta y Roles' },
        { id: 'hist', label: 'Historial', requiresAdmin: true },
      ],
    },
  ];

  // Determine which group is active based on currentTab
  const activeGroup =
    navGroups.find(g => g.subtabs.some(s => s.id === currentTab)) || navGroups[0];

  const visibleSubtabs = activeGroup.subtabs.filter(s => {
    if (s.requiresAdmin && !isRealAdmin && activeRole !== 'admin') return false;
    if (s.requiresNotVisitor && activeRole === 'visitante' && !isRealAdmin) return false;
    return true;
  });

  return (
    <nav className="bg-white dark:bg-[#16262f] border-b border-slate-200 dark:border-slate-800 sticky top-[69px] z-30 shadow-sm">
      <div className="max-w-6xl mx-auto px-2">
        {/* Main groups scrollable bar */}
        <div className="flex gap-1 overflow-x-auto py-2 no-scrollbar scroll-smooth">
          {navGroups.map(group => {
            const isGroupActive = activeGroup.id === group.id;
            return (
              <button
                key={group.id}
                onClick={() => {
                  const firstValid =
                    group.subtabs.find(s => {
                      if (s.requiresAdmin && !isRealAdmin && activeRole !== 'admin') return false;
                      if (s.requiresNotVisitor && activeRole === 'visitante' && !isRealAdmin) return false;
                      return true;
                    }) || group.subtabs[0];
                  onTabChange(firstValid.id);
                }}
                className={`relative px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  isGroupActive
                    ? 'bg-[#0e8a5f] text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <span>{group.label}</span>
                {group.id === 'avisos' && unreadCount > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      isGroupActive ? 'bg-white text-[#0e8a5f]' : 'bg-rose-500 text-white'
                    }`}
                  >
                    {unreadCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Subtabs bar (if more than 1 option in group) */}
        {visibleSubtabs.length > 1 && (
          <div className="flex gap-1.5 overflow-x-auto py-1.5 border-t border-slate-100 dark:border-slate-800/60 no-scrollbar">
            {visibleSubtabs.map(sub => {
              const isSubActive = currentTab === sub.id;
              return (
                <button
                  key={sub.id}
                  onClick={() => onTabChange(sub.id)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all whitespace-nowrap ${
                    isSubActive
                      ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900 font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {sub.label}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </nav>
  );
};
