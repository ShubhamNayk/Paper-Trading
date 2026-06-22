const express = require('express');
const router = express.Router();
const db = require('../db');

const PAGE_SIZE = 20;

router.get('/', (req, res) => {
  const email = req.user.email;
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const { count: total } = db.prepare(
    'SELECT COUNT(*) as count FROM transactions WHERE user_email = ?'
  ).get(email);

  const rows = db.prepare(
    `SELECT id, ticker, type, quantity, price, timestamp
     FROM transactions
     WHERE user_email = ?
     ORDER BY id DESC
     LIMIT ? OFFSET ?`
  ).all(email, PAGE_SIZE, offset);

  res.json({ transactions: rows, total, page, pageSize: PAGE_SIZE });
});

module.exports = router;
