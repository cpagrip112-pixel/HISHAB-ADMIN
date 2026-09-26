import React, { useState } from 'react';
import { X, Copy, Check, Shield, User, Mail, Clock, LogOut, ShieldCheck, KeyRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface AdminProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminProfileModal: React.FC<AdminProfileModalProps> = ({ isOpen, onClose }) => {
  const { user, role, logout, isMfaVerified, mfaLevel, selectedFactorId } = useAuth();
  const [copiedId, setCopiedId] = useState(false);
  const [copiedFactorId, setCopiedFactorId] = useState(false);

  if (!isOpen || !user) return null;

  const copyAdminId = () => {
    navigator.clipboard.writeText(user.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const copyFactor = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedFactorId(true);
    setTimeout(() => setCopiedFactorId(false), 2000);
  };

  const formatDate = (dateStr: string | null | undefined): string => {
    if (!dateStr) return 'Not available';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
    } catch {
      return 'Not available';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
              <Shield className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Admin Profile &amp; Security</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-xs max-h-[80vh] overflow-y-auto">
          {/* Admin Avatar & Role */}
          <div className="flex items-center gap-3 p-3 bg-blue-50/60 border border-blue-100 rounded-xl">
            <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center text-lg font-black">
              {user.email ? user.email[0].toUpperCase() : 'A'}
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900">
                {user.user_metadata?.full_name || user.email?.split('@')[0] || 'Administrator'}
              </div>
              <div className="text-xs text-blue-700 font-semibold uppercase tracking-wider mt-0.5">
                Role: {role || 'ADMIN'}
              </div>
            </div>
          </div>

          {/* MFA / Two-Factor Security Card */}
          <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold text-emerald-900 text-xs">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Two-Factor Authentication (MFA)</span>
              </div>
              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
                {isMfaVerified ? 'ACTIVE (AAL2)' : 'REQUIRED'}
              </span>
            </div>

            <div className="text-[11px] text-emerald-800 leading-relaxed">
              Protected by Supabase Auth MFA. Authenticator Assurance Level:{' '}
              <strong className="font-mono">{mfaLevel || 'aal2'}</strong>.
            </div>

            {selectedFactorId && (
              <div className="pt-1 border-t border-emerald-200 flex items-center justify-between text-[10px] text-emerald-900 font-mono">
                <span className="text-emerald-700">Factor ID:</span>
                <div className="flex items-center gap-1">
                  <span className="truncate max-w-[150px]">{selectedFactorId}</span>
                  <button
                    onClick={() => copyFactor(selectedFactorId)}
                    className="p-0.5 hover:bg-emerald-200 rounded text-emerald-800"
                    title="Copy Factor ID"
                  >
                    {copiedFactorId ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-3 pt-1">
            {/* User ID */}
            <div>
              <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">
                Admin User ID (UUID)
              </span>
              <div className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="font-mono text-slate-800 break-all select-all flex-1 text-[11px]">
                  {user.id}
                </span>
                <button
                  onClick={copyAdminId}
                  className="p-1 hover:bg-slate-200 rounded text-slate-600 transition-colors cursor-pointer"
                  title="Copy Admin User ID"
                >
                  {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Email */}
            <div>
              <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">
                Email Address
              </span>
              <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span>{user.email || 'Not available'}</span>
              </div>
            </div>

            {/* Account Created */}
            <div>
              <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">
                Admin Account Created
              </span>
              <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>{formatDate(user.created_at)}</span>
              </div>
            </div>

            {/* Last Login */}
            <div>
              <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">
                Last Login Timestamp
              </span>
              <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>{formatDate(user.last_sign_in_at)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50/70 flex items-center justify-between">
          <button
            onClick={async () => {
              await logout();
              onClose();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg border border-rose-200 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout Session</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
