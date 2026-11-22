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
        return 'border-l-emerald-500 text-emerald-950';
      case 'warning':
        return 'border-l-amber-500 text-amber-950';
      case 'danger':
        return 'border-l-rose-500 text-rose-950';
      case 'accent':
        return 'border-l-blue-600 text-blue-950';
      default:
        return 'border-l-slate-400 text-slate-900';
    }
  };

  return (
    <div
      className={`bg-white rounded-lg border border-slate-200 p-5 shadow-xs border-l-4 transition-all duration-200 hover:shadow-sm ${getVariantStyles()} ${className}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500 tracking-wider uppercase">{title}</p>
          <div className="mt-1 flex items-baseline space-x-2">
            <span className="text-2xl font-bold font-mono text-slate-900 tracking-tight">{value}</span>
            {trend && (
              <span
                className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
                  trend.isPositive ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                }`}
              >
                {trend.value}
              </span>
            )}
          </div>
          {subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}
        </div>
        {Icon && (
          <div className="p-2.5 rounded-md bg-slate-100 text-slate-600">
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
    </div>
  );
};
