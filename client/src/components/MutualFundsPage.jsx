import { useState, useEffect, useCallback } from 'react';
import { Search, TrendingUp, TrendingDown, RefreshCw, X, IndianRupee } from 'lucide-react';
import { searchMF, fetchMFCat, fetchMFNav, fetchMFPortfolio, investMF, redeemMF } from '../api';
import { formatINR } from '../utils/format';

const CATEGORIES = [
  { id: 'large-cap',  label: 'Large Cap' },
  { id: 'mid-cap',    label: 'Mid Cap' },
  { id: 'small-cap',  label: 'Small Cap' },
  { id: 'index',      label: 'Index Funds' },
  { id: 'elss',       label: 'ELSS / Tax Saver' },
  { id: 'liquid',     label: 'Liquid' },
  { id: 'hybrid',     label: 'Hybrid' },
];

function shortName(name) {
  return name.length > 52 ? name.slice(0, 50) + '…' : name;
}

// ── Invest Modal ──────────────────────────────────────────────────────────────
function InvestModal({ fund, walletBalance, onClose, onSuccess }) {
  const [amount, setAmount]   = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg]         = useState(null);

  const units = fund.nav && amount ? (Number(amount) / fund.nav).toFixed(4) : '—';

  const handleInvest = async () => {
    if (!amount || Number(amount) < 500) { setMsg({ err: 'Minimum ₹500' }); return; }
    setLoading(true); setMsg(null);
    try {
      const res = await investMF({ schemeCode: fund.schemeCode, schemeName: fund.schemeName, amount: Number(amount) });
      setMsg({ ok: `Invested! ${res.units} units at NAV ₹${res.nav}` });
      onSuccess(res.balance);
    } catch (e) {
      setMsg({ err: e.response?.data?.error || 'Investment failed' });
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-ink-muted uppercase tracking-wide">Invest in</p>
            <p className="text-sm font-bold text-ink-primary mt-0.5">{fund.schemeName}</p>
            <p className="text-xs text-ink-muted mt-1">NAV: <span className="font-semibold text-ink-secondary">{formatINR(fund.nav)}</span> · as on {fund.navDate}</p>
          </div>
          <button onClick={onClose} className="text-ink-muted hover:text-ink-primary shrink-0"><X size={18} /></button>
        </div>

        <div>
          <label className="block text-xs font-semibold text-ink-muted mb-1.5">Amount (₹)</label>
          <div className="relative">
            <IndianRupee size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
            <input
              type="number" min="500" value={amount}
              onChange={e => { setAmount(e.target.value); setMsg(null); }}
              placeholder="Min ₹500"
              className="w-full pl-8 pr-4 py-2.5 border border-surface-border rounded-xl text-sm text-ink-primary focus:outline-none focus:ring-2 focus:ring-brand-green/40 focus:border-brand-green"
            />
          </div>
          <p className="text-xs text-ink-muted mt-1.5">
            Units you'll get: <span className="font-semibold text-ink-secondary">{units}</span>
            &nbsp;·&nbsp;Wallet: <span className="font-semibold">{formatINR(walletBalance)}</span>
          </p>
        </div>

        {/* Quick amounts */}
        <div className="flex gap-2 flex-wrap">
          {[1000, 5000, 10000, 25000].map(v => (
            <button key={v} type="button" onClick={() => setAmount(String(v))}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${Number(amount) === v ? 'bg-ink-primary text-white border-ink-primary' : 'border-surface-border text-ink-secondary hover:border-ink-primary'}`}>
              +{formatINR(v)}
            </button>
          ))}
        </div>

        {msg?.err && <p className="text-xs font-medium text-brand-red-dark bg-brand-red-light px-3 py-2 rounded-lg">{msg.err}</p>}
        {msg?.ok  && <p className="text-xs font-medium text-brand-green bg-green-50 px-3 py-2 rounded-lg">{msg.ok}</p>}

        <button onClick={handleInvest} disabled={loading || !amount}
          className="w-full py-2.5 bg-brand-green text-white font-bold rounded-xl text-sm hover:bg-brand-green/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
          {loading ? 'Processing…' : 'Invest Now'}
        </button>
      </div>
    </div>
  );
}

// ── Redeem Modal ──────────────────────────────────────────────────────────────
function RedeemModal({ holding, onClose, onSuccess }) {
  const [units, setUnits]     = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg]         = useState(null);

  const handleRedeem = async () => {
    if (!units || Number(units) <= 0) { setMsg({ err: 'Enter valid units' }); return; }
    if (Number(units) > holding.units) { setMsg({ err: 'Not enough units' }); return; }
    setLoading(true); setMsg(null);
    try {
      const res = await redeemMF({ schemeCode: holding.scheme_code, units: Number(units) });
      setMsg({ ok: `Redeemed! ₹${res.payout.toFixed(2)} added to wallet.` });
      onSuccess(res.balance);
    } catch (e) {
      setMsg({ err: e.response?.data?.error || 'Redemption failed' });
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-ink-muted uppercase tracking-wide">Redeem from</p>
            <p className="text-sm font-bold text-ink-primary mt-0.5">{holding.scheme_name}</p>
            <p className="text-xs text-ink-muted mt-1">Available: <span className="font-semibold">{holding.units.toFixed(4)} units</span></p>
          </div>
          <button onClick={onClose} className="text-ink-muted hover:text-ink-primary shrink-0"><X size={18} /></button>
        </div>

        <div>
          <label className="block text-xs font-semibold text-ink-muted mb-1.5">Units to redeem</label>
          <input type="number" min="0.001" max={holding.units} value={units}
            onChange={e => { setUnits(e.target.value); setMsg(null); }}
            placeholder={`Max ${holding.units.toFixed(4)}`}
            className="w-full px-4 py-2.5 border border-surface-border rounded-xl text-sm text-ink-primary focus:outline-none focus:ring-2 focus:ring-brand-green/40 focus:border-brand-green"
          />
          <button type="button" onClick={() => setUnits(String(holding.units.toFixed(4)))}
            className="mt-1.5 text-xs font-semibold text-brand-green hover:underline">Redeem All</button>
        </div>

        {msg?.err && <p className="text-xs font-medium text-brand-red-dark bg-brand-red-light px-3 py-2 rounded-lg">{msg.err}</p>}
        {msg?.ok  && <p className="text-xs font-medium text-brand-green bg-green-50 px-3 py-2 rounded-lg">{msg.ok}</p>}

        <button onClick={handleRedeem} disabled={loading || !units}
          className="w-full py-2.5 bg-brand-red-dark text-white font-bold rounded-xl text-sm hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
          {loading ? 'Processing…' : 'Redeem Units'}
        </button>
      </div>
    </div>
  );
}

// ── Fund Card ─────────────────────────────────────────────────────────────────
function FundCard({ fund, walletBalance, onInvest }) {
  return (
    <div className="bg-white rounded-2xl shadow-card p-5 flex flex-col gap-4 hover:shadow-md transition-shadow">
      <div>
        <p className="text-sm font-bold text-ink-primary leading-snug">{shortName(fund.schemeName)}</p>
        <p className="text-xs text-ink-muted mt-1">NAV as on {fund.navDate}</p>
      </div>
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs text-ink-muted">Current NAV</p>
          <p className="text-xl font-bold text-ink-primary">{formatINR(fund.nav)}</p>
        </div>
        <button onClick={() => onInvest(fund)}
          className="px-4 py-2 bg-brand-green text-white text-xs font-bold rounded-xl hover:bg-brand-green/90 transition-all">
          Invest
        </button>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function MutualFundsPage({ walletBalance, onBalanceChange }) {
  const [activeCat, setActiveCat]       = useState('large-cap');
  const [funds, setFunds]               = useState([]);
  const [portfolio, setPortfolio]       = useState([]);
  const [loading, setLoading]           = useState(false);
  const [query, setQuery]               = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching]       = useState(false);
  const [investTarget, setInvestTarget] = useState(null);
  const [redeemTarget, setRedeemTarget] = useState(null);
  const [navMap, setNavMap]             = useState({});

  const loadCategory = useCallback(async (cat) => {
    setLoading(true); setQuery(''); setSearchResults([]);
    try {
      const data = await fetchMFCat(cat);
      setFunds(data);
    } catch { setFunds([]); }
    finally { setLoading(false); }
  }, []);

  const loadPortfolio = useCallback(async () => {
    try {
      const holdings = await fetchMFPortfolio();
      setPortfolio(holdings);
      // Fetch current NAV for each holding
      const navResults = await Promise.allSettled(
        holdings.map(async h => {
          const navData = await fetchMFNav(h.scheme_code);
          return { code: h.scheme_code, nav: parseFloat(navData?.data?.[0]?.nav) };
        })
      );
      const map = {};
      navResults.forEach(r => { if (r.status === 'fulfilled' && r.value) map[r.value.code] = r.value.nav; });
      setNavMap(map);
    } catch { setPortfolio([]); }
  }, []);

  useEffect(() => { loadCategory(activeCat); }, [activeCat, loadCategory]);
  useEffect(() => { loadPortfolio(); }, [loadPortfolio]);

  useEffect(() => {
    if (!query.trim()) { setSearchResults([]); return; }
    const timer = setTimeout(async () => {
      setSearching(true);
      try { setSearchResults(await searchMF(query)); }
      catch { setSearchResults([]); }
      finally { setSearching(false); }
    }, 400);
    return () => clearTimeout(timer);
  }, [query]);

  const handleInvestSuccess = (newBalance) => {
    onBalanceChange?.(newBalance);
    loadPortfolio();
  };

  const handleRedeemSuccess = (newBalance) => {
    onBalanceChange?.(newBalance);
    loadPortfolio();
  };

  const displayFunds = query.trim() ? searchResults : funds;

  return (
    <div className="space-y-6">

      {/* Modals */}
      {investTarget && (
        <InvestModal fund={investTarget} walletBalance={walletBalance}
          onClose={() => setInvestTarget(null)} onSuccess={handleInvestSuccess} />
      )}
      {redeemTarget && (
        <RedeemModal holding={redeemTarget}
          onClose={() => setRedeemTarget(null)} onSuccess={handleRedeemSuccess} />
      )}

      {/* Header row */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <h2 className="text-lg font-bold text-ink-primary">Mutual Funds</h2>
        <span className="text-xs font-medium bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full border border-blue-200">
          Real NAV · AMFI Data
        </span>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
        <input value={query} onChange={e => setQuery(e.target.value)}
          placeholder="Search any fund by name…"
          className="w-full pl-8 pr-4 py-2.5 border border-surface-border rounded-xl text-sm text-ink-primary bg-white focus:outline-none focus:ring-2 focus:ring-brand-green/40 focus:border-brand-green" />
        {searching && <RefreshCw size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted animate-spin" />}
      </div>

      {/* Category tabs — hidden when searching */}
      {!query.trim() && (
        <div className="flex gap-1 flex-wrap">
          {CATEGORIES.map(c => (
            <button key={c.id} onClick={() => setActiveCat(c.id)}
              className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                activeCat === c.id
                  ? 'bg-ink-primary text-white border-ink-primary'
                  : 'border-surface-border text-ink-secondary hover:border-ink-primary hover:text-ink-primary bg-white'
              }`}>
              {c.label}
            </button>
          ))}
        </div>
      )}

      {/* Fund grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl shadow-card p-5 h-36 animate-pulse">
              <div className="h-4 bg-surface-muted rounded w-3/4 mb-2" />
              <div className="h-3 bg-surface-muted rounded w-1/2 mb-4" />
              <div className="h-6 bg-surface-muted rounded w-1/3" />
            </div>
          ))}
        </div>
      ) : displayFunds.length === 0 ? (
        <div className="text-center py-16 text-ink-muted text-sm">
          {query ? 'No funds found. Try a different search.' : 'No funds in this category right now.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayFunds.map(f => (
            f.nav
              ? <FundCard key={f.schemeCode} fund={f} walletBalance={walletBalance} onInvest={setInvestTarget} />
              : (
                <div key={f.schemeCode} className="bg-white rounded-2xl shadow-card p-5 flex flex-col gap-3">
                  <p className="text-sm font-bold text-ink-primary leading-snug">{shortName(f.schemeName)}</p>
                  <p className="text-xs text-ink-muted">NAV not available</p>
                  <button onClick={() => setInvestTarget({ ...f, nav: null })}
                    className="self-start px-4 py-2 bg-surface-muted text-ink-muted text-xs font-bold rounded-xl cursor-not-allowed" disabled>
                    Invest
                  </button>
                </div>
              )
          ))}
        </div>
      )}

      {/* My MF Portfolio */}
      {portfolio.length > 0 && (
        <div className="bg-white rounded-2xl shadow-card overflow-hidden">
          <div className="px-5 py-4 border-b border-surface-border">
            <h3 className="font-bold text-ink-primary">My MF Portfolio</h3>
          </div>
          <div className="divide-y divide-surface-border">
            {portfolio.map(h => {
              const currentNav   = navMap[h.scheme_code];
              const currentValue = currentNav ? currentNav * h.units : null;
              const pnl          = currentValue != null ? currentValue - h.invested_amt : null;
              const pnlPct       = pnl != null && h.invested_amt > 0 ? (pnl / h.invested_amt) * 100 : null;
              const isUp         = pnl == null || pnl >= 0;

              return (
                <div key={h.scheme_code} className="px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-ink-primary truncate">{h.scheme_name}</p>
                    <p className="text-xs text-ink-muted mt-0.5">
                      {h.units.toFixed(4)} units · Avg NAV {formatINR(h.avg_nav)} · Invested {formatINR(h.invested_amt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-bold text-ink-primary">
                        {currentValue != null ? formatINR(currentValue) : '—'}
                      </p>
                      {pnl != null && (
                        <p className={`text-xs font-semibold flex items-center justify-end gap-0.5 ${isUp ? 'text-brand-green-dark' : 'text-brand-red-dark'}`}>
                          {isUp ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                          {isUp ? '+' : ''}{formatINR(pnl)} ({pnlPct?.toFixed(2)}%)
                        </p>
                      )}
                    </div>
                    <button onClick={() => setRedeemTarget(h)}
                      className="px-3 py-1.5 border border-brand-red-dark text-brand-red-dark text-xs font-bold rounded-xl hover:bg-brand-red-light transition-all shrink-0">
                      Redeem
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <p className="text-xs text-ink-muted text-center">NAV data sourced from AMFI via mfapi.in · Updated daily after market close</p>
    </div>
  );
}
