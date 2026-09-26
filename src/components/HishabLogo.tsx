import React from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showTagline?: boolean;
}

export const HishabLogo: React.FC<LogoProps> = ({ className = '', size = 'md', showTagline = false }) => {
  const iconSizes = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-11 h-11',
  };

  const textSizes = {
    sm: 'text-base',
    md: 'text-lg',
    lg: 'text-xl',
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Hishab Brand Icon: Navy square with sleek billing ledger glyph */}
      <div
        className={`${iconSizes[size]} bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-800 rounded-xl flex items-center justify-center text-white shadow-sm ring-1 ring-blue-500/20 shrink-0`}
      >
        <svg
          className="w-5 h-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Stylized Ledger & Checkmark */}
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
          <path d="M8 10h8" />
          <path d="M8 14h5" />
          <path d="M16 14l2 2 3-3" strokeWidth="2.2" />
        </svg>
      </div>

      <div className="flex flex-col">
        <div className="flex items-center gap-1.5">
          <span className={`font-bold tracking-tight text-slate-900 ${textSizes[size]}`}>
            HISHAB
          </span>
          <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-200/60">
            ADMIN
          </span>
        </div>
        {showTagline && (
          <span className="text-[11px] font-medium text-slate-500 tracking-tight">
            Smart Billing. Simple Business.
          </span>
        )}
      </div>
    </div>
  );
};
