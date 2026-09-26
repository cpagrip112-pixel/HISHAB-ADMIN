import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, ShieldCheck, X } from 'lucide-react';
import { PaymentRequestRecord } from '../types';

interface VerifyPaymentModalProps {
  payment: PaymentRequestRecord | null;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

export const VerifyPaymentModal: React.FC<VerifyPaymentModalProps> = ({
  payment,
  onConfirm,
  onCancel,
}) => {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!payment) return null;

  const handleConfirm = async () => {
    try {
      setSubmitting(true);
      setError(null);
      await onConfirm();
    } catch (err: any) {
      setError(err?.message || 'Failed to verify payment');
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 pt-6 pb-4 flex items-start gap-4">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Verify Manual Payment
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Manual UPI ID: <span className="font-mono font-semibold text-slate-700">Q164166564@ybl</span>
            </p>
          </div>
        </div>

        <div className="px-6 py-4 bg-slate-50/70 border-y border-slate-200 space-y-3 text-xs">
          <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-amber-900 font-medium">
              Have you verified this payment in your bank/UPI transaction history?
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 text-slate-600 pt-1">
            <div>
              <span className="text-[10px] uppercase font-semibold text-slate-400 block">User</span>
              <span className="font-semibold text-slate-800">{payment.user?.full_name || payment.user_id.slice(0, 8)}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-semibold text-slate-400 block">Plan</span>
              <span className="font-semibold text-slate-800">{payment.plan_name || 'Subscription'}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-semibold text-slate-400 block">Amount</span>
              <span className="font-bold text-emerald-700 text-sm">₹{payment.amount}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-semibold text-slate-400 block">UTR Number</span>
              <span className="font-mono font-bold text-slate-900 select-all">{payment.utr}</span>
            </div>
          </div>

          {payment.screenshot_url && (
            <div className="pt-2">
              <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">Receipt Screenshot</span>
              <a
                href={payment.screenshot_url}
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 underline font-medium hover:text-blue-800 text-[11px]"
              >
                View Uploaded Receipt ↗
              </a>
            </div>
          )}

          {error && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
              {error}
            </div>
          )}
        </div>

        <div className="px-6 py-4 flex items-center justify-end gap-3 bg-white">
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
          >
            CANCEL
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={submitting}
            className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
          >
            {submitting ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            <span>CONFIRM VERIFICATION</span>
          </button>
        </div>
      </div>
    </div>
  );
};
