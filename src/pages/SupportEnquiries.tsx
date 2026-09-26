import React, { useEffect, useState } from 'react';
import { LifeBuoy, RefreshCw, ChevronLeft, ChevronRight, Eye, Check, Clock, X } from 'lucide-react';
import { adminService } from '../services/adminService';
import { SupportTicketRecord } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { EmptyState } from '../components/EmptyState';

interface SupportEnquiriesPageProps {
  onSelectUser: (userId: string) => void;
}

export const SupportEnquiriesPage: React.FC<SupportEnquiriesPageProps> = ({ onSelectUser }) => {
  const [tickets, setTickets] = useState<SupportTicketRecord[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const [activeTicket, setActiveTicket] = useState<SupportTicketRecord | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const res = await adminService.getSupportTickets({
        status: statusFilter,
        page,
        pageSize,
      });
      setTickets(res.tickets);
      setTotalCount(res.totalCount);
    } catch (err) {
      console.warn('Support tickets query notification:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [statusFilter, page]);

  const handleUpdateStatus = async (newStatus: string) => {
    if (!activeTicket) return;
    setUpdatingStatus(true);
    try {
      await adminService.updateTicketStatus(activeTicket.id, newStatus, adminNotes);
      setActiveTicket(null);
      await fetchTickets();
    } catch (err) {
      console.warn('Support ticket update notification:', err);
    } finally {
      setUpdatingStatus(false);
    }
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
            Customer Support &amp; Enquiries
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Real merchant assistance tickets and technical queries from Supabase.
          </p>
        </div>

        <button
          onClick={fetchTickets}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-600' : 'text-slate-500'}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto bg-white p-2 rounded-xl border border-slate-200 shadow-2xs text-xs">
        {['all', 'open', 'in_progress', 'resolved', 'closed'].map((tab) => {
          const active = statusFilter === tab;
          return (
            <button
              key={tab}
              onClick={() => {
                setStatusFilter(tab);
                setPage(1);
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer ${
                active
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tab.replace('_', ' ')}
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center text-slate-400 gap-3">
            <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-xs font-medium">Fetching support tickets from database...</span>
          </div>
        ) : tickets.length === 0 ? (
          <EmptyState
            title="No enquiries found"
            description="There are currently no support enquiries or tickets in the database with this status."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Ticket ID</th>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Subject</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Created Date</th>
                  <th className="py-3 px-4">Last Updated</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tickets.map((t) => (
                  <tr
                    key={t.id}
                    onClick={() => {
                      setActiveTicket(t);
                      setAdminNotes(t.admin_notes || '');
                    }}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                  >
                    <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">
                      {t.id.slice(0, 8)}...
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                        {t.user?.full_name || 'Merchant'}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {t.user?.email || t.user_id.slice(0, 8)}...
                      </div>
                    </td>

                    <td className="py-3 px-4 font-medium text-slate-900 max-w-sm truncate">
                      {t.subject}
                    </td>

                    <td className="py-3 px-4">
                      <StatusBadge status={t.status} />
                    </td>

                    <td className="py-3 px-4 text-slate-500">
                      {formatDate(t.created_at)}
                    </td>

                    <td className="py-3 px-4 text-slate-500">
                      {formatDate(t.updated_at)}
                    </td>

                    <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => {
                          setActiveTicket(t);
                          setAdminNotes(t.admin_notes || '');
                        }}
                        className="px-2.5 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50 rounded border border-blue-200 transition-colors inline-flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Manage</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && tickets.length > 0 && (
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

      {/* Ticket Management Modal */}
      {activeTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Manage Support Ticket
                </h3>
                <span className="text-[11px] font-mono text-slate-500">
                  ID: {activeTicket.id}
                </span>
              </div>
              <button
                onClick={() => setActiveTicket(null)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                    User / Merchant
                  </span>
                  <span className="font-bold text-slate-900 text-sm">
                    {activeTicket.user?.full_name || 'Merchant'}
                  </span>
                  <div className="text-[11px] text-slate-500 font-mono">
                    {activeTicket.user?.email || activeTicket.user_id}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                    Current Status
                  </span>
                  <StatusBadge status={activeTicket.status} />
                </div>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                  Subject
                </span>
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-slate-900">
                  {activeTicket.subject}
                </div>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                  Customer Message
                </span>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto">
                  {activeTicket.message}
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
                  Admin Resolution Notes
                </label>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={3}
                  placeholder="Internal notes or response details..."
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              {/* Status Update Buttons */}
              <div className="pt-2 border-t border-slate-100">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-2">
                  Update Ticket Status:
                </span>
                <div className="flex flex-wrap gap-2">
                  {['open', 'in_progress', 'resolved', 'closed'].map((st) => (
                    <button
                      key={st}
                      type="button"
                      disabled={updatingStatus}
                      onClick={() => handleUpdateStatus(st)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider border transition-colors cursor-pointer ${
                        activeTicket.status === st
                          ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      {st.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setActiveTicket(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 rounded-lg border border-slate-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
