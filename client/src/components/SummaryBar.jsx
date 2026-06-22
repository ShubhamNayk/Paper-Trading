import { TrendingUp, Wallet, BarChart2 } from 'lucide-react';
import { formatINR, formatPct, pnlClass } from '../utils/format';

function StatCard({ icon: Icon, label, value, sub, subColor }) {
  return (
    <div className="flex items-start gap-4 bg-white rounded-2xl px-6 py-5 shadow-card flex-1 min-w-0">
      <div className="p-2 rounded-xl bg-surface-muted mt-0.5">
        <Icon size={20} className="text-ink-secondary" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-ink-muted uppercase tracking-wide mb-1">{label}</p>
        <p className="text-xl font-bold text-ink-primary tabular-nums truncate">{value}</p>
        {sub && (
          <p className={`text-xs font-medium mt-0.5 tabular-nums ${subColor}`}>{sub}</p>
        )}
      </div>
    </div>
  );
}

export default function SummaryBar({ data }) {
  if (!data) return null;

  const { portfolio_value, total_pnl, total_pnl_percent, balance } = data;

  return (
    <div className="flex flex-col sm:flex-row gap-4">
      <StatCard
        icon={BarChart2}
        label="Total Portfolio Value"
        value={formatINR(portfolio_value)}
        sub={`Invested: ${formatINR(data.total_invested)}`}
        subColor="text-ink-secondary"
      />
      <StatCard
        icon={TrendingUp}
        label="Total Returns"
        value={formatINR(total_pnl)}
        sub={formatPct(total_pnl_percent)}
        subColor={pnlClass(total_pnl)}
      />
      <StatCard
        icon={Wallet}
        label="Available Cash"
        value={formatINR(balance)}
        sub="Uninvested balance"
        subColor="text-ink-secondary"
      />
    </div>
  );
}
