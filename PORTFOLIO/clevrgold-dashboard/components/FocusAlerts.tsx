'use client';

import Link from 'next/link';
import { cn, formatPnl, pnlColor } from '@/lib/utils';
import { useCurrency } from '@/lib/currency';

interface Account {
  account_number: number;
  name?: string;
  balance: number;
  equity: number;
  floating_pnl: number;
  daily_pnl: number;
  open_orders: number;
  aw_orders: number;
  mode: string;
  margin_level: number;
  is_offline?: boolean;
}

interface FocusAlertsProps {
  accounts: Account[];
}

interface FocusItem {
  level: 'critical' | 'warning' | 'info';
  account_number: number;
  message: string;
  detail: string;
  value?: number;
}

export default function FocusAlerts({ accounts }: FocusAlertsProps) {
  const { convert, symbol } = useCurrency();
  const items: FocusItem[] = [];

  accounts.forEach((acc) => {
    // Critical: AW mode
    if (acc.aw_orders > 0 || acc.mode === 'AW') {
      items.push({
        level: 'critical',
        account_number: acc.account_number,
        message: `AW Recovery Active (${acc.aw_orders} orders)`,
        detail: `Floating: ${formatPnl(convert(acc.floating_pnl), symbol)}`,
        value: acc.floating_pnl,
      });
    }

    // Warning: floating loss > $10
    if (acc.floating_pnl < -10 && acc.aw_orders === 0) {
      items.push({
        level: 'warning',
        account_number: acc.account_number,
        message: `Floating Loss`,
        detail: formatPnl(convert(acc.floating_pnl), symbol),
        value: acc.floating_pnl,
      });
    }

    // Warning: margin level < 1000% and has orders
    if (acc.margin_level > 0 && acc.margin_level < 1000 && acc.open_orders > 0) {
      items.push({
        level: 'warning',
        account_number: acc.account_number,
        message: `Low Margin Level`,
        detail: `${acc.margin_level.toFixed(0)}%`,
      });
    }

    // Info: has open orders with positive float
    if (acc.open_orders > 0 && acc.floating_pnl >= 0 && acc.aw_orders === 0) {
      items.push({
        level: 'info',
        account_number: acc.account_number,
        message: `${acc.open_orders} order${acc.open_orders > 1 ? 's' : ''} running`,
        detail: formatPnl(convert(acc.floating_pnl), symbol),
        value: acc.floating_pnl,
      });
    }

    // Warning: offline
    if (acc.is_offline) {
      items.push({
        level: 'warning',
        account_number: acc.account_number,
        message: `Account OFFLINE`,
        detail: 'Data not updating',
      });
    }
  });

  // Sort: critical > warning > info
  const levelOrder = { critical: 0, warning: 1, info: 2 };
  items.sort((a, b) => levelOrder[a.level] - levelOrder[b.level]);

  if (items.length === 0) {
    return (
      <div className="bg-green-500/5 rounded-xl border border-green-500/20 p-4 flex items-center gap-3">
        <span className="text-2xl">✅</span>
        <div>
          <div className="text-sm text-green-400 font-semibold">All Clear</div>
          <div className="text-xs text-slate-500">No issues detected across all accounts</div>
        </div>
      </div>
    );
  }

  const levelStyles = {
    critical: {
      bg: 'bg-red-500/5',
      border: 'border-red-500/30',
      dot: 'bg-red-500',
      text: 'text-red-400',
      label: 'CRITICAL',
    },
    warning: {
      bg: 'bg-orange-500/5',
      border: 'border-orange-500/30',
      dot: 'bg-orange-500',
      text: 'text-orange-400',
      label: 'WARNING',
    },
    info: {
      bg: 'bg-blue-500/5',
      border: 'border-blue-500/30',
      dot: 'bg-blue-500',
      text: 'text-blue-400',
      label: 'ACTIVE',
    },
  };

  return (
    <div className="space-y-2">
      {items.map((item, i) => {
        const style = levelStyles[item.level];
        return (
          <Link key={i} href={`/account/${item.account_number}`}>
            <div className={cn(
              'rounded-xl border p-3 flex items-center justify-between hover:brightness-110 transition-all cursor-pointer',
              style.bg, style.border
            )}>
              <div className="flex items-center gap-3">
                <div className={cn('w-2 h-2 rounded-full flex-shrink-0', style.dot,
                  item.level === 'critical' && 'animate-pulse'
                )} />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-slate-400">{item.account_number}</span>
                    <span className={cn('text-[9px] font-mono font-bold uppercase', style.text)}>
                      {style.label}
                    </span>
                  </div>
                  <div className="text-sm text-slate-300">{item.message}</div>
                </div>
              </div>
              <div className={cn(
                'font-mono text-sm font-bold',
                item.value != null ? pnlColor(item.value) : style.text
              )}>
                {item.detail}
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
