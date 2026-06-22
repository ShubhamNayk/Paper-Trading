const express = require('express');
const router  = express.Router();
const db      = require('../db');

const YahooFinance = require('yahoo-finance2').default;
const yf = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

// ── Black-Scholes ─────────────────────────────────────────────────────────────
function erf(x) {
  const sign = x >= 0 ? 1 : -1;
  x = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * x);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t
    - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return sign * y;
}
function normCDF(x) { return 0.5 * (1 + erf(x / Math.SQRT2)); }

function bs(S, K, T, r, sigma, type) {
  if (T <= 0.0001) return type === 'CE' ? Math.max(S - K, 0) : Math.max(K - S, 0);
  const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * Math.sqrt(T));
  const d2 = d1 - sigma * Math.sqrt(T);
  return type === 'CE'
    ? S * normCDF(d1) - K * Math.exp(-r * T) * normCDF(d2)
    : K * Math.exp(-r * T) * normCDF(-d2) - S * normCDF(-d1);
}

// ── Lot sizes ─────────────────────────────────────────────────────────────────
const INDEX_LOTS = { NIFTY: 75, BANKNIFTY: 30, FINNIFTY: 65, MIDCPNIFTY: 75 };
const STOCK_LOTS = {
  RELIANCE: 250, TCS: 150, HDFCBANK: 550, INFY: 300,
  ICICIBANK: 700, SBIN: 1500, BHARTIARTL: 475, LT: 175,
  AXISBANK: 625, KOTAKBANK: 400,
};

// Yahoo Finance symbol map for indices
const INDEX_YAHOO = {
  NIFTY:      '^NSEI',
  BANKNIFTY:  '^NSEBANK',
  FINNIFTY:   '^CNXFIN',
  MIDCPNIFTY: '^CNXMDCP',
};

// ── Date helpers ──────────────────────────────────────────────────────────────
function nextThursdays(count = 4) {
  const out = [];
  const d   = new Date();
  d.setDate(d.getDate() + 1);            // start from tomorrow
  while (out.length < count) {
    if (d.getDay() === 4) out.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return out;
}

function lastThursdayOfMonth(year, month) {  // month 0-indexed
  const last = new Date(year, month + 1, 0);
  const back = (last.getDay() - 4 + 7) % 7;
  return new Date(year, month, last.getDate() - back);
}

function futuresExpiries() {
  const now  = new Date();
  const out  = [];
  for (let i = 0; i < 3 && out.length < 2; i++) {
    const d = lastThursdayOfMonth(now.getFullYear(), now.getMonth() + i);
    if (d > now) out.push(d);
  }
  return out;
}

function toDateStr(d) { return d.toISOString().split('T')[0]; }

// ── Price cache ───────────────────────────────────────────────────────────────
const priceCache = new Map();
const PRICE_TTL  = 15_000;

async function fetchYahooPrice(yahooSym) {
  const c = priceCache.get(yahooSym);
  if (c && Date.now() - c.ts < PRICE_TTL) return c.data;
  const r = await yf.quote(yahooSym);
  if (!r || r.regularMarketPrice == null) return null;
  const data = { price: r.regularMarketPrice, changePercent: r.regularMarketChangePercent || 0 };
  priceCache.set(yahooSym, { data, ts: Date.now() });
  return data;
}

// ── GET /api/fno/optionschain/:symbol?expiry=YYYY-MM-DD ───────────────────────
router.get('/optionschain/:symbol', async (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  if (!INDEX_YAHOO[symbol]) return res.status(400).json({ error: 'Supported: NIFTY, BANKNIFTY, FINNIFTY, MIDCPNIFTY' });

  const expiries    = nextThursdays(4).map(toDateStr);
  const expiry      = expiries.includes(req.query.expiry) ? req.query.expiry : expiries[0];
  const expiryDate  = new Date(expiry + 'T15:30:00+05:30'); // NSE closes at 3:30PM IST
  const T           = Math.max((expiryDate - Date.now()) / (365 * 24 * 3600 * 1000), 0.001);
  const r           = 0.065;

  try {
    const spot = await fetchYahooPrice(INDEX_YAHOO[symbol]);
    if (!spot) return res.status(502).json({ error: 'Could not fetch spot price from Yahoo Finance' });

    const S    = spot.price;
    const step = symbol === 'BANKNIFTY' ? 100 : 50;
    const atm  = Math.round(S / step) * step;

    const chain = [];
    for (let i = -10; i <= 10; i++) {
      const K  = atm + i * step;
      // IV smile: higher IV for deep OTM
      const moneyness = Math.abs((K - S) / S);
      const baseIV    = symbol === 'BANKNIFTY' ? 0.20 : 0.15;
      const iv        = Math.min(baseIV + moneyness * 0.6, 0.80);

      const cePrice = Math.max(bs(S, K, T, r, iv, 'CE'), 0.05);
      const pePrice = Math.max(bs(S, K, T, r, iv, 'PE'), 0.05);

      // Simulated OI — highest near ATM, tapering off
      const dist   = Math.abs(i);
      const baseOI = symbol === 'BANKNIFTY' ? 80000 : 150000;
      const ceOI   = Math.round(baseOI * Math.exp(-0.25 * dist) * (i <= 0 ? 1.3 : 1));
      const peOI   = Math.round(baseOI * Math.exp(-0.25 * dist) * (i >= 0 ? 1.3 : 1));

      chain.push({
        strike: K,
        isATM:  i === 0,
        ce: { ltp: +cePrice.toFixed(2), iv: +(iv * 100).toFixed(1), oi: ceOI, itm: K < S },
        pe: { ltp: +pePrice.toFixed(2), iv: +(iv * 100).toFixed(1), oi: peOI, itm: K > S },
      });
    }

    res.json({ symbol, spot: S, expiry, expiries, chain, lotSize: INDEX_LOTS[symbol] });
  } catch (e) {
    res.status(500).json({ error: 'Options chain generation failed' });
  }
});

// ── GET /api/fno/futures ──────────────────────────────────────────────────────
router.get('/futures', async (req, res) => {
  const contracts = [
    { symbol: 'NIFTY',      yahoo: '^NSEI',       lotSize: INDEX_LOTS.NIFTY },
    { symbol: 'BANKNIFTY',  yahoo: '^NSEBANK',    lotSize: INDEX_LOTS.BANKNIFTY },
    { symbol: 'FINNIFTY',   yahoo: '^CNXFIN',     lotSize: INDEX_LOTS.FINNIFTY },
    { symbol: 'RELIANCE',   yahoo: 'RELIANCE.NS', lotSize: STOCK_LOTS.RELIANCE },
    { symbol: 'TCS',        yahoo: 'TCS.NS',      lotSize: STOCK_LOTS.TCS },
    { symbol: 'HDFCBANK',   yahoo: 'HDFCBANK.NS', lotSize: STOCK_LOTS.HDFCBANK },
    { symbol: 'INFY',       yahoo: 'INFY.NS',     lotSize: STOCK_LOTS.INFY },
    { symbol: 'ICICIBANK',  yahoo: 'ICICIBANK.NS',lotSize: STOCK_LOTS.ICICIBANK },
    { symbol: 'SBIN',       yahoo: 'SBIN.NS',     lotSize: STOCK_LOTS.SBIN },
    { symbol: 'BHARTIARTL', yahoo: 'BHARTIARTL.NS',lotSize: STOCK_LOTS.BHARTIARTL },
  ];

  const expiries = futuresExpiries().map(toDateStr);

  const results = await Promise.all(contracts.map(async c => {
    try {
      const p = await fetchYahooPrice(c.yahoo);
      if (!p) return null;
      const contractValue = p.price * c.lotSize;
      return {
        symbol:        c.symbol,
        ltp:           p.price,
        changePercent: p.changePercent,
        lotSize:       c.lotSize,
        contractValue: Math.round(contractValue),
        margin:        Math.round(contractValue * 0.12),
        expiry:        expiries[0] || '',
        expiries,
      };
    } catch { return null; }
  }));

  res.json(results.filter(Boolean));
});

// ── GET /api/fno/positions ────────────────────────────────────────────────────
router.get('/positions', async (req, res) => {
  const email   = req.user.email;
  const options = db.prepare('SELECT * FROM options_positions WHERE user_email = ? ORDER BY created_at DESC').all(email);
  const futures = db.prepare('SELECT * FROM futures_positions WHERE user_email = ? ORDER BY created_at DESC').all(email);

  // Enrich options with current premium via BS
  const enrichedOptions = await Promise.all(options.map(async p => {
    try {
      const spot = await fetchYahooPrice(INDEX_YAHOO[p.symbol]);
      if (!spot) return { ...p, current_premium: null, pnl: null };
      const S  = spot.price;
      const T  = Math.max((new Date(p.expiry) - Date.now()) / (365 * 24 * 3600 * 1000), 0.001);
      const iv = 0.15;
      const curr = Math.max(bs(S, p.strike, T, 0.065, iv, p.option_type), 0.05);
      const pnl  = (p.side === 'BUY' ? 1 : -1) * (curr - p.avg_premium) * p.lot_size * p.lots;
      return { ...p, current_premium: +curr.toFixed(2), pnl: +pnl.toFixed(2) };
    } catch { return { ...p, current_premium: null, pnl: null }; }
  }));

  // Enrich futures with current price
  const enrichedFutures = await Promise.all(futures.map(async p => {
    try {
      const sym   = INDEX_YAHOO[p.symbol] || p.symbol + '.NS';
      const spot  = await fetchYahooPrice(sym);
      if (!spot) return { ...p, current_price: null, pnl: null };
      const pnl   = (p.side === 'BUY' ? 1 : -1) * (spot.price - p.avg_price) * p.lot_size * p.lots;
      return { ...p, current_price: spot.price, pnl: +pnl.toFixed(2) };
    } catch { return { ...p, current_price: null, pnl: null }; }
  }));

  res.json({ options: enrichedOptions, futures: enrichedFutures });
});

// ── POST /api/fno/options/trade ───────────────────────────────────────────────
router.post('/options/trade', async (req, res) => {
  const email = req.user.email;
  const { symbol, optionType, strike, expiry, lots, side } = req.body;

  if (!symbol || !optionType || !strike || !expiry || !lots || !side)
    return res.status(400).json({ error: 'Missing required fields' });
  if (!['CE', 'PE'].includes(optionType)) return res.status(400).json({ error: 'Invalid option type' });
  if (!['BUY', 'SELL'].includes(side))   return res.status(400).json({ error: 'Invalid side' });

  const sym = symbol.toUpperCase();
  if (!INDEX_YAHOO[sym]) return res.status(400).json({ error: 'Invalid symbol' });

  try {
    const spotData = await fetchYahooPrice(INDEX_YAHOO[sym]);
    if (!spotData) return res.status(502).json({ error: 'Could not fetch spot price' });

    const S  = spotData.price;
    const K  = parseFloat(strike);
    const T  = Math.max((new Date(expiry) - Date.now()) / (365 * 24 * 3600 * 1000), 0.001);
    const m  = Math.abs((K - S) / S);
    const iv = (sym === 'BANKNIFTY' ? 0.20 : 0.15) + m * 0.6;
    const premium  = Math.max(bs(S, K, T, 0.065, iv, optionType), 0.05);

    const lotSize  = INDEX_LOTS[sym] || 75;
    const numLots  = parseInt(lots);
    const cost     = premium * lotSize * numLots;

    const wallet = db.prepare('SELECT balance FROM wallet WHERE user_email = ?').get(email);
    // BUY costs premium; SELL requires margin = 20% of contract value
    const required = side === 'BUY' ? cost : S * lotSize * numLots * 0.20;
    if (wallet.balance < required) {
      const label = side === 'BUY' ? 'premium' : 'margin';
      return res.status(400).json({ error: `Insufficient balance. Required ${label}: ₹${Math.round(required).toLocaleString('en-IN')}` });
    }

    db.transaction(() => {
      const deduct = side === 'BUY' ? cost : -(cost); // SELL collects premium but deducts margin separately
      if (side === 'BUY') {
        db.prepare('UPDATE wallet SET balance = balance - ? WHERE user_email = ?').run(cost, email);
      } else {
        // Collect premium, deduct margin
        const margin = S * lotSize * numLots * 0.20;
        db.prepare('UPDATE wallet SET balance = balance + ? - ? WHERE user_email = ?').run(cost, margin, email);
      }
      db.prepare(`
        INSERT INTO options_positions (user_email, symbol, option_type, strike, expiry, lots, avg_premium, lot_size, side)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(email, sym, optionType, K, expiry, numLots, +premium.toFixed(2), lotSize, side);
    })();

    const { balance } = db.prepare('SELECT balance FROM wallet WHERE user_email = ?').get(email);
    res.json({ success: true, premium: +premium.toFixed(2), cost: +cost.toFixed(2), balance });
  } catch {
    res.status(500).json({ error: 'Options trade failed' });
  }
});

// ── POST /api/fno/futures/trade ───────────────────────────────────────────────
router.post('/futures/trade', async (req, res) => {
  const email = req.user.email;
  const { symbol, expiry, lots, side } = req.body;

  if (!symbol || !expiry || !lots || !side) return res.status(400).json({ error: 'Missing fields' });
  if (!['BUY', 'SELL'].includes(side))     return res.status(400).json({ error: 'Invalid side' });

  const sym    = symbol.toUpperCase();
  const yahoo  = INDEX_YAHOO[sym] || sym + '.NS';
  const lotSize = INDEX_LOTS[sym] || STOCK_LOTS[sym] || 100;

  try {
    const spotData = await fetchYahooPrice(yahoo);
    if (!spotData) return res.status(502).json({ error: 'Could not fetch price' });

    const price    = spotData.price;
    const numLots  = parseInt(lots);
    const margin   = price * lotSize * numLots * 0.12;

    const wallet = db.prepare('SELECT balance FROM wallet WHERE user_email = ?').get(email);
    if (wallet.balance < margin) {
      return res.status(400).json({ error: `Insufficient margin. Required: ₹${Math.round(margin).toLocaleString('en-IN')}` });
    }

    db.transaction(() => {
      db.prepare('UPDATE wallet SET balance = balance - ? WHERE user_email = ?').run(margin, email);
      db.prepare(`
        INSERT INTO futures_positions (user_email, symbol, expiry, lots, avg_price, lot_size, side)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(email, sym, expiry, numLots, price, lotSize, side);
    })();

    const { balance } = db.prepare('SELECT balance FROM wallet WHERE user_email = ?').get(email);
    res.json({ success: true, price, margin: Math.round(margin), balance });
  } catch {
    res.status(500).json({ error: 'Futures trade failed' });
  }
});

module.exports = router;
