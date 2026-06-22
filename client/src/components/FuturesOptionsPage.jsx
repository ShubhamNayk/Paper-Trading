import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, TrendingUp, TrendingDown, ChevronDown } from 'lucide-react';
import { fetchOptionsChain, fetchFutures, fetchFNOPositions, tradeOption, tradeFuture } from '../api';
import { formatINR } from '../utils/format';

// ── Options Chain ─────────────────────────────────────────────────────────────
function OptionsChain({ walletBalance, onTradeSuccess }) {
  const [symbol, setSymbol]   = useState('NIFTY');
  const [chain, setChain]     = useState(null);
  const [loading, setLoading] = useState(false);
  const [expiry, setExpiry]   = useState('');
  const [selected, setSelected] = useState(null); // { strike, type: 'CE'|'PE', ltp }
  const [lots, setLots]       = useState(1);
  const [side, setSide]       = useState('BUY');
  const [trading, setTrading] = useState(false);
  const [msg, setMsg]         = useState(null);

  const SYMBOLS = ['NIFTY', 'BANKNIFTY', 'FINNIFTY', 'MIDCPNIFTY'];

  const load = useCallback(async () => {
    setLoading(true); setMsg(null);
    try {
      const data = await fetchOptionsChain(symbol, expiry || undefined);
      setChain(data);
      if (!expiry) setExpiry(data.expiry);
    } catch { setChain(null); }
    finally { setLoading(false); }
  }, [symbol, expiry]);

  useEffect(() => { setExpiry(''); setChain(null); setSelected(null); }, [symbol]);
  useEffect(() => { load(); }, [load]);

  // Auto-refresh every 15s
  useEffect(() => {
    const id = setInterval(load, 15000);
    return () => clearInterval(id);
  }, [load]);

  const handleTrade = async () => {
    if (!selected) return;
    setTrading(true); setMsg(null);
    try {
      const res = await tradeOption({
        symbol, optionType: selected.type, strike: selected.strike,
        expiry: chain.expiry, lots, side,
      });
      setMsg({ ok: `${side} ${lots} lot(s) of ${symbol} ${selected.strike} ${selected.type} @ ₹${res.premium}. Cost: ${formatINR(res.cost)}` });
      onTradeSuccess?.(res.balance);
      setSelected(null);
    } catch (e) {
      setMsg({ err: e.response?.data?.error || 'Trade failed' });
    } finally { setTrading(false); }
  };

  const totalCost = selected && chain ? selected.ltp * chain.lotSize * lots : 0;

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="bg-white rounded-2xl shadow-card p-4 flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-ink-muted">Symbol</label>
          <div className="relative">
            <select value={symbol} onChange={e => setSymbol(e.target.value)}
              className="appearance-none pl-3 pr-8 py-1.5 border border-surface-border rounded-xl text-sm font-bold text-ink-primary focus:outline-none focus:ring-2 focus:ring-brand-green/40 bg-white">
              {SYMBOLS.map(s => <option key={s}>{s}</option>)}
            </select>
            <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-ink-muted" />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-ink-muted">Expiry</label>
          <div className="relative">
            <select value={expiry} onChange={e => { setExpiry(e.target.value); setSelected(null); }}
              className="appearance-none pl-3 pr-8 py-1.5 border border-surface-border rounded-xl text-sm font-semibold text-ink-primary focus:outline-none focus:ring-2 focus:ring-brand-green/40 bg-white">
              {(chain?.expiries || [expiry]).map(e => <option key={e}>{e}</option>)}
            </select>
            <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-ink-muted" />
          </div>
        </div>

        {chain && (
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs text-ink-muted">Spot:</span>
            <span className="text-sm font-bold text-ink-primary">{formatINR(chain.spot)}</span>
            <span className="text-xs text-ink-muted">· Lot size: {chain.lotSize}</span>
            <button onClick={load} className="ml-1 text-ink-muted hover:text-ink-primary transition-colors">
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        )}
      </div>

      {/* Options Chain Table */}
      {loading && !chain ? (
        <div className="bg-white rounded-2xl shadow-card p-8 text-center text-ink-muted text-sm">
          <RefreshCw size={20} className="animate-spin mx-auto mb-2" />
          Loading options chain…
        </div>
      ) : chain ? (
        <div className="bg-white rounded-2xl shadow-card overflow-x-auto">
          <table className="w-full text-xs min-w-[640px]">
            <thead>
              <tr className="bg-green-50 text-brand-green-dark font-bold">
                <th className="px-3 py-2.5 text-right">OI</th>
                <th className="px-3 py-2.5 text-right">IV %</th>
                <th className="px-3 py-2.5 text-right font-bold text-sm">CE LTP</th>
                <th className="px-4 py-2.5 text-center bg-surface-muted text-ink-primary text-sm">STRIKE</th>
                <th className="px-3 py-2.5 text-left font-bold text-sm text-brand-red-dark">PE LTP</th>
                <th className="px-3 py-2.5 text-left text-brand-red-dark">IV %</th>
                <th className="px-3 py-2.5 text-left text-brand-red-dark">OI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {chain.chain.map(row => {
                const atmRow  = row.isATM;
                const ceSelected = selected?.strike === row.strike && selected?.type === 'CE';
                const peSelected = selected?.strike === row.strike && selected?.type === 'PE';

                return (
                  <tr key={row.strike}
                    className={`transition-colors ${atmRow ? 'bg-yellow-50' : 'hover:bg-surface-muted/40'}`}>
                    {/* CALL side */}
                    <td className={`px-3 py-2 text-right text-ink-muted ${row.ce.itm ? 'bg-green-50/60' : ''}`}>
                      {(row.ce.oi / 1000).toFixed(1)}K
                    </td>
                    <td className={`px-3 py-2 text-right text-ink-muted ${row.ce.itm ? 'bg-green-50/60' : ''}`}>
                      {row.ce.iv}%
                    </td>
                    <td className={`px-3 py-2 text-right ${row.ce.itm ? 'bg-green-50/60' : ''}`}>
                      <button onClick={() => { setSelected({ strike: row.strike, type: 'CE', ltp: row.ce.ltp }); setSide('BUY'); setMsg(null); }}
                        className={`px-2 py-1 rounded-lg font-bold transition-all ${ceSelected ? 'bg-brand-green text-white' : 'text-brand-green-dark hover:bg-green-50'}`}>
                        {formatINR(row.ce.ltp)}
                      </button>
                    </td>

                    {/* Strike */}
                    <td className={`px-4 py-2 text-center font-bold bg-surface-muted text-sm ${atmRow ? 'text-amber-700 bg-yellow-100' : 'text-ink-primary'}`}>
                      {row.strike.toLocaleString('en-IN')}
                      {atmRow && <span className="ml-1 text-[9px] font-black tracking-wider text-amber-600">ATM</span>}
                    </td>

                    {/* PUT side */}
                    <td className={`px-3 py-2 text-left ${row.pe.itm ? 'bg-red-50/60' : ''}`}>
                      <button onClick={() => { setSelected({ strike: row.strike, type: 'PE', ltp: row.pe.ltp }); setSide('BUY'); setMsg(null); }}
                        className={`px-2 py-1 rounded-lg font-bold transition-all ${peSelected ? 'bg-brand-red-dark text-white' : 'text-brand-red-dark hover:bg-red-50'}`}>
                        {formatINR(row.pe.ltp)}
                      </button>
                    </td>
                    <td className={`px-3 py-2 text-left text-ink-muted ${row.pe.itm ? 'bg-red-50/60' : ''}`}>
                      {row.pe.iv}%
                    </td>
                    <td className={`px-3 py-2 text-left text-ink-muted ${row.pe.itm ? 'bg-red-50/60' : ''}`}>
                      {(row.pe.oi / 1000).toFixed(1)}K
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-card p-8 text-center text-ink-muted text-sm">
          Failed to load options chain. Check server connection.
        </div>
      )}

      {/* Trade Panel */}
      {selected && chain && (
        <div className="bg-white rounded-2xl shadow-card p-5 space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-ink-primary">{symbol}</span>
            <span className="font-bold text-ink-primary">{selected.strike.toLocaleString('en-IN')}</span>
            <span className={`px-2 py-0.5 rounded-lg text-xs font-black ${selected.type === 'CE' ? 'bg-green-50 text-brand-green-dark' : 'bg-red-50 text-brand-red-dark'}`}>
              {selected.type}
            </span>
            <span className="text-sm text-ink-muted">@ {formatINR(selected.ltp)}/unit · Lot {chain.lotSize}</span>
          </div>

          <div className="flex flex-wrap gap-3 items-end">
            {/* BUY / SELL */}
            <div>
              <label className="block text-xs font-semibold text-ink-muted mb-1">Action</label>
              <div className="flex rounded-xl overflow-hidden border border-surface-border">
                {['BUY', 'SELL'].map(s => (
                  <button key={s} onClick={() => setSide(s)}
                    className={`px-5 py-1.5 text-xs font-bold transition-all ${side === s
                      ? s === 'BUY' ? 'bg-brand-green text-white' : 'bg-brand-red-dark text-white'
                      : 'text-ink-secondary bg-white hover:bg-surface-muted'}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Lots */}
            <div>
              <label className="block text-xs font-semibold text-ink-muted mb-1">Lots</label>
              <input type="number" min="1" max="50" value={lots} onChange={e => setLots(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-20 px-3 py-1.5 border border-surface-border rounded-xl text-sm text-center font-bold text-ink-primary focus:outline-none focus:ring-2 focus:ring-brand-green/40" />
            </div>

            {/* Summary */}
            <div className="text-sm text-ink-secondary">
              <span className="text-ink-muted text-xs">Total Premium&nbsp;</span>
              <span className="font-bold text-ink-primary">{formatINR(totalCost)}</span>
              <span className="text-ink-muted text-xs ml-2">({lots} × {chain.lotSize} × {formatINR(selected.ltp)})</span>
            </div>

            <button onClick={handleTrade} disabled={trading}
              className={`px-6 py-1.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50 ${side === 'BUY' ? 'bg-brand-green hover:bg-brand-green/90' : 'bg-brand-red-dark hover:opacity-90'}`}>
              {trading ? 'Placing…' : `${side} ${selected.type}`}
            </button>
          </div>

          {msg?.err && <p className="text-xs font-medium text-brand-red-dark bg-brand-red-light px-3 py-2 rounded-lg">{msg.err}</p>}
          {msg?.ok  && <p className="text-xs font-medium text-brand-green bg-green-50 px-3 py-2 rounded-lg">{msg.ok}</p>}
        </div>
      )}
    </div>
  );
}

// ── Futures ───────────────────────────────────────────────────────────────────
function FuturesTab({ walletBalance, onTradeSuccess }) {
  const [futures, setFutures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [lots, setLots]       = useState(1);
  const [side, setSide]       = useState('BUY');
  const [trading, setTrading] = useState(false);
  const [msg, setMsg]         = useState(null);

  const load = useCallback(async () => {
    try {
      const data = await fetchFutures();
      setFutures(data);
    } catch { setFutures([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); const id = setInterval(load, 15000); return () => clearInterval(id); }, [load]);

  const handleTrade = async () => {
    if (!selected) return;
    setTrading(true); setMsg(null);
    try {
      const res = await tradeFuture({ symbol: selected.symbol, expiry: selected.expiry, lots, side });
      setMsg({ ok: `${side} ${lots} lot(s) of ${selected.symbol} FUT @ ${formatINR(res.price)}. Margin blocked: ${formatINR(res.margin)}` });
      onTradeSuccess?.(res.balance);
    } catch (e) {
      setMsg({ err: e.response?.data?.error || 'Trade failed' });
    } finally { setTrading(false); }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl shadow-card overflow-hidden">
        <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr_1fr_auto] text-xs font-semibold text-ink-muted uppercase tracking-wide px-5 py-3 border-b border-surface-border bg-surface-muted">
          <span>Contract</span>
          <span className="text-right">LTP</span>
          <span className="text-right">Change</span>
          <span className="text-right hidden sm:block">Lot Size</span>
          <span className="text-right hidden sm:block">Margin (12%)</span>
          <span></span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-ink-muted text-sm">
            <RefreshCw size={18} className="animate-spin mx-auto mb-2" />Loading futures…
          </div>
        ) : futures.length === 0 ? (
          <p className="text-center py-12 text-ink-muted text-sm">Failed to load futures data.</p>
        ) : (
          futures.map(f => {
            const isUp  = f.changePercent >= 0;
            const isSel = selected?.symbol === f.symbol;
            return (
              <div key={f.symbol}
                className={`grid grid-cols-[1.5fr_1fr_1fr_1fr_1fr_auto] items-center px-5 py-3.5 border-b border-surface-border last:border-0 transition-colors ${isSel ? 'bg-blue-50' : 'hover:bg-surface-muted/40'}`}>
                <div>
                  <p className="text-sm font-bold text-ink-primary">{f.symbol} <span className="text-ink-muted font-normal text-xs">FUT</span></p>
                  <p className="text-xs text-ink-muted">{f.expiry}</p>
                </div>
                <p className="text-sm font-bold text-ink-primary text-right">{formatINR(f.ltp)}</p>
                <div className={`flex items-center justify-end gap-1 text-xs font-semibold ${isUp ? 'text-brand-green-dark' : 'text-brand-red-dark'}`}>
                  {isUp ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                  {isUp ? '+' : ''}{f.changePercent.toFixed(2)}%
                </div>
                <p className="text-xs text-ink-secondary text-right hidden sm:block">{f.lotSize}</p>
                <p className="text-xs text-ink-secondary text-right hidden sm:block">{formatINR(f.margin)}</p>
                <button
                  onClick={() => { setSelected(f); setMsg(null); }}
                  className={`ml-3 px-3 py-1.5 text-xs font-bold rounded-xl border transition-all ${isSel ? 'bg-ink-primary text-white border-ink-primary' : 'border-surface-border text-ink-secondary hover:border-ink-primary hover:text-ink-primary'}`}>
                  Trade
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Trade Panel */}
      {selected && (
        <div className="bg-white rounded-2xl shadow-card p-5 space-y-4">
          <p className="font-bold text-ink-primary">{selected.symbol} Futures · {selected.expiry}</p>
          <div className="text-sm text-ink-muted">
            LTP: <span className="font-bold text-ink-primary">{formatINR(selected.ltp)}</span>
            &nbsp;· Lot size: {selected.lotSize}
            &nbsp;· Contract value: {formatINR(selected.contractValue)}
          </div>

          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-xs font-semibold text-ink-muted mb-1">Action</label>
              <div className="flex rounded-xl overflow-hidden border border-surface-border">
                {['BUY', 'SELL'].map(s => (
                  <button key={s} onClick={() => setSide(s)}
                    className={`px-5 py-1.5 text-xs font-bold transition-all ${side === s
                      ? s === 'BUY' ? 'bg-brand-green text-white' : 'bg-brand-red-dark text-white'
                      : 'text-ink-secondary bg-white hover:bg-surface-muted'}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-muted mb-1">Lots</label>
              <input type="number" min="1" max="50" value={lots} onChange={e => setLots(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-20 px-3 py-1.5 border border-surface-border rounded-xl text-sm text-center font-bold text-ink-primary focus:outline-none focus:ring-2 focus:ring-brand-green/40" />
            </div>

            <div className="text-sm text-ink-secondary">
              <span className="text-ink-muted text-xs">Margin required&nbsp;</span>
              <span className="font-bold text-ink-primary">{formatINR(selected.margin * lots)}</span>
            </div>

            <button onClick={handleTrade} disabled={trading}
              className={`px-6 py-1.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50 ${side === 'BUY' ? 'bg-brand-green hover:bg-brand-green/90' : 'bg-brand-red-dark hover:opacity-90'}`}>
              {trading ? 'Placing…' : `${side} ${selected.symbol} FUT`}
            </button>
          </div>

          {msg?.err && <p className="text-xs font-medium text-brand-red-dark bg-brand-red-light px-3 py-2 rounded-lg">{msg.err}</p>}
          {msg?.ok  && <p className="text-xs font-medium text-brand-green bg-green-50 px-3 py-2 rounded-lg">{msg.ok}</p>}
        </div>
      )}
    </div>
  );
}

// ── Positions ─────────────────────────────────────────────────────────────────
function PositionsTab() {
  const [positions, setPositions] = useState({ options: [], futures: [] });
  const [loading, setLoading]     = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await fetchFNOPositions();
      setPositions(data);
    } catch { setPositions({ options: [], futures: [] }); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); const id = setInterval(load, 15000); return () => clearInterval(id); }, [load]);

  if (loading) return <div className="text-center py-12 text-ink-muted text-sm"><RefreshCw size={18} className="animate-spin mx-auto mb-2" />Loading positions…</div>;

  const noPositions = positions.options.length === 0 && positions.futures.length === 0;

  if (noPositions) return (
    <div className="bg-white rounded-2xl shadow-card p-12 text-center text-ink-muted text-sm">
      No open F&O positions. Place a trade from Options Chain or Futures.
    </div>
  );

  return (
    <div className="space-y-4">
      {positions.options.length > 0 && (
        <div className="bg-white rounded-2xl shadow-card overflow-hidden">
          <div className="px-5 py-3 border-b border-surface-border bg-surface-muted">
            <p className="text-xs font-bold text-ink-muted uppercase tracking-wide">Options Positions</p>
          </div>
          <div className="divide-y divide-surface-border">
            {positions.options.map(p => {
              const isUp = p.pnl == null || p.pnl >= 0;
              return (
                <div key={p.id} className="px-5 py-3 flex flex-wrap items-center gap-3 justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-ink-primary">{p.symbol}</span>
                      <span className="font-bold text-sm text-ink-primary">{Number(p.strike).toLocaleString('en-IN')}</span>
                      <span className={`px-1.5 py-0.5 rounded text-xs font-black ${p.option_type === 'CE' ? 'bg-green-50 text-brand-green-dark' : 'bg-red-50 text-brand-red-dark'}`}>{p.option_type}</span>
                      <span className={`px-1.5 py-0.5 rounded text-xs font-semibold ${p.side === 'BUY' ? 'text-brand-green-dark' : 'text-brand-red-dark'}`}>{p.side}</span>
                    </div>
                    <p className="text-xs text-ink-muted mt-0.5">{p.lots} lot(s) · Expiry {p.expiry} · Avg ₹{p.avg_premium}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-ink-primary">{p.current_premium != null ? formatINR(p.current_premium) : '—'}</p>
                    {p.pnl != null && (
                      <p className={`text-xs font-semibold ${isUp ? 'text-brand-green-dark' : 'text-brand-red-dark'}`}>
                        {p.pnl >= 0 ? '+' : ''}{formatINR(p.pnl)}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {positions.futures.length > 0 && (
        <div className="bg-white rounded-2xl shadow-card overflow-hidden">
          <div className="px-5 py-3 border-b border-surface-border bg-surface-muted">
            <p className="text-xs font-bold text-ink-muted uppercase tracking-wide">Futures Positions</p>
          </div>
          <div className="divide-y divide-surface-border">
            {positions.futures.map(p => {
              const isUp = p.pnl == null || p.pnl >= 0;
              return (
                <div key={p.id} className="px-5 py-3 flex flex-wrap items-center gap-3 justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-ink-primary">{p.symbol} FUT</span>
                      <span className={`px-1.5 py-0.5 rounded text-xs font-semibold ${p.side === 'BUY' ? 'text-brand-green-dark' : 'text-brand-red-dark'}`}>{p.side}</span>
                    </div>
                    <p className="text-xs text-ink-muted mt-0.5">{p.lots} lot(s) · Expiry {p.expiry} · Avg {formatINR(p.avg_price)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-ink-primary">{p.current_price != null ? formatINR(p.current_price) : '—'}</p>
                    {p.pnl != null && (
                      <p className={`text-xs font-semibold ${isUp ? 'text-brand-green-dark' : 'text-brand-red-dark'}`}>
                        {p.pnl >= 0 ? '+' : ''}{formatINR(p.pnl)}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function FuturesOptionsPage({ walletBalance, onTradeSuccess }) {
  const [tab, setTab] = useState('options');
  const TABS = [
    { id: 'options',   label: 'Options Chain' },
    { id: 'futures',   label: 'Futures' },
    { id: 'positions', label: 'My Positions' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <h2 className="text-lg font-bold text-ink-primary">Futures & Options</h2>
        <div className="flex gap-1.5">
          <span className="text-xs font-medium bg-purple-50 text-purple-700 px-2.5 py-1 rounded-full border border-purple-200">
            Black-Scholes Pricing
          </span>
          <span className="text-xs font-medium bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full border border-blue-200">
            Real NIFTY / BANKNIFTY Spot
          </span>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-white rounded-2xl shadow-card p-1 w-fit">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all ${
              tab === t.id ? 'bg-ink-primary text-white shadow-sm' : 'text-ink-secondary hover:text-ink-primary'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'options'   && <OptionsChain walletBalance={walletBalance} onTradeSuccess={onTradeSuccess} />}
      {tab === 'futures'   && <FuturesTab   walletBalance={walletBalance} onTradeSuccess={onTradeSuccess} />}
      {tab === 'positions' && <PositionsTab />}

      <p className="text-xs text-ink-muted text-center">
        Paper trading only · Options premiums calculated via Black-Scholes using live NIFTY/BANKNIFTY spot prices
      </p>
    </div>
  );
}
