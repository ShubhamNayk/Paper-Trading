const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/orders — fetch user's active pending orders
router.get('/', (req, res) => {
  const email = req.user.email;
  try {
    const orders = db.prepare(
      `SELECT * FROM pending_orders WHERE user_email = ? AND status = 'PENDING' ORDER BY created_at DESC`
    ).all(email);
    res.json({ orders });
  } catch {
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// POST /api/orders — place a new limit/trigger order
router.post('/', (req, res) => {
  const email = req.user.email;
  const { ticker, order_type, trigger_price, quantity } = req.body;

  if (!ticker || !order_type || trigger_price == null || !quantity) {
    return res.status(400).json({ error: 'ticker, order_type, trigger_price, and quantity are required' });
  }
  const type = order_type.toUpperCase();
  if (!['BUY', 'SELL'].includes(type)) {
    return res.status(400).json({ error: 'order_type must be BUY or SELL' });
  }
  const qty = parseInt(quantity, 10);
  if (!Number.isInteger(qty) || qty <= 0) {
    return res.status(400).json({ error: 'quantity must be a positive integer' });
  }
  const tp = parseFloat(trigger_price);
  if (isNaN(tp) || tp <= 0) {
    return res.status(400).json({ error: 'trigger_price must be a positive number' });
  }

  // For BUY orders validate the user has enough balance at trigger price
  if (type === 'BUY') {
    const wallet = db.prepare('SELECT balance FROM wallet WHERE user_email = ?').get(email);
    if (!wallet) return res.status(400).json({ error: 'Wallet not found. Please load your portfolio first.' });
    const required = tp * qty;
    if (wallet.balance < required) {
      return res.status(400).json({
        error: `Insufficient balance. Need ₹${required.toFixed(2)}, have ₹${wallet.balance.toFixed(2)}`
      });
    }
  }

  try {
    const result = db.prepare(
      `INSERT INTO pending_orders (user_email, ticker, order_type, trigger_price, quantity, status)
       VALUES (?, ?, ?, ?, ?, 'PENDING')`
    ).run(email, ticker.toUpperCase(), type, tp, qty);

    res.json({
      success: true,
      order_id: result.lastInsertRowid,
      message: `${type} limit order placed — ${qty}× ${ticker.toUpperCase()} triggers at ₹${tp.toFixed(2)}`,
    });
  } catch {
    res.status(500).json({ error: 'Failed to place order' });
  }
});

// DELETE /api/orders/:id — cancel a pending order
router.delete('/:id', (req, res) => {
  const email = req.user.email;
  const orderId = parseInt(req.params.id, 10);
  if (isNaN(orderId)) return res.status(400).json({ error: 'Invalid order ID' });

  try {
    const order = db.prepare(
      `SELECT * FROM pending_orders WHERE id = ? AND user_email = ?`
    ).get(orderId, email);

    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.status !== 'PENDING') {
      return res.status(400).json({ error: `Cannot cancel an order with status: ${order.status}` });
    }

    db.prepare(`UPDATE pending_orders SET status = 'CANCELLED' WHERE id = ?`).run(orderId);
    res.json({ success: true, message: 'Order cancelled' });
  } catch {
    res.status(500).json({ error: 'Failed to cancel order' });
  }
});

module.exports = router;
