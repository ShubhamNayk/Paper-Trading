import { useState, useEffect, useCallback } from 'react';
import { Wallet, PlusCircle, Clock, TrendingUp, IndianRupee } from 'lucide-react';
import { fetchWallet, addFunds } from '../api';
import { formatINR } from '../utils/format';

const PRESETS = [10000, 25000, 50000, 100000];

function formatDate(str) {
  if (!str) return '';
  const d = new Date(str.endsWith('Z') ? str : str + 'Z');
  return d.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

export default function WalletPage({ onFundsAdded }) {
  const [wallet, setWallet]     = useState(null);
  const [amount, setAmount]     = useState('');
  const [note, setNote]         = useState('');
  const [loading, setLoading]   = useState(false);
  const [success, setSuccess]   = useState('');
  const [error, setError]       = useState('');

  const load = useCallback(async () => {
    try {
      const data = await fetchWallet();
      setWallet(data);
    } catch {
      setError('Could not load wallet. Make sure the server is running.');
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async (e) => {
    e.preventDefault();
    const parsed = Number(amount);
    if (!parsed || parsed <= 0) {
      setError('Enter a valid amount.');
      return;
    }
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await addFunds(parsed, note.trim() || undefined);
      setWallet(prev => ({ ...prev, balance: res.balance }));
      setSuccess(`₹${parsed.toLocaleString('en-IN')} added successfully!`);
      setAmount('');
      setNote('');
      load();
      onFundsAdded?.();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add funds.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">

      {/* Balance card */}
      <div className="bg-white rounded-2xl shadow-card p-6 flex items-center gap-5">
        <div className="p-4 bg-brand-green/10 rounded-2xl">
          <Wallet size={28} className="text-brand-green" />
        </div>
        <div>
          <p className="text-sm text-ink-muted font-medium">Available Balance</p>
          <p className="text-3xl font-bold text-ink-primary mt-0.5">
            {wallet ? formatINR(wallet.balance) : '—'}
          </p>
          <p className="text-xs text-ink-muted mt-1">Initial allocation: ₹1,00,000 · Add more anytime</p>
        </div>
      </div>

      {/* Add funds form */}
      <div className="bg-white rounded-2xl shadow-card p-6 space-y-5">
        <div className="flex items-center gap-2">
          <PlusCircle size={18} className="text-brand-green" />
          <h2 className="font-bold text-ink-primary text-base">Add Funds</h2>
        </div>

        {/* Quick presets */}
        <div className="flex flex-wrap gap-2">
          {PRESETS.map(p => (
            <button
              key={p}
              type="button"
              onClick={() => setAmount(String(p))}
              className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${
                Number(amount) === p
                  ? 'bg-ink-primary text-white border-ink-primary'
                  : 'border-surface-border text-ink-secondary hover:border-ink-primary hover:text-ink-primary'
              }`}
            >
              +{formatINR(p)}
            </button>
          ))}
        </div>

        <form onSubmit={handleAdd} className="space-y-4">
          {/* Custom amount */}
          <div>
            <label className="block text-xs font-semibold text-ink-muted mb-1.5">Amount (₹)</label>
            <div className="relative">
              <IndianRupee size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
              <input
                type="number"
                min="1"
                max="10000000"
                value={amount}
                onChange={e => { setAmount(e.target.value); setSuccess(''); setError(''); }}
                placeholder="Enter amount"
                className="w-full pl-8 pr-4 py-2.5 border border-surface-border rounded-xl text-sm text-ink-primary focus:outline-none focus:ring-2 focus:ring-brand-green/40 focus:border-brand-green"
              />
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="block text-xs font-semibold text-ink-muted mb-1.5">Note (optional)</label>
            <input
              type="text"
              maxLength={100}
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="e.g. Monthly top-up"
              className="w-full px-4 py-2.5 border border-surface-border rounded-xl text-sm text-ink-primary focus:outline-none focus:ring-2 focus:ring-brand-green/40 focus:border-brand-green"
            />
          </div>

          {error   && <p className="text-xs font-medium text-brand-red-dark bg-brand-red-light px-3 py-2 rounded-lg">{error}</p>}
          {success && <p className="text-xs font-medium text-brand-green bg-green-50 px-3 py-2 rounded-lg">{success}</p>}

          <button
            type="submit"
            disabled={loading || !amount}
            className="w-full py-2.5 bg-brand-green text-white font-bold rounded-xl hover:bg-brand-green/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm"
          >
            {loading ? 'Adding…' : 'Add Funds'}
          </button>
        </form>
      </div>

      {/* Deposit history */}
      <div className="bg-white rounded-2xl shadow-card p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Clock size={18} className="text-ink-muted" />
          <h2 className="font-bold text-ink-primary text-base">Deposit History</h2>
        </div>

        {!wallet || wallet.deposits.length === 0 ? (
          <div className="text-center py-10 text-ink-muted text-sm">
            <TrendingUp size={32} className="mx-auto mb-3 opacity-30" />
            No deposits yet. Add funds above to get started.
          </div>
        ) : (
          <div className="divide-y divide-surface-border">
            {wallet.deposits.map(d => (
              <div key={d.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-semibold text-ink-primary">+{formatINR(d.amount)}</p>
                  {d.note && <p className="text-xs text-ink-muted mt-0.5">{d.note}</p>}
                </div>
                <p className="text-xs text-ink-muted">{formatDate(d.created_at)}</p>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
