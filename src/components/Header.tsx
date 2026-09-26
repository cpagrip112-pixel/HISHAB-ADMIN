import React from 'react';
import { Search, Menu, Database, Shield, ExternalLink, QrCode } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { isSupabaseConfigured } from '../lib/supabase';

interface HeaderProps {
  onOpenSearch: () => void;
  onOpenMobileMenu: () => void;
  onOpenProfile: () => void;
  currentTabName: string;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenSearch,
  onOpenMobileMenu,
  onOpenProfile,
  currentTabName,
}) => {
  const { user, role } = useAuth();
  const configured = isSupabaseConfigured();

  return (
    <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6">
      {/* Left: Mobile hamburger & Page Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>{currentTabName}</span>
          </h1>
        </div>
      </div>

      {/* Right Area: Search, UPI badge, Database Status, Admin Avatar */}
      <div className="flex items-center gap-2.5 sm:gap-4">
        {/* Global Search Trigger */}
        <button
          onClick={onOpenSearch}
          className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-500 rounded-lg text-xs font-medium transition-all shadow-2xs group cursor-pointer"
        >
          <Search className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 transition-colors" />
          <span className="hidden sm:inline">Search users, payments, UTR...</span>
          <span className="sm:hidden">Search...</span>
          <kbd className="hidden md:inline text-[10px] bg-white text-slate-400 px-1.5 py-0.5 rounded border border-slate-200 font-mono">
            ⌘K
          </kbd>
        </button>

        {/* UPI ID Pill */}
        <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 bg-blue-50/80 border border-blue-200/70 rounded-lg text-[11px] text-blue-900 font-medium">
          <QrCode className="w-3.5 h-3.5 text-blue-600" />
          <span>Manual UPI:</span>
          <span className="font-mono font-bold select-all text-blue-950">Q164166564@ybl</span>
        </div>

        {/* Live Supabase Status */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium border bg-slate-50 border-slate-200">
          <Database className={`w-3.5 h-3.5 ${configured ? 'text-emerald-600' : 'text-amber-500'}`} />
          <span className="hidden sm:inline text-slate-700">Supabase:</span>
          <span className={`inline-flex items-center gap-1 font-semibold ${configured ? 'text-emerald-700' : 'text-amber-700'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${configured ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
            {configured ? 'Connected' : 'Setup Required'}
          </span>
        </div>

        {/* Admin Profile Pill */}
        <button
          onClick={onOpenProfile}
          className="flex items-center gap-2 pl-2 pr-2.5 py-1 rounded-lg hover:bg-slate-100 border border-transparent hover:border-slate-200 transition-all text-left group"
        >
          <div className="w-7 h-7 rounded-lg bg-blue-700 text-white font-bold text-xs flex items-center justify-center shadow-xs">
            {user?.email ? user.email[0].toUpperCase() : 'A'}
          </div>
          <div className="hidden md:block">
            <div className="text-xs font-semibold text-slate-900 leading-tight">
              {user?.email ? user.email.split('@')[0] : 'Admin'}
            </div>
            <div className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">
              {role || 'Admin'}
            </div>
          </div>
        </button>
      </div>
    </header>
  );
};
