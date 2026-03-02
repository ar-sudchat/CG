'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import useSWR from 'swr';
import { cn, formatPnl, pnlColor } from '@/lib/utils';
import { useCurrency } from '@/lib/currency';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface Account {
  account_number: number;
  name?: string;
  floating_pnl: number;
  daily_pnl: number;
  open_orders: number;
  aw_orders: number;
  mode: string;
  margin_level: number;
  is_offline?: boolean;
  is_locked?: boolean;
  lock_reason?: string | null;
  locked_by?: number | null;
}

interface AlertItem {
  level: 'critical' | 'warning' | 'info';
  account_number: number;
  name?: string;
  message: string;
  detail: string;
  value?: number;
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { convert, symbol } = useCurrency();

  const { data } = useSWR('/api/portfolio', fetcher, {
    refreshInterval: 10000,
    revalidateOnFocus: true,
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const alerts = useMemo(() => {
    if (!data?.accounts) return [];
    const items: AlertItem[] = [];

    (data.accounts as Account[]).forEach((acc) => {
      // Warning: Account LOCKED by pair
      if (acc.is_locked && acc.locked_by) {
        items.push({
          level: 'warning',
          account_number: acc.account_number,
          name: acc.name,
          message: `LOCKED by #${acc.locked_by}`,
          detail: 'Pair active',
        });
      }

      // Critical: AW mode
      if (acc.aw_orders > 0 || acc.mode === 'AW') {
        items.push({
          level: 'critical',
          account_number: acc.account_number,
          name: acc.name,
          message: `AW Recovery (${acc.aw_orders} orders)`,
          detail: formatPnl(convert(acc.floating_pnl), symbol),
          value: acc.floating_pnl,
        });
      }

      // Warning: floating loss > $10
      if (acc.floating_pnl < -10 && acc.aw_orders === 0) {
        items.push({
          level: 'warning',
          account_number: acc.account_number,
          name: acc.name,
          message: 'Floating Loss',
          detail: formatPnl(convert(acc.floating_pnl), symbol),
          value: acc.floating_pnl,
        });
      }

      // Warning: margin level < 1000% and has orders
      if (acc.margin_level > 0 && acc.margin_level < 1000 && acc.open_orders > 0) {
        items.push({
          level: 'warning',
          account_number: acc.account_number,
          name: acc.name,
          message: 'Low Margin',
          detail: `${acc.margin_level.toFixed(0)}%`,
        });
      }

      // Warning: offline
      if (acc.is_offline) {
        items.push({
          level: 'warning',
          account_number: acc.account_number,
          name: acc.name,
          message: 'Offline',
          detail: 'No data',
        });
      }
    });

    // Sort: critical > warning > info
    const order = { critical: 0, warning: 1, info: 2 };
    items.sort((a, b) => order[a.level] - order[b.level]);
    return items;
  }, [data, convert, symbol]);

  const criticalCount = alerts.filter((a) => a.level === 'critical').length;
  const totalCount = alerts.length;

  const levelStyles = {
    critical: { dot: 'bg-red-500', text: 'text-red-400', label: 'CRITICAL' },
    warning: { dot: 'bg-orange-500', text: 'text-orange-400', label: 'WARNING' },
    info: { dot: 'bg-blue-500', text: 'text-blue-400', label: 'INFO' },
  };

  return (
    <div ref={ref} className="relative">
      {/* Bell Button */}
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'relative flex items-center justify-center w-8 h-8 rounded-lg transition-colors',
          totalCount > 0
            ? 'text-[var(--text-body)] hover:bg-[var(--gold)]/10'
            : 'text-[var(--text-secondary)] hover:bg-[var(--bg-card)]'
        )}
        title={totalCount > 0 ? `${totalCount} alert${totalCount > 1 ? 's' : ''}` : 'No alerts'}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={cn(criticalCount > 0 && 'animate-[bell_1s_ease-in-out_infinite]')}
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>

        {/* Badge */}
        {totalCount > 0 && (
          <span className={cn(
            'absolute -top-0.5 -right-0.5 min-w-[16px] h-4 flex items-center justify-center rounded-full text-[9px] font-bold px-1',
            criticalCount > 0
              ? 'bg-red-500 text-white animate-pulse'
              : 'bg-orange-500 text-white'
          )}>
            {totalCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl shadow-2xl shadow-black/50 overflow-hidden z-50">
          {/* Header */}
          <div className="px-3 py-2 border-b border-[var(--border)] flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
              Alerts
            </span>
            {totalCount > 0 && (
              <span className={cn(
                'text-[10px] font-mono font-bold',
                criticalCount > 0 ? 'text-red-400' : 'text-orange-400'
              )}>
                {totalCount} active
              </span>
            )}
          </div>

          {/* Alert list */}
          <div className="max-h-64 overflow-y-auto">
            {alerts.length === 0 ? (
              <div className="py-6 text-center">
                <div className="text-green-500 text-lg mb-1">&#10003;</div>
                <div className="text-xs text-slate-500">All clear</div>
              </div>
            ) : (
              alerts.map((alert, i) => {
                const style = levelStyles[alert.level];
                return (
                  <div
                    key={`${alert.account_number}-${alert.message}-${i}`}
                    className="px-3 py-2 border-b border-[var(--border)] last:border-b-0 hover:bg-white/[0.02] transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        'w-1.5 h-1.5 rounded-full flex-shrink-0',
                        style.dot,
                        alert.level === 'critical' && 'animate-pulse'
                      )} />
                      <span className="text-[10px] font-mono text-slate-500">
                        {alert.account_number}
                      </span>
                      <span className={cn('text-[9px] font-mono font-bold uppercase', style.text)}>
                        {style.label}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-0.5 ml-3.5">
                      <span className="text-xs text-slate-300">{alert.message}</span>
                      <span className={cn(
                        'text-xs font-mono font-semibold',
                        alert.value != null ? pnlColor(alert.value) : style.text
                      )}>
                        {alert.detail}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
