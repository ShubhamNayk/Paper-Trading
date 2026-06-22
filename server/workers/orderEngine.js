const cron = require('node-cron');
const db = require('../db');
const { getPrice } = require('../mockPrices');

async function processOrders() {
  let pendingOrders;
  try {
    pendingOrders = db.prepare(`SELECT * FROM pending_orders WHERE status = 'PENDING'`).all();
  } catch (err) {
    console.error('[OrderEngine] Failed to read pending_orders:', err.message);
    return;
  }

  if (pendingOrders.length === 0) return;

  // Deduplicate tickers and fetch live prices in parallel
  const tickers = [...new Set(pendingOrders.map(o => o.ticker))];
  const priceMap = {};
  await Promise.all(
    tickers.map(async (ticker) => {
      try {
        const data = await getPrice(ticker);
        if (data) priceMap[ticker] = data;
      } catch (err) {
        console.error(`[OrderEngine] Price fetch failed for ${ticker}:`, err.message);
      }
    })
  );

  for (const order of pendingOrders) {
    const priceData = priceMap[order.ticker];
    if (!priceData) continue;

    const livePrice = priceData.price;
    const triggered =
      (order.order_type === 'BUY'  && livePrice <= order.trigger_price) ||
      (order.order_type === 'SELL' && livePrice >= order.trigger_price);

    if (!triggered) continue;

    const execute = db.transaction(() => {
      // Re-read status to guard against concurrent double-execution
      const fresh = db.prepare(`SELECT status FROM pending_orders WHERE id = ?`).get(order.id);
      if (!fresh || fresh.status !== 'PENDING') return;

      const wallet = db.prepare('SELECT balance FROM wallet WHERE user_email = ?').get(order.user_email);
      if (!wallet) {
        db.prepare(`UPDATE pending_orders SET status = 'CANCELLED' WHERE id = ?`).run(order.id);
        console.warn(`[OrderEngine] Order #${order.id} cancelled — wallet not found`);
        return;
      }

      if (order.order_type === 'BUY') {
        const cost = livePrice * order.quantity;
        if (wallet.balance < cost) {
          db.prepare(`UPDATE pending_orders SET status = 'CANCELLED' WHERE id = ?`).run(order.id);
          console.warn(`[OrderEngine] BUY order #${order.id} cancelled — insufficient balance (need ₹${cost.toFixed(2)}, have ₹${wallet.balance.toFixed(2)})`);
          return;
        }
        db.prepare('UPDATE wallet SET balance = balance - ? WHERE user_email = ?').run(cost, order.user_email);

        const holding = db.prepare(
          'SELECT quantity, avg_price FROM holdings WHERE user_email = ? AND symbol = ?'
        ).get(order.user_email, order.ticker);

        if (holding) {
          const newQty = holding.quantity + order.quantity;
          const newAvg = (holding.avg_price * holding.quantity + livePrice * order.quantity) / newQty;
          db.prepare(
            'UPDATE holdings SET quantity = ?, avg_price = ? WHERE user_email = ? AND symbol = ?'
          ).run(newQty, newAvg, order.user_email, order.ticker);
        } else {
          db.prepare(
            'INSERT INTO holdings (user_email, symbol, company_name, quantity, avg_price) VALUES (?, ?, ?, ?, ?)'
          ).run(order.user_email, order.ticker, priceData.name, order.quantity, livePrice);
        }

      } else {
        const holding = db.prepare(
          'SELECT quantity FROM holdings WHERE user_email = ? AND symbol = ?'
        ).get(order.user_email, order.ticker);

        if (!holding || holding.quantity < order.quantity) {
          db.prepare(`UPDATE pending_orders SET status = 'CANCELLED' WHERE id = ?`).run(order.id);
          console.warn(`[OrderEngine] SELL order #${order.id} cancelled — insufficient shares (have ${holding?.quantity ?? 0}, need ${order.quantity})`);
          return;
        }

        const proceeds = livePrice * order.quantity;
        db.prepare('UPDATE wallet SET balance = balance + ? WHERE user_email = ?').run(proceeds, order.user_email);

        const remaining = holding.quantity - order.quantity;
        if (remaining === 0) {
          db.prepare('DELETE FROM holdings WHERE user_email = ? AND symbol = ?').run(order.user_email, order.ticker);
        } else {
          db.prepare(
            'UPDATE holdings SET quantity = ? WHERE user_email = ? AND symbol = ?'
          ).run(remaining, order.user_email, order.ticker);
        }
      }

      // Append to transaction history ledger
      db.prepare(
        'INSERT INTO transactions (user_email, ticker, type, quantity, price) VALUES (?, ?, ?, ?, ?)'
      ).run(order.user_email, order.ticker, order.order_type, order.quantity, livePrice);

      db.prepare(`UPDATE pending_orders SET status = 'EXECUTED' WHERE id = ?`).run(order.id);
      console.log(`[OrderEngine] ✓ Order #${order.id} EXECUTED — ${order.order_type} ${order.quantity}×${order.ticker} @ ₹${livePrice.toFixed(2)}`);
    });

    try {
      execute();
    } catch (err) {
      console.error(`[OrderEngine] Execution error for order #${order.id}:`, err.message);
    }
  }
}

function startOrderEngine() {
  cron.schedule('* * * * *', () => {
    processOrders().catch(err =>
      console.error('[OrderEngine] Unhandled error:', err.message)
    );
  });
  console.log('[OrderEngine] Started — checking trigger orders every 60 seconds');
}

module.exports = { startOrderEngine };
