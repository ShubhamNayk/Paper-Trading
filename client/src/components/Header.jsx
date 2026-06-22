import { Activity, LogOut, BarChart2, Wallet, LayoutDashboard, TrendingUp, PiggyBank } from 'lucide-react';

const NAV = [
  { id: 'portfolio', label: 'Portfolio',   Icon: LayoutDashboard },
  { id: 'markets',   label: 'Markets',     Icon: BarChart2 },
  { id: 'fno',       label: 'F&O',         Icon: TrendingUp },
  { id: 'mf',        label: 'Mutual Funds',Icon: PiggyBank },
  { id: 'wallet',    label: 'Wallet',      Icon: Wallet },
];

export default function Header({ user, onLogout, activePage, onNavigate }) {
  return (
    <header className="bg-white border-b border-surface-border sticky top-0 z-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">

        {/* Brand */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="p-1.5 bg-brand-green rounded-lg">
            <Activity size={18} className="text-white" />
          </div>
          <span className="font-bold text-ink-primary text-base tracking-tight">PaperTrade</span>
          <span className="hidden lg:inline-block text-xs font-medium bg-surface-muted text-ink-muted px-2 py-0.5 rounded-full border border-surface-border ml-1">
            Nifty 50 · Live
          </span>
        </div>

        {/* Page Nav */}
        <nav className="flex items-center gap-0.5 overflow-x-auto scrollbar-hide">
          {NAV.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => onNavigate(id)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
                activePage === id
                  ? 'bg-ink-primary text-white'
                  : 'text-ink-secondary hover:text-ink-primary hover:bg-surface-muted'
              }`}
            >
              <Icon size={13} />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-brand-green animate-pulse" />
            <span className="text-xs font-medium text-ink-muted hidden sm:block">Live</span>
          </div>

          {user && (
            <div className="flex items-center gap-2 pl-3 border-l border-surface-border">
              {user.picture && (
                <img src={user.picture} alt={user.name || 'User'}
                  className="w-7 h-7 rounded-full border border-surface-border"
                  referrerPolicy="no-referrer" />
              )}
              <span className="text-xs font-semibold text-ink-secondary hidden md:block max-w-[120px] truncate">
                {user.name || user.email}
              </span>
              <button onClick={onLogout} title="Sign out"
                className="flex items-center gap-1.5 text-xs font-medium text-ink-muted hover:text-brand-red-dark transition-colors px-2 py-1.5 rounded-lg hover:bg-brand-red-light">
                <LogOut size={14} />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          )}
        </div>

      </div>
    </header>
  );
}
