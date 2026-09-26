import React, { useEffect, useState } from 'react';
import { Smartphone, RefreshCw, ChevronLeft, ChevronRight, Copy, Check, Eye } from 'lucide-react';
import { adminService } from '../services/adminService';
import { RechargeRecord } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { EmptyState } from '../components/EmptyState';

interface RechargeTransactionsPageProps {
  onSelectUser: (userId: string) => void;
}

export const RechargeTransactionsPage: React.FC<RechargeTransactionsPageProps> = ({ onSelectUser }) => {
  const [recharges, setRecharges] = useState<RechargeRecord[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<'all' | 'mobile' | 'dth'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'success' | 'failed'>('all');
  const [page, setPage] = useState(1);
  const pageSize = 15;
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchRecharges = async () => {
    setLoading(true);
    try {
      const res = await adminService.getRechargeTransactions({
        type: typeFilter,
        status: statusFilter,
        page,
        pageSize,
      });
      setRecharges(res.recharges);
      setTotalCount(res.totalCount);
    } catch (err) {
      console.warn('Recharges query notification:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecharges();
  }, [typeFilter, statusFilter, page]);

  const copyId = (id: string, e: React.MouseEvent) => {
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
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Not available';
    }
  };

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Recharge Transactions
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Real Mobile and DTH recharge history from the Hishab recharge gateway.
          </p>
        </div>

        <button
          onClick={fetchRecharges}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-600' : 'text-slate-500'}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        {/* Type Filter */}
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">
            Type:
          </span>
          {[
            { id: 'all', label: 'All Services' },
            { id: 'mobile', label: 'Mobile Recharge' },
            { id: 'dth', label: 'DTH Recharge' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setTypeFilter(t.id as any);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                typeFilter === t.id
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">
            Status:
          </span>
          {[
            { id: 'all', label: 'All' },
            { id: 'success', label: 'Success' },
            { id: 'pending', label: 'Pending' },
            { id: 'failed', label: 'Failed' },
          ].map((s) => (
            <button
              key={s.id}
              onClick={() => {
                setStatusFilter(s.id as any);
                setPage(1);
              }}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
                statusFilter === s.id
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center text-slate-400 gap-3">
            <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-xs font-medium">Fetching transactions from database...</span>
          </div>
        ) : recharges.length === 0 ? (
          <EmptyState
            title="No recharge transactions found."
            description="No real recharge transactions have been performed or found in Supabase with the selected filters."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Transaction ID</th>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Mobile / Customer ID</th>
                  <th className="py-3 px-4">Operator</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">API Txn ID</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recharges.map((r) => {
                  const isCopied = copiedId === r.id;
                  return (
                    <tr
                      key={r.id}
                      onClick={() => onSelectUser(r.user_id)}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                    >
                      <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1.5 font-mono text-slate-700">
                          <span>{r.id.slice(0, 8)}...</span>
                          <button
                            onClick={(e) => copyId(r.id, e)}
                            className="p-1 hover:bg-slate-200 rounded text-slate-500"
                            title="Copy Txn ID"
                          >
                            {isCopied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                      </td>

                      <td className="py-3 px-4 font-semibold text-slate-800">
                        {r.user?.full_name || r.user_id.slice(0, 8)}
                      </td>

                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {r.mobile_number}
                      </td>

                      <td className="py-3 px-4 font-medium text-slate-700">
                        {r.operator}
                      </td>

                      <td className="py-3 px-4 font-black text-slate-900 text-sm">
                        ₹{r.amount}
                      </td>

                      <td className="py-3 px-4">
                        <span className="uppercase text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                          {r.type}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <StatusBadge status={r.status} />
                      </td>

                      <td className="py-3 px-4 text-slate-500">
                        {formatDate(r.created_at)}
                      </td>

                      <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">
                        {r.api_txn_id || 'Not available'}
                      </td>

                      <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => onSelectUser(r.user_id)}
                          className="px-2.5 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50 rounded border border-blue-200 transition-colors inline-flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>User</span>
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
        {!loading && recharges.length > 0 && (
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
