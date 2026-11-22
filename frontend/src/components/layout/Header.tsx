import React from 'react';
import { PageId } from './Sidebar';
import { Database, RefreshCw, Cpu, Activity, Radio } from 'lucide-react';

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
    <header className="h-16 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 px-6 lg:px-8 flex items-center justify-between shrink-0 z-10">
      <div>
        <div className="flex items-center space-x-2.5">
          <h2 className="text-sm lg:text-base font-bold text-white tracking-tight font-mono">{current.title}</h2>
          <span className="hidden sm:inline-flex items-center text-[10px] font-mono px-2 py-0.5 rounded bg-blue-900/40 border border-blue-700/50 text-blue-300">
            <Radio className="w-2.5 h-2.5 mr-1 text-cyan-400 animate-pulse" />
            LIVE TELEMETRY
          </span>
        </div>
        <p className="text-xs text-slate-400 hidden sm:block truncate max-w-xl">{current.subtitle}</p>
      </div>

      <div className="flex items-center space-x-3 lg:space-x-4">
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700/90 border border-slate-700/70 hover:border-slate-600 rounded text-xs font-medium text-slate-200 transition-all duration-150 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-400 ${isRefreshing ? 'animate-spin text-cyan-400' : ''}`} />
            <span className="font-mono text-[11px]">{isRefreshing ? 'SYNCING...' : 'SYNC FLEET'}</span>
          </button>
        )}

        <div className="hidden md:flex items-center space-x-3 text-xs font-mono text-slate-400 pl-4 border-l border-slate-800">
          <div className="flex items-center space-x-1.5 bg-slate-950/60 px-2.5 py-1 rounded border border-slate-800/80">
            <Database className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-[11px] text-slate-300">NASA C-MAPSS FD001</span>
          </div>
          <div className="flex items-center space-x-1.5 bg-slate-950/60 px-2.5 py-1 rounded border border-slate-800/80">
            <Cpu className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[11px] text-slate-300">164 FEATURES</span>
          </div>
        </div>
      </div>
    </header>
  );
};
