/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider, useData } from './context/DataContext';
import { Header } from './components/Header';
import { Navigation } from './components/Navigation';
import { RankingView } from './components/RankingView';
import { MatchesView } from './components/MatchesView';
import { PlayedMatchesView } from './components/PlayedMatchesView';
import { ResultsReportView } from './components/ResultsReportView';
import { MatchSheetView } from './components/MatchSheetView';
import { TeamsAndPlayersView } from './components/TeamsAndPlayersView';
import { ProfilesView } from './components/ProfilesView';
import { TransfersView } from './components/TransfersView';
import { TournamentsView } from './components/TournamentsView';
import { NotificationsView } from './components/NotificationsView';
import { RefereesView } from './components/RefereesView';
import { VenuesView } from './components/VenuesView';
import { TrainingsView } from './components/TrainingsView';
import { RegulationsView } from './components/RegulationsView';
import { AccountView } from './components/AccountView';
import { AuditView } from './components/AuditView';

const MainContent: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<string>('inicio');
  const { user, userProfile, isRealAdmin, activeRole, activeTeam, activeRef } = useAuth();
  const { matches, referees, solicitudes, propuestas, users, playerClaims, mvpVotes } = useData();

  const isAdmin = isRealAdmin || activeRole === 'admin';
  const isCaptain = activeRole === 'capitan';
  const isReferee = activeRole === 'arbitro';

  // Compute unread alert count
  let unreadCount = 0;
  if (isAdmin) {
    unreadCount += playerClaims.filter(c => c.status === 'pend').length;
    unreadCount += matches.filter(m => !m.played && m.disputa).length;
    unreadCount += solicitudes.filter(s => s.st === 'pend').length;
    unreadCount += referees.filter(r => !r.ok).length;
    unreadCount += users.filter(u => u.role === 'visitante').length;
  }
  const MVP_LIMIT_MS = 24 * 60 * 60 * 1000;
  if (user && userProfile?.playerId) {
    const myPid = userProfile.playerId;
    unreadCount += matches.filter(m => {
      if (!m.played) return false;
      const recTime = m.resultRecordedAt || m.updatedAt || m.createdAt || 0;
      if (!recTime || Date.now() - recTime >= MVP_LIMIT_MS) return false;

      const wasStarter = Array.isArray(m.part) && m.part.some(x => x.p === myPid);
      const wasSub = Array.isArray(m.subs) && m.subs.some(s => s.in === myPid || s.out === myPid);
      if (!wasStarter && !wasSub) return false;
      return !mvpVotes.some(v => v.matchId === m.id && v.voterUserId === user.uid);
    }).length;
  }
  if (isCaptain && activeTeam) {
    unreadCount += solicitudes.filter(s => s.st === 'pend' && s.from === activeTeam).length;
    unreadCount += propuestas.filter(p => p.st === 'abierta' && p.resp && p.resp[activeTeam] === null).length;
  }
  if (isReferee && activeRef) {
    unreadCount += matches.filter(m => !m.played && m.ref === activeRef).length;
    if (user) {
      unreadCount += matches.filter(m => {
        if (!m.played || m.ref !== activeRef) return false;
        const recTime = m.resultRecordedAt || m.updatedAt || m.createdAt || 0;
        if (!recTime || Date.now() - recTime >= MVP_LIMIT_MS) return false;
        return !mvpVotes.some(v => v.matchId === m.id && v.voterUserId === user.uid);
      }).length;
    }
  }

  const renderActiveView = () => {
    switch (currentTab) {
      case 'inicio':
        return <RankingView />;
      case 'desig':
        return <MatchesView />;
      case 'jugados':
        return <PlayedMatchesView />;
      case 'res':
        return <ResultsReportView />;
      case 'panel':
        return <MatchSheetView />;
      case 'equipos':
        return <TeamsAndPlayersView />;
      case 'perfil':
        return <ProfilesView />;
      case 'traspasos':
        return <TransfersView />;
      case 'torneos':
        return <TournamentsView />;
      case 'avisos':
        return <NotificationsView onNavigate={tab => setCurrentTab(tab)} />;
      case 'arbitros':
        return <RefereesView />;
      case 'canchas':
        return <VenuesView />;
      case 'entreno':
        return <TrainingsView />;
      case 'reglas':
        return <RegulationsView />;
      case 'cuenta':
        return <AccountView />;
      case 'hist':
        return <AuditView />;
      default:
        return <RankingView />;
    }
  };

  return (
    <div className="min-h-screen bg-[#eef3f2] dark:bg-[#0e1a23] text-[#142433] dark:text-[#e8f1ee] flex flex-col font-sans">
      <Header currentTab={currentTab} onNavigate={setCurrentTab} unreadCount={unreadCount} />
      <Navigation currentTab={currentTab} onTabChange={setCurrentTab} unreadCount={unreadCount} />

      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6">
        {renderActiveView()}
      </main>

      <footer className="bg-white dark:bg-[#16262f] border-t border-slate-200 dark:border-slate-800 text-center py-5 text-xs text-slate-500 dark:text-slate-400">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>© KAPE A.F. · Asociación de Fútbol. Todos los derechos reservados.</span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCurrentTab('reglas')}
              className="hover:text-[#0e8a5f] underline transition-colors"
            >
              Reglamento Oficial
            </button>
            <span>·</span>
            <button
              onClick={() => setCurrentTab('cuenta')}
              className="hover:text-[#0e8a5f] underline transition-colors"
            >
              Control de Acceso
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <MainContent />
      </DataProvider>
    </AuthProvider>
  );
}
