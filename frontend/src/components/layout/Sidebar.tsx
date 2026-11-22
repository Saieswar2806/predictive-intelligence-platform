import React from 'react';
import {
  LayoutDashboard,
  Box,
  Cpu,
  BarChart3,
  HelpCircle,
  AlertTriangle,
  Wrench,
  Activity,
  Layers,
} from 'lucide-react';

export type PageId =
  | 'command-center'
  | 'digital-twin'
  | 'machine-intelligence'
  | 'model-evaluation'
  | 'explainable-ai'
  | 'anomaly-intelligence'
  | 'maintenance-planning'
  | 'mlops-health';

interface SidebarProps {
  currentPage: PageId;
  onNavigate: (page: PageId) => void;
  apiConnected: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentPage, onNavigate, apiConnected }) => {
  const navItems = [
    { id: 'command-center' as PageId, label: 'Command Center', icon: LayoutDashboard },
    { id: 'digital-twin' as PageId, label: 'Digital Twin Studio', icon: Box, highlight: true },
    { id: 'machine-intelligence' as PageId, label: 'Machine Intelligence', icon: Cpu },
    { id: 'model-evaluation' as PageId, label: 'Model Evaluation', icon: BarChart3 },
    { id: 'explainable-ai' as PageId, label: 'Explainable AI (SHAP)', icon: HelpCircle },
    { id: 'anomaly-intelligence' as PageId, label: 'Anomaly Intelligence', icon: AlertTriangle },
    { id: 'maintenance-planning' as PageId, label: 'Maintenance Planning', icon: Wrench },
    { id: 'mlops-health' as PageId, label: 'MLOps & Health', icon: Activity },
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 select-none">
      {/* Brand & Logo */}
      <div className="h-16 flex items-center px-6 border-b border-slate-800/80 bg-slate-950/60">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-md bg-blue-600 flex items-center justify-center text-white shadow-xs">
            <Layers className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white tracking-wider font-mono">AEROTWIN AI</h1>
            <p className="text-[10px] text-slate-400 font-mono tracking-tight">PREDICTIVE PLATFORM</p>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold">
            ENGINEERING MODULES
          </span>
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-md text-xs font-medium transition-all duration-150 text-left ${
                isActive
                  ? 'bg-blue-600/90 text-white shadow-xs'
                  : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              <span className="flex-1">{item.label}</span>
              {item.highlight && !isActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Backend Operational Status Footer */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/40">
        <div className="bg-slate-900/90 rounded border border-slate-800 p-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-slate-400">FASTAPI SERVER</span>
            <span
              className={`inline-flex items-center text-[10px] font-mono font-semibold px-2 py-0.5 rounded ${
                apiConnected ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full mr-1.5 ${apiConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`}
              />
              {apiConnected ? 'ONLINE' : 'CONNECTING'}
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1 font-mono">PORT 8000 • C-MAPSS FD001</p>
        </div>
      </div>
    </aside>
  );
};
