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
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'MEDIUM':
      case 'Warning Deviation':
      case 'DEGRADED':
      case 'warning':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'HIGH':
      case 'Critical Anomaly':
      case 'CRITICAL':
      case 'critical':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getSizeStyle = () => {
    switch (size) {
      case 'sm':
        return 'px-1.5 py-0.5 text-[10px]';
      case 'lg':
        return 'px-3 py-1 text-xs font-medium';
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
          status === 'LOW' || status === 'Normal' || status === 'HEALTHY'
            ? 'bg-emerald-500'
            : status === 'MEDIUM' || status === 'Warning Deviation' || status === 'DEGRADED'
            ? 'bg-amber-500'
            : 'bg-rose-500'
        }`}
      />
      {status}
    </span>
  );
};
