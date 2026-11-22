import React from 'react';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  trend?: {
    value: string | number;
    isPositive?: boolean;
    label?: string;
  };
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'accent';
  className?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  variant = 'default',
  className = '',
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'success':
        return 'border-l-emerald-500 bg-slate-900/80 text-emerald-400';
      case 'warning':
        return 'border-l-amber-500 bg-slate-900/80 text-amber-400';
      case 'danger':
        return 'border-l-rose-500 bg-slate-900/80 text-rose-400';
      case 'accent':
        return 'border-l-cyan-500 bg-slate-900/80 text-cyan-400';
      default:
        return 'border-l-slate-600 bg-slate-900/80 text-slate-300';
    }
  };

  const getIconContainerStyles = () => {
    switch (variant) {
      case 'success':
        return 'bg-emerald-950/60 border border-emerald-800/40 text-emerald-400';
      case 'warning':
        return 'bg-amber-950/60 border border-amber-800/40 text-amber-400';
      case 'danger':
        return 'bg-rose-950/60 border border-rose-800/40 text-rose-400';
      case 'accent':
        return 'bg-cyan-950/60 border border-cyan-800/40 text-cyan-400';
      default:
        return 'bg-slate-800/80 border border-slate-700/60 text-slate-300';
    }
  };

  return (
    <div
      className={`rounded-lg border border-slate-800/90 p-4.5 shadow-md border-l-4 transition-all duration-200 hover:border-slate-700/90 ${getVariantStyles()} ${className}`}
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-mono uppercase tracking-wider text-slate-400 truncate font-semibold">
            {title}
          </p>
          <div className="mt-1.5 flex items-baseline space-x-2">
            <span className="text-2xl font-bold font-mono text-white tracking-tight">{value}</span>
            {trend && (
              <span
                className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded border ${
                  trend.isPositive
                    ? 'bg-emerald-950/80 border-emerald-800/60 text-emerald-400'
                    : 'bg-rose-950/80 border-rose-800/60 text-rose-400'
                }`}
              >
                {trend.value}
              </span>
            )}
          </div>
          {subtitle && <p className="mt-1 text-xs text-slate-400 truncate">{subtitle}</p>}
        </div>
        {Icon && (
          <div className={`p-2 rounded-md shrink-0 ml-3 ${getIconContainerStyles()}`}>
            <Icon className="w-4.5 h-4.5" />
          </div>
        )}
      </div>
    </div>
  );
};
