import React from 'react';
import { MaintenanceRisk, AnomalySeverity } from '../../types/api';

interface StatusBadgeProps {
  status: MaintenanceRisk | AnomalySeverity | string;
  size?: 'sm' | 'md' | 'lg';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const getBadgeStyle = () => {
    switch (status) {
      case 'LOW':
      case 'Normal':
      case 'HEALTHY':
      case 'healthy':
      case 'operational':
        return 'bg-emerald-950/70 text-emerald-300 border-emerald-800/60';
      case 'MEDIUM':
      case 'Warning Deviation':
      case 'DEGRADED':
      case 'warning':
        return 'bg-amber-950/70 text-amber-300 border-amber-800/60';
      case 'HIGH':
      case 'Critical Anomaly':
      case 'CRITICAL':
      case 'critical':
        return 'bg-rose-950/70 text-rose-300 border-rose-800/60';
      default:
        return 'bg-slate-800/80 text-slate-300 border-slate-700/60';
    }
  };

  const getSizeStyle = () => {
    switch (size) {
      case 'sm':
        return 'px-1.5 py-0.5 text-[10px]';
      case 'lg':
        return 'px-3 py-1 text-xs font-semibold';
      default:
        return 'px-2 py-0.5 text-xs font-medium';
    }
  };

  return (
    <span
      className={`inline-flex items-center rounded border font-mono tracking-wide ${getBadgeStyle()} ${getSizeStyle()}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
          status === 'LOW' || status === 'Normal' || status === 'HEALTHY' || status === 'healthy'
            ? 'bg-emerald-400'
            : status === 'MEDIUM' || status === 'Warning Deviation' || status === 'DEGRADED' || status === 'warning'
            ? 'bg-amber-400'
            : 'bg-rose-400 animate-pulse'
        }`}
      />
      {status}
    </span>
  );
};
