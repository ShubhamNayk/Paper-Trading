const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', (req, res) => {
  const email = req.user.email;
  const wallet = db.prepare('SELECT balance FROM wallet WHERE user_email = ?').get(email);
  const deposits = db.prepare(
    'SELECT id, amount, note, created_at FROM deposits WHERE user_email = ? ORDER BY created_at DESC LIMIT 50'
  ).all(email);
  res.json({ balance: wallet?.balance ?? 0, deposits });
});

router.post('/add-funds', (req, res) => {
  const email = req.user.email;
  const { amount, note } = req.body;

  const parsed = Number(amount);
  if (!parsed || parsed <= 0 || parsed > 10_000_000) {
    return res.status(400).json({ error: 'Amount must be between ₹1 and ₹1,00,00,000' });
  }

  const addFunds = db.transaction(() => {
    db.prepare('UPDATE wallet SET balance = balance + ? WHERE user_email = ?').run(parsed, email);
    db.prepare('INSERT INTO deposits (user_email, amount, note) VALUES (?, ?, ?)').run(email, parsed, note || null);
  });

  addFunds();
  const { balance } = db.prepare('SELECT balance FROM wallet WHERE user_email = ?').get(email);
  res.json({ balance });
});

module.exports = router;
