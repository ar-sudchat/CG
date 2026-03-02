'use client';

import { useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import useSWR from 'swr';
import { cn, formatMoney, formatPnl, formatMarginLevel, formatPercent, pnlColor, timeAgoFromSeconds, DAILY_TARGET_USD, WEEKLY_TARGET_USD } from '@/lib/utils';
import { useCurrency } from '@/lib/currency';
import StatusBadge from '@/components/StatusBadge';
import DailyPnlChart from '@/components/DailyPnlChart';
import PositionsTable from '@/components/PositionsTable';
import TradeRow from '@/components/TradeRow';
import DateRangeFilter from '@/components/DateRangeFilter';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function StatRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex justify-between py-1.5">
      <span className="text-xs text-slate-500">{label}</span>
      <span className={cn('font-mono text-xs font-semibold', color || 'text-slate-300')}>{value}</span>
    </div>
  );
}

export default function AccountDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { convert, symbol } = useCurrency();
  const [dateRange, setDateRange] = useState({ from: '', to: '' });

  const dateParams = dateRange.from || dateRange.to
    ? `&from=${dateRange.from}&to=${dateRange.to}`
    : '';

  const { data, error, isLoading, mutate } = useSWR(`/api/account/${id}?_=1${dateParams}`, fetcher, {
    refreshInterval: 5000,
    revalidateOnFocus: true,
  });

  const toggleLock = useCallback(async () => {
    const current = data?.account?.manual_lock === true;
    await fetch(`/api/account/${id}/lock`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ manual_lock: !current }),
    });
    mutate();
  }, [id, data, mutate]);

  if (error) {
    return (
      <div className="p-4 text-center text-red-400">
        <p className="text-lg mb-2">Failed to load account</p>
        <Link href="/" className="text-blue-400 text-sm hover:underline">Back to Portfolio</Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <div className="bg-[#111827] rounded-xl border border-[#1e2a3a] p-4 h-40 animate-pulse" />
        <div className="bg-[#111827] rounded-xl border border-[#1e2a3a] p-4 h-[280px] animate-pulse" />
      </div>
    );
  }

  const { account, snapshot, stats, today, open_positions, recent_trades } = data;
  const isManualLocked = account.manual_lock === true;

  const dPct = DAILY_TARGET_USD > 0 ? Math.min((snapshot.daily_pnl / DAILY_TARGET_USD) * 100, 100) : 0;
  const dHit = snapshot.daily_pnl >= DAILY_TARGET_USD;
  const wPct = WEEKLY_TARGET_USD > 0 ? Math.min((snapshot.weekly_pnl / WEEKLY_TARGET_USD) * 100, 100) : 0;
  const wHit = snapshot.weekly_pnl >= WEEKLY_TARGET_USD;

  return (
    <div className="p-4 space-y-4 pb-20 md:pb-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="flex items-center justify-center w-9 h-9 rounded-lg bg-[#1a2332] hover:bg-[#243044] text-slate-400 hover:text-slate-200 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-lg text-slate-200 font-bold">{account.account_number}</span>
              {account.name && <span className="text-sm text-slate-500">{account.name}</span>}
            </div>
            <div className="flex items-center gap-3 text-[10px] text-slate-600 font-mono">
              {account.server && <span>{account.server}</span>}
              <span>Updated {timeAgoFromSeconds(snapshot.seconds_ago)}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleLock}
            className={cn(
              'flex items-center justify-center w-8 h-8 rounded-lg transition-colors',
              isManualLocked
                ? 'bg-purple-500/20 text-purple-400 hover:bg-purple-500/30'
                : 'bg-[#1a2332] text-slate-500 hover:bg-[#243044] hover:text-slate-300'
            )}
            title={isManualLocked ? 'Unlock account' : 'Lock account'}
          >
            {isManualLocked ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 9.9-1"/>
              </svg>
            )}
          </button>
          <Link
            href={`/account/${id}/edit`}
            className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#1a2332] hover:bg-[#243044] text-slate-500 hover:text-slate-300 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </Link>
          <StatusBadge
            mode={snapshot.mode}
            orders={snapshot.open_orders}
            awOrders={snapshot.aw_orders}
            secondsAgo={snapshot.seconds_ago}
          />
        </div>
      </div>

      {/* Key Metrics */}
      <div className="bg-[#111827] rounded-xl border border-[#1e2a3a] p-4">
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider">Balance</div>
            <div className="font-mono text-base sm:text-lg text-slate-100 font-bold">
              {formatMoney(convert(snapshot.balance), symbol)}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider">Equity</div>
            <div className="font-mono text-base sm:text-lg text-slate-100 font-bold">
              {formatMoney(convert(snapshot.equity), symbol)}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider">Floating</div>
            <div className={cn('font-mono text-base sm:text-lg font-bold', pnlColor(snapshot.floating_pnl))}>
              {formatPnl(convert(snapshot.floating_pnl), symbol)}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider">Daily P&L</div>
            <div className={cn('font-mono text-sm font-semibold', pnlColor(snapshot.daily_pnl))}>
              {formatPnl(convert(snapshot.daily_pnl), symbol)}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider">Weekly P&L</div>
            <div className={cn('font-mono text-sm font-semibold', pnlColor(snapshot.weekly_pnl))}>
              {formatPnl(convert(snapshot.weekly_pnl), symbol)}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider">Free Margin</div>
            <div className="font-mono text-sm text-slate-300 font-semibold">
              {formatMoney(convert(snapshot.free_margin), symbol)}
            </div>
          </div>
        </div>

        {/* Daily & Weekly Target — subtle inline */}
        <div className="space-y-1.5 mb-4">
          <div className="flex items-center gap-2">
            <span className={cn('text-[9px] uppercase shrink-0 font-mono w-16', dHit ? 'text-green-500' : 'text-slate-600')}>Daily {Math.round(dPct)}%</span>
            <div className="flex-1 h-1 bg-[#1e2a3a] rounded-full overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all duration-500', dHit ? 'bg-green-500/70' : dPct > 0 ? 'bg-slate-500/50' : 'bg-transparent')}
                style={{ width: `${Math.max(dPct, 0)}%` }}
              />
            </div>
            <span className={cn('font-mono text-[10px] shrink-0', dHit ? 'text-green-500' : 'text-slate-600')}>
              {formatPnl(convert(snapshot.daily_pnl), symbol)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className={cn('text-[9px] uppercase shrink-0 font-mono w-16', wHit ? 'text-green-500' : 'text-slate-600')}>Weekly {Math.round(wPct)}%</span>
            <div className="flex-1 h-1 bg-[#1e2a3a] rounded-full overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all duration-500', wHit ? 'bg-green-500/70' : wPct > 0 ? 'bg-slate-500/50' : 'bg-transparent')}
                style={{ width: `${Math.max(wPct, 0)}%` }}
              />
            </div>
            <span className={cn('font-mono text-[10px] shrink-0', wHit ? 'text-green-500' : 'text-slate-600')}>
              {formatPnl(convert(snapshot.weekly_pnl), symbol)}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4 pt-3 border-t border-[#1e2a3a]">
          <div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider">Orders</div>
            <div className="font-mono text-sm text-slate-300">
              {snapshot.open_orders}
              {snapshot.aw_orders > 0 && (
                <span className="text-red-400 ml-1">(AW:{snapshot.aw_orders})</span>
              )}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider">Margin Lvl</div>
            <div className="font-mono text-sm text-slate-300">
              {formatMarginLevel(snapshot.margin_level)}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider">Spread</div>
            <div className="font-mono text-sm text-slate-300">{snapshot.spread}</div>
          </div>
          <div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider">Margin</div>
            <div className="font-mono text-sm text-slate-300">
              {formatMoney(convert(snapshot.margin), symbol)}
            </div>
          </div>
        </div>
      </div>

      {/* Today's Summary */}
      <div className="bg-[#111827] rounded-xl border border-[#1e2a3a] p-4">
        <h3 className="text-sm font-semibold text-slate-300 mb-3">Today&apos;s Trading</h3>
        <div className="grid grid-cols-4 gap-4">
          <div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider">Closed</div>
            <div className="font-mono text-sm text-slate-200 font-semibold">{today.trades}</div>
          </div>
          <div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider">Wins</div>
            <div className="font-mono text-sm text-green-400 font-semibold">{today.wins}</div>
          </div>
          <div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider">Realized</div>
            <div className={cn('font-mono text-sm font-semibold', pnlColor(today.pnl))}>
              {formatPnl(convert(today.pnl), symbol)}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider">TP Today</div>
            <div className="font-mono text-sm text-slate-200 font-semibold">{snapshot.tp_today}</div>
          </div>
        </div>
      </div>

      {/* Open Positions */}
      {open_positions && (
        <PositionsTable positions={open_positions} awOrders={snapshot.aw_orders} />
      )}

      {/* Daily P&L Chart */}
      <DailyPnlChart account={id} />

      {/* Date Range Filter for Historical Data */}
      <div className="bg-[#111827] rounded-xl border border-[#1e2a3a] p-4">
        <DateRangeFilter onChange={setDateRange} />
        {(dateRange.from || dateRange.to) && (
          <div className="text-[10px] text-slate-600 font-mono mt-2">
            Showing data: {dateRange.from || 'beginning'} → {dateRange.to || 'now'}
          </div>
        )}
      </div>

      {/* Account Growth */}
      <div className="bg-[#111827] rounded-xl border border-[#1e2a3a] p-4">
        <h3 className="text-sm font-semibold text-slate-300 mb-3">Account Growth</h3>
        <div className="grid grid-cols-3 gap-4 mb-3">
          <div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider">Initial</div>
            <div className="font-mono text-sm text-slate-300 font-semibold">
              {formatMoney(convert(account.initial_deposit), symbol)}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider">Growth</div>
            <div className={cn('font-mono text-sm font-semibold', pnlColor(stats.growth))}>
              {formatPnl(convert(stats.growth), symbol)}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider">ROI</div>
            <div className={cn('font-mono text-sm font-semibold', pnlColor(stats.growth_pct))}>
              {formatPercent(stats.growth_pct)}
            </div>
          </div>
        </div>
        {/* Growth bar */}
        {account.initial_deposit > 0 && (
          <div className="w-full h-1.5 bg-[#1e2a3a] rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all duration-500', stats.growth >= 0 ? 'bg-green-500/50' : 'bg-red-500/50')}
              style={{ width: `${Math.min(Math.max(Math.abs(stats.growth_pct), 0), 100)}%` }}
            />
          </div>
        )}
      </div>

      {/* Performance Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Trade Stats */}
        <div className="bg-[#111827] rounded-xl border border-[#1e2a3a] p-4">
          <h3 className="text-sm font-semibold text-slate-300 mb-2">Trade Statistics</h3>
          <div className="divide-y divide-[#1e2a3a]">
            <StatRow label="Total Trades" value={`${stats.total_trades}`} />
            <StatRow
              label="W / L / BE"
              value={`${stats.wins} / ${stats.losses} / ${stats.breakeven}`}
            />
            <StatRow label="Win Rate" value={`${stats.win_rate}%`} color={stats.win_rate >= 50 ? 'text-green-400' : 'text-orange-400'} />
            <StatRow label="Profit Factor" value={stats.profit_factor >= 999 ? '∞' : `${stats.profit_factor}`} color={stats.profit_factor >= 1.5 ? 'text-green-400' : stats.profit_factor >= 1 ? 'text-yellow-400' : 'text-red-400'} />
            <StatRow label="Avg Profit" value={formatPnl(convert(stats.avg_profit), symbol)} color="text-green-400" />
            <StatRow label="Avg Loss" value={formatPnl(convert(stats.avg_loss), symbol)} color="text-red-400" />
            <StatRow label="Best Trade" value={formatPnl(convert(stats.best_trade), symbol)} color="text-green-400" />
            <StatRow label="Worst Trade" value={formatPnl(convert(stats.worst_trade), symbol)} color="text-red-400" />
          </div>
        </div>

        {/* P&L Breakdown */}
        <div className="bg-[#111827] rounded-xl border border-[#1e2a3a] p-4">
          <h3 className="text-sm font-semibold text-slate-300 mb-2">P&L Breakdown</h3>
          <div className="divide-y divide-[#1e2a3a]">
            <StatRow label="Total Profit" value={`${formatPnl(convert(stats.total_profit), symbol)} (${formatPercent(stats.profit_pct)})`} color={pnlColor(stats.total_profit)} />
            <StatRow label="Gross Profit" value={formatMoney(convert(stats.gross_profit), symbol)} color="text-green-400" />
            <StatRow label="Gross Loss" value={`-${formatMoney(convert(stats.gross_loss), symbol)}`} color="text-red-400" />
            <StatRow label="Total Swap" value={formatPnl(convert(stats.total_swap), symbol)} color={pnlColor(stats.total_swap)} />
            <StatRow label="Total Commission" value={formatPnl(convert(stats.total_commission), symbol)} color={pnlColor(stats.total_commission)} />
          </div>
        </div>
      </div>

      {/* Buy vs Sell Analysis */}
      <div className="bg-[#111827] rounded-xl border border-[#1e2a3a] p-4">
        <h3 className="text-sm font-semibold text-slate-300 mb-3">Buy vs Sell Analysis</h3>
        <div className="grid grid-cols-2 gap-4">
          {/* Buy side */}
          <div className="rounded-lg bg-blue-500/5 border border-blue-500/10 p-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-500/20 text-blue-400">BUY</span>
              <span className="font-mono text-xs text-slate-400">{stats.buy_count} trades</span>
            </div>
            <div className="text-[10px] text-slate-500">Win Rate</div>
            <div className={cn('font-mono text-sm font-semibold', stats.buy_win_rate >= 50 ? 'text-green-400' : 'text-orange-400')}>
              {stats.buy_win_rate}%
            </div>
            {stats.total_trades > 0 && (
              <div className="w-full h-1 bg-[#1e2a3a] rounded-full overflow-hidden mt-2">
                <div className="h-full rounded-full bg-blue-500/40" style={{ width: `${(stats.buy_count / stats.total_trades) * 100}%` }} />
              </div>
            )}
            <div className="text-[9px] font-mono text-slate-600 mt-1">
              {stats.total_trades > 0 ? Math.round((stats.buy_count / stats.total_trades) * 100) : 0}% of trades
            </div>
          </div>

          {/* Sell side */}
          <div className="rounded-lg bg-orange-500/5 border border-orange-500/10 p-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-orange-500/20 text-orange-400">SELL</span>
              <span className="font-mono text-xs text-slate-400">{stats.sell_count} trades</span>
            </div>
            <div className="text-[10px] text-slate-500">Win Rate</div>
            <div className={cn('font-mono text-sm font-semibold', stats.sell_win_rate >= 50 ? 'text-green-400' : 'text-orange-400')}>
              {stats.sell_win_rate}%
            </div>
            {stats.total_trades > 0 && (
              <div className="w-full h-1 bg-[#1e2a3a] rounded-full overflow-hidden mt-2">
                <div className="h-full rounded-full bg-orange-500/40" style={{ width: `${(stats.sell_count / stats.total_trades) * 100}%` }} />
              </div>
            )}
            <div className="text-[9px] font-mono text-slate-600 mt-1">
              {stats.total_trades > 0 ? Math.round((stats.sell_count / stats.total_trades) * 100) : 0}% of trades
            </div>
          </div>
        </div>
      </div>

      {/* Lot Sizing */}
      <div className="bg-[#111827] rounded-xl border border-[#1e2a3a] p-4">
        <h3 className="text-sm font-semibold text-slate-300 mb-2">Lot Sizing</h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider">Total Lots</div>
            <div className="font-mono text-sm text-slate-200 font-semibold">{stats.total_lots}</div>
          </div>
          <div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider">Avg Lot</div>
            <div className="font-mono text-sm text-slate-200 font-semibold">{stats.avg_lots}</div>
          </div>
          <div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider">Max Lot</div>
            <div className="font-mono text-sm text-slate-200 font-semibold">{stats.max_lots}</div>
          </div>
        </div>
      </div>

      {/* Recent Trades */}
      <div className="bg-[#111827] rounded-xl border border-[#1e2a3a] p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-300">
            {dateRange.from || dateRange.to ? 'Filtered Trades' : 'Recent Trades'}
            {dateRange.from || dateRange.to ? ` (${recent_trades?.length || 0})` : ''}
          </h3>
          <Link href={`/trades?account=${id}`} className="text-xs text-blue-400 hover:underline">
            View All →
          </Link>
        </div>
        {recent_trades && recent_trades.length > 0 ? (
          <div className="divide-y divide-[#1e2a3a]">
            {recent_trades.map((trade: any) => (
              <TradeRow key={trade.ticket} trade={trade} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500 text-center py-4">No trades yet</p>
        )}
      </div>
    </div>
  );
}
