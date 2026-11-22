import React from 'react';
import { PageId } from './Sidebar';
import { Database, RefreshCw, Cpu, Radio } from 'lucide-react';

interface HeaderProps {
  currentPage: PageId;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

const PAGE_TITLES: Record<PageId, { title: string; subtitle: string }> = {
  'command-center': {
    title: 'Fleet Command Center',
    subtitle: 'Industrial turbofan telemetry, prognostic fleet health matrix, and live anomaly stream',
  },
  'digital-twin': {
    title: 'Digital Twin Studio',
    subtitle: 'Physics-guided cutaway 3D turbofan inspection, stress simulations & prescriptive maintenance',
  },
  'machine-intelligence': {
    title: 'Machine Intelligence & Prediction',
    subtitle: 'Real-time multi-sensor inference, component RUL forecasting, and what-if parameter testing',
  },
  'model-evaluation': {
    title: 'Model Evaluation Center',
    subtitle: 'Zero-leakage cross-validation benchmarks: Ridge, Random Forest, Extra Trees, XGBoost, and LSTM',
  },
  'explainable-ai': {
    title: 'Explainable AI Center (SHAP)',
    subtitle: 'Thermodynamic feature attribution, Shapley value decomposition, and root-cause diagnostics',
  },
  'anomaly-intelligence': {
    title: 'Anomaly Intelligence & Subsystem Diagnostics',
    subtitle: 'Calibrated Isolation Forest & PCA reconstruction error with sensor-level z-score attribution',
  },
  'maintenance-planning': {
    title: 'Maintenance Planning & Decision Support',
    subtitle: 'Risk-prioritized turbofan queue, inspection scheduling windows, and overhaul trade-off models',
  },
  'mlops-health': {
    title: 'MLOps Governance & Platform Health',
    subtitle: 'Model registry metadata, feature schemas, dataset versions, and telemetry drift monitoring',
  },
};

export const Header: React.FC<HeaderProps> = ({ currentPage, onRefresh, isRefreshing = false }) => {
  const current = PAGE_TITLES[currentPage] || PAGE_TITLES['command-center'];

  return (
    <header className="h-18 bg-white border-b border-slate-200 px-6 lg:px-8 flex items-center justify-between shrink-0 z-10 shadow-xs">
      <div>
        <div className="flex items-center space-x-3">
          <h2 className="text-xl lg:text-2xl font-bold text-slate-900 tracking-tight font-mono">{current.title}</h2>
          <span className="hidden sm:inline-flex items-center text-xs font-mono font-medium px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700">
            <Radio className="w-3 h-3 mr-1.5 text-blue-600 animate-pulse" />
            LIVE TELEMETRY
          </span>
        </div>
        <p className="text-sm text-slate-500 hidden sm:block truncate max-w-xl mt-0.5">{current.subtitle}</p>
      </div>

      <div className="flex items-center space-x-3 lg:space-x-4">
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex items-center space-x-2 px-3.5 py-2 bg-slate-100 hover:bg-slate-200/90 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 transition-all duration-150 disabled:opacity-50 shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-600 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
            <span className="font-mono text-xs">{isRefreshing ? 'SYNCING...' : 'SYNC FLEET'}</span>
          </button>
        )}

        <div className="hidden md:flex items-center space-x-3 text-xs font-mono text-slate-600 pl-4 border-l border-slate-200">
          <div className="flex items-center space-x-1.5 bg-slate-50 px-3 py-1.5 rounded-md border border-slate-200">
            <Database className="w-3.5 h-3.5 text-blue-600" />
            <span className="text-xs font-medium text-slate-700">NASA C-MAPSS FD001</span>
          </div>
          <div className="flex items-center space-x-1.5 bg-slate-50 px-3 py-1.5 rounded-md border border-slate-200">
            <Cpu className="w-3.5 h-3.5 text-emerald-600" />
            <span className="text-xs font-medium text-slate-700">164 FEATURES</span>
          </div>
        </div>
      </div>
    </header>
  );
};
