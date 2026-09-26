import React, { useEffect, useState } from 'react';
import { CreditCard, Eye, RefreshCw, ChevronLeft, ChevronRight, Copy, Check } from 'lucide-react';
import { adminService } from '../services/adminService';
import { SubscriptionRecord } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { EmptyState } from '../components/EmptyState';

interface SubscriptionsPageProps {
  onSelectUser: (userId: string) => void;
}

export const SubscriptionsPage: React.FC<SubscriptionsPageProps> = ({ onSelectUser }) => {
  const [subscriptions, setSubscriptions] = useState<SubscriptionRecord[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const pageSize = 15;
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchSubscriptions = async () => {
    setLoading(true);
    try {
      const res = await adminService.getSubscriptions({
        status: statusFilter,
        page,
        pageSize,
      });
      setSubscriptions(res.subscriptions);
      setTotalCount(res.totalCount);
    } catch (err) {
      console.warn('Subscriptions query notification:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, [statusFilter, page]);

  const copyUserId = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const formatDate = (dateStr: string | null | undefined): string => {
    if (!dateStr) return 'Not available';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return 'Not available';
      return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return 'Not available';
    }
  };

  const calculateRemainingDays = (expiryStr: string | null | undefined): { text: string; isExpired: boolean } => {
    if (!expiryStr) return { text: 'Not available', isExpired: false };
    try {
      const expiry = new Date(expiryStr).getTime();
      const now = Date.now();
      const diffDays = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
      if (diffDays <= 0) return { text: 'Expired (0 days)', isExpired: true };
      return { text: `${diffDays} days remaining`, isExpired: false };
    } catch {
      return { text: 'Not available', isExpired: false };
    }
  };

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Subscription Records
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Real subscription statuses, durations, and expiration dates from Supabase.
          </p>
        </div>

        <button
          onClick={fetchSubscriptions}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-600' : 'text-slate-500'}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto bg-white p-2 rounded-xl border border-slate-200 shadow-2xs text-xs">
        {['all', 'active', 'trial', 'expired', 'cancelled'].map((tab) => {
          const active = statusFilter === tab;
          return (
            <button
              key={tab}
              onClick={() => {
                setStatusFilter(tab);
                setPage(1);
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors cursor-pointer ${
                active
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tab === 'all' ? 'All Subscriptions' : tab}
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center text-slate-400 gap-3">
            <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-xs font-medium">Loading subscriptions from database...</span>
          </div>
        ) : subscriptions.length === 0 ? (
          <EmptyState
            title="No subscriptions found"
            description="There are currently no subscription entries recorded in the database."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">User ID (UUID)</th>
                  <th className="py-3 px-4">Plan Name</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Start Date</th>
                  <th className="py-3 px-4">Expiry Date</th>
                  <th className="py-3 px-4">Remaining Duration</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {subscriptions.map((s) => {
                  const isCopied = copiedId === s.user_id;
                  const remaining = calculateRemainingDays(s.expiry_date);
                  return (
                    <tr
                      key={s.id}
                      onClick={() => onSelectUser(s.user_id)}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                    >
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                          {s.user?.full_name || 'User'}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {s.user?.email || s.user?.phone || 'No contact'}
                        </div>
                      </td>

                      <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1.5 font-mono text-slate-700">
                          <span>{s.user_id.slice(0, 8)}...</span>
                          <button
                            onClick={(e) => copyUserId(s.user_id, e)}
                            className="p-1 hover:bg-slate-200 rounded text-slate-500"
                            title="Copy User UUID"
                          >
                            {isCopied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                      </td>

                      <td className="py-3 px-4 font-bold text-slate-800">
                        {s.plan_name || 'Standard Plan'}
                      </td>

                      <td className="py-3 px-4">
                        <StatusBadge status={s.status} />
                      </td>

                      <td className="py-3 px-4 text-slate-600">
                        {formatDate(s.start_date)}
                      </td>

                      <td className="py-3 px-4 text-slate-700 font-medium">
                        {formatDate(s.expiry_date)}
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${
                            remaining.isExpired
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-blue-50 text-blue-800 border border-blue-200'
                          }`}
                        >
                          {remaining.text}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => onSelectUser(s.user_id)}
                          className="px-2.5 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50 rounded border border-blue-200 transition-colors inline-flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Inspect</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && subscriptions.length > 0 && (
          <div className="p-4 border-t border-slate-200 bg-slate-50/70 flex items-center justify-between text-xs text-slate-600">
            <div>
              Showing page <span className="font-semibold text-slate-900">{page}</span> of{' '}
              <span className="font-semibold text-slate-900">{totalPages}</span> ({totalCount} total)
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none transition-colors flex items-center gap-1 cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Prev</span>
              </button>

              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none transition-colors flex items-center gap-1 cursor-pointer"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
