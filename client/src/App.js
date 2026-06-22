import { useState, useEffect, useCallback, useRef } from 'react';
import { jwtDecode } from 'jwt-decode';
import { fetchPortfolio } from './api';
import Header from './components/Header';
import SummaryBar from './components/SummaryBar';
import HoldingsTable from './components/HoldingsTable';
import TradePanel from './components/TradePanel';
import TradeHistoryTab from './components/TradeHistoryTab';
import ActiveTriggersTab from './components/ActiveTriggersTab';
import LoginPage from './components/LoginPage';
import WalletPage from './components/WalletPage';
import MarketsPage from './components/MarketsPage';
import MutualFundsPage from './components/MutualFundsPage';
import FuturesOptionsPage from './components/FuturesOptionsPage';

const TOKEN_KEY = 'pt_google_token';

function loadStoredAuth() {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return { token: null, user: null };
  try {
    const user = jwtDecode(token);
    if (user.exp && user.exp * 1000 < Date.now()) {
      localStorage.removeItem(TOKEN_KEY);
      return { token: null, user: null };
    }
    return { token, user };
  } catch {
    localStorage.removeItem(TOKEN_KEY);
    return { token: null, user: null };
  }
}

export default function App() {
  const [{ token, user }, setAuth] = useState(loadStoredAuth);
  const [portfolio, setPortfolio]       = useState(null);
  const [error, setError]               = useState(null);
  const [tradePrefill, setTradePrefill] = useState('');
  const [activeTab, setActiveTab]       = useState('portfolio');
  const [activePage, setActivePage]     = useState('portfolio');
  const [triggerRefresh, setTriggerRefresh] = useState(0);
  const tradePanelRef = useRef(null);

  const handleLogin = useCallback((credential) => {
    try {
      const decoded = jwtDecode(credential);
      localStorage.setItem(TOKEN_KEY, credential);
      setAuth({ token: credential, user: decoded });
      setError(null);
    } catch {
      setError('Login failed — could not decode token.');
    }
  }, []);

  const handleLogout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setAuth({ token: null, user: null });
    setPortfolio(null);
    setError(null);
  }, []);

  const refreshTriggers = useCallback(() => setTriggerRefresh(n => n + 1), []);

  const loadPortfolio = useCallback(async () => {
    try {
      const data = await fetchPortfolio();
      setPortfolio(data);
      setError(null);
    } catch (err) {
      if (err.response?.status === 401) {
        handleLogout();
      } else {
        setError('Cannot connect to server. Make sure the backend is running on port 5000.');
      }
    }
  }, [handleLogout]);

  useEffect(() => {
    if (!token) return;
    loadPortfolio();
    const id = setInterval(loadPortfolio, 5000);
    return () => clearInterval(id);
  }, [token, loadPortfolio]);

  if (!token) return <LoginPage onLogin={handleLogin} />;

  // Clicking Trade from Markets page → go to Portfolio + prefill
  const handleMarketTradeClick = (symbol) => {
    setTradePrefill(symbol);
    setActivePage('portfolio');
    setActiveTab('portfolio');
    setTimeout(() => tradePanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  };

  const handleSellClick = (symbol) => {
    setTradePrefill(symbol);
    setActiveTab('portfolio');
    tradePanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const TABS = [
    { id: 'portfolio', label: 'Portfolio' },
    { id: 'triggers',  label: 'Active Triggers' },
    { id: 'history',   label: 'Trade History' },
  ];

  return (
    <div className="min-h-screen bg-surface-muted">
      <Header
        user={user}
        onLogout={handleLogout}
        activePage={activePage}
        onNavigate={setActivePage}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* ── Wallet ── */}
        {activePage === 'wallet' && (
          <WalletPage onFundsAdded={loadPortfolio} />
        )}

        {/* ── Markets ── */}
        {activePage === 'markets' && (
          <MarketsPage onTradeClick={handleMarketTradeClick} />
        )}

        {/* ── Mutual Funds ── */}
        {activePage === 'mf' && (
          <MutualFundsPage
            walletBalance={portfolio?.balance ?? 0}
            onBalanceChange={loadPortfolio}
          />
        )}

        {/* ── F&O ── */}
        {activePage === 'fno' && (
          <FuturesOptionsPage
            walletBalance={portfolio?.balance ?? 0}
            onTradeSuccess={loadPortfolio}
          />
        )}

        {/* ── Portfolio ── */}
        {activePage === 'portfolio' && (
          <>
            {error ? (
              <div className="bg-brand-red-light text-brand-red-dark text-sm font-medium rounded-2xl px-6 py-4 border border-red-200">
                {error}
              </div>
            ) : (
              <>
                <SummaryBar data={portfolio} />

                <div className="flex gap-1 bg-white rounded-2xl shadow-card p-1 w-fit">
                  {TABS.map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                      className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all ${
                        activeTab === tab.id
                          ? 'bg-ink-primary text-white shadow-sm'
                          : 'text-ink-secondary hover:text-ink-primary'
                      }`}>
                      {tab.label}
                    </button>
                  ))}
                </div>

                {activeTab === 'portfolio' ? (
                  <div className="flex flex-col xl:flex-row gap-6 items-start">
                    <div className="flex-1 min-w-0 space-y-6">
                      <HoldingsTable holdings={portfolio?.holdings} onTradeClick={handleSellClick} />
                    </div>
                    <div ref={tradePanelRef} className="w-full xl:w-[360px] shrink-0">
                      <TradePanel
                        balance={portfolio?.balance ?? 0}
                        onTradeSuccess={loadPortfolio}
                        onOrderPlaced={refreshTriggers}
                        prefillSymbol={tradePrefill}
                      />
                    </div>
                  </div>
                ) : activeTab === 'triggers' ? (
                  <ActiveTriggersTab key={triggerRefresh} onCancelSuccess={loadPortfolio} />
                ) : (
                  <TradeHistoryTab />
                )}
              </>
            )}
          </>
        )}

      </main>
    </div>
  );
}
