const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'trading.db'));

// Detect old single-user schema (wallet keyed by id=1) and drop it
const walletCols = db.prepare('PRAGMA table_info(wallet)').all();
const isOldSchema = walletCols.length > 0 && !walletCols.some(c => c.name === 'user_email');
if (isOldSchema) {
  db.exec('DROP TABLE IF EXISTS holdings; DROP TABLE IF EXISTS wallet;');
}

db.exec(`
  CREATE TABLE IF NOT EXISTS wallet (
    user_email TEXT PRIMARY KEY,
    balance    REAL NOT NULL
  );

  CREATE TABLE IF NOT EXISTS holdings (
    user_email   TEXT NOT NULL,
    symbol       TEXT NOT NULL,
    company_name TEXT NOT NULL,
    quantity     INTEGER NOT NULL,
    avg_price    REAL NOT NULL,
    PRIMARY KEY (user_email, symbol)
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_email TEXT    NOT NULL,
    ticker     TEXT    NOT NULL,
    type       TEXT    NOT NULL CHECK(type IN ('BUY','SELL')),
    quantity   INTEGER NOT NULL,
    price      REAL    NOT NULL,
    timestamp  TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS pending_orders (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    user_email    TEXT    NOT NULL,
    ticker        TEXT    NOT NULL,
    order_type    TEXT    NOT NULL CHECK(order_type IN ('BUY','SELL')),
    trigger_price REAL    NOT NULL,
    quantity      INTEGER NOT NULL,
    status        TEXT    NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','EXECUTED','CANCELLED')),
    created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS deposits (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_email TEXT    NOT NULL,
    amount     REAL    NOT NULL,
    note       TEXT,
    created_at TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS mf_holdings (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    user_email   TEXT    NOT NULL,
    scheme_code  TEXT    NOT NULL,
    scheme_name  TEXT    NOT NULL,
    units        REAL    NOT NULL,
    avg_nav      REAL    NOT NULL,
    invested_amt REAL    NOT NULL,
    UNIQUE(user_email, scheme_code)
  );

  CREATE TABLE IF NOT EXISTS options_positions (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    user_email   TEXT    NOT NULL,
    symbol       TEXT    NOT NULL,
    option_type  TEXT    NOT NULL CHECK(option_type IN ('CE','PE')),
    strike       REAL    NOT NULL,
    expiry       TEXT    NOT NULL,
    lots         INTEGER NOT NULL,
    avg_premium  REAL    NOT NULL,
    lot_size     INTEGER NOT NULL,
    side         TEXT    NOT NULL CHECK(side IN ('BUY','SELL')),
    created_at   TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS futures_positions (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    user_email   TEXT    NOT NULL,
    symbol       TEXT    NOT NULL,
    expiry       TEXT    NOT NULL,
    lots         INTEGER NOT NULL,
    avg_price    REAL    NOT NULL,
    lot_size     INTEGER NOT NULL,
    side         TEXT    NOT NULL CHECK(side IN ('BUY','SELL')),
    created_at   TEXT    NOT NULL DEFAULT (datetime('now'))
  );
`);

module.exports = db;
