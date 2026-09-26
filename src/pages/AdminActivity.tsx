import React, { useEffect, useState } from 'react';
import { History, RefreshCw, User, Shield, Clock } from 'lucide-react';
import { adminService } from '../services/adminService';
import { AdminActivityRecord } from '../types';
import { EmptyState } from '../components/EmptyState';

interface AdminActivityPageProps {
  onSelectUser: (userId: string) => void;
}

export const AdminActivityPage: React.FC<AdminActivityPageProps> = ({ onSelectUser }) => {
  const [logs, setLogs] = useState<AdminActivityRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const data = await adminService.getActivityLogs(100);
      setLogs(data);
    } catch (err) {
      console.warn('Admin activity logs query notification:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const formatDate = (dateStr: string | null | undefined): string => {
    if (!dateStr) return 'Not available';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return 'Not available';
      return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return 'Not available';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <History className="w-5 h-5 text-blue-600" />
            <span>Administrator Audit Trail</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Permanent log of pricing adjustments, payment verifications, and security decisions.
          </p>
        </div>

        <button
          onClick={fetchLogs}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-600' : 'text-slate-500'}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Log Feed */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center text-slate-400 gap-3">
            <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-xs font-medium">Fetching administrative audit logs...</span>
          </div>
        ) : logs.length === 0 ? (
          <EmptyState
            title="No activity recorded yet"
            description="Important administrative decisions such as payment approvals and price updates will appear here automatically."
          />
        ) : (
          <div className="divide-y divide-slate-100 text-xs">
            {logs.map((log) => (
              <div key={log.id} className="p-4 hover:bg-slate-50/70 transition-colors flex items-start gap-3.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                  <Shield className="w-4 h-4" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <span className="font-bold text-slate-900 text-xs">
                      {log.action}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1 shrink-0">
                      <Clock className="w-3 h-3 text-slate-300" />
                      {formatDate(log.created_at)}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[11px] text-slate-500">
                    <span>Admin: <strong className="text-slate-700">{log.admin_email}</strong></span>
                    {log.target_user_id && (
                      <span className="inline-flex items-center gap-1">
                        • Target User:
                        <button
                          onClick={() => onSelectUser(log.target_user_id!)}
                          className="font-mono text-blue-600 hover:underline"
                        >
                          {log.target_user_id.slice(0, 8)}...
                        </button>
                      </span>
                    )}
                  </div>

                  {log.metadata && Object.keys(log.metadata).length > 0 && (
                    <div className="mt-2 p-2 bg-slate-50 border border-slate-200/80 rounded font-mono text-[10px] text-slate-600 overflow-x-auto">
                      {JSON.stringify(log.metadata)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
