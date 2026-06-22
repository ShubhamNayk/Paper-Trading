import { useState, useEffect } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';
import { fetchHistory } from '../api';

const INTERVALS = ['1D', '1W', '1M', '1Y'];

// Brand colors matching tailwind.config.js
const GREEN = '#00C853';
const RED   = '#F44336';

function labelForDate(isoStr, interval) {
  const d = new Date(isoStr);
  if (interval === '1D') {
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  }
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function ChartTooltip({ active, payload, label, interval }) {
  if (!active || !payload?.length) return null;
  const price = payload[0]?.value;
  return (
    <div
      style={{ background: '#0D0D0D' }}
      className="rounded-lg px-3 py-2 shadow-lg pointer-events-none"
    >
      <p className="text-white text-xs font-bold tabular-nums">
        ₹{price?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </p>
      <p className="text-gray-400 text-xs mt-0.5">{labelForDate(label, interval)}</p>
    </div>
  );
}

export default function PriceChart({ symbol, changePercent }) {
  const [chartInterval, setChartInterval] = useState('1W');
  const [history, setHistory]             = useState([]);
  const [loading, setLoading]             = useState(false);

  const isPositive = (changePercent ?? 0) >= 0;
  const color      = isPositive ? GREEN : RED;
  const gradId     = isPositive ? 'ptGreenGrad' : 'ptRedGrad';

  useEffect(() => {
    if (!symbol) { setHistory([]); return; }
    let cancelled = false;
    setLoading(true);
    fetchHistory(symbol, chartInterval)
      .then(d => { if (!cancelled) setHistory(d.history ?? []); })
      .catch(() => { if (!cancelled) setHistory([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [symbol, chartInterval]);

  // Reset to 1W when the user picks a new stock
  useEffect(() => { setChartInterval('1W'); }, [symbol]);

  if (!symbol) return null;

  const prices = history.map(p => p.price);
  const yMin   = prices.length ? Math.min(...prices) : 0;
  const yMax   = prices.length ? Math.max(...prices) : 0;
  const yPad   = ((yMax - yMin) * 0.2) || 1;

  return (
    <div className="space-y-2.5">
      {/* Interval pills */}
      <div className="flex gap-1 bg-surface-muted rounded-xl p-1">
        {INTERVALS.map(iv => (
          <button
            key={iv}
            onClick={() => setChartInterval(iv)}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
              chartInterval === iv
                ? isPositive
                  ? 'bg-brand-green text-white shadow-sm'
                  : 'bg-brand-red text-white shadow-sm'
                : 'text-ink-muted hover:text-ink-primary'
            }`}
          >
            {iv}
          </button>
        ))}
      </div>

      {/* Chart area — fixed height prevents layout shift */}
      <div className="h-[130px] w-full">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <span className="text-ink-muted text-xs">Loading chart…</span>
          </div>
        ) : history.length > 1 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={history}
              margin={{ top: 4, right: 2, left: 2, bottom: 0 }}
            >
              <defs>
                <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor={color} stopOpacity={0.18} />
                  <stop offset="100%" stopColor={color} stopOpacity={0}    />
                </linearGradient>
              </defs>

              <XAxis dataKey="date" hide />
              <YAxis
                domain={[yMin - yPad, yMax + yPad]}
                hide
              />

              <Tooltip
                content={<ChartTooltip interval={chartInterval} />}
                cursor={{ stroke: color, strokeWidth: 1, strokeDasharray: '4 3', opacity: 0.6 }}
              />

              <Area
                type="monotone"
                dataKey="price"
                stroke={color}
                strokeWidth={2}
                fill={`url(#${gradId})`}
                dot={false}
                activeDot={{ r: 4, fill: color, stroke: '#fff', strokeWidth: 2 }}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : null}
      </div>
    </div>
  );
}
