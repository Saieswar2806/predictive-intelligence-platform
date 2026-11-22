import React, { useState } from 'react';
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
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
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
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPage,
  onNavigate,
  apiConnected,
  isExpanded: externalExpanded,
  onToggleExpand: externalToggle,
}) => {
  const [internalExpanded, setInternalExpanded] = useState(false);
  const isExpanded = externalExpanded !== undefined ? externalExpanded : internalExpanded;
  const toggleExpand = externalToggle || (() => setInternalExpanded(!internalExpanded));

  const navItems = [
    { id: 'command-center' as PageId, label: 'Command Center', icon: LayoutDashboard },
    { id: 'digital-twin' as PageId, label: 'Digital Twin Studio', icon: Box, badge: '3D' },
    { id: 'machine-intelligence' as PageId, label: 'Machine Intelligence', icon: Cpu },
    { id: 'model-evaluation' as PageId, label: 'Model Evaluation', icon: BarChart3 },
    { id: 'explainable-ai' as PageId, label: 'Explainable AI', icon: HelpCircle },
    { id: 'anomaly-intelligence' as PageId, label: 'Anomaly Intelligence', icon: AlertTriangle },
    { id: 'maintenance-planning' as PageId, label: 'Maintenance Planning', icon: Wrench },
    { id: 'mlops-health' as PageId, label: 'MLOps & Health', icon: Activity },
  ];

  return (
    <aside
      className={`${
        isExpanded ? 'w-64' : 'w-20'
      } bg-[#FAF9F5] border-r border-[#E5E4DE] flex flex-col shrink-0 select-none transition-all duration-300 ease-in-out z-20 shadow-xs relative`}
    >
      {/* Brand & Logo */}
      <div className="h-18 flex items-center px-4.5 border-b border-[#E5E4DE] justify-between">
        <div className="flex items-center space-x-3 overflow-hidden">
          <div className="w-10 h-10 rounded-xl bg-[#2563EB] flex items-center justify-center text-white shadow-xs shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          {isExpanded && (
            <div className="min-w-0 transition-opacity duration-200">
              <h1 className="text-sm font-bold text-charcoal-900 tracking-wide font-sans truncate">AEROTWIN</h1>
              <p className="text-[11px] text-charcoal-500 font-medium tracking-tight truncate">Industrial AI Twin</p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 py-5 px-3 space-y-1.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              title={!isExpanded ? item.label : undefined}
              className={`w-full group relative flex items-center rounded-xl text-sm font-medium transition-all duration-150 ${
                isExpanded ? 'px-3.5 py-3 space-x-3' : 'justify-center py-3'
              } ${
                isActive
                  ? 'bg-white text-[#2563EB] shadow-xs border border-[#E5E4DE] font-semibold'
                  : 'text-charcoal-600 hover:bg-[#F2F1EC] hover:text-charcoal-900'
              }`}
            >
              <Icon
                className={`w-5 h-5 shrink-0 ${
                  isActive ? 'text-[#2563EB]' : 'text-charcoal-500 group-hover:text-charcoal-800'
                }`}
              />

              {isExpanded && <span className="flex-1 text-left truncate">{item.label}</span>}

              {item.badge && isExpanded && (
                <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-blue-50 text-blue-700 border border-blue-200">
                  {item.badge}
                </span>
              )}

              {/* Tooltip for collapsed mode */}
              {!isExpanded && (
                <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-charcoal-900 text-white text-xs font-medium rounded-lg whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity shadow-md z-50">
                  {item.label}
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* Sidebar Expand / Collapse Toggle Button */}
      <div className="px-3 pb-3">
        <button
          onClick={toggleExpand}
          className="w-full flex items-center justify-center p-2 rounded-xl text-charcoal-500 hover:text-charcoal-900 hover:bg-[#F0EFEA] border border-transparent hover:border-[#E5E4DE] transition-all text-xs font-medium"
          title={isExpanded ? 'Collapse Sidebar' : 'Expand Sidebar'}
        >
          {isExpanded ? (
            <div className="flex items-center space-x-2">
              <ChevronLeft className="w-4 h-4" />
              <span>Collapse Menu</span>
            </div>
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Backend Operational Status Footer */}
      <div className="p-3 border-t border-[#E5E4DE] bg-[#F7F6F2]">
        <div className="flex items-center justify-center">
          {isExpanded ? (
            <div className="w-full bg-white rounded-xl border border-[#E5E4DE] p-2.5 shadow-xs flex items-center justify-between">
              <span className="text-xs text-charcoal-600 font-medium">FastAPI Engine</span>
              <span
                className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full ${
                  apiConnected
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${apiConnected ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                {apiConnected ? 'ONLINE' : 'CONNECTING'}
              </span>
            </div>
          ) : (
            <div
              className={`w-3 h-3 rounded-full ${
                apiConnected ? 'bg-emerald-500' : 'bg-rose-500'
              } ring-4 ring-emerald-100`}
              title={apiConnected ? 'FastAPI Backend Online' : 'FastAPI Connecting...'}
            />
          )}
        </div>
      </div>
    </aside>
  );
};
