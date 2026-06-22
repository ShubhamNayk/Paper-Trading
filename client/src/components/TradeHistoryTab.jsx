import { useState, useEffect, useCallback } from 'react';
import { ArrowUpCircle, ArrowDownCircle, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { fetchTransactions } from '../api';
import { formatINR } from '../utils/format';

const COL = 'text-xs text-ink-secondary font-semibold uppercase tracking-wider py-3 px-4';
const CELL = 'py-4 px-4 text-sm tabular-nums';

function TypeBadge({ type }) {
  const isBuy = type === 'BUY';
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
        isBuy
          ? 'bg-brand-green-light text-brand-green-dark'
          : 'bg-brand-red-light text-brand-red-dark'
      }`}
    >
      {isBuy ? <ArrowDownCircle size={12} /> : <ArrowUpCircle size={12} />}
      {type}
    </span>
  );
}

function formatTimestamp(ts) {
  const d = new Date(ts + 'Z');
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

export default function TradeHistoryTab() {
  const [data, setData]       = useState(null);
  const [page, setPage]       = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  const load = useCallback(async (p) => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchTransactions(p);
      setData(result);
    } catch {
      setError('Failed to load trade history.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(page); }, [load, page]);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  const handlePrev = () => { if (page > 1) setPage(p => p - 1); };
  const handleNext = () => { if (page < totalPages) setPage(p => p + 1); };

  return (
    <div className="bg-white rounded-2xl shadow-card overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-surface-border flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-ink-primary">Trade History</h2>
          {data && (
            <p className="text-xs text-ink-muted mt-0.5">
              {data.total} trade{data.total !== 1 ? 's' : ''} total
            </p>
          )}
        </div>
        <Clock size={16} className="text-ink-muted" />
      </div>

      {/* Body */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-ink-muted text-sm">
          Loading...
        </div>
      ) : error ? (
        <div className="flex items-center justify-center py-20 text-brand-red-dark text-sm">
          {error}
        </div>
      ) : !data || data.transactions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Clock size={36} className="text-ink-muted opacity-40" />
          <p className="text-ink-muted text-sm">No trades yet. Execute a buy or sell to see your history here.</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-surface-muted border-b border-surface-border">
                <tr>
                  <th className={`${COL} text-left`}>#</th>
                  <th className={`${COL} text-left`}>Ticker</th>
                  <th className={`${COL} text-left`}>Type</th>
                  <th className={`${COL} text-right`}>Qty</th>
                  <th className={`${COL} text-right`}>Price</th>
                  <th className={`${COL} text-right`}>Value</th>
                  <th className={`${COL} text-right`}>Date &amp; Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {data.transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-surface-muted transition-colors">
                    <td className={`${CELL} text-ink-muted`}>{tx.id}</td>
                    <td className={`${CELL} font-bold text-ink-primary`}>{tx.ticker}</td>
                    <td className={CELL}>
                      <TypeBadge type={tx.type} />
                    </td>
                    <td className={`${CELL} text-right text-ink-primary font-semibold`}>
                      {tx.quantity}
                    </td>
                    <td className={`${CELL} text-right text-ink-secondary`}>
                      {formatINR(tx.price)}
                    </td>
                    <td className={`${CELL} text-right font-semibold text-ink-primary`}>
                      {formatINR(tx.price * tx.quantity)}
                    </td>
                    <td className={`${CELL} text-right text-ink-muted`}>
                      {formatTimestamp(tx.timestamp)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-3 border-t border-surface-border bg-surface-muted">
              <span className="text-xs text-ink-muted">
                Page {page} of {totalPages}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrev}
                  disabled={page === 1}
                  className="p-1.5 rounded-lg text-ink-secondary hover:bg-white hover:shadow-sm disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={handleNext}
                  disabled={page === totalPages}
                  className="p-1.5 rounded-lg text-ink-secondary hover:bg-white hover:shadow-sm disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
