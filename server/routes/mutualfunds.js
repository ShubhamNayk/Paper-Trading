const express = require('express');
const router  = express.Router();
const https   = require('https');
const db      = require('../db');

// ── HTTP helper (follows one redirect) ───────────────────────────────────────
function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
      timeout: 10000,
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchJSON(res.headers.location).then(resolve).catch(reject);
      }
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => {
        try { resolve(JSON.parse(raw)); }
        catch { reject(new Error('JSON parse error')); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

// ── NAV cache (5 min TTL) ────────────────────────────────────────────────────
const navCache = new Map();
const NAV_TTL  = 5 * 60 * 1000;

async function getNav(schemeCode) {
  const c = navCache.get(schemeCode);
  if (c && Date.now() - c.ts < NAV_TTL) return c.data;
  const data = await fetchJSON(`https://api.mfapi.in/mf/${schemeCode}/latest`);
  navCache.set(schemeCode, { data, ts: Date.now() });
  return data;
}

// ── Category search map ───────────────────────────────────────────────────────
const CATEGORY_QUERIES = {
  'large-cap':  'large cap direct growth',
  'mid-cap':    'mid cap direct growth',
  'small-cap':  'small cap direct growth',
  'index':      'nifty 50 index direct growth',
  'elss':       'elss direct growth',
  'liquid':     'liquid direct growth',
  'hybrid':     'balanced advantage direct growth',
};

// GET /api/mutualfunds/search?q=
router.get('/search', async (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q) return res.json([]);
  try {
    const data = await fetchJSON(`https://api.mfapi.in/mf/search?q=${encodeURIComponent(q)}`);
    const results = (Array.isArray(data) ? data : []).slice(0, 15).map(f => ({
      schemeCode: String(f.schemeCode),
      schemeName: f.schemeName,
    }));
    res.json(results);
  } catch {
    res.status(500).json({ error: 'Search failed' });
  }
});

// GET /api/mutualfunds/category/:cat
router.get('/category/:cat', async (req, res) => {
  const q = CATEGORY_QUERIES[req.params.cat];
  if (!q) return res.json([]);
  try {
    const list  = await fetchJSON(`https://api.mfapi.in/mf/search?q=${encodeURIComponent(q)}`);
    const funds = (Array.isArray(list) ? list : []).slice(0, 8);
    const withNav = await Promise.all(funds.map(async f => {
      try {
        const navData = await getNav(String(f.schemeCode));
        const latest  = navData?.data?.[0];
        if (!latest) return null;
        return {
          schemeCode: String(f.schemeCode),
          schemeName: f.schemeName,
          nav:        parseFloat(latest.nav),
          navDate:    latest.date,
        };
      } catch { return null; }
    }));
    res.json(withNav.filter(f => f && f.nav));
  } catch {
    res.status(500).json({ error: 'Failed to load category' });
  }
});

// GET /api/mutualfunds/nav/:schemeCode
router.get('/nav/:schemeCode', async (req, res) => {
  try {
    const data = await getNav(req.params.schemeCode);
    res.json(data);
  } catch {
    res.status(500).json({ error: 'NAV fetch failed' });
  }
});

// GET /api/mutualfunds/portfolio
router.get('/portfolio', (req, res) => {
  const email = req.user.email;
  const holdings = db.prepare(
    'SELECT * FROM mf_holdings WHERE user_email = ? ORDER BY invested_amt DESC'
  ).all(email);
  res.json(holdings);
});

// POST /api/mutualfunds/invest  { schemeCode, schemeName, amount }
router.post('/invest', async (req, res) => {
  const email = req.user.email;
  const { schemeCode, schemeName, amount } = req.body;

  if (!schemeCode || !schemeName || !amount || Number(amount) < 500) {
    return res.status(400).json({ error: 'Minimum investment is ₹500' });
  }
  const amt = Number(amount);

  try {
    const navData = await getNav(String(schemeCode));
    const nav = parseFloat(navData?.data?.[0]?.nav);
    if (!nav || isNaN(nav)) return res.status(400).json({ error: 'Could not fetch NAV' });

    const wallet = db.prepare('SELECT balance FROM wallet WHERE user_email = ?').get(email);
    if (!wallet || wallet.balance < amt) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    const units = amt / nav;

    db.transaction(() => {
      db.prepare('UPDATE wallet SET balance = balance - ? WHERE user_email = ?').run(amt, email);
      const existing = db.prepare(
        'SELECT units, invested_amt FROM mf_holdings WHERE user_email = ? AND scheme_code = ?'
      ).get(email, String(schemeCode));

      if (existing) {
        const newUnits    = existing.units + units;
        const newInvested = existing.invested_amt + amt;
        db.prepare(
          'UPDATE mf_holdings SET units = ?, avg_nav = ?, invested_amt = ? WHERE user_email = ? AND scheme_code = ?'
        ).run(newUnits, newInvested / newUnits, newInvested, email, String(schemeCode));
      } else {
        db.prepare(
          'INSERT INTO mf_holdings (user_email, scheme_code, scheme_name, units, avg_nav, invested_amt) VALUES (?, ?, ?, ?, ?, ?)'
        ).run(email, String(schemeCode), schemeName, units, nav, amt);
      }
    })();

    const { balance } = db.prepare('SELECT balance FROM wallet WHERE user_email = ?').get(email);
    res.json({ success: true, units: +units.toFixed(4), nav, balance });
  } catch {
    res.status(500).json({ error: 'Investment failed' });
  }
});

// POST /api/mutualfunds/redeem  { schemeCode, units }
router.post('/redeem', async (req, res) => {
  const email = req.user.email;
  const { schemeCode, units } = req.body;

  if (!schemeCode || !units || Number(units) <= 0) {
    return res.status(400).json({ error: 'Invalid redemption request' });
  }
  const redeemUnits = Number(units);

  const holding = db.prepare(
    'SELECT * FROM mf_holdings WHERE user_email = ? AND scheme_code = ?'
  ).get(email, String(schemeCode));

  if (!holding || holding.units < redeemUnits - 0.0001) {
    return res.status(400).json({ error: 'Insufficient units' });
  }

  try {
    const navData = await getNav(String(schemeCode));
    const nav = parseFloat(navData?.data?.[0]?.nav);
    if (!nav || isNaN(nav)) return res.status(400).json({ error: 'Could not fetch NAV' });

    const payout = redeemUnits * nav;

    db.transaction(() => {
      db.prepare('UPDATE wallet SET balance = balance + ? WHERE user_email = ?').run(payout, email);
      const remainingUnits    = holding.units - redeemUnits;
      const remainingInvested = holding.invested_amt * (remainingUnits / holding.units);

      if (remainingUnits < 0.001) {
        db.prepare('DELETE FROM mf_holdings WHERE user_email = ? AND scheme_code = ?').run(email, String(schemeCode));
      } else {
        db.prepare(
          'UPDATE mf_holdings SET units = ?, invested_amt = ? WHERE user_email = ? AND scheme_code = ?'
        ).run(remainingUnits, remainingInvested, email, String(schemeCode));
      }
    })();

    const { balance } = db.prepare('SELECT balance FROM wallet WHERE user_email = ?').get(email);
    res.json({ success: true, payout: +payout.toFixed(2), nav, balance });
  } catch {
    res.status(500).json({ error: 'Redemption failed' });
  }
});

module.exports = router;
