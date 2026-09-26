import React, { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { PaymentRequestRecord } from '../types';

interface RejectPaymentModalProps {
  payment: PaymentRequestRecord | null;
  onConfirm: (reason: string) => Promise<void>;
  onCancel: () => void;
}

export const RejectPaymentModal: React.FC<RejectPaymentModalProps> = ({
  payment,
  onConfirm,
  onCancel,
}) => {
  const [reason, setReason] = useState('UTR not found in bank statement');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!payment) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('Please provide a rejection reason');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await onConfirm(reason.trim());
    } catch (err: any) {
      setError(err?.message || 'Failed to reject payment');
      setSubmitting(false);
    }
  };

  const commonReasons = [
    'UTR not found in bank statement',
    'Amount mismatch with bank receipt',
    'Duplicate UTR submission',
    'Invalid or illegible screenshot',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 pt-6 pb-4 flex items-start gap-4">
          <div className="w-11 h-11 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Reject Payment Request
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Payment UTR: <span className="font-mono font-semibold text-slate-700">{payment.utr}</span>
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="px-6 py-4 bg-slate-50/70 border-y border-slate-200 space-y-3 text-xs">
            <p className="text-slate-600 leading-relaxed">
              Rejecting will mark this payment as <span className="font-bold text-rose-600">REJECTED</span> and prevent subscription activation. The user will be notified of the reason.
            </p>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Rejection Reason
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                required
                placeholder="Explain why this payment could not be verified..."
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 text-xs"
              />
            </div>

            <div className="space-y-1">
              <span className="text-[10px] uppercase font-semibold text-slate-400 block">Quick reasons:</span>
              <div className="flex flex-wrap gap-1.5">
                {commonReasons.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setReason(r)}
                    className="text-[10px] px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded text-slate-600 font-medium transition-colors"
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

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
              type="submit"
              disabled={submitting || !reason.trim()}
              className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
            >
              {submitting && (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              )}
              <span>REJECT PAYMENT</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
