import { TrendingUp, TrendingDown } from 'lucide-react';
import { formatINR, formatPct, pnlClass, pnlBg } from '../utils/format';

function PnlBadge({ value, percent }) {
  const isPos = value >= 0;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold tabular-nums ${pnlBg(value)}`}>
      {isPos ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
      {formatPct(percent)}
    </span>
  );
}

const COL = 'text-sm text-ink-secondary font-medium uppercase tracking-wide py-3 px-4';
const CELL = 'py-4 px-4 text-sm tabular-nums';

export default function HoldingsTable({ holdings, onTradeClick }) {
  if (!holdings || holdings.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-card p-10 text-center">
        <p className="text-ink-muted text-sm">No holdings yet. Use the Trade Panel to make your first investment.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-card overflow-hidden">
      <div className="px-6 py-4 border-b border-surface-border">
        <h2 className="text-base font-semibold text-ink-primary">Holdings</h2>
        <p className="text-xs text-ink-muted mt-0.5">{holdings.length} position{holdings.length !== 1 ? 's' : ''}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-surface-muted border-b border-surface-border">
            <tr>
              <th className={`${COL} text-left`}>Company</th>
              <th className={`${COL} text-right`}>Qty</th>
              <th className={`${COL} text-right`}>Avg Buy</th>
              <th className={`${COL} text-right`}>Current</th>
              <th className={`${COL} text-right`}>Invested</th>
              <th className={`${COL} text-right`}>Current Val.</th>
              <th className={`${COL} text-right`}>P&amp;L</th>
              <th className={`${COL} text-right`}>Returns</th>
              <th className={`${COL} text-right`}></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border">
            {holdings.map((h) => (
              <tr key={h.symbol} className="hover:bg-surface-muted transition-colors">
                <td className={`${CELL} font-medium`}>
                  <span className="font-bold text-ink-primary">{h.symbol}</span>
                  <span className="block text-xs text-ink-muted mt-0.5 max-w-[160px] truncate">{h.company_name}</span>
                </td>
                <td className={`${CELL} text-right text-ink-primary font-semibold`}>{h.quantity}</td>
                <td className={`${CELL} text-right text-ink-secondary`}>{formatINR(h.avg_buy_price)}</td>
                <td className={`${CELL} text-right font-semibold ${pnlClass(h.current_price - h.avg_buy_price)}`}>
                  {formatINR(h.current_price)}
                </td>
                <td className={`${CELL} text-right text-ink-secondary`}>{formatINR(h.invested_value)}</td>
                <td className={`${CELL} text-right text-ink-primary font-semibold`}>{formatINR(h.current_value)}</td>
                <td className={`${CELL} text-right font-semibold ${pnlClass(h.pnl)}`}>
                  {h.pnl >= 0 ? '+' : ''}{formatINR(h.pnl)}
                </td>
                <td className={`${CELL} text-right`}>
                  <PnlBadge value={h.pnl} percent={h.pnl_percent} />
                </td>
                <td className={`${CELL} text-right`}>
                  <button
                    onClick={() => onTradeClick(h.symbol)}
                    className="text-xs font-semibold text-brand-red-dark bg-brand-red-light hover:bg-red-200 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    Sell
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
