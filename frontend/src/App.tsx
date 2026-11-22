import React, { useState, useEffect } from 'react';
import { AppLayout } from './components/layout/AppLayout';
import { PageId } from './components/layout/Sidebar';
import { CommandCenter } from './pages/CommandCenter';
import { DigitalTwinStudio } from './pages/DigitalTwinStudio';
import { MachineIntelligence } from './pages/MachineIntelligence';
import { ModelEvaluation } from './pages/ModelEvaluation';
import { ExplainableAICenter } from './pages/ExplainableAICenter';
import { AnomalyIntelligence } from './pages/AnomalyIntelligence';
import { MaintenancePlanning } from './pages/MaintenancePlanning';
import { MLOpsSystemHealth } from './pages/MLOpsSystemHealth';
import { api } from './services/api';

export const App: React.FC = () => {
  const getPageFromHash = (): PageId => {
    const hash = window.location.hash.replace('#', '');
    const validPages: PageId[] = [
      'command-center',
      'digital-twin',
      'machine-intelligence',
      'model-evaluation',
      'explainable-ai',
      'anomaly-intelligence',
      'maintenance-planning',
      'mlops-health',
    ];
    return validPages.includes(hash as PageId) ? (hash as PageId) : 'command-center';
  };

  const [currentPage, setCurrentPage] = useState<PageId>(getPageFromHash());
  const [apiConnected, setApiConnected] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [selectedEngineId, setSelectedEngineId] = useState<number>(1);

  useEffect(() => {
    const handleHashChange = () => {
      setCurrentPage(getPageFromHash());
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleNavigate = (page: PageId) => {
    window.location.hash = page;
    setCurrentPage(page);
  };

  useEffect(() => {
    checkConnection();
    // Heartbeat connection check every 15 seconds
    const interval = setInterval(checkConnection, 15000);
    return () => clearInterval(interval);
  }, []);

  const checkConnection = async () => {
    try {
      const res = await api.checkHealth();
      setApiConnected(res.status === 'healthy' || res.status === 'ok');
    } catch {
      setApiConnected(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await checkConnection();
    setTimeout(() => {
      setIsRefreshing(false);
    }, 600);
  };

  const handleSelectEngine = (engineId: number) => {
    setSelectedEngineId(engineId);
    handleNavigate('machine-intelligence');
  };

  const renderActivePage = () => {
    switch (currentPage) {
      case 'command-center':
        return (
          <CommandCenter
            onSelectEngine={handleSelectEngine}
            onNavigateToTwin={() => handleNavigate('digital-twin')}
          />
        );
      case 'digital-twin':
        return <DigitalTwinStudio />;
      case 'machine-intelligence':
        return <MachineIntelligence />;
      case 'model-evaluation':
        return <ModelEvaluation />;
      case 'explainable-ai':
        return <ExplainableAICenter />;
      case 'anomaly-intelligence':
        return <AnomalyIntelligence />;
      case 'maintenance-planning':
        return <MaintenancePlanning />;
      case 'mlops-health':
        return <MLOpsSystemHealth />;
      default:
        return (
          <CommandCenter
            onSelectEngine={handleSelectEngine}
            onNavigateToTwin={() => handleNavigate('digital-twin')}
          />
        );
    }
  };

  return (
    <AppLayout
      currentPage={currentPage}
      onNavigate={handleNavigate}
      apiConnected={apiConnected}
      onRefresh={handleRefresh}
      isRefreshing={isRefreshing}
      selectedEngineId={selectedEngineId}
      onSelectEngine={(id) => setSelectedEngineId(id)}
    >
      {renderActivePage()}
    </AppLayout>
  );
};

export default App;
