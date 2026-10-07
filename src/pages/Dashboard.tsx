import React, { useEffect, useState } from 'react';
import {
  Users,
  UserCheck,
  Clock,
  Award,
  AlertCircle,
  ShieldCheck,
  Building,
  TrendingUp,
  RefreshCw,
  ArrowRight,
  CreditCard,
  Database,
  ExternalLink,
} from 'lucide-react';
import { adminService } from '../services/adminService';
import { DashboardStats, PaymentRequestRecord } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { VerifyPaymentModal } from '../components/VerifyPaymentModal';
import { RejectPaymentModal } from '../components/RejectPaymentModal';

interface DashboardProps {
  onNavigateTab: (tabId: string) => void;
  onSelectUser: (userId: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigateTab, onSelectUser }) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [pendingPayments, setPendingPayments] = useState<PaymentRequestRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [verifyingPayment, setVerifyingPayment] = useState<PaymentRequestRecord | null>(null);
  const [rejectingPayment, setRejectingPayment] = useState<PaymentRequestRecord | null>(null);
  const [missingTables, setMissingTables] = useState<string[]>([]);

  const fetchDashboardData = async (force = false) => {
    setLoading(true);
    try {
      if (force) {
        adminService.clearTableCache();
      }
      const [statsData, paymentsData, missing] = await Promise.all([
        adminService.getDashboardStats(),
        adminService.getPaymentRequests({ status: 'pending', pageSize: 5 }),
        adminService.getMissingRequiredTables(force),
      ]);
      setStats(statsData);
      setPendingPayments(paymentsData.payments);
      setMissingTables(missing);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData(true);
  }, []);

  const handleVerify = async () => {
    if (!verifyingPayment) return;
    await adminService.verifyPayment(verifyingPayment.id);
    setVerifyingPayment(null);
    await fetchDashboardData();
  };

  const handleReject = async (reason: string) => {
    if (!rejectingPayment) return;
    await adminService.rejectPayment(rejectingPayment.id, reason);
    setRejectingPayment(null);
    await fetchDashboardData();
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

  return (
    <div className="space-y-6">
      {/* Top Banner / Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Administrative Overview
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Displaying live data directly from your connected Hishab Supabase database.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchDashboardData(true)}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-600' : 'text-slate-500'}`} />
            <span>Refresh Data</span>
          </button>
        </div>
      </div>

      {/* Missing Tables Notice (if Supabase schema is fresh/unmigrated) */}
      {missingTables.length > 0 && (
        <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-xl text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-900">
          <div className="flex items-center gap-2.5">
            <Database className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <span className="font-bold">Supabase Database Notice:</span>{' '}
              <span>
                {missingTables.length} tables (including {missingTables.slice(0, 3).join(', ')}) have not been created yet in your Supabase project.
              </span>
            </div>
          </div>
          <button
            onClick={() => onNavigateTab('settings')}
            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg shrink-0 transition-colors cursor-pointer shadow-2xs"
          >
            View SQL Setup Script →
          </button>
        </div>
      )}

      {/* TOP STATISTIC CARDS (8 CARDS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Users */}
        <div
          onClick={() => onNavigateTab('users')}
          className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs hover:border-blue-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Users
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">
            {stats ? stats.totalUsers.toLocaleString() : '-'}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1 group-hover:text-blue-600">
            <span>View all users</span>
            <ArrowRight className="w-3 h-3" />
          </div>
        </div>

        {/* Active Users */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Active Users
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">
            {stats ? stats.activeUsers.toLocaleString() : '-'}
          </div>
          <div className="text-[11px] text-emerald-600 font-medium mt-1">
            Status: Active
          </div>
        </div>

        {/* Free Trial Users */}
        <div
          onClick={() => onNavigateTab('users')}
          className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs hover:border-sky-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Free Trial Users
            </span>
            <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">
            {stats ? stats.freeTrialUsers.toLocaleString() : '-'}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1 group-hover:text-sky-600">
            <span>On trial period</span>
          </div>
        </div>

        {/* Premium Users */}
        <div
          onClick={() => onNavigateTab('subscriptions')}
          className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs hover:border-indigo-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Premium Users
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">
            {stats ? stats.premiumUsers.toLocaleString() : '-'}
          </div>
          <div className="text-[11px] text-indigo-600 font-medium mt-1">
            Active paid subscriptions
          </div>
        </div>

        {/* Expired Users */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Expired Users
            </span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">
            {stats ? stats.expiredUsers.toLocaleString() : '-'}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Subscription ended
          </div>
        </div>

        {/* Pending Payments */}
        <div
          onClick={() => onNavigateTab('payment-requests')}
          className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs hover:border-amber-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Pending Payments
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-600">
            {stats ? stats.pendingPayments.toLocaleString() : '-'}
          </div>
          <div className="text-[11px] text-amber-700 font-medium mt-1 flex items-center gap-1 group-hover:underline">
            <span>Requires manual verification</span>
            <ArrowRight className="w-3 h-3" />
          </div>
        </div>

        {/* Verified Payments */}
        <div
          onClick={() => onNavigateTab('payment-requests')}
          className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs hover:border-emerald-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Verified Payments
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-700">
            {stats ? stats.verifiedPayments.toLocaleString() : '-'}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Successfully activated
          </div>
        </div>

        {/* Total Businesses */}
        <div
          onClick={() => onNavigateTab('businesses')}
          className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs hover:border-purple-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Businesses
            </span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Building className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">
            {stats ? stats.totalBusinesses.toLocaleString() : '-'}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Registered business shops
          </div>
        </div>
      </div>

      {/* ADDITIONAL STAT CARDS: NEW USERS WINDOWS & SUBSCRIPTION OVERVIEW */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* New Users Window Card */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100">
            <TrendingUp className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900">
              New User Registrations (Actual)
            </h3>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                Today
              </span>
              <span className="text-xl font-black text-slate-900">
                {stats ? stats.newUsersToday : 0}
              </span>
              <span className="text-[10px] text-slate-500 block mt-0.5">users</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                Last 7 Days
              </span>
              <span className="text-xl font-black text-slate-900">
                {stats ? stats.newUsers7Days : 0}
              </span>
              <span className="text-[10px] text-slate-500 block mt-0.5">users</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                Last 30 Days
              </span>
              <span className="text-xl font-black text-slate-900">
                {stats ? stats.newUsers30Days : 0}
              </span>
              <span className="text-[10px] text-slate-500 block mt-0.5">users</span>
            </div>
          </div>
        </div>

        {/* Subscription Overview Card: Exactly 3 Plans */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-900">
                Active Plan Breakdown
              </h3>
            </div>
            <button
              onClick={() => onNavigateTab('plans')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 cursor-pointer"
            >
              Configure Plans →
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                Monthly
              </span>
              <span className="text-xl font-black text-slate-900">
                {stats ? stats.subscriptionOverview.monthly : 0}
              </span>
              <span className="text-[10px] text-slate-500 block mt-0.5">active</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                2 Years
              </span>
              <span className="text-xl font-black text-slate-900">
                {stats ? stats.subscriptionOverview.twoYears : 0}
              </span>
              <span className="text-[10px] text-slate-500 block mt-0.5">active</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                3 Years
              </span>
              <span className="text-xl font-black text-slate-900">
                {stats ? stats.subscriptionOverview.threeYears : 0}
              </span>
              <span className="text-[10px] text-slate-500 block mt-0.5">active</span>
            </div>
          </div>
        </div>
      </div>

      {/* PENDING PAYMENT REQUESTS TABLE */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-600" />
              <span>Pending Manual Payment Requests</span>
              {pendingPayments.length > 0 && (
                <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-xs font-bold rounded">
                  {pendingPayments.length} Pending
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Verify transactions against your UPI ID: <span className="font-mono font-bold text-slate-800">Q164166564@ybl</span>
            </p>
          </div>

          <button
            onClick={() => onNavigateTab('payment-requests')}
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
          >
            <span>View All Payments</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {pendingPayments.length === 0 ? (
          <div className="p-10 text-center text-xs text-slate-500">
            No pending payment requests. All submissions have been processed.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Plan</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">UTR Number</th>
                  <th className="py-3 px-4">Submitted At</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pendingPayments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <button
                        onClick={() => onSelectUser(p.user_id)}
                        className="text-left group cursor-pointer"
                      >
                        <div className="font-semibold text-slate-900 group-hover:text-blue-600">
                          {p.user?.full_name || 'User'}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {p.user?.email || p.user_id.slice(0, 8)}...
                        </div>
                      </button>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-800">
                      {p.plan_name || 'Plan'}
                    </td>
                    <td className="py-3 px-4 font-bold text-emerald-700 text-sm">
                      ₹{p.amount}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-900 select-all">
                      {p.utr}
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {formatDate(p.created_at)}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={p.status} />
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
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
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Verification & Rejection Modals */}
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
