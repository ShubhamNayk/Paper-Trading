const express = require('express');
const router = express.Router();
const { getPrice } = require('../mockPrices');

const INTERVALS = {
  '1D': { count: 14, stepMs: 30 * 60 * 1000,          volatility: 0.0018 },
  '1W': { count: 7,  stepMs: 24 * 60 * 60 * 1000,      volatility: 0.009  },
  '1M': { count: 30, stepMs: 24 * 60 * 60 * 1000,      volatility: 0.013  },
  '1Y': { count: 52, stepMs: 7  * 24 * 60 * 60 * 1000, volatility: 0.032  },
};

// Deterministic pseudo-random (xorshift32) seeded by ticker + interval + calendar day.
// Same seed → same chart within a day; seed rolls over at midnight.
function makeRand(seed) {
  let s = (seed ^ 0xdeadbeef) >>> 0 || 1;
  return () => {
    s ^= s << 13; s ^= s >>> 17; s ^= s << 5; s = s >>> 0;
    return s / 0xffffffff;
  };
}

function strToSeed(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++)
    h = (((h << 5) + h) ^ str.charCodeAt(i)) & 0xffffffff;
  return Math.abs(h);
}

function generateHistory(currentPrice, interval, ticker) {
  const { count, stepMs, volatility } = INTERVALS[interval];
  const today = new Date().toISOString().slice(0, 10);
  const rand  = makeRand(strToSeed(ticker + interval + today));
  const now   = Date.now();

  // Build prices backward from currentPrice so the final point = live price.
  const raw = new Array(count + 1);
  raw[count] = currentPrice;
  for (let i = count - 1; i >= 0; i--) {
    const drift = (rand() - 0.5) * 2 * volatility;
    raw[i] = raw[i + 1] / (1 + drift);
  }

  return raw.map((price, i) => ({
    date:  new Date(now - (count - i) * stepMs).toISOString(),
    price: parseFloat(price.toFixed(2)),
  }));
}

router.get('/:ticker', async (req, res) => {
  const ticker   = req.params.ticker.toUpperCase();
  const interval = (req.query.interval || '1W').toUpperCase();

  if (!INTERVALS[interval]) {
    return res.status(400).json({ error: `Invalid interval. Use: ${Object.keys(INTERVALS).join(', ')}` });
  }

  const live = await getPrice(ticker);
  if (!live) {
    return res.status(404).json({ error: `Unknown ticker: ${ticker}` });
  }

  res.json({ ticker, interval, history: generateHistory(live.price, interval, ticker) });
});

module.exports = router;
