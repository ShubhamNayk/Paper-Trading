import axios from 'axios';

// In production the React build is served from the same Express server,
// so API calls use a relative path. In development the servers run separately.
const BASE = process.env.NODE_ENV === 'production'
  ? '/api'
  : 'http://localhost:5000/api';
const TOKEN_KEY = 'pt_google_token';

const authHeaders = () => {
  const token = localStorage.getItem(TOKEN_KEY);
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const fetchPortfolio  = () =>
  axios.get(`${BASE}/portfolio`, { headers: authHeaders() }).then(r => r.data);

export const fetchPrice      = (symbol) =>
  axios.get(`${BASE}/prices/${symbol}`).then(r => r.data);

export const fetchAllPrices  = () =>
  axios.get(`${BASE}/prices`).then(r => r.data);

export const executeTrade    = (payload) =>
  axios.post(`${BASE}/trade`, payload, { headers: authHeaders() }).then(r => r.data);

export const fetchTransactions = (page = 1) =>
  axios.get(`${BASE}/transactions`, { params: { page }, headers: authHeaders() }).then(r => r.data);

export const fetchHistory = (symbol, interval = '1W') =>
  axios.get(`${BASE}/history/${symbol}`, { params: { interval } }).then(r => r.data);

export const placeOrder  = (payload) =>
  axios.post(`${BASE}/orders`, payload, { headers: authHeaders() }).then(r => r.data);

export const fetchOrders = () =>
  axios.get(`${BASE}/orders`, { headers: authHeaders() }).then(r => r.data);

export const cancelOrder = (id) =>
  axios.delete(`${BASE}/orders/${id}`, { headers: authHeaders() }).then(r => r.data);

export const fetchWallet  = () =>
  axios.get(`${BASE}/wallet`, { headers: authHeaders() }).then(r => r.data);

export const addFunds = (amount, note) =>
  axios.post(`${BASE}/wallet/add-funds`, { amount, note }, { headers: authHeaders() }).then(r => r.data);

// ── Mutual Funds ─────────────────────────────────────────────────────────────
export const searchMF      = (q)              => axios.get(`${BASE}/mutualfunds/search`, { params: { q }, headers: authHeaders() }).then(r => r.data);
export const fetchMFCat    = (cat)            => axios.get(`${BASE}/mutualfunds/category/${cat}`, { headers: authHeaders() }).then(r => r.data);
export const fetchMFNav    = (schemeCode)     => axios.get(`${BASE}/mutualfunds/nav/${schemeCode}`, { headers: authHeaders() }).then(r => r.data);
export const fetchMFPortfolio = ()            => axios.get(`${BASE}/mutualfunds/portfolio`, { headers: authHeaders() }).then(r => r.data);
export const investMF      = (body)           => axios.post(`${BASE}/mutualfunds/invest`, body, { headers: authHeaders() }).then(r => r.data);
export const redeemMF      = (body)           => axios.post(`${BASE}/mutualfunds/redeem`, body, { headers: authHeaders() }).then(r => r.data);

// ── F&O ──────────────────────────────────────────────────────────────────────
export const fetchOptionsChain  = (symbol, expiry) => axios.get(`${BASE}/fno/optionschain/${symbol}`, { params: { expiry }, headers: authHeaders() }).then(r => r.data);
export const fetchFutures       = ()               => axios.get(`${BASE}/fno/futures`, { headers: authHeaders() }).then(r => r.data);
export const fetchFNOPositions  = ()               => axios.get(`${BASE}/fno/positions`, { headers: authHeaders() }).then(r => r.data);
export const tradeOption        = (body)           => axios.post(`${BASE}/fno/options/trade`, body, { headers: authHeaders() }).then(r => r.data);
export const tradeFuture        = (body)           => axios.post(`${BASE}/fno/futures/trade`, body, { headers: authHeaders() }).then(r => r.data);
