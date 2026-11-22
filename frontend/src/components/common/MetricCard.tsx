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
        return 'border-l-emerald-500 bg-white text-emerald-700';
      case 'warning':
        return 'border-l-amber-500 bg-white text-amber-700';
      case 'danger':
        return 'border-l-rose-500 bg-white text-rose-700';
      case 'accent':
        return 'border-l-blue-600 bg-white text-blue-700';
      default:
        return 'border-l-slate-400 bg-white text-slate-700';
    }
  };

  const getIconContainerStyles = () => {
    switch (variant) {
      case 'success':
        return 'bg-emerald-50 border border-emerald-200 text-emerald-600';
      case 'warning':
        return 'bg-amber-50 border border-amber-200 text-amber-600';
      case 'danger':
        return 'bg-rose-50 border border-rose-200 text-rose-600';
      case 'accent':
        return 'bg-blue-50 border border-blue-200 text-blue-600';
      default:
        return 'bg-slate-100 border border-slate-200 text-slate-600';
    }
  };

  return (
    <div
      className={`rounded-xl border border-slate-200/90 p-5 shadow-xs border-l-4 transition-all duration-200 hover:shadow-sm ${getVariantStyles()} ${className}`}
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold uppercase tracking-wider text-slate-500 truncate">
            {title}
          </p>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-3xl lg:text-4xl font-bold font-mono text-slate-900 tracking-tight">{value}</span>
            {trend && (
              <span
                className={`text-xs font-mono font-semibold px-2 py-0.5 rounded-full border ${
                  trend.isPositive
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                    : 'bg-rose-50 border-rose-200 text-rose-700'
                }`}
              >
                {trend.value}
              </span>
            )}
          </div>
          {subtitle && <p className="mt-1.5 text-xs text-slate-500 truncate">{subtitle}</p>}
        </div>
        {Icon && (
          <div className={`p-2.5 rounded-lg shrink-0 ml-3 ${getIconContainerStyles()}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
    </div>
  );
};
