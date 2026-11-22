import React from 'react';

interface LoadingSpinnerProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ message = 'Loading telemetry...', size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-5 h-5 border-2',
    md: 'w-9 h-9 border-3',
    lg: 'w-14 h-14 border-4',
  }[size];

  return (
    <div className="flex flex-col items-center justify-center p-12 space-y-4">
      <div className={`${sizeClasses} border-slate-200 border-t-blue-600 rounded-full animate-spin shadow-xs`} />
      {message && <p className="text-sm font-mono text-slate-600 uppercase tracking-wider font-medium">{message}</p>}
    </div>
  );
};
