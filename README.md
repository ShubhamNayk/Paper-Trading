# PaperTrade — Indian Stock Market Simulator

A full-stack paper trading web app inspired by Groww and Zerodha. Trade Nifty 50 stocks, Futures & Options, and Mutual Funds with ₹1,00,000 virtual money — no real money, no API keys needed for stocks.

---

## Features

- **Google Login** — secure authentication via Google OAuth
- **Portfolio** — live holdings with P&L, buy/sell stocks, limit/stop-loss triggers, trade history
- **Markets** — all 25 Nifty 50 stocks with live prices (Yahoo Finance), search, one-click trade
- **Futures & Options** — real NIFTY/BANKNIFTY spot prices + Black-Scholes option pricing, full options chain (CE/PE), futures contracts for indices and top stocks, positions tracker
- **Mutual Funds** — real NAV data from AMFI (via mfapi.in), search any Indian fund, invest/redeem with paper money, portfolio with live P&L
- **Wallet** — start with ₹1,00,000, add more funds anytime, deposit history

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Tailwind CSS v3, Lucide Icons, Axios |
| Backend | Node.js, Express.js |
| Database | SQLite (better-sqlite3) |
| Auth | Google OAuth 2.0 (JWT) |
| Stock Prices | Yahoo Finance (yahoo-finance2) |
| MF Data | AMFI / mfapi.in (real NAV) |
| Options Pricing | Black-Scholes (server-side) |

---

## Project Structure

```
paper-trading/
├── client/                  # React frontend
│   └── src/
│       ├── components/
│       │   ├── Header.jsx
│       │   ├── SummaryBar.jsx
│       │   ├── HoldingsTable.jsx
│       │   ├── TradePanel.jsx
│       │   ├── MarketsPage.jsx
│       │   ├── WalletPage.jsx
│       │   ├── MutualFundsPage.jsx
│       │   ├── FuturesOptionsPage.jsx
│       │   ├── TradeHistoryTab.jsx
│       │   ├── ActiveTriggersTab.jsx
│       │   └── LoginPage.jsx
│       ├── utils/format.js
│       └── api.js
├── server/                  # Express backend
│   ├── routes/
│   │   ├── portfolio.js
│   │   ├── trade.js
│   │   ├── prices.js
│   │   ├── transactions.js
│   │   ├── orders.js
│   │   ├── wallet.js
│   │   ├── mutualfunds.js
│   │   └── fno.js
│   ├── middleware/auth.js
│   ├── workers/orderEngine.js
│   ├── mockPrices.js
│   ├── db.js
│   └── index.js
└── package.json             # Root orchestrator
```

---

## Local Development Setup

### Prerequisites
- Node.js 18 or higher
- npm

### Steps

**1. Clone the repository**
```bash
git clone https://github.com/YOUR_USERNAME/paper-trading.git
cd paper-trading
```

**2. Install all dependencies**
```bash
# Root dependencies (concurrently)
npm install

# Server dependencies
npm install --prefix server

# Client dependencies
npm install --prefix client
```

**3. Start the app**
```bash
npm start
```

This starts both servers at once:
- Frontend → http://localhost:3000
- Backend API → http://localhost:5000

---

## Upload to GitHub (Step-by-Step)

### First time setup

**Step 1 — Open terminal in the project folder**
```bash
cd "C:\Users\shubh\OneDrive\Desktop\paper-trading"
```

**Step 2 — Initialize git**
```bash
git init
git add .
git commit -m "Initial commit: PaperTrade full-stack app"
```

**Step 3 — Create a new repo on GitHub**
1. Go to https://github.com/new
2. Repository name: `paper-trading`
3. Set to **Public** (required for free Render deployment)
4. Do NOT check "Add README" (we already have one)
5. Click **Create repository**

**Step 4 — Connect and push**
```bash
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/paper-trading.git
git push -u origin main
```

Replace `YOUR_USERNAME` with your actual GitHub username.

### Pushing future changes
```bash
git add .
git commit -m "your message here"
git push
```

---

## Deploy on Render (Step-by-Step)

> **Note:** Render free tier apps sleep after 15 minutes of inactivity and take ~30 seconds to wake up. This is a free tier limitation. The app works fine once awake.

### Step 1 — Push code to GitHub first (see above)

### Step 2 — Create Render account
Go to https://render.com and sign up (free, use GitHub login).

### Step 3 — Create a new Web Service
1. Click **New +** → **Web Service**
2. Click **Connect a repository** → select your `paper-trading` repo
3. Click **Connect**

### Step 4 — Configure the service

Fill in these exact values:

| Field | Value |
|---|---|
| **Name** | `paper-trading` (or any name you like) |
| **Region** | Singapore (closest to India) |
| **Branch** | `main` |
| **Runtime** | `Node` |
| **Build Command** | `npm run build` |
| **Start Command** | `NODE_ENV=production node server/index.js` |

### Step 5 — Set Environment Variables
In the **Environment** section, add:

| Key | Value |
|---|---|
| `NODE_ENV` | `production` |

### Step 6 — Deploy
Click **Create Web Service**. Render will:
1. Clone your repo
2. Run the build command (installs deps + builds React)
3. Start the server

Wait 3–5 minutes for the first deploy. You'll get a URL like:
`https://paper-trading-xxxx.onrender.com`

### Step 7 — Update Google OAuth (IMPORTANT)
After getting your Render URL, you must whitelist it in Google Cloud:

1. Go to https://console.cloud.google.com
2. APIs & Services → Credentials
3. Click your OAuth 2.0 Client ID
4. Under **Authorized JavaScript origins**, add:
   ```
   https://paper-trading-xxxx.onrender.com
   ```
5. Under **Authorized redirect URIs**, add:
   ```
   https://paper-trading-xxxx.onrender.com
   ```
6. Click **Save**

---

## How It Works

### Authentication
Users log in with Google. A JWT token is stored in localStorage and sent with every API request. The backend verifies it against Google's public keys.

### Stock Prices
Live prices are fetched from Yahoo Finance using the `yahoo-finance2` library. Prices are cached for 10 seconds to avoid rate limits.

### Options Chain
Option premiums are calculated server-side using the **Black-Scholes** formula with:
- Real NIFTY/BANKNIFTY spot price from Yahoo Finance
- Implied volatility smile model (base IV + OTM premium)
- Risk-free rate: 6.5% (India repo rate)

### Mutual Fund NAV
Real NAV data is fetched from **mfapi.in**, which sources data from AMFI (Association of Mutual Funds in India). NAV is updated daily after market close.

### Database
SQLite is used for simplicity. Tables: `wallet`, `holdings`, `transactions`, `pending_orders`, `deposits`, `mf_holdings`, `options_positions`, `futures_positions`.

> On Render free tier, the database resets on each deploy (no persistent disk). All users start fresh after a redeploy. This is expected for a demo/paper trading app.

---

## Important Notes

- This is a **paper trading simulator** — no real money is involved
- Stock prices are live but execution is simulated
- Mutual Fund NAV is real (from AMFI) but buying/selling is simulated
- F&O prices are calculated using Black-Scholes, not real exchange data
- The app requires a Google account to log in
