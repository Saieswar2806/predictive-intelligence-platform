import React from 'react';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({ title, subtitle, action }) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#E5E4DE] gap-2">
      <div>
        <h2 className="text-xl lg:text-2xl font-bold text-charcoal-900 tracking-tight font-sans">{title}</h2>
        {subtitle && <p className="text-sm text-charcoal-500 mt-1 font-normal">{subtitle}</p>}
      </div>
      {action && <div className="flex items-center space-x-2">{action}</div>}
    </div>
  );
};
