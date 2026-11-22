import React from 'react';
import { PageId } from './Sidebar';
import { ShieldCheck, Database, RefreshCw, Cpu } from 'lucide-react';

interface HeaderProps {
  currentPage: PageId;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

const PAGE_TITLES: Record<PageId, { title: string; subtitle: string }> = {
  'command-center': {
    title: 'Fleet Command Center',
    subtitle: 'Commercial turbofan fleet health, real-time risk classification, and high-level prognostic status',
  },
  'digital-twin': {
    title: 'Digital Twin Studio',
    subtitle: 'Physics-guided cutaway 3D engine inspection, real-time stress testing & prescriptive maintenance',
  },
  'machine-intelligence': {
    title: 'Machine Intelligence & Prediction',
    subtitle: 'Live multi-sensor inference, component RUL estimation, and anomaly severity assessment',
  },
  'model-evaluation': {
    title: 'Model Evaluation Center',
    subtitle: 'Cross-validated benchmarks: Ridge, Random Forest, Extra Trees, XGBoost, and PyTorch LSTM',
  },
  'explainable-ai': {
    title: 'Explainable AI Center (SHAP)',
    subtitle: 'Thermodynamic feature attribution, Shapley value decomposition, and engineering diagnostics',
  },
  'anomaly-intelligence': {
    title: 'Anomaly Intelligence & Subsystem Diagnostics',
    subtitle: 'Calibrated dual Isolation Forest & PCA reconstruction error with sensor root-cause attribution',
  },
  'maintenance-planning': {
    title: 'Maintenance Planning & Decision Support',
    subtitle: 'Risk-ranked turbofan prioritization, inspection scheduling windows, and scenario recovery trade-offs',
  },
  'mlops-health': {
    title: 'MLOps Governance & Platform Health',
    subtitle: 'Model registry metadata, feature schemas, training datasets, and API uptime diagnostics',
  },
};

export const Header: React.FC<HeaderProps> = ({ currentPage, onRefresh, isRefreshing = false }) => {
  const current = PAGE_TITLES[currentPage];

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between shrink-0">
      <div>
        <h2 className="text-base font-bold text-slate-900 tracking-tight">{current.title}</h2>
        <p className="text-xs text-slate-500 hidden sm:block">{current.subtitle}</p>
      </div>

      <div className="flex items-center space-x-4">
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex items-center space-x-1.5 px-3 py-1.5 border border-slate-200 hover:bg-slate-50 rounded text-xs font-medium text-slate-700 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
            <span>{isRefreshing ? 'Refreshing...' : 'Refresh Fleet'}</span>
          </button>
        )}

        <div className="hidden md:flex items-center space-x-3 text-xs font-mono text-slate-500 pl-4 border-l border-slate-200">
          <div className="flex items-center space-x-1.5">
            <Database className="w-3.5 h-3.5 text-blue-600" />
            <span>NASA C-MAPSS FD001</span>
          </div>
          <span className="text-slate-300">•</span>
          <div className="flex items-center space-x-1.5">
            <Cpu className="w-3.5 h-3.5 text-emerald-600" />
            <span>164 FEATURES</span>
          </div>
        </div>
      </div>
    </header>
  );
};
