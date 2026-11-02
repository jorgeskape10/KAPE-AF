import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { LOGO_DATA } from '../constants';
import { UserRole } from '../types';
import { LogIn, LogOut, Shield, User, Award, Eye, Bell } from 'lucide-react';

interface HeaderProps {
  currentTab: string;
  onNavigate: (tab: string) => void;
  unreadCount: number;
}

export const Header: React.FC<HeaderProps> = ({ currentTab, onNavigate, unreadCount }) => {
  const {
    user,
    userProfile,
    activeRole,
    activeTeam,
    activeRef,
    isRealAdmin,
    setSimulatedRole,
    signInWithGoogle,
    logout,
  } = useAuth();

  const { teams, referees } = useData();

  const roleLabels: Record<UserRole, string> = {
    admin: 'Administrador',
    capitan: 'Capitán',
    arbitro: 'Árbitro',
    visitante: 'Visitante',
  };

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/40';
      case 'capitan':
        return 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-500/40';
      case 'arbitro':
        return 'bg-sky-500/20 text-sky-700 dark:text-sky-400 border-sky-500/40';
      default:
        return 'bg-slate-500/20 text-slate-700 dark:text-slate-400 border-slate-500/40';
    }
  };

  const currentTeamName = teams.find(t => t.id === activeTeam)?.name;
  const currentRefName = referees.find(r => r.id === activeRef)?.name;

  return (
    <header className="bg-white dark:bg-[#16262f] border-b-4 border-[#0e8a5f] shadow-md px-4 py-3 sticky top-0 z-40">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Brand */}
        <div
          onClick={() => onNavigate('inicio')}
          className="flex items-center gap-3 cursor-pointer select-none group"
        >
          <img
            src={LOGO_DATA}
            alt="KAPE A.F. Logo"
            className="h-12 w-auto object-contain drop-shadow transition-transform group-hover:scale-105"
          />
          <div>
            <h1 className="text-xl font-bold tracking-wider text-[#142433] dark:text-[#e8f1ee] leading-tight">
              KAPE A.F.
            </h1>
            <span className="text-[11px] font-semibold tracking-widest text-[#0e8a5f] dark:text-[#6fe3ae] uppercase">
              Asociación de Fútbol
            </span>
          </div>
        </div>

        {/* User Info / Controls */}
        <div className="flex flex-wrap items-center justify-end gap-2 text-sm w-full sm:w-auto">
          {user ? (
            <div className="flex flex-wrap items-center gap-2">
              {/* Notification icon */}
              <button
                onClick={() => onNavigate('avisos')}
                className={`relative p-2 rounded-full border transition-colors ${
                  currentTab === 'avisos'
                    ? 'bg-[#0e8a5f] text-white border-[#0e8a5f]'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-200'
                }`}
                title="Avisos pendientes"
              >
                <Bell size={16} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-rose-600 text-white text-[10px] font-bold h-4 w-4 rounded-full flex items-center justify-center animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* User avatar & name */}
              <div
                onClick={() => onNavigate('cuenta')}
                className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/80 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer hover:border-[#0e8a5f] transition-all"
                title="Ver mi cuenta y perfil"
              >
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'Avatar'}
                    className="w-7 h-7 rounded-full object-cover border border-slate-300 dark:border-slate-600"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-[#0e8a5f] text-white font-bold text-xs flex items-center justify-center">
                    {(user.displayName || user.email || 'U')[0].toUpperCase()}
                  </div>
                )}
                <div className="text-left hidden md:block leading-tight">
                  <div className="font-semibold text-xs text-[#142433] dark:text-[#e8f1ee] truncate max-w-[130px]">
                    {user.displayName || user.email}
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">
                    {activeRole === 'capitan' && currentTeamName
                      ? `Capitán · ${currentTeamName}`
                      : activeRole === 'arbitro' && currentRefName
                      ? `Árbitro · ${currentRefName}`
                      : roleLabels[activeRole]}
                  </div>
                </div>

                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getRoleBadgeColor(
                    activeRole
                  )}`}
                >
                  {roleLabels[activeRole]}
                </span>
              </div>

              {/* Admin simulation selector (if real admin) */}
              {isRealAdmin && (
                <div className="hidden lg:flex items-center gap-1.5 bg-amber-500/10 px-2 py-1 rounded-lg border border-amber-500/30 text-xs">
                  <Eye size={13} className="text-amber-600 dark:text-amber-400" />
                  <span className="font-semibold text-amber-700 dark:text-amber-300 text-[11px]">
                    Simular:
                  </span>
                  <select
                    className="bg-transparent text-xs text-slate-800 dark:text-slate-200 font-medium outline-none cursor-pointer"
                    value={
                      activeRole === 'admin'
                        ? 'admin'
                        : activeRole === 'capitan'
                        ? `capitan:${activeTeam}`
                        : activeRole === 'arbitro'
                        ? `arbitro:${activeRef}`
                        : 'visitante'
                    }
                    onChange={e => {
                      const val = e.target.value;
                      if (val === 'admin' || val === 'visitante') {
                        setSimulatedRole(val as UserRole);
                      } else {
                        const [r, id] = val.split(':');
                        if (r === 'capitan') setSimulatedRole('capitan', id);
                        if (r === 'arbitro') setSimulatedRole('arbitro', '', id);
                      }
                    }}
                  >
                    <option value="admin">Administrador (Real)</option>
                    <option value="visitante">Visitante</option>
                    <optgroup label="Capitán de:">
                      {teams.map(t => (
                        <option key={t.id} value={`capitan:${t.id}`}>
                          {t.name}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Árbitro:">
                      {referees.map(r => (
                        <option key={r.id} value={`arbitro:${r.id}`}>
                          {r.name}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>
              )}

              {/* Logout button */}
              <button
                onClick={logout}
                className="p-1.5 text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 transition-colors"
                title="Cerrar sesión"
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <button
              onClick={signInWithGoogle}
              className="flex items-center gap-2 bg-[#0e8a5f] hover:bg-[#0b7a43] text-white font-semibold text-xs px-3.5 py-2 rounded-xl shadow-sm transition-all transform active:scale-95"
            >
              <LogIn size={15} />
              <span>Acceder con Google</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
