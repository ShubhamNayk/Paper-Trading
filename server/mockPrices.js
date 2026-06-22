// Live price service — fetches real NSE data via yahoo-finance2 v3.
// All symbols are automatically suffixed with '.NS' for the National Stock Exchange.
// To switch providers: replace getPrice() and getPrices() with calls to your preferred API.

const YahooFinance = require('yahoo-finance2').default;
const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

// 10-second in-memory cache — avoids hammering Yahoo Finance on every poll cycle.
const cache = new Map(); // symbol (bare, e.g. 'TCS') -> { data, expiresAt }
const CACHE_TTL = 10_000;

const NIFTY_SYMBOLS = [
  'RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK',
  'HINDUNILVR', 'ITC', 'SBIN', 'BHARTIARTL', 'KOTAKBANK',
  'LT', 'AXISBANK', 'ASIANPAINT', 'MARUTI', 'BAJFINANCE',
  'WIPRO', 'HCLTECH', 'ULTRACEMCO', 'TITAN', 'NESTLEIND',
  'POWERGRID', 'NTPC', 'SUNPHARMA', 'ONGC', 'TATAMOTORS',
];

function toNSE(symbol) {
  const s = symbol.toUpperCase();
  return s.endsWith('.NS') ? s : `${s}.NS`;
}

function fromNSE(yahooSymbol) {
  return (yahooSymbol || '').replace(/\.NS$/i, '').toUpperCase();
}

function fromCacheOrNull(symbol) {
  const entry = cache.get(symbol.toUpperCase());
  return entry && Date.now() < entry.expiresAt ? entry.data : null;
}

function setCache(symbol, data) {
  cache.set(symbol.toUpperCase(), { data, expiresAt: Date.now() + CACHE_TTL });
}

function buildRecord(r) {
  if (!r || r.regularMarketPrice == null) return null;
  const sym = fromNSE(r.symbol);
  return {
    symbol: sym,
    name: r.shortName || r.longName || sym,
    price: r.regularMarketPrice,
    changePercent: typeof r.regularMarketChangePercent === 'number'
      ? r.regularMarketChangePercent
      : 0,
  };
}

async function getPrice(symbol) {
  const s = symbol.toUpperCase();
  const cached = fromCacheOrNull(s);
  if (cached) return cached;

  try {
    const result = await yahooFinance.quote(toNSE(s));
    const data = buildRecord(result);
    if (data) setCache(s, data);
    return data;
  } catch {
    return null;
  }
}

async function getPrices() {
  const yahooSymbols = NIFTY_SYMBOLS.map(toNSE);
  try {
    const results = await yahooFinance.quote(yahooSymbols);
    const arr = Array.isArray(results) ? results : [results];
    return arr
      .map(buildRecord)
      .filter(Boolean)
      .map(d => { setCache(d.symbol, d); return d; });
  } catch {
    return [];
  }
}

module.exports = { getPrice, getPrices };
