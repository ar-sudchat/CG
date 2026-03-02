import { clsx, type ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatMoney(value: number | null | undefined, symbol = '$'): string {
  if (value == null) return `${symbol}0.00`;
  const abs = Math.abs(value);
  const formatted = abs.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return value < 0 ? `-${symbol}${formatted}` : `${symbol}${formatted}`;
}

export function formatMoneyShort(value: number | null | undefined, symbol = '$'): string {
  if (value == null) return `${symbol}0`;
  const abs = Math.floor(Math.abs(value));
  const formatted = abs.toLocaleString('en-US');
  return value < 0 ? `-${symbol}${formatted}` : `${symbol}${formatted}`;
}

export function formatPnlShort(value: number | null | undefined, symbol = '$'): string {
  if (value == null) return `${symbol}0`;
  const abs = Math.floor(Math.abs(value));
  const formatted = abs.toLocaleString('en-US');
  if (value > 0) return `+${symbol}${formatted}`;
  if (value < 0) return `-${symbol}${formatted}`;
  return `${symbol}0`;
}

export function formatPnl(value: number | null | undefined, symbol = '$'): string {
  if (value == null) return `${symbol}0.00`;
  const abs = Math.abs(value);
  const formatted = abs.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  if (value > 0) return `+${symbol}${formatted}`;
  if (value < 0) return `-${symbol}${formatted}`;
  return `${symbol}0.00`;
}

export function formatPercent(value: number | null | undefined): string {
  if (value == null) return '0%';
  const formatted = Math.abs(value).toLocaleString('en-US', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  if (value > 0) return `+${formatted}%`;
  if (value < 0) return `-${formatted}%`;
  return '0%';
}

export function formatMarginLevel(value: number | null | undefined): string {
  if (value == null || value === 0) return '-';
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }) + '%';
}

export function timeAgoFromSeconds(seconds: number | null | undefined): string {
  if (seconds == null) return 'N/A';
  const s = Math.round(seconds);
  if (s < 0) return 'just now';
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export function timeAgo(dateStr: string | null | undefined): string {
  if (!dateStr) return 'N/A';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 0) return 'just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  const diffDay = Math.floor(diffHour / 24);
  return `${diffDay}d ago`;
}

export function isOffline(dateStr: string | null | undefined): boolean {
  if (!dateStr) return true;
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  return diffMs > 5 * 60 * 1000; // 5 minutes
}

// Daily/Weekly/Monthly target per account (USD)
export const DAILY_TARGET_USD = 50;
export const WEEKLY_TARGET_USD = 250; // 50 x 5 days
export const MONTHLY_TARGET_USD = 1000; // 50 x 20 trading days

export function pnlColor(value: number | null | undefined): string {
  if (value == null || value === 0) return 'text-slate-400';
  return value > 0 ? 'text-green-500' : 'text-red-500';
}

export function pnlBgColor(value: number | null | undefined): string {
  if (value == null || value === 0) return '';
  return value > 0 ? 'bg-green-500/10' : 'bg-red-500/10';
}
