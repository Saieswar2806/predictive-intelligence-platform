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
  const [currentPage, setCurrentPage] = useState<PageId>('command-center');
  const [apiConnected, setApiConnected] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [selectedEngineId, setSelectedEngineId] = useState<number>(1);

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
    setCurrentPage('machine-intelligence');
  };

  const renderActivePage = () => {
    switch (currentPage) {
      case 'command-center':
        return (
          <CommandCenter
            onSelectEngine={handleSelectEngine}
            onNavigateToTwin={() => setCurrentPage('digital-twin')}
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
            onNavigateToTwin={() => setCurrentPage('digital-twin')}
          />
        );
    }
  };

  return (
    <AppLayout
      currentPage={currentPage}
      onNavigate={setCurrentPage}
      apiConnected={apiConnected}
      onRefresh={handleRefresh}
      isRefreshing={isRefreshing}
    >
      {renderActivePage()}
    </AppLayout>
  );
};

export default App;
