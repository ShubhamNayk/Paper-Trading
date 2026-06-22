const express = require('express');
const router = express.Router();
const db = require('../db');
const { getPrice } = require('../mockPrices');

router.get('/', async (req, res) => {
  const email = req.user.email;

  // Auto-provision wallet on first login
  const existing = db.prepare('SELECT balance FROM wallet WHERE user_email = ?').get(email);
  if (!existing) {
    db.prepare('INSERT INTO wallet (user_email, balance) VALUES (?, 100000)').run(email);
  }

  try {
    const { balance } = db.prepare('SELECT balance FROM wallet WHERE user_email = ?').get(email);
    const rows = db.prepare(
      'SELECT symbol, company_name, quantity, avg_price FROM holdings WHERE user_email = ?'
    ).all(email);

    const holdings = await Promise.all(
      rows.map(async (h) => {
        const live = await getPrice(h.symbol);
        const current_price = live ? live.price : h.avg_price;
        const invested_value = h.avg_price * h.quantity;
        const current_value = current_price * h.quantity;
        const pnl = current_value - invested_value;
        return {
          symbol: h.symbol,
          company_name: h.company_name,
          quantity: h.quantity,
          avg_buy_price: h.avg_price,
          current_price,
          invested_value,
          current_value,
          pnl,
          pnl_percent: invested_value > 0 ? (pnl / invested_value) * 100 : 0,
        };
      })
    );

    const total_invested = holdings.reduce((s, h) => s + h.invested_value, 0);
    const total_current  = holdings.reduce((s, h) => s + h.current_value, 0);
    const total_pnl      = total_current - total_invested;

    res.json({
      balance,
      holdings,
      portfolio_value: balance + total_current,
      total_invested,
      total_pnl,
      total_pnl_percent: total_invested > 0 ? (total_pnl / total_invested) * 100 : 0,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load portfolio' });
  }
});

module.exports = router;
