import { GoogleLogin } from '@react-oauth/google';
import { Activity, TrendingUp, Shield, Zap } from 'lucide-react';

const FEATURES = [
  { icon: TrendingUp, label: 'Live Nifty 50 prices' },
  { icon: Shield,     label: 'Your own isolated portfolio' },
  { icon: Zap,        label: '₹1,00,000 virtual balance' },
];

export default function LoginPage({ onLogin }) {
  return (
    <div className="min-h-screen bg-surface-muted flex items-center justify-center px-4">
      {/* Background accent */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-brand-green opacity-5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-brand-green opacity-5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-card-hover px-8 py-10 space-y-7">

          {/* Logo + Brand */}
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="p-3.5 bg-brand-green rounded-2xl shadow-sm">
              <Activity size={26} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-ink-primary tracking-tight">PaperTrade</h1>
              <p className="text-sm text-ink-muted mt-1">Practice trading. Zero risk.</p>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-surface-border" />

          {/* Feature list */}
          <ul className="space-y-3">
            {FEATURES.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-lg bg-brand-green-light flex items-center justify-center shrink-0">
                  <Icon size={14} className="text-brand-green-dark" />
                </span>
                <span className="text-sm text-ink-secondary font-medium">{label}</span>
              </li>
            ))}
          </ul>

          {/* Divider */}
          <div className="h-px bg-surface-border" />

          {/* CTA */}
          <div className="flex flex-col items-center gap-3">
            <p className="text-xs font-semibold text-ink-secondary uppercase tracking-wide">
              Sign in to get started
            </p>
            <div className="w-full flex justify-center">
              <GoogleLogin
                onSuccess={(res) => onLogin(res.credential)}
                onError={() => {}}
                theme="outline"
                size="large"
                text="signin_with"
                shape="rectangular"
                width="280"
              />
            </div>
          </div>

          <p className="text-center text-xs text-ink-muted">
            Your portfolio is private and tied to your Google account.
          </p>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-ink-muted mt-4">
          Nifty 50 · Paper trading only · No real money involved
        </p>
      </div>
    </div>
  );
}
