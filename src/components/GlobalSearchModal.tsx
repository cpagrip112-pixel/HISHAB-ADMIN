import React, { useState, useEffect, useRef } from 'react';
import { Search, X, User, Building, CreditCard, FileText, ArrowRight } from 'lucide-react';
import { adminService } from '../services/adminService';
import { UserRecord, BusinessRecord, PaymentRequestRecord, InvoiceRecord } from '../types';
import { StatusBadge } from './StatusBadge';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectUser: (userId: string) => void;
  onNavigateTab: (tabId: string) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  onSelectUser,
  onNavigateTab,
}) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{
    users: UserRecord[];
    businesses: BusinessRecord[];
    payments: PaymentRequestRecord[];
    invoices: InvoiceRecord[];
  }>({ users: [], businesses: [], payments: [], invoices: [] });

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setResults({ users: [], businesses: [], payments: [], invoices: [] });
    }
  }, [isOpen]);

  useEffect(() => {
    if (!query.trim() || query.trim().length < 2) {
      setResults({ users: [], businesses: [], payments: [], invoices: [] });
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await adminService.globalSearch(query);
        setResults(res);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  if (!isOpen) return null;

  const totalResultsCount =
    results.users.length +
    results.businesses.length +
    results.payments.length +
    results.invoices.length;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[80vh]">
        {/* Search Input Bar */}
        <div className="p-4 border-b border-slate-200 flex items-center gap-3 bg-white">
          <Search className="w-5 h-5 text-blue-600 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search User ID, Name, Email, Mobile, Business, UTR, Invoice..."
            className="w-full text-sm font-medium text-slate-900 placeholder:text-slate-400 bg-transparent focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 text-slate-400 hover:text-slate-600 rounded transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <span className="text-[10px] font-mono font-medium px-2 py-0.5 bg-slate-100 text-slate-500 rounded border border-slate-200">
            ESC
          </span>
        </div>

        {/* Results Area */}
        <div className="overflow-y-auto p-4 flex-1 space-y-4">
          {loading && (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-xs">Searching Supabase database...</span>
            </div>
          )}

          {!loading && query.length >= 2 && totalResultsCount === 0 && (
            <div className="py-12 text-center text-slate-500 text-xs">
              No matching records found in Supabase for &quot;<span className="font-semibold text-slate-700">{query}</span>&quot;.
            </div>
          )}

          {!loading && query.length < 2 && (
            <div className="py-10 text-center text-slate-400 text-xs">
              Type at least 2 characters to search across users, businesses, payments, and invoices.
            </div>
          )}

          {!loading && totalResultsCount > 0 && (
            <>
              {/* Users */}
              {results.users.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase text-slate-400 tracking-wider mb-2">
                    <User className="w-3.5 h-3.5 text-blue-600" />
                    <span>Users ({results.users.length})</span>
                  </div>
                  <div className="space-y-1">
                    {results.users.map((u) => (
                      <div
                        key={u.id}
                        onClick={() => {
                          onSelectUser(u.id);
                          onClose();
                        }}
                        className="p-2.5 rounded-lg hover:bg-blue-50/60 border border-transparent hover:border-blue-100 flex items-center justify-between cursor-pointer transition-colors"
                      >
                        <div>
                          <div className="text-xs font-semibold text-slate-900">
                            {u.full_name || 'User'}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            {u.email || u.phone || u.id}
                          </div>
                        </div>
                        <StatusBadge status={u.status} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Businesses */}
              {results.businesses.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase text-slate-400 tracking-wider mb-2">
                    <Building className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Businesses ({results.businesses.length})</span>
                  </div>
                  <div className="space-y-1">
                    {results.businesses.map((b) => (
                      <div
                        key={b.id}
                        onClick={() => {
                          onNavigateTab('businesses');
                          onClose();
                        }}
                        className="p-2.5 rounded-lg hover:bg-indigo-50/60 border border-transparent hover:border-indigo-100 flex items-center justify-between cursor-pointer transition-colors"
                      >
                        <div>
                          <div className="text-xs font-semibold text-slate-900">
                            {b.name}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            {b.phone || b.gst_number || b.address || 'Business'}
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-400" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Payments */}
              {results.payments.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase text-slate-400 tracking-wider mb-2">
                    <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Payments ({results.payments.length})</span>
                  </div>
                  <div className="space-y-1">
                    {results.payments.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => {
                          onNavigateTab('payment-requests');
                          onClose();
                        }}
                        className="p-2.5 rounded-lg hover:bg-emerald-50/60 border border-transparent hover:border-emerald-100 flex items-center justify-between cursor-pointer transition-colors"
                      >
                        <div>
                          <div className="text-xs font-semibold text-slate-900">
                            UTR: <span className="font-mono">{p.utr}</span> (₹{p.amount})
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            User: {p.user_id.slice(0, 8)}...
                          </div>
                        </div>
                        <StatusBadge status={p.status} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Invoices */}
              {results.invoices.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase text-slate-400 tracking-wider mb-2">
                    <FileText className="w-3.5 h-3.5 text-purple-600" />
                    <span>Invoices ({results.invoices.length})</span>
                  </div>
                  <div className="space-y-1">
                    {results.invoices.map((inv) => (
                      <div
                        key={inv.id}
                        onClick={() => {
                          onNavigateTab('invoices');
                          onClose();
                        }}
                        className="p-2.5 rounded-lg hover:bg-purple-50/60 border border-transparent hover:border-purple-100 flex items-center justify-between cursor-pointer transition-colors"
                      >
                        <div>
                          <div className="text-xs font-semibold text-slate-900">
                            {inv.invoice_number} - {inv.customer_name}
                          </div>
                          <div className="text-[11px] text-slate-500 font-bold text-emerald-700">
                            ₹{inv.amount}
                          </div>
                        </div>
                        <StatusBadge status={inv.status} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-slate-200 bg-slate-50/80 flex items-center justify-between text-[11px] text-slate-500">
          <span>Real-time search across Supabase</span>
          <button
            onClick={onClose}
            className="text-slate-600 hover:text-slate-900 font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
