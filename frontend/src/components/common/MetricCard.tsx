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
  const getIconContainerStyles = () => {
    switch (variant) {
      case 'success':
        return 'bg-emerald-50 text-emerald-700 border border-emerald-200/60';
      case 'warning':
        return 'bg-amber-50 text-amber-700 border border-amber-200/60';
      case 'danger':
        return 'bg-rose-50 text-rose-700 border border-rose-200/60';
      case 'accent':
        return 'bg-blue-50 text-blue-700 border border-blue-200/60';
      default:
        return 'bg-[#F4F3EE] text-charcoal-600 border border-[#E5E4DE]';
    }
  };

  const getAccentBorder = () => {
    switch (variant) {
      case 'success':
        return 'border-l-4 border-l-emerald-500';
      case 'warning':
        return 'border-l-4 border-l-amber-500';
      case 'danger':
        return 'border-l-4 border-l-rose-500';
      case 'accent':
        return 'border-l-4 border-l-blue-600';
      default:
        return 'border-l-4 border-l-charcoal-400';
    }
  };

  return (
    <div
      className={`bg-white border border-[#E5E4DE] rounded-2xl p-5 shadow-bento hover:shadow-md transition-all duration-200 ${getAccentBorder()} ${className}`}
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-charcoal-500 truncate">
            {title}
          </p>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-3xl lg:text-4xl font-bold text-charcoal-900 tracking-tight font-sans">
              {value}
            </span>
            {trend && (
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
                  trend.isPositive
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                    : 'bg-rose-50 border-rose-200 text-rose-700'
                }`}
              >
                {trend.value}
              </span>
            )}
          </div>
          {subtitle && <p className="mt-1.5 text-xs text-charcoal-500 truncate font-normal">{subtitle}</p>}
        </div>
        {Icon && (
          <div className={`p-2.5 rounded-xl shrink-0 ml-3 ${getIconContainerStyles()}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
    </div>
  );
};
