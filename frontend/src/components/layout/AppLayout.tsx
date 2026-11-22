import React from 'react';
import { Sidebar, PageId } from './Sidebar';
import { Header } from './Header';

interface AppLayoutProps {
  currentPage: PageId;
  onNavigate: (page: PageId) => void;
  apiConnected: boolean;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  currentPage,
  onNavigate,
  apiConnected,
  onRefresh,
  isRefreshing,
  children,
}) => {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 text-slate-800">
      {/* Permanent Clean Industrial Navigation Sidebar */}
      <Sidebar currentPage={currentPage} onNavigate={onNavigate} apiConnected={apiConnected} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-50">
        <Header currentPage={currentPage} onRefresh={onRefresh} isRefreshing={isRefreshing} />

        <main className="flex-1 overflow-y-auto p-6 lg:p-8 bg-slate-50 text-slate-800">
          <div className="max-w-7xl mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
