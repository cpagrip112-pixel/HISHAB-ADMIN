import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Eye,
  RefreshCw,
  QrCode,
  AlertCircle,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { adminService } from '../services/adminService';
import { PaymentRequestRecord } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { VerifyPaymentModal } from '../components/VerifyPaymentModal';
import { RejectPaymentModal } from '../components/RejectPaymentModal';
import { EmptyState } from '../components/EmptyState';

interface PaymentRequestsPageProps {
  onSelectUser: (userId: string) => void;
}

export const PaymentRequestsPage: React.FC<PaymentRequestsPageProps> = ({ onSelectUser }) => {
  const [payments, setPayments] = useState<PaymentRequestRecord[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'pending' | 'verified' | 'rejected' | 'all'>('pending');
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const [verifyingPayment, setVerifyingPayment] = useState<PaymentRequestRecord | null>(null);
  const [rejectingPayment, setRejectingPayment] = useState<PaymentRequestRecord | null>(null);
  const [viewingPayment, setViewingPayment] = useState<PaymentRequestRecord | null>(null);
  const [copiedUtr, setCopiedUtr] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const res = await adminService.getPaymentRequests({
        status: statusFilter,
        page,
        pageSize,
      });
      setPayments(res.payments);
      setTotalCount(res.totalCount);
    } catch (err) {
      console.warn('Payment requests query notification:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [statusFilter, page]);

  const handleVerify = async () => {
    if (!verifyingPayment) return;
    await adminService.verifyPayment(verifyingPayment.id);
    setSuccessBanner(`Payment ${verifyingPayment.utr} verified! User subscription has been activated.`);
    setVerifyingPayment(null);
    setTimeout(() => setSuccessBanner(null), 5000);
    await fetchPayments();
  };

  const handleReject = async (reason: string) => {
    if (!rejectingPayment) return;
    await adminService.rejectPayment(rejectingPayment.id, reason);
    setSuccessBanner(`Payment ${rejectingPayment.utr} marked as REJECTED.`);
    setRejectingPayment(null);
    setTimeout(() => setSuccessBanner(null), 5000);
    await fetchPayments();
  };

  const copyUtr = (utr: string) => {
    navigator.clipboard.writeText(utr);
    setCopiedUtr(utr);
    setTimeout(() => setCopiedUtr(null), 1500);
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
        hour12: false,
      });
    } catch {
      return 'Not available';
    }
  };

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  return (
    <div className="space-y-6">
      {/* Header with UPI ID Announcement */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Payment Requests (Manual UPI)
            </h2>
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-900">
              MANUAL VERIFICATION
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Check customer UTR against your UPI banking statement before approving subscription activation.
          </p>
        </div>

        {/* UPI ID Banner */}
        <div className="flex items-center gap-3 p-3 bg-blue-50/80 border border-blue-200 rounded-xl">
          <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
            <QrCode className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-blue-800 tracking-wider block">
              Official Hishab UPI ID
            </span>
            <span className="text-xs font-mono font-bold text-blue-950 select-all">
              Q164166564@ybl
            </span>
          </div>
        </div>
      </div>

      {/* Success Banner */}
      {successBanner && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2 font-medium">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successBanner}</span>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-1.5 text-xs">
          {[
            { id: 'pending', label: 'Pending Verification' },
            { id: 'verified', label: 'Verified Payments' },
            { id: 'rejected', label: 'Rejected' },
            { id: 'all', label: 'All Requests' },
          ].map((tab) => {
            const active = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setStatusFilter(tab.id as any);
                  setPage(1);
                }}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  active
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <button
          onClick={fetchPayments}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-600' : 'text-slate-500'}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center text-slate-400 gap-3">
            <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-xs font-medium">Fetching payment requests from Supabase...</span>
          </div>
        ) : payments.length === 0 ? (
          <EmptyState
            title="No payment requests found"
            description={`No payment submissions currently found with status "${statusFilter}".`}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Payment ID</th>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Mobile</th>
                  <th className="py-3 px-4">Plan</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">UTR Number</th>
                  <th className="py-3 px-4">Submitted At</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.map((p) => {
                  const isCopied = copiedUtr === p.utr;
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">
                        {p.id.slice(0, 8)}...
                      </td>

                      <td className="py-3 px-4">
                        <button
                          onClick={() => onSelectUser(p.user_id)}
                          className="text-left group cursor-pointer"
                        >
                          <div className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                            {p.user?.full_name || 'User'}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {p.user?.email || p.user_id.slice(0, 8)}...
                          </div>
                        </button>
                      </td>

                      <td className="py-3 px-4 font-mono text-slate-700">
                        {p.user?.phone || 'Not available'}
                      </td>

                      <td className="py-3 px-4 font-semibold text-slate-800">
                        {p.plan_name || 'Subscription Plan'}
                      </td>

                      <td className="py-3 px-4 font-black text-emerald-700 text-sm">
                        ₹{p.amount}
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-slate-900 select-all">
                            {p.utr}
                          </span>
                          <button
                            onClick={() => copyUtr(p.utr)}
                            className="p-1 hover:bg-slate-200 rounded text-slate-500"
                            title="Copy UTR"
                          >
                            {isCopied ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-slate-500">
                        {formatDate(p.created_at)}
                      </td>

                      <td className="py-3 px-4">
                        <StatusBadge status={p.status} />
                      </td>

                      <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                        {/* VIEW ACTION */}
                        <button
                          onClick={() => setViewingPayment(p)}
                          className="px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded border border-slate-200 transition-colors inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5 text-slate-500" />
                          <span>View</span>
                        </button>

                        {/* VERIFY / REJECT only if PENDING */}
                        {p.status === 'pending' && (
                          <>
                            <button
                              onClick={() => setRejectingPayment(p)}
                              className="px-2.5 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded border border-rose-200 transition-colors cursor-pointer"
                            >
                              Reject
                            </button>
                            <button
                              onClick={() => setVerifyingPayment(p)}
                              className="px-2.5 py-1 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded shadow-2xs transition-colors cursor-pointer"
                            >
                              Verify Payment
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && payments.length > 0 && (
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

      {/* View Payment Details Modal */}
      {viewingPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="text-base font-bold text-slate-900">
                Payment Request Details
              </h3>
              <button
                onClick={() => setViewingPayment(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-0.5">
                    User
                  </span>
                  <span className="font-semibold text-slate-900 text-sm">
                    {viewingPayment.user?.full_name || 'User'}
                  </span>
                  <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                    {viewingPayment.user_id}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-0.5">
                    Payment Status
                  </span>
                  <StatusBadge status={viewingPayment.status} />
                </div>

                <div>
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-0.5">
                    Plan
                  </span>
                  <span className="font-bold text-slate-900">
                    {viewingPayment.plan_name || 'Standard'}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-0.5">
                    Amount Paid
                  </span>
                  <span className="text-base font-black text-emerald-700">
                    ₹{viewingPayment.amount}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-0.5">
                    UTR Number
                  </span>
                  <span className="font-mono font-bold text-slate-900 text-sm select-all">
                    {viewingPayment.utr}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-0.5">
                    Submitted Date
                  </span>
                  <span className="font-medium text-slate-800">
                    {formatDate(viewingPayment.created_at)}
                  </span>
                </div>

                {viewingPayment.verified_at && (
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-0.5">
                      Verified At
                    </span>
                    <span className="font-medium text-slate-800">
                      {formatDate(viewingPayment.verified_at)}
                    </span>
                  </div>
                )}

                {viewingPayment.verified_by && (
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-0.5">
                      Verified By (Admin UUID)
                    </span>
                    <span className="font-mono text-slate-600 text-[11px]">
                      {viewingPayment.verified_by}
                    </span>
                  </div>
                )}
              </div>

              {viewingPayment.rejection_reason && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800">
                  <span className="font-bold block text-[11px] mb-1">Rejection Reason:</span>
                  <p>{viewingPayment.rejection_reason}</p>
                </div>
              )}

              {viewingPayment.screenshot_url && (
                <div className="pt-2 border-t border-slate-100">
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-2">
                    Payment Receipt Screenshot
                  </span>
                  <div className="border border-slate-200 rounded-xl overflow-hidden max-h-60 bg-slate-50 flex items-center justify-center p-2">
                    <img
                      src={viewingPayment.screenshot_url}
                      alt="Payment Screenshot"
                      className="max-h-56 object-contain rounded"
                    />
                  </div>
                  <a
                    href={viewingPayment.screenshot_url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 text-blue-600 hover:underline flex items-center gap-1 font-medium text-[11px]"
                  >
                    <span>Open full image in new tab</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
              <div>
                {viewingPayment.status === 'pending' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setViewingPayment(null);
                        setRejectingPayment(viewingPayment);
                      }}
                      className="px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg border border-rose-200"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => {
                        setViewingPayment(null);
                        setVerifyingPayment(viewingPayment);
                      }}
                      className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg"
                    >
                      Verify Payment
                    </button>
                  </div>
                )}
              </div>
              <button
                onClick={() => setViewingPayment(null)}
                className="px-4 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 rounded-lg border border-slate-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modals */}
      <VerifyPaymentModal
        payment={verifyingPayment}
        onConfirm={handleVerify}
        onCancel={() => setVerifyingPayment(null)}
      />

      <RejectPaymentModal
        payment={rejectingPayment}
        onConfirm={handleReject}
        onCancel={() => setRejectingPayment(null)}
      />
    </div>
  );
};
