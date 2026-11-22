import React from 'react';
import { PageId } from './Sidebar';
import {
  Database,
  RefreshCw,
  Search,
  Bell,
  ChevronRight,
  User,
  Radio,
  SlidersHorizontal,
} from 'lucide-react';

interface HeaderProps {
  currentPage: PageId;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  selectedEngineId?: number;
  onSelectEngine?: (id: number) => void;
}

const PAGE_META: Record<PageId, { title: string; category: string; subtitle: string }> = {
  'command-center': {
    title: 'Command Center',
    category: 'Fleet Intelligence',
    subtitle: 'Real-time turbofan fleet telemetry, predictive RUL matrix, and live anomaly streams',
  },
  'digital-twin': {
    title: 'Digital Twin Studio',
    category: 'Physics & 3D Simulation',
    subtitle: 'Interactive cutaway engine inspection, operational stress testing & prescriptive recovery',
  },
  'machine-intelligence': {
    title: 'Machine Intelligence',
    category: 'Prognostic Inference',
    subtitle: 'Multi-sensor inference, component RUL forecasting, and what-if parameter tests',
  },
  'model-evaluation': {
    title: 'Model Evaluation',
    category: 'ML Governance',
    subtitle: 'Zero-leakage cross-validation benchmarks on NASA C-MAPSS FD001 turbofans',
  },
  'explainable-ai': {
    title: 'Explainable AI (SHAP)',
    category: 'Model Interpretability',
    subtitle: 'Thermodynamic feature attribution and Shapley value root-cause synthesis',
  },
  'anomaly-intelligence': {
    title: 'Anomaly Intelligence',
    category: 'Subsystem Diagnostics',
    subtitle: 'Dual Isolation Forest + PCA reconstruction error calibrated against baseline manifold',
  },
  'maintenance-planning': {
    title: 'Maintenance Planning',
    category: 'Asset Optimization',
    subtitle: 'Risk-prioritized turbofan queue, inspection windows, and overhaul trade-off models',
  },
  'mlops-health': {
    title: 'MLOps & Health',
    category: 'System Telemetry',
    subtitle: 'Artifact registry metadata, feature schemas, dataset versions, and drift monitoring',
  },
};

export const Header: React.FC<HeaderProps> = ({
  currentPage,
  onRefresh,
  isRefreshing = false,
  selectedEngineId = 1,
  onSelectEngine,
}) => {
  const current = PAGE_META[currentPage] || PAGE_META['command-center'];

  return (
    <header className="h-18 bg-white/90 backdrop-blur-md border-b border-[#E5E4DE] px-6 lg:px-8 flex items-center justify-between shrink-0 z-10 shadow-xs">
      {/* Left: Breadcrumbs & Page Title */}
      <div className="flex flex-col justify-center">
        <div className="flex items-center space-x-2 text-xs font-medium text-charcoal-500 mb-0.5">
          <span>{current.category}</span>
          <ChevronRight className="w-3.5 h-3.5 text-charcoal-400" />
          <span className="text-charcoal-800 font-semibold">{current.title}</span>
        </div>
        <div className="flex items-center space-x-3">
          <h2 className="text-xl lg:text-2xl font-bold text-charcoal-900 tracking-tight font-sans">
            {current.title}
          </h2>
          <span className="hidden sm:inline-flex items-center text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700">
            <Radio className="w-3 h-3 mr-1.5 text-blue-600 animate-pulse" />
            LIVE TELEMETRY
          </span>
        </div>
      </div>

      {/* Right: Controls, Engine Selector, Search, Notifications, Profile */}
      <div className="flex items-center space-x-3 lg:space-x-4">
        {/* Engine / Fleet Selector */}
        {onSelectEngine && (
          <div className="hidden sm:flex items-center space-x-2 bg-[#F7F6F2] border border-[#E5E4DE] rounded-xl px-3 py-1.5">
            <label className="text-xs font-semibold text-charcoal-500">ENGINE:</label>
            <select
              value={selectedEngineId}
              onChange={(e) => onSelectEngine(Number(e.target.value))}
              aria-label="Select Engine"
              className="bg-transparent text-xs font-bold text-charcoal-800 focus:outline-none cursor-pointer"
            >
              {Array.from({ length: 25 }, (_, i) => i + 1).map((id) => (
                <option key={id} value={id}>
                  ENG-{id.toString().padStart(3, '0')}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Global Search Input */}
        <div className="relative hidden md:block">
          <Search className="w-4 h-4 text-charcoal-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search telemetry or engine..."
            className="pl-9 pr-3.5 py-1.5 text-xs bg-[#F7F6F2] border border-[#E5E4DE] rounded-xl text-charcoal-800 placeholder-charcoal-400 w-48 lg:w-56 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
          />
        </div>

        {/* Fleet Sync Button */}
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex items-center space-x-1.5 px-3 py-2 bg-white hover:bg-[#F7F6F2] border border-[#E5E4DE] rounded-xl text-xs font-semibold text-charcoal-700 transition-all shadow-xs disabled:opacity-50"
            title="Synchronize with backend telemetry"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-charcoal-500 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
            <span className="hidden sm:inline">{isRefreshing ? 'Syncing...' : 'Sync Fleet'}</span>
          </button>
        )}

        {/* Notification Bell */}
        <button className="relative p-2 text-charcoal-600 hover:text-charcoal-900 bg-white border border-[#E5E4DE] rounded-xl hover:bg-[#F7F6F2] transition-colors shadow-xs">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-500 ring-2 ring-white"></span>
        </button>

        {/* User / Engineer Profile Badge */}
        <div className="flex items-center space-x-2 pl-2 border-l border-[#E5E4DE]">
          <div className="w-9 h-9 rounded-xl bg-[#E8E6DF] flex items-center justify-center text-charcoal-700 font-bold text-xs shadow-xs border border-[#DCDAD2]">
            SH
          </div>
          <div className="hidden xl:block text-left">
            <p className="text-xs font-bold text-charcoal-900 leading-tight">Dr. Harrison</p>
            <p className="text-[10px] text-charcoal-500 font-medium">Lead Propulsion</p>
          </div>
        </div>
      </div>
    </header>
  );
};
