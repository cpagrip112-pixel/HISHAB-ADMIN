import React from 'react';

interface StatusBadgeProps {
  status: string | null | undefined;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '' }) => {
  if (!status) {
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200 ${className}`}>
        Not available
      </span>
    );
  }

  const s = status.toLowerCase();

  // Status mapping strictly adhering to design constitution (clean, functional colors, no excessive pills)
  if (['active', 'verified', 'success', 'paid', 'resolved'].includes(s)) {
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/80 ${className}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
        {status.toUpperCase()}
      </span>
    );
  }

  if (['pending', 'in_progress', 'open', 'draft'].includes(s)) {
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200/80 ${className}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
        {status.replace('_', ' ').toUpperCase()}
      </span>
    );
  }

  if (['trial', 'free_trial', 'free trial'].includes(s)) {
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-medium bg-sky-50 text-sky-700 border border-sky-200/80 ${className}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-sky-500"></span>
        FREE TRIAL
      </span>
    );
  }

  if (['expired', 'inactive', 'closed'].includes(s)) {
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200 ${className}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
        {status.toUpperCase()}
      </span>
    );
  }

  if (['rejected', 'failed', 'suspended', 'cancelled'].includes(s)) {
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200/80 ${className}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
        {status.toUpperCase()}
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200 ${className}`}>
      {status.toUpperCase()}
    </span>
  );
};
