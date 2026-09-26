import React, { useEffect, useState } from 'react';
import { X, Copy, Check, User, Building, CreditCard, Smartphone, FileText, Calendar, Clock } from 'lucide-react';
import { UserRecord, BusinessRecord, SubscriptionRecord, PaymentRequestRecord, RechargeRecord, InvoiceRecord } from '../types';
import { adminService } from '../services/adminService';
import { StatusBadge } from './StatusBadge';

interface UserDetailsModalProps {
  userId: string | null;
  onClose: () => void;
  onRefreshParent?: () => void;
}

export const UserDetailsModal: React.FC<UserDetailsModalProps> = ({ userId, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState(false);
  const [details, setDetails] = useState<{
    user: UserRecord | null;
    business: BusinessRecord | null;
    subscription: SubscriptionRecord | null;
    payments: PaymentRequestRecord[];
    recharges: RechargeRecord[];
    invoices: InvoiceRecord[];
  }>({
    user: null,
    business: null,
    subscription: null,
    payments: [],
    recharges: [],
    invoices: [],
  });

  useEffect(() => {
    if (!userId) return;
    let mounted = true;
    setLoading(true);

    adminService.getUserDetails(userId).then((res) => {
      if (mounted) {
        setDetails(res);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
    };
  }, [userId]);

  if (!userId) return null;

  const copyUserId = () => {
    navigator.clipboard.writeText(userId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
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

  const calculateRemainingDays = (expiryStr: string | null | undefined): string => {
    if (!expiryStr) return 'Not available';
    try {
      const expiry = new Date(expiryStr).getTime();
      const now = Date.now();
      const diffDays = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
      if (diffDays <= 0) return 'Expired (0 days)';
      return `${diffDays} days remaining`;
    } catch {
      return 'Not available';
    }
  };

  const { user, business, subscription, payments, recharges, invoices } = details;

  // Recharge aggregations
  const mobileRecharges = recharges.filter((r) => r.type === 'mobile');
  const dthRecharges = recharges.filter((r) => r.type === 'dth');
  const lastRecharge = recharges.length > 0 ? recharges[0] : null;

  // Invoice aggregations
  const totalSales = invoices.reduce((acc, inv) => acc + (inv.amount || 0), 0);
  const lastInvoice = invoices.length > 0 ? invoices[0] : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-lg shadow-xs">
              {user?.full_name ? user.full_name[0].toUpperCase() : 'U'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">
                  {user?.full_name || 'User Details'}
                </h2>
                <StatusBadge status={user?.status || 'active'} />
              </div>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                {userId}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={copyUserId}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors shadow-2xs"
              title="Copy Supabase Auth User UUID"
            >
              {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
              <span>{copiedId ? 'COPIED!' : 'COPY USER ID'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
              <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-xs font-medium">Fetching real user details from Supabase...</span>
            </div>
          ) : (
            <>
              {/* SECTION 1: USER INFORMATION */}
              <div className="bg-slate-50/50 rounded-xl border border-slate-200 p-5">
                <div className="flex items-center gap-2 text-slate-900 font-bold text-sm mb-4 border-b border-slate-200 pb-2">
                  <User className="w-4 h-4 text-blue-600" />
                  <span>USER INFORMATION</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 uppercase font-semibold text-[10px] tracking-wider block mb-1">
                      User ID (UUID)
                    </span>
                    <span className="font-mono text-slate-800 break-all select-all font-medium">
                      {user?.id || userId}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 uppercase font-semibold text-[10px] tracking-wider block mb-1">
                      Full Name
                    </span>
                    <span className="font-semibold text-slate-900 text-sm">
                      {user?.full_name || 'Not available'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 uppercase font-semibold text-[10px] tracking-wider block mb-1">
                      Email Address
                    </span>
                    <span className="text-slate-800 font-medium">
                      {user?.email || 'Not available'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 uppercase font-semibold text-[10px] tracking-wider block mb-1">
                      Mobile Number
                    </span>
                    <span className="text-slate-800 font-medium font-mono">
                      {user?.phone || 'Not available'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 uppercase font-semibold text-[10px] tracking-wider block mb-1">
                      Account Created
                    </span>
                    <span className="text-slate-800 font-medium flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {formatDate(user?.created_at)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 uppercase font-semibold text-[10px] tracking-wider block mb-1">
                      Last Login
                    </span>
                    <span className="text-slate-800 font-medium flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {user?.last_sign_in_at ? formatDate(user.last_sign_in_at) : 'Not available'}
                    </span>
                  </div>
                </div>
              </div>

              {/* SECTION 2: BUSINESS INFORMATION */}
              <div className="bg-slate-50/50 rounded-xl border border-slate-200 p-5">
                <div className="flex items-center gap-2 text-slate-900 font-bold text-sm mb-4 border-b border-slate-200 pb-2">
                  <Building className="w-4 h-4 text-blue-600" />
                  <span>BUSINESS INFORMATION</span>
                </div>
                {business ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                    <div>
                      <span className="text-slate-400 uppercase font-semibold text-[10px] tracking-wider block mb-1">
                        Business Name
                      </span>
                      <span className="font-semibold text-slate-900 text-sm">
                        {business.name || 'Not available'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 uppercase font-semibold text-[10px] tracking-wider block mb-1">
                        Business Type
                      </span>
                      <span className="text-slate-800 font-medium">
                        {business.business_type || 'Not available'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 uppercase font-semibold text-[10px] tracking-wider block mb-1">
                        GST Information
                      </span>
                      <span className="text-slate-800 font-mono font-medium">
                        {business.gst_number || 'Not available'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 uppercase font-semibold text-[10px] tracking-wider block mb-1">
                        Business Phone
                      </span>
                      <span className="text-slate-800 font-mono font-medium">
                        {business.phone || 'Not available'}
                      </span>
                    </div>
                    <div className="md:col-span-2">
                      <span className="text-slate-400 uppercase font-semibold text-[10px] tracking-wider block mb-1">
                        Business Address
                      </span>
                      <span className="text-slate-800 font-medium">
                        {business.address || 'Not available'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic">No business record connected in Supabase.</p>
                )}
              </div>

              {/* SECTION 3: SUBSCRIPTION */}
              <div className="bg-slate-50/50 rounded-xl border border-slate-200 p-5">
                <div className="flex items-center gap-2 text-slate-900 font-bold text-sm mb-4 border-b border-slate-200 pb-2">
                  <CreditCard className="w-4 h-4 text-blue-600" />
                  <span>SUBSCRIPTION STATUS</span>
                </div>
                {subscription ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                    <div>
                      <span className="text-slate-400 uppercase font-semibold text-[10px] tracking-wider block mb-1">
                        Current Plan
                      </span>
                      <span className="font-bold text-slate-900 text-sm">
                        {subscription.plan_name || 'Standard'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 uppercase font-semibold text-[10px] tracking-wider block mb-1">
                        Subscription Status
                      </span>
                      <StatusBadge status={subscription.status} />
                    </div>
                    <div>
                      <span className="text-slate-400 uppercase font-semibold text-[10px] tracking-wider block mb-1">
                        Remaining Duration
                      </span>
                      <span className="font-semibold text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                        {calculateRemainingDays(subscription.expiry_date)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 uppercase font-semibold text-[10px] tracking-wider block mb-1">
                        Start Date
                      </span>
                      <span className="text-slate-800 font-medium">
                        {formatDate(subscription.start_date)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 uppercase font-semibold text-[10px] tracking-wider block mb-1">
                        Expiry Date
                      </span>
                      <span className="text-slate-800 font-medium font-semibold text-rose-600">
                        {formatDate(subscription.expiry_date)}
                      </span>
                    </div>
                    {subscription.trial_end_date && (
                      <div>
                        <span className="text-slate-400 uppercase font-semibold text-[10px] tracking-wider block mb-1">
                          Trial End Date
                        </span>
                        <span className="text-slate-800 font-medium">
                          {formatDate(subscription.trial_end_date)}
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic">No subscription record found in Supabase.</p>
                )}
              </div>

              {/* SECTION 4: PAYMENT HISTORY */}
              <div className="bg-slate-50/50 rounded-xl border border-slate-200 p-5">
                <div className="flex items-center gap-2 text-slate-900 font-bold text-sm mb-4 border-b border-slate-200 pb-2">
                  <CreditCard className="w-4 h-4 text-blue-600" />
                  <span>PAYMENT HISTORY ({payments.length})</span>
                </div>
                {payments.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                          <th className="pb-2">Payment ID</th>
                          <th className="pb-2">Plan</th>
                          <th className="pb-2">Amount</th>
                          <th className="pb-2">UTR</th>
                          <th className="pb-2">Status</th>
                          <th className="pb-2">Submitted</th>
                          <th className="pb-2">Verified At</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {payments.map((p) => (
                          <tr key={p.id} className="hover:bg-slate-100/60">
                            <td className="py-2.5 font-mono text-slate-600">{p.id.slice(0, 8)}...</td>
                            <td className="py-2.5 font-medium text-slate-800">{p.plan_name || 'Plan'}</td>
                            <td className="py-2.5 font-bold text-slate-900">₹{p.amount}</td>
                            <td className="py-2.5 font-mono text-slate-700">{p.utr}</td>
                            <td className="py-2.5"><StatusBadge status={p.status} /></td>
                            <td className="py-2.5 text-slate-600">{formatDate(p.created_at)}</td>
                            <td className="py-2.5 text-slate-600">{p.verified_at ? formatDate(p.verified_at) : 'Not available'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic">No payment requests recorded for this user.</p>
                )}
              </div>

              {/* SECTION 5 & 6: RECHARGE & INVOICE SUMMARIES */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Recharge Summary */}
                <div className="bg-slate-50/50 rounded-xl border border-slate-200 p-5">
                  <div className="flex items-center gap-2 text-slate-900 font-bold text-sm mb-4 border-b border-slate-200 pb-2">
                    <Smartphone className="w-4 h-4 text-blue-600" />
                    <span>RECHARGE SUMMARY</span>
                  </div>
                  <div className="space-y-2.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Mobile Recharges:</span>
                      <span className="font-semibold text-slate-800">{mobileRecharges.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">DTH Recharges:</span>
                      <span className="font-semibold text-slate-800">{dthRecharges.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Last Recharge Date:</span>
                      <span className="font-medium text-slate-800">
                        {lastRecharge ? formatDate(lastRecharge.created_at) : 'Not available'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Last Recharge Status:</span>
                      {lastRecharge ? <StatusBadge status={lastRecharge.status} /> : <span className="text-slate-400">Not available</span>}
                    </div>
                  </div>
                </div>

                {/* Invoice Summary */}
                <div className="bg-slate-50/50 rounded-xl border border-slate-200 p-5">
                  <div className="flex items-center gap-2 text-slate-900 font-bold text-sm mb-4 border-b border-slate-200 pb-2">
                    <FileText className="w-4 h-4 text-blue-600" />
                    <span>INVOICE SUMMARY</span>
                  </div>
                  <div className="space-y-2.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Total Invoices:</span>
                      <span className="font-semibold text-slate-800">{invoices.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Total Sales Recorded:</span>
                      <span className="font-bold text-emerald-700">
                        {invoices.length > 0 ? `₹${totalSales.toLocaleString('en-IN')}` : 'Not available'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Last Invoice:</span>
                      <span className="font-medium text-slate-800">
                        {lastInvoice ? `${lastInvoice.invoice_number} (${formatDate(lastInvoice.created_at)})` : 'Not available'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50/70 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
