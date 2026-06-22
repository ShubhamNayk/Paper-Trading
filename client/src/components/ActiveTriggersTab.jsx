import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, X, Zap, Clock } from 'lucide-react';
import { fetchOrders, cancelOrder } from '../api';
import { formatINR } from '../utils/format';

function OrderTypeBadge({ type }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold tracking-wide ${
      type === 'BUY'
        ? 'bg-brand-green-light text-brand-green-dark'
        : 'bg-brand-red-light text-brand-red-dark'
    }`}>
      {type}
    </span>
  );
}

function formatDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso.replace(' ', 'T') + 'Z');
  return d.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

export default function ActiveTriggersTab({ onCancelSuccess }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(null); // order id being cancelled
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      const data = await fetchOrders();
      setOrders(data.orders ?? []);
      setError(null);
    } catch {
      setError('Failed to load trigger orders.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 10000);
    return () => clearInterval(id);
  }, [load]);

  const handleCancel = async (orderId) => {
    setCancelling(orderId);
    try {
      await cancelOrder(orderId);
      setOrders(prev => prev.filter(o => o.id !== orderId));
      if (onCancelSuccess) onCancelSuccess();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to cancel order.');
    } finally {
      setCancelling(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-ink-muted text-sm py-10 justify-center">
        <RefreshCw size={16} className="animate-spin" />
        <span>Loading trigger orders…</span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-card overflow-hidden">
      <div className="px-6 py-4 border-b border-surface-border flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-ink-primary flex items-center gap-2">
            <Zap size={16} className="text-amber-500" />
            Active Trigger Orders
          </h2>
          <p className="text-xs text-ink-muted mt-0.5">Auto-executes when the live price hits your target</p>
        </div>
        <button
          onClick={load}
          className="p-2 rounded-lg hover:bg-surface-muted transition-colors text-ink-muted"
          title="Refresh"
        >
          <RefreshCw size={14} />
        </button>
      </div>

      {error && (
        <div className="mx-6 mt-4 px-4 py-3 rounded-xl bg-brand-red-light text-brand-red-dark text-sm font-medium border border-red-200">
          {error}
        </div>
      )}

      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center px-6">
          <div className="p-3 rounded-2xl bg-surface-muted mb-3">
            <Clock size={24} className="text-ink-muted" />
          </div>
          <p className="text-sm font-semibold text-ink-secondary">No active trigger orders</p>
          <p className="text-xs text-ink-muted mt-1">
            Switch to "Limit / Trigger" in the Trade panel to place one.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-border bg-surface-muted">
                <th className="px-6 py-3 text-left text-xs font-semibold text-ink-muted uppercase tracking-wide">Stock</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-ink-muted uppercase tracking-wide">Type</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-ink-muted uppercase tracking-wide">Trigger Price</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-ink-muted uppercase tracking-wide">Qty</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-ink-muted uppercase tracking-wide">Order Value</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-ink-muted uppercase tracking-wide">Placed At</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-ink-muted uppercase tracking-wide">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {orders.map(order => (
                <tr key={order.id} className="hover:bg-surface-muted transition-colors">
                  <td className="px-6 py-4">
                    <span className="font-bold text-ink-primary">{order.ticker}</span>
                  </td>
                  <td className="px-4 py-4">
                    <OrderTypeBadge type={order.order_type} />
                  </td>
                  <td className="px-4 py-4 text-right font-semibold text-ink-primary tabular-nums">
                    {formatINR(order.trigger_price)}
                  </td>
                  <td className="px-4 py-4 text-right text-ink-secondary tabular-nums">
                    {order.quantity}
                  </td>
                  <td className="px-4 py-4 text-right text-ink-secondary tabular-nums">
                    {formatINR(order.trigger_price * order.quantity)}
                  </td>
                  <td className="px-4 py-4 text-ink-muted text-xs">
                    {formatDateTime(order.created_at)}
                  </td>
                  <td className="px-4 py-4 text-center">
                    <button
                      onClick={() => handleCancel(order.id)}
                      disabled={cancelling === order.id}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-brand-red-dark bg-brand-red-light hover:bg-red-100 border border-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {cancelling === order.id
                        ? <RefreshCw size={12} className="animate-spin" />
                        : <X size={12} />}
                      Cancel
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
