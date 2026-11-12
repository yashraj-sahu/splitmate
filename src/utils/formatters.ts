import { CurrencyCode } from '../types/models';

/**
 * Currency configuration symbols and formats
 */
export const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = {
  INR: '₹',
  USD: '$',
  EUR: '€',
  GBP: '£',
  CAD: 'CA$',
  AUD: 'AU$',
  SGD: 'SG$',
  AED: 'AED ',
};

/**
 * Convert user float/decimal input string or number safely to integer paise
 * e.g., "120.50" or 120.50 -> 12050 paise
 */
export function toPaise(value: number | string): number {
  if (typeof value === 'number') {
    return Math.round(value * 100);
  }
  const clean = value.replace(/[^0-9.-]/g, '');
  if (!clean || isNaN(Number(clean))) return 0;
  
  const parts = clean.split('.');
  const whole = parseInt(parts[0] || '0', 10);
  let decimal = parts[1] || '';
  if (decimal.length > 2) {
    decimal = decimal.substring(0, 2);
  } else if (decimal.length === 1) {
    decimal = decimal + '0';
  } else if (decimal.length === 0) {
    decimal = '00';
  }
  const isNegative = clean.startsWith('-');
  const result = Math.abs(whole) * 100 + parseInt(decimal, 10);
  return isNegative ? -result : result;
}

/**
 * Convert integer paise to decimal number (for input fields)
 * e.g., 12050 -> 120.50
 */
export function fromPaise(paise: number): number {
  return Number((paise / 100).toFixed(2));
}

/**
 * Format integer paise into display currency string
 * e.g., 12050, 'INR' -> "₹120.50"
 */
export function formatCurrency(paise: number, currency: CurrencyCode = 'INR', showSign = false): string {
  const symbol = CURRENCY_SYMBOLS[currency] || '₹';
  const isNegative = paise < 0;
  const absPaise = Math.abs(paise);
  const units = Math.floor(absPaise / 100);
  const cents = absPaise % 100;
  const centsStr = cents < 10 ? `0${cents}` : `${cents}`;

  // Locale thousands grouping
  const formattedUnits = new Intl.NumberFormat('en-IN').format(units);
  const formatted = `${symbol}${formattedUnits}.${centsStr}`;

  if (showSign) {
    if (paise > 0) return `+${formatted}`;
    if (paise < 0) return `-${formatted}`;
    return formatted;
  }

  return isNegative ? `-${formatted}` : formatted;
}

/**
 * Format date for transactions and activity displays
 */
export function formatDate(dateString: string): string {
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(d);
  } catch {
    return dateString;
  }
}

/**
 * Get human readable relative time (e.g. "Today", "Yesterday", "3 days ago")
 */
export function formatRelativeTime(dateString: string): string {
  try {
    const d = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return formatDate(dateString);
  } catch {
    return dateString;
  }
}

/**
 * Extract 1-2 initials from full name or email
 */
export function getInitials(name?: string | null): string {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Deterministic color palette for avatars
 */
export function getAvatarColor(identifier: string): string {
  const colors = [
    'bg-royal text-white',
    'bg-navy text-white',
    'bg-emerald-600 text-white',
    'bg-indigo-600 text-white',
    'bg-amber-600 text-white',
    'bg-rose-600 text-white',
    'bg-teal-600 text-white',
    'bg-violet-600 text-white',
  ];
  let hash = 0;
  for (let i = 0; i < identifier.length; i++) {
    hash = identifier.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
}

