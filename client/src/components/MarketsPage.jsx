import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Search } from 'lucide-react';
import { fetchAllPrices } from '../api';
import { formatINR } from '../utils/format';

export default function MarketsPage({ onTradeClick }) {
  const [prices, setPrices] = useState([]);
  const [query, setQuery]   = useState('');

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const data = await fetchAllPrices();
        if (alive) setPrices(data);
      } catch {}
    };
    load();
    const id = setInterval(load, 3000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  const filtered = prices.filter(s =>
    s.symbol.toLowerCase().includes(query.toLowerCase()) ||
    s.name?.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="space-y-4">

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search symbol or company…"
          className="w-full pl-8 pr-4 py-2.5 border border-surface-border rounded-xl text-sm text-ink-primary bg-white focus:outline-none focus:ring-2 focus:ring-brand-green/40 focus:border-brand-green"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-card overflow-hidden">
        <div className="grid grid-cols-[2fr_1fr_1fr_auto] text-xs font-semibold text-ink-muted uppercase tracking-wide px-5 py-3 border-b border-surface-border bg-surface-muted">
          <span>Company</span>
          <span className="text-right">Price</span>
          <span className="text-right">Change %</span>
          <span></span>
        </div>

        {filtered.length === 0 ? (
          <p className="text-center py-16 text-ink-muted text-sm">No stocks found.</p>
        ) : (
          filtered.map((s) => {
            const pct = s.changePercent ?? 0;
            const isUp = pct >= 0;
            return (
              <div
                key={s.symbol}
                className="grid grid-cols-[2fr_1fr_1fr_auto] items-center px-5 py-3.5 border-b border-surface-border last:border-0 hover:bg-surface-muted/50 transition-colors"
              >
                <div>
                  <p className="text-sm font-bold text-ink-primary">{s.symbol}</p>
                  <p className="text-xs text-ink-muted truncate max-w-[180px]">{s.name}</p>
                </div>

                <p className="text-sm font-semibold text-ink-primary text-right">
                  {formatINR(s.price)}
                </p>

                <div className={`flex items-center justify-end gap-1 text-sm font-semibold ${isUp ? 'text-brand-green-dark' : 'text-brand-red-dark'}`}>
                  {isUp ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                  <span>{isUp ? '+' : ''}{pct.toFixed(2)}%</span>
                </div>

                <button
                  onClick={() => onTradeClick(s.symbol)}
                  className="ml-3 px-3 py-1.5 bg-ink-primary text-white text-xs font-bold rounded-lg hover:bg-ink-primary/80 transition-colors whitespace-nowrap"
                >
                  Trade
                </button>
              </div>
            );
          })
        )}
      </div>

      <p className="text-xs text-ink-muted text-center">Prices refresh every 3 seconds · Simulated Nifty 50 data</p>
    </div>
  );
}
