import { useState, useEffect, useCallback } from 'react';
import { Search, TrendingUp, TrendingDown, RefreshCw, AlertCircle, CheckCircle2, ShieldCheck, ChevronDown, ChevronUp } from 'lucide-react';
import { fetchPrice, executeTrade, placeOrder } from '../api';
import { formatINR, formatPct, pnlClass } from '../utils/format';
import PriceChart from './PriceChart';

const NIFTY_SYMBOLS = [
  'RELIANCE','TCS','HDFCBANK','INFY','ICICIBANK','HINDUNILVR','SBIN',
  'BHARTIARTL','KOTAKBANK','LT','AXISBANK','WIPRO','ONGC','NTPC',
  'POWERGRID','MARUTI','BAJFINANCE','TITAN','HCLTECH','SUNPHARMA',
  'ULTRACEMCO','ADANIENT','JSWSTEEL','NESTLEIND','M_M',
];

export default function TradePanel({ balance, onTradeSuccess, onOrderPlaced, prefillSymbol }) {
  const [symbol, setSymbol] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [priceData, setPriceData] = useState(null);
  const [prevPrice, setPrevPrice] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [action, setAction] = useState('buy');
  const [loading, setLoading] = useState(false);
  const [priceLoading, setPriceLoading] = useState(false);
  const [message, setMessage] = useState(null); // { type: 'success'|'error', text }

  // Order type: 'market' | 'limit'
  const [orderMode, setOrderMode] = useState('market');
  const [triggerPrice, setTriggerPrice] = useState('');

  // Risk calculator state
  const [showRiskCalc, setShowRiskCalc] = useState(false);
  const [riskPct, setRiskPct] = useState(1);
  const [stopLoss, setStopLoss] = useState('');

  const loadPrice = useCallback(async (sym) => {
    if (!sym) return;
    setPriceLoading(true);
    try {
      const data = await fetchPrice(sym);
      setPrevPrice(p => (p !== data.price ? (priceData?.price ?? null) : p));
      setPriceData(data);
    } catch {
      setPriceData(null);
    } finally {
      setPriceLoading(false);
    }
  }, [priceData]);

  // Prefill from holdings "Sell" click
  useEffect(() => {
    if (prefillSymbol) {
      setSymbol(prefillSymbol);
      setInputValue(prefillSymbol);
      setAction('sell');
      setSuggestions([]);
    }
  }, [prefillSymbol]);

  // Reset inputs when stock changes
  useEffect(() => {
    setStopLoss('');
    setTriggerPrice('');
  }, [symbol]);

  // Refresh price every 3s when a symbol is active
  useEffect(() => {
    if (!symbol) return;
    loadPrice(symbol);
    const id = setInterval(() => loadPrice(symbol), 3000);
    return () => clearInterval(id);
  }, [symbol, loadPrice]);

  const handleInput = (val) => {
    const v = val.toUpperCase();
    setInputValue(v);
    setSymbol('');
    setPriceData(null);
    if (v.length > 0) {
      setSuggestions(NIFTY_SYMBOLS.filter(s => s.startsWith(v)).slice(0, 6));
    } else {
      setSuggestions([]);
    }
  };

  const selectSymbol = (sym) => {
    setSymbol(sym);
    setInputValue(sym);
    setSuggestions([]);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && inputValue) selectSymbol(inputValue);
  };

  const tradeValue = priceData ? priceData.price * quantity : 0;
  const canAfford = action === 'buy' ? balance >= tradeValue : true;

  // Risk calculator derived values
  const entryPrice = priceData?.price ?? 0;
  const slPrice = parseFloat(stopLoss);
  const riskAmount = balance * (riskPct / 100);
  const slGap = entryPrice - slPrice;
  const riskCalcValid = slPrice > 0 && slGap > 0;
  const maxShares = riskCalcValid ? Math.floor(riskAmount / slGap) : 0;
  const positionValue = maxShares * entryPrice;

  const handleTrade = async () => {
    if (!symbol || !priceData) return;
    setLoading(true);
    setMessage(null);
    try {
      if (orderMode === 'limit') {
        const tp = parseFloat(triggerPrice);
        if (isNaN(tp) || tp <= 0) {
          setMessage({ type: 'error', text: 'Enter a valid trigger price.' });
          return;
        }
        const res = await placeOrder({
          ticker: symbol,
          order_type: action.toUpperCase(),
          trigger_price: tp,
          quantity,
        });
        setMessage({ type: 'success', text: res.message });
        setTriggerPrice('');
        setQuantity(1);
        if (onOrderPlaced) onOrderPlaced();
      } else {
        const res = await executeTrade({ symbol, action, quantity });
        setMessage({ type: 'success', text: res.message });
        onTradeSuccess();
        setQuantity(1);
      }
    } catch (err) {
      const msg = err.response?.data?.error || 'Order failed. Please try again.';
      setMessage({ type: 'error', text: msg });
    } finally {
      setLoading(false);
    }
  };

  const priceDir = priceData && prevPrice
    ? priceData.price > prevPrice ? 'up' : priceData.price < prevPrice ? 'down' : 'flat'
    : 'flat';

  return (
    <div className="bg-white rounded-2xl shadow-card overflow-hidden">
      <div className="px-6 py-4 border-b border-surface-border">
        <h2 className="text-base font-semibold text-ink-primary">Trade</h2>
        <p className="text-xs text-ink-muted mt-0.5">Buy or sell Nifty 50 stocks</p>
      </div>

      <div className="p-6 space-y-5">
        {/* Symbol Search */}
        <div className="relative">
          <label className="block text-xs font-semibold text-ink-secondary uppercase tracking-wide mb-1.5">
            Stock Symbol
          </label>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
            <input
              type="text"
              value={inputValue}
              onChange={e => handleInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g. RELIANCE, TCS, INFY"
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-surface-border bg-surface-muted text-sm font-medium text-ink-primary placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent transition"
            />
          </div>
          {suggestions.length > 0 && (
            <ul className="absolute z-10 w-full mt-1 bg-white border border-surface-border rounded-xl shadow-card-hover overflow-hidden">
              {suggestions.map(s => (
                <li
                  key={s}
                  onClick={() => selectSymbol(s)}
                  className="px-4 py-2.5 text-sm font-medium text-ink-primary hover:bg-surface-muted cursor-pointer transition-colors"
                >
                  {s}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Live Price Display */}
        {symbol && (
          <div className={`rounded-xl p-4 border transition-colors ${
            priceDir === 'up' ? 'border-brand-green bg-brand-green-light' :
            priceDir === 'down' ? 'border-red-200 bg-brand-red-light' :
            'border-surface-border bg-surface-muted'
          }`}>
            {priceLoading && !priceData ? (
              <div className="flex items-center gap-2 text-ink-muted text-sm">
                <RefreshCw size={14} className="animate-spin" />
                <span>Fetching price…</span>
              </div>
            ) : priceData ? (
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-ink-secondary mb-0.5">{priceData.name}</p>
                  <p className={`text-2xl font-bold tabular-nums ${
                    priceDir === 'up' ? 'text-brand-green-dark' :
                    priceDir === 'down' ? 'text-brand-red-dark' :
                    'text-ink-primary'
                  }`}>
                    {formatINR(priceData.price)}
                  </p>
                  {priceData.changePercent !== undefined && (
                    <p className={`text-xs font-semibold mt-0.5 tabular-nums ${pnlClass(priceData.changePercent)}`}>
                      {formatPct(priceData.changePercent)} today
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 mt-1">
                  {priceDir === 'up' ? <TrendingUp size={16} className="text-brand-green-dark" /> :
                   priceDir === 'down' ? <TrendingDown size={16} className="text-brand-red-dark" /> : null}
                  <RefreshCw size={12} className="text-ink-muted animate-spin" style={{ animationDuration: '3s' }} />
                </div>
              </div>
            ) : (
              <p className="text-sm text-brand-red-dark">Symbol not found</p>
            )}
          </div>
        )}

        {/* Price Chart */}
        {symbol && priceData && (
          <PriceChart symbol={symbol} changePercent={priceData.changePercent} />
        )}

        {/* Buy / Sell Toggle */}
        <div>
          <label className="block text-xs font-semibold text-ink-secondary uppercase tracking-wide mb-1.5">
            Action
          </label>
          <div className="flex rounded-xl overflow-hidden border border-surface-border">
            <button
              onClick={() => setAction('buy')}
              className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${
                action === 'buy'
                  ? 'bg-brand-green text-white'
                  : 'bg-white text-ink-secondary hover:bg-surface-muted'
              }`}
            >
              Buy
            </button>
            <button
              onClick={() => setAction('sell')}
              className={`flex-1 py-2.5 text-sm font-semibold transition-colors border-l border-surface-border ${
                action === 'sell'
                  ? 'bg-brand-red text-white'
                  : 'bg-white text-ink-secondary hover:bg-surface-muted'
              }`}
            >
              Sell
            </button>
          </div>
        </div>

        {/* Order Type toggle */}
        <div>
          <label className="block text-xs font-semibold text-ink-secondary uppercase tracking-wide mb-1.5">
            Order Type
          </label>
          <div className="flex rounded-xl overflow-hidden border border-surface-border">
            <button
              onClick={() => setOrderMode('market')}
              className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${
                orderMode === 'market'
                  ? 'bg-ink-primary text-white'
                  : 'bg-white text-ink-secondary hover:bg-surface-muted'
              }`}
            >
              Market
            </button>
            <button
              onClick={() => setOrderMode('limit')}
              className={`flex-1 py-2.5 text-sm font-semibold transition-colors border-l border-surface-border ${
                orderMode === 'limit'
                  ? 'bg-ink-primary text-white'
                  : 'bg-white text-ink-secondary hover:bg-surface-muted'
              }`}
            >
              Limit / Trigger
            </button>
          </div>
        </div>

        {/* Trigger Price — only for Limit mode */}
        {orderMode === 'limit' && (
          <div>
            <label className="block text-xs font-semibold text-ink-secondary uppercase tracking-wide mb-1.5">
              Trigger Price (₹)
            </label>
            <input
              type="number"
              min={0}
              step={0.05}
              value={triggerPrice}
              onChange={e => setTriggerPrice(e.target.value)}
              placeholder={priceData ? `Current: ${priceData.price.toFixed(2)}` : 'e.g. 2450.00'}
              className="w-full px-3 py-2.5 rounded-xl border border-surface-border bg-surface-muted text-sm font-medium text-ink-primary placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-brand-green transition"
            />
            <p className="text-[11px] text-ink-muted mt-1">
              {action === 'buy'
                ? 'Order executes when price drops to or below this level.'
                : 'Order executes when price rises to or above this level.'}
            </p>
          </div>
        )}

        {/* Risk Calculator — only for Buy with an active price */}
        {symbol && priceData && action === 'buy' && (
          <div className="rounded-xl border border-surface-border overflow-hidden">
            <button
              onClick={() => setShowRiskCalc(v => !v)}
              className="w-full flex items-center justify-between px-4 py-3 bg-surface-muted hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-2">
                <ShieldCheck size={15} className="text-brand-green-dark" />
                <span className="text-xs font-semibold text-ink-primary uppercase tracking-wide">
                  Risk Calculator
                </span>
              </div>
              {showRiskCalc
                ? <ChevronUp size={15} className="text-ink-muted" />
                : <ChevronDown size={15} className="text-ink-muted" />}
            </button>

            {showRiskCalc && (
              <div className="px-4 py-4 space-y-4 bg-white">

                {/* Risk % slider */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-xs font-semibold text-ink-secondary uppercase tracking-wide">
                      Risk per Trade
                    </label>
                    <span className="text-sm font-bold text-ink-primary tabular-nums">{riskPct}%</span>
                  </div>
                  <input
                    type="range"
                    min={0.5}
                    max={5}
                    step={0.5}
                    value={riskPct}
                    onChange={e => setRiskPct(parseFloat(e.target.value))}
                    className="w-full accent-brand-green"
                  />
                  <div className="flex justify-between text-[10px] text-ink-muted mt-0.5">
                    <span>0.5%</span><span>5%</span>
                  </div>
                </div>

                {/* Stop Loss input */}
                <div>
                  <label className="block text-xs font-semibold text-ink-secondary uppercase tracking-wide mb-1.5">
                    Stop-Loss Price (₹)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={0.05}
                    value={stopLoss}
                    onChange={e => setStopLoss(e.target.value)}
                    placeholder={`e.g. ${entryPrice ? (entryPrice * 0.95).toFixed(2) : '—'}`}
                    className="w-full px-3 py-2.5 rounded-xl border border-surface-border bg-surface-muted text-sm font-medium text-ink-primary placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-brand-green transition"
                  />
                  {stopLoss && !riskCalcValid && (
                    <p className="text-[11px] text-brand-red-dark mt-1 font-medium">
                      Stop-loss must be below entry price ({formatINR(entryPrice)})
                    </p>
                  )}
                </div>

                {/* Output */}
                {riskCalcValid && (
                  <div className="rounded-xl bg-surface-muted border border-surface-border px-4 py-3 space-y-1.5">
                    <div className="flex justify-between text-xs text-ink-secondary">
                      <span>Risk Amount</span>
                      <span className="font-semibold text-ink-primary tabular-nums">{formatINR(riskAmount)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-ink-secondary">
                      <span>Risk per Share</span>
                      <span className="font-semibold text-ink-primary tabular-nums">{formatINR(slGap)}</span>
                    </div>
                    <div className="h-px bg-surface-border my-1" />
                    <div className="flex justify-between text-sm font-bold text-ink-primary">
                      <span>Max Safe Shares</span>
                      <span className="tabular-nums text-brand-green-dark">{maxShares}</span>
                    </div>
                    <div className="flex justify-between text-xs text-ink-secondary">
                      <span>Position Value</span>
                      <span className="font-semibold tabular-nums">{formatINR(positionValue)}</span>
                    </div>
                    {maxShares === 0 && (
                      <p className="text-[11px] text-brand-red-dark font-medium">
                        Risk too small to buy even 1 share at this stop-loss.
                      </p>
                    )}
                    {maxShares > 0 && (
                      <button
                        onClick={() => setQuantity(maxShares)}
                        className="mt-2 w-full py-2 rounded-lg bg-brand-green text-white text-xs font-bold hover:bg-brand-green-dark transition-colors"
                      >
                        Apply — Set Quantity to {maxShares}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Quantity */}
        <div>
          <label className="block text-xs font-semibold text-ink-secondary uppercase tracking-wide mb-1.5">
            Quantity
          </label>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setQuantity(q => Math.max(1, q - 1))}
              className="w-9 h-9 rounded-lg bg-surface-muted border border-surface-border text-ink-secondary font-bold text-lg hover:bg-gray-100 transition-colors flex items-center justify-center"
            >
              −
            </button>
            <input
              type="number"
              min={1}
              value={quantity}
              onChange={e => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              className="flex-1 text-center py-2 rounded-lg border border-surface-border bg-surface-muted text-sm font-bold text-ink-primary focus:outline-none focus:ring-2 focus:ring-brand-green transition"
            />
            <button
              onClick={() => setQuantity(q => q + 1)}
              className="w-9 h-9 rounded-lg bg-surface-muted border border-surface-border text-ink-secondary font-bold text-lg hover:bg-gray-100 transition-colors flex items-center justify-center"
            >
              +
            </button>
          </div>
        </div>

        {/* Trade Summary */}
        {priceData && (
          <div className="rounded-xl bg-surface-muted border border-surface-border px-4 py-3 space-y-1.5">
            <div className="flex justify-between text-xs text-ink-secondary">
              <span>Price per share</span>
              <span className="font-medium tabular-nums">{formatINR(priceData.price)}</span>
            </div>
            <div className="flex justify-between text-xs text-ink-secondary">
              <span>Quantity</span>
              <span className="font-medium">{quantity}</span>
            </div>
            <div className="h-px bg-surface-border my-1" />
            <div className="flex justify-between text-sm font-bold text-ink-primary">
              <span>Total {action === 'buy' ? 'Cost' : 'Proceeds'}</span>
              <span className="tabular-nums">{formatINR(tradeValue)}</span>
            </div>
            {action === 'buy' && !canAfford && (
              <p className="text-xs text-brand-red-dark font-medium">
                Insufficient balance (available {formatINR(balance)})
              </p>
            )}
          </div>
        )}

        {/* Message */}
        {message && (
          <div className={`flex items-start gap-2 rounded-xl px-4 py-3 text-sm font-medium ${
            message.type === 'success'
              ? 'bg-brand-green-light text-brand-green-dark'
              : 'bg-brand-red-light text-brand-red-dark'
          }`}>
            {message.type === 'success'
              ? <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
              : <AlertCircle size={16} className="mt-0.5 shrink-0" />}
            <span>{message.text}</span>
          </div>
        )}

        {/* CTA Button */}
        <button
          onClick={handleTrade}
          disabled={
            !symbol || !priceData || loading ||
            (orderMode === 'market' && action === 'buy' && !canAfford) ||
            (orderMode === 'limit' && (!triggerPrice || parseFloat(triggerPrice) <= 0))
          }
          className={`w-full py-3 rounded-xl text-sm font-bold tracking-wide transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
            action === 'buy'
              ? 'bg-brand-green hover:bg-brand-green-dark text-white shadow-sm'
              : 'bg-brand-red hover:bg-brand-red-dark text-white shadow-sm'
          }`}
        >
          {loading
            ? 'Processing…'
            : orderMode === 'limit'
              ? `Place ${action === 'buy' ? 'Buy' : 'Sell'} Limit Order`
              : `${action === 'buy' ? 'Buy' : 'Sell'} ${symbol || 'Stock'}`}
        </button>
      </div>
    </div>
  );
}
