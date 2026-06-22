const express = require('express');
const router = express.Router();
const db = require('../db');
const { getPrice } = require('../mockPrices');

router.post('/', async (req, res) => {
  const email = req.user.email;
  const { symbol, quantity, action } = req.body;

  if (!symbol || !quantity || !action) {
    return res.status(400).json({ error: 'symbol, quantity, and action are required' });
  }
  if (!['buy', 'sell'].includes(action)) {
    return res.status(400).json({ error: 'action must be buy or sell' });
  }
  const qty = parseInt(quantity, 10);
  if (!Number.isInteger(qty) || qty <= 0) {
    return res.status(400).json({ error: 'quantity must be a positive integer' });
  }

  const live = await getPrice(symbol);
  if (!live) {
    return res.status(404).json({ error: `Unknown symbol: ${symbol.toUpperCase()} — check the ticker is a valid NSE symbol` });
  }

  const { price, name: companyName } = live;

  const execute = db.transaction(() => {
    const wallet  = db.prepare('SELECT balance FROM wallet WHERE user_email = ?').get(email);
    const holding = db.prepare(
      'SELECT quantity, avg_price FROM holdings WHERE user_email = ? AND symbol = ?'
    ).get(email, symbol.toUpperCase());

    if (action === 'buy') {
      const cost = price * qty;
      if (wallet.balance < cost) {
        throw new Error(`Insufficient balance. Need ₹${cost.toFixed(2)}, have ₹${wallet.balance.toFixed(2)}`);
      }
      db.prepare('UPDATE wallet SET balance = balance - ? WHERE user_email = ?').run(cost, email);

      if (holding) {
        const newQty = holding.quantity + qty;
        const newAvg = (holding.avg_price * holding.quantity + price * qty) / newQty;
        db.prepare(
          'UPDATE holdings SET quantity = ?, avg_price = ? WHERE user_email = ? AND symbol = ?'
        ).run(newQty, newAvg, email, symbol.toUpperCase());
      } else {
        db.prepare(
          'INSERT INTO holdings (user_email, symbol, company_name, quantity, avg_price) VALUES (?, ?, ?, ?, ?)'
        ).run(email, symbol.toUpperCase(), companyName, qty, price);
      }
    } else {
      if (!holding || holding.quantity < qty) {
        throw new Error(`Insufficient shares. Have ${holding?.quantity ?? 0}, selling ${qty}`);
      }
      const proceeds = price * qty;
      db.prepare('UPDATE wallet SET balance = balance + ? WHERE user_email = ?').run(proceeds, email);

      const remaining = holding.quantity - qty;
      if (remaining === 0) {
        db.prepare('DELETE FROM holdings WHERE user_email = ? AND symbol = ?').run(email, symbol.toUpperCase());
      } else {
        db.prepare(
          'UPDATE holdings SET quantity = ? WHERE user_email = ? AND symbol = ?'
        ).run(remaining, email, symbol.toUpperCase());
      }
    }

    db.prepare(
      'INSERT INTO transactions (user_email, ticker, type, quantity, price) VALUES (?, ?, ?, ?, ?)'
    ).run(email, symbol.toUpperCase(), action.toUpperCase(), qty, price);
  });

  try {
    execute();
    const { balance } = db.prepare('SELECT balance FROM wallet WHERE user_email = ?').get(email);
    const verb = action === 'buy' ? 'Bought' : 'Sold';
    res.json({
      success: true,
      price,
      balance,
      message: `${verb} ${qty} share${qty !== 1 ? 's' : ''} of ${symbol.toUpperCase()} at ₹${price.toFixed(2)}`,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
