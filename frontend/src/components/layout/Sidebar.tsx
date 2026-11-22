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
    <aside className="w-68 bg-white border-r border-slate-200 flex flex-col shrink-0 select-none shadow-xs">
      {/* Brand & Logo */}
      <div className="h-18 flex items-center px-6 border-b border-slate-200 bg-white">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs">
            <Layers className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900 tracking-wider font-mono">AEROTWIN AI</h1>
            <p className="text-xs text-slate-500 font-mono tracking-tight font-medium">PREDICTIVE PLATFORM</p>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 py-5 px-3.5 space-y-1.5 overflow-y-auto">
        <div className="px-3 pb-2">
          <span className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold">
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
              className={`w-full flex items-center space-x-3 px-3.5 py-3 rounded-lg text-sm font-medium transition-all duration-150 text-left ${
                isActive
                  ? 'bg-blue-600 text-white shadow-xs font-semibold'
                  : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Icon className={`w-4.5 h-4.5 ${isActive ? 'text-white' : 'text-slate-500'}`} />
              <span className="flex-1">{item.label}</span>
              {item.highlight && !isActive && (
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Backend Operational Status Footer */}
      <div className="p-4 border-t border-slate-200 bg-slate-50">
        <div className="bg-white rounded-lg border border-slate-200 p-3 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-slate-600 font-medium">FASTAPI SERVER</span>
            <span
              className={`inline-flex items-center text-xs font-mono font-semibold px-2.5 py-0.5 rounded-full ${
                apiConnected ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full mr-1.5 ${apiConnected ? 'bg-emerald-500' : 'bg-rose-500'}`}
              />
              {apiConnected ? 'ONLINE' : 'CONNECTING'}
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
};
