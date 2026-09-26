import React, { useEffect, useState } from 'react';
import { Building, Search, RefreshCw, ChevronLeft, ChevronRight, Copy, Check, Eye } from 'lucide-react';
import { adminService } from '../services/adminService';
import { BusinessRecord } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { EmptyState } from '../components/EmptyState';

interface BusinessesPageProps {
  onSelectUser: (userId: string) => void;
}

export const BusinessesPage: React.FC<BusinessesPageProps> = ({ onSelectUser }) => {
  const [businesses, setBusinesses] = useState<BusinessRecord[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 15;
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchBusinesses = async () => {
    setLoading(true);
    try {
      const res = await adminService.getBusinesses({
        page,
        pageSize,
        search,
      });
      setBusinesses(res.businesses);
      setTotalCount(res.totalCount);
    } catch (err) {
      console.warn('Businesses query notification:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBusinesses();
  }, [page]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchBusinesses();
  };

  const copyOwnerId = (id: string, e: React.MouseEvent) => {
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

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Registered Businesses
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Real enterprise and retail store entities associated with registered Hishab merchants.
          </p>
        </div>

        <button
          onClick={fetchBusinesses}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-600' : 'text-slate-500'}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
        <form onSubmit={handleSearchSubmit} className="flex gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search business name, phone, or GST number..."
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900 placeholder:text-slate-400"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            Search
          </button>
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setPage(1);
                setTimeout(fetchBusinesses, 0);
              }}
              className="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200"
            >
              Clear
            </button>
          )}
        </form>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center text-slate-400 gap-3">
            <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-xs font-medium">Fetching businesses from database...</span>
          </div>
        ) : businesses.length === 0 ? (
          <EmptyState
            title="No businesses found"
            description={
              search
                ? `No businesses matched "${search}".`
                : 'There are currently no business entities registered in this database.'
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Business Name</th>
                  <th className="py-3 px-4">Owner</th>
                  <th className="py-3 px-4">Owner User ID</th>
                  <th className="py-3 px-4">Mobile</th>
                  <th className="py-3 px-4">Business Type</th>
                  <th className="py-3 px-4">GST Number</th>
                  <th className="py-3 px-4">Created Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {businesses.map((b) => {
                  const isCopied = copiedId === b.user_id;
                  return (
                    <tr
                      key={b.id}
                      onClick={() => onSelectUser(b.user_id)}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                    >
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                          {b.name}
                        </div>
                        {b.address && (
                          <div className="text-[11px] text-slate-400 truncate max-w-xs">
                            {b.address}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4 font-semibold text-slate-800">
                        {b.owner_name || 'Merchant'}
                      </td>

                      <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1.5 font-mono text-slate-700">
                          <span>{b.user_id.slice(0, 8)}...</span>
                          <button
                            onClick={(e) => copyOwnerId(b.user_id, e)}
                            className="p-1 hover:bg-slate-200 rounded text-slate-500"
                            title="Copy Owner UUID"
                          >
                            {isCopied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                      </td>

                      <td className="py-3 px-4 font-mono text-slate-700">
                        {b.phone || 'Not available'}
                      </td>

                      <td className="py-3 px-4 text-slate-600">
                        {b.business_type || 'Retail'}
                      </td>

                      <td className="py-3 px-4 font-mono text-slate-600">
                        {b.gst_number || 'Not available'}
                      </td>

                      <td className="py-3 px-4 text-slate-500">
                        {formatDate(b.created_at)}
                      </td>

                      <td className="py-3 px-4">
                        <StatusBadge status={b.status || 'active'} />
                      </td>

                      <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => onSelectUser(b.user_id)}
                          className="px-2.5 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50 rounded border border-blue-200 transition-colors inline-flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Owner</span>
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
        {!loading && businesses.length > 0 && (
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
