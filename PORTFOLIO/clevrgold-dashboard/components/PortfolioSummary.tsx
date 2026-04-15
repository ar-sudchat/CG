'use client';

import { cn, formatMoneyShort, formatPnlShort, pnlColor, pnlBgColor, DAILY_TARGET_USD, WEEKLY_TARGET_USD, MONTHLY_TARGET_USD } from '@/lib/utils';
import { useCurrency } from '@/lib/currency';

interface PortfolioSummaryProps {
  totalBalance: number;
  totalEquity: number;
  totalFloating: number;
  totalDaily: number;
  totalWeekly: number;
  totalMonthly: number;
  accountCount: number;
  awActive: number;
  totalOrders: number;
}

export default function PortfolioSummary({
  totalBalance,
  totalEquity,
  totalFloating,
  totalDaily,
  totalWeekly,
  totalMonthly,
  accountCount,
  awActive,
  totalOrders,
}: PortfolioSummaryProps) {
  const { convert, symbol } = useCurrency();

  return (
    <div className="space-y-2">
      {/* Row 1: Balance, Equity+Floating, Status */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-2.5 min-w-0">
          <div className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider mb-0.5">Balance</div>
          <div className="font-mono text-sm sm:text-base text-[var(--text-heading)] font-bold truncate">
            {formatMoneyShort(convert(totalBalance), symbol)}
          </div>
        </div>

        <div className={cn('bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-2.5 min-w-0', pnlBgColor(totalFloating))}>
          <div className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider mb-0.5">Equity</div>
          <div className="font-mono text-sm sm:text-base text-[var(--text-heading)] font-bold truncate">
            {formatMoneyShort(convert(totalEquity), symbol)}
          </div>
          <div className={cn('text-[9px] font-mono mt-0.5 truncate', pnlColor(totalFloating))}>
            {formatPnlShort(convert(totalFloating), symbol)}
          </div>
        </div>

        <div className={cn(
          'bg-[var(--bg-card)] rounded-xl border p-2.5 min-w-0',
          awActive > 0 ? 'border-red-500/50 bg-red-500/5' : totalOrders > 0 ? 'border-blue-500/30 bg-blue-500/5' : 'border-[var(--border)]'
        )}>
          <div className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider mb-0.5">Status</div>
          <div className="font-mono text-sm sm:text-base text-[var(--text-heading)] font-bold truncate">
            {totalOrders > 0 ? `${totalOrders} Orders` : 'No Orders'}
          </div>
          <div className={cn(
            'text-[9px] font-mono mt-0.5 truncate',
            awActive > 0 ? 'text-red-400' : 'text-green-400'
          )}>
            {awActive > 0 ? `⚠ ${awActive} AW` : `${accountCount} acc OK`}
          </div>
        </div>
      </div>

      {/* Row 2: Daily, Weekly, Monthly P&L */}
      <div className="grid grid-cols-3 gap-2">
        {(() => {
          const dailyTotal = totalDaily + totalFloating;
          const totalTarget = DAILY_TARGET_USD * accountCount;
          const pct = totalTarget > 0 ? Math.min((dailyTotal / totalTarget) * 100, 100) : 0;
          const hit = dailyTotal >= totalTarget;
          return (
            <div className={cn('bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-2.5 min-w-0', pnlBgColor(dailyTotal))}>
              <div className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider mb-0.5">
                Daily {hit ? '✓' : ''}
              </div>
              <div className={cn('font-mono text-sm sm:text-base font-bold truncate', pnlColor(dailyTotal))}>
                {formatPnlShort(convert(dailyTotal), symbol)}
              </div>
              <div className="flex items-center gap-1 mt-0.5">
                <span className={cn('text-[9px] font-mono', pnlColor(totalDaily))}>closed {formatPnlShort(convert(totalDaily), symbol)}</span>
                <span className="text-[8px] text-[var(--text-dim)]">/</span>
                <span className={cn('text-[9px] font-mono', pnlColor(totalFloating))}>float {formatPnlShort(convert(totalFloating), symbol)}</span>
              </div>
              <div className="w-full h-1 bg-[var(--bar-track)] rounded-full overflow-hidden mt-1">
                <div
                  className={cn('h-full rounded-full transition-all duration-500', hit ? 'bg-green-500/60' : pct > 0 ? 'bg-slate-500/40' : 'bg-transparent')}
                  style={{ width: `${Math.max(pct, 0)}%` }}
                />
              </div>
              <div className="text-[8px] font-mono text-[var(--text-dim)] mt-0.5 truncate">
                {Math.round(pct)}% of {formatMoneyShort(convert(totalTarget), symbol)}
              </div>
            </div>
          );
        })()}

        {(() => {
          const totalTarget = WEEKLY_TARGET_USD * accountCount;
          const pct = totalTarget > 0 ? Math.min((totalWeekly / totalTarget) * 100, 100) : 0;
          const hit = totalWeekly >= totalTarget;
          return (
            <div className={cn('bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-2.5 min-w-0', pnlBgColor(totalWeekly))}>
              <div className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider mb-0.5">
                Weekly {hit ? '✓' : ''}
              </div>
              <div className={cn('font-mono text-sm sm:text-base font-bold truncate', pnlColor(totalWeekly))}>
                {formatPnlShort(convert(totalWeekly), symbol)}
              </div>
              <div className="w-full h-1 bg-[var(--bar-track)] rounded-full overflow-hidden mt-1">
                <div
                  className={cn('h-full rounded-full transition-all duration-500', hit ? 'bg-green-500/60' : pct > 0 ? 'bg-slate-500/40' : 'bg-transparent')}
                  style={{ width: `${Math.max(pct, 0)}%` }}
                />
              </div>
              <div className="text-[8px] font-mono text-[var(--text-dim)] mt-0.5 truncate">
                {Math.round(pct)}% of {formatMoneyShort(convert(totalTarget), symbol)}
              </div>
            </div>
          );
        })()}

        {(() => {
          const totalTarget = MONTHLY_TARGET_USD * accountCount;
          const pct = totalTarget > 0 ? Math.min((totalMonthly / totalTarget) * 100, 100) : 0;
          const hit = totalMonthly >= totalTarget;
          return (
            <div className={cn('bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-2.5 min-w-0', pnlBgColor(totalMonthly))}>
              <div className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider mb-0.5">
                Monthly {hit ? '✓' : ''}
              </div>
              <div className={cn('font-mono text-sm sm:text-base font-bold truncate', pnlColor(totalMonthly))}>
                {formatPnlShort(convert(totalMonthly), symbol)}
              </div>
              <div className="w-full h-1 bg-[var(--bar-track)] rounded-full overflow-hidden mt-1">
                <div
                  className={cn('h-full rounded-full transition-all duration-500', hit ? 'bg-green-500/60' : pct > 0 ? 'bg-slate-500/40' : 'bg-transparent')}
                  style={{ width: `${Math.max(pct, 0)}%` }}
                />
              </div>
              <div className="text-[8px] font-mono text-[var(--text-dim)] mt-0.5 truncate">
                {Math.round(pct)}% of {formatMoneyShort(convert(totalTarget), symbol)}
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
