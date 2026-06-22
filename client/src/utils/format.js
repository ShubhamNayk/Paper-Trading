export const formatINR = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

export const formatPct = (value) => {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
};

export const pnlClass = (value) =>
  value >= 0 ? 'text-brand-green-dark' : 'text-brand-red-dark';

export const pnlBg = (value) =>
  value >= 0 ? 'bg-brand-green-light text-brand-green-dark' : 'bg-brand-red-light text-brand-red-dark';
