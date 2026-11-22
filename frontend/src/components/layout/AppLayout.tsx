import React from 'react';
import { Sidebar, PageId } from './Sidebar';
import { Header } from './Header';

interface AppLayoutProps {
  currentPage: PageId;
  onNavigate: (page: PageId) => void;
  apiConnected: boolean;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  selectedEngineId?: number;
  onSelectEngine?: (id: number) => void;
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  currentPage,
  onNavigate,
  apiConnected,
  onRefresh,
  isRefreshing,
  selectedEngineId,
  onSelectEngine,
  children,
}) => {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#F7F6F2] text-charcoal-900 font-sans">
      {/* Slim Modern Left Sidebar */}
      <Sidebar currentPage={currentPage} onNavigate={onNavigate} apiConnected={apiConnected} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#F7F6F2]">
        <Header
          currentPage={currentPage}
          onRefresh={onRefresh}
          isRefreshing={isRefreshing}
          selectedEngineId={selectedEngineId}
          onSelectEngine={onSelectEngine}
        />

        <main className="flex-1 overflow-y-auto p-6 lg:p-8 bg-[#F7F6F2] text-charcoal-900">
          <div className="max-w-7xl mx-auto space-y-7">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
