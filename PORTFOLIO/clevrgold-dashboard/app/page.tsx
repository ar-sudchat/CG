'use client';

import { useState, useMemo } from 'react';
import useSWR from 'swr';
import { cn, formatMoney, formatPnl, pnlColor } from '@/lib/utils';
import { useCurrency } from '@/lib/currency';
import PortfolioSummary from '@/components/PortfolioSummary';
import AccountCard from '@/components/AccountCard';
import ChartSection from '@/components/ChartSection';
import DateRangeFilter from '@/components/DateRangeFilter';
import PullToRefresh from '@/components/PullToRefresh';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function PortfolioPage() {
  const [selectedOwner, setSelectedOwner] = useState<string>('all');
  const [orderFilter, setOrderFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const { convert, symbol } = useCurrency();

  const handleToggleLock = async (accountNumber: number, lock: boolean) => {
    await fetch(`/api/account/${accountNumber}/lock`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ manual_lock: lock }),
    });
    mutate();
  };

  const { data, error, isLoading, mutate } = useSWR('/api/portfolio', fetcher, {
    refreshInterval: 5000,
    revalidateOnFocus: true,
    errorRetryCount: 5,
    errorRetryInterval: 3000,
    shouldRetryOnError: true,
    keepPreviousData: true,
  });

  // Portfolio stats with date filter
  const dateParams = dateRange.from || dateRange.to
    ? `?from=${dateRange.from}&to=${dateRange.to}`
    : '';
  const { data: statsData } = useSWR(
    dateParams ? `/api/portfolio-stats${dateParams}` : null,
    fetcher
  );

  // Filter accounts by owner + order status
  const filtered = useMemo(() => {
    if (!data?.accounts) return { accounts: [], totals: null };
    let accounts = selectedOwner === 'all'
      ? data.accounts
      : data.accounts.filter((a: any) => a.owner === selectedOwner);

    // Order status filter
    if (orderFilter === 'orders') {
      accounts = accounts.filter((a: any) => (a.open_orders + a.aw_orders) > 0);
    } else if (orderFilter === 'profit') {
      accounts = accounts.filter((a: any) => (a.open_orders + a.aw_orders) > 0 && a.floating_pnl >= 0);
    } else if (orderFilter === 'loss') {
      accounts = accounts.filter((a: any) => (a.open_orders + a.aw_orders) > 0 && a.floating_pnl < 0);
    } else if (orderFilter === 'idle') {
      accounts = accounts.filter((a: any) => (a.open_orders + a.aw_orders) === 0);
    }

    let totalBalance = 0, totalEquity = 0, totalFloating = 0;
    let totalDaily = 0, totalWeekly = 0, totalMonthly = 0, totalOrders = 0, awActive = 0;
    for (const a of accounts) {
      totalBalance += a.balance;
      totalEquity += a.equity;
      totalFloating += a.floating_pnl;
      totalDaily += a.daily_pnl;
      totalWeekly += a.weekly_pnl;
      totalMonthly += a.monthly_pnl || 0;
      totalOrders += a.open_orders + a.aw_orders;
      if (a.aw_orders > 0) awActive++;
    }
    return {
      accounts,
      totals: { totalBalance, totalEquity, totalFloating, totalDaily, totalWeekly, totalMonthly, totalOrders, awActive, count: accounts.length },
    };
  }, [data, selectedOwner, orderFilter]);

  if (error && !data) {
    return (
      <div className="p-4 text-center text-red-400">
        <p className="text-lg mb-2">Failed to load portfolio data</p>
        <p className="text-sm text-[var(--text-secondary)]">Check your database connection</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-3 h-16 animate-pulse" />
            ))}
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-3 h-20 animate-pulse" />
            ))}
          </div>
        </div>
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-4 h-[280px] animate-pulse" />
      </div>
    );
  }

  const owners: string[] = data.owners || [];
  const t = filtered.totals;

  return (
    <PullToRefresh onRefresh={() => mutate()}>
    <div className="p-4 space-y-5 pb-20 md:pb-4">
      {/* Filters — collapsible on mobile, always visible on md+ */}
      {(() => {
        const hasActiveFilter = selectedOwner !== 'all' || orderFilter !== 'all';
        const activeLabel = [
          selectedOwner !== 'all' ? selectedOwner : '',
          orderFilter !== 'all' ? orderFilter : '',
        ].filter(Boolean).join(' · ');

        return (
          <div>
            {/* Mobile toggle button */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                'md:hidden flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-mono transition-colors border',
                hasActiveFilter
                  ? 'bg-[#eab308]/10 text-[#eab308] border-[#eab308]/30'
                  : 'text-[var(--text-secondary)] border-[var(--border)]'
              )}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
              </svg>
              Filter{activeLabel ? `: ${activeLabel}` : ''}
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={cn('transition-transform', showFilters && 'rotate-180')}>
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {/* Filter content — hidden on mobile unless toggled, always visible on md+ */}
            <div className={cn(
              'flex items-center gap-2 flex-wrap mt-2',
              showFilters ? 'flex' : 'hidden md:flex',
            )}>
              {/* Owner Filter */}
              {owners.length > 1 && (<>
                <span className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider">Filter</span>
                <button
                  onClick={() => setSelectedOwner('all')}
                  className={cn(
                    'px-3 py-1 text-xs font-mono rounded-full transition-colors',
                    selectedOwner === 'all'
                      ? 'bg-[#eab308]/20 text-[#eab308] border border-[#eab308]/30'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-body)] border border-[var(--border)]'
                  )}
                >
                  All
                </button>
                {owners.map((owner) => (
                  <button
                    key={owner}
                    onClick={() => setSelectedOwner(owner)}
                    className={cn(
                      'px-3 py-1 text-xs font-mono rounded-full transition-colors',
                      selectedOwner === owner
                        ? 'bg-[#eab308]/20 text-[#eab308] border border-[#eab308]/30'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-body)] border border-[var(--border)]'
                    )}
                  >
                    {owner}
                  </button>
                ))}
                <span className="text-[var(--border)] mx-1">|</span>
              </>)}

              {/* Order Status Filter */}
              <span className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider">Status</span>
              {([
                { key: 'all', label: 'All' },
                { key: 'orders', label: 'Has Orders' },
                { key: 'profit', label: 'Profit' },
                { key: 'loss', label: 'Loss' },
                { key: 'idle', label: 'Idle' },
              ] as const).map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setOrderFilter(key)}
                  className={cn(
                    'px-3 py-1 text-xs font-mono rounded-full transition-colors',
                    orderFilter === key
                      ? (key === 'profit' ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                        : key === 'loss' ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                        : 'bg-[#eab308]/20 text-[#eab308] border border-[#eab308]/30')
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-body)] border border-[var(--border)]'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Section: Portfolio Summary */}
      {t && (
        <div>
          <h2 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">
            {selectedOwner === 'all' ? 'Portfolio Summary' : selectedOwner}
          </h2>
          <PortfolioSummary
            totalBalance={t.totalBalance}
            totalEquity={t.totalEquity}
            totalFloating={t.totalFloating}
            totalDaily={t.totalDaily}
            totalWeekly={t.totalWeekly}
            totalMonthly={t.totalMonthly}
            accountCount={t.count}
            awActive={t.awActive}
            totalOrders={t.totalOrders}
          />
        </div>
      )}

      {/* Section: Accounts — grouped by owner, paired within group */}
      {(() => {
        const accounts = filtered.accounts;
        const showGrouped = selectedOwner === 'all' && owners.length > 1;

        // Grid cols based on item count
        const gridCols = (count: number) => {
          if (count <= 1) return 'grid-cols-1';
          if (count === 2) return 'grid-cols-1 md:grid-cols-2';
          if (count === 3) return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';
          return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';
        };

        // Render accounts with pair grouping
        const renderAccounts = (accs: any[]) => {
          // Separate paired and unpaired
          const paired: Record<string, any[]> = {};
          const unpaired: any[] = [];
          for (const a of accs) {
            if (a.pair_group) {
              if (!paired[a.pair_group]) paired[a.pair_group] = [];
              paired[a.pair_group].push(a);
            } else {
              unpaired.push(a);
            }
          }
          const pairKeys = Object.keys(paired).sort();
          const hasPairs = pairKeys.length > 0;

          // Sort each pair: trend first, counter second
          for (const pg of pairKeys) {
            paired[pg].sort((a: any, b: any) => {
              if (a.ea_strategy === 'trend') return -1;
              if (b.ea_strategy === 'trend') return 1;
              return 0;
            });
          }

          return (
            <div className="space-y-3">
              {/* Pairs in one row, each pair visually separated */}
              {hasPairs && (
                <div className={cn('grid gap-4', pairKeys.length === 1 ? 'grid-cols-1' : 'grid-cols-1 xl:grid-cols-2')}>
                  {pairKeys.map((pg) => {
                    const pair = paired[pg];
                    const pf = pair.reduce((s: number, a: any) => s + a.floating_pnl, 0);
                    const pd = pair.reduce((s: number, a: any) => s + a.daily_pnl, 0);
                    const po = pair.reduce((s: number, a: any) => s + a.open_orders + a.aw_orders, 0);
                    const aw = pair.some((a: any) => a.aw_orders > 0);
                    return (
                      <div key={pg}>
                        {/* Pair label + Net PnL */}
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#6366f1]/15 text-[#818cf8] border border-[#6366f1]/25">
                            {pg}
                          </span>
                          <div className="flex-1 h-px bg-[var(--border)]" />
                          {po > 0 ? (
                            <span className={cn(
                              'text-[10px] font-mono font-semibold',
                              aw ? 'text-red-400' : pf >= 0 ? 'text-green-400' : 'text-red-400'
                            )}>
                              {aw && 'AW '}Net: {pf >= 0 ? '+' : ''}{formatPnl(convert(pf), symbol)}
                            </span>
                          ) : (
                            <span className="text-[10px] font-mono text-[var(--text-dim)]">
                              Day: {pd >= 0 ? '+' : ''}{formatPnl(convert(pd), symbol)}
                            </span>
                          )}
                        </div>
                        {/* Cards: adapt columns to pair size */}
                        <div className={cn('grid gap-3', gridCols(pair.length))}>
                          {pair.map((account: any) => (
                            <AccountCard key={account.account_number} account={account} isWeekend={data?.is_weekend} onToggleLock={handleToggleLock} />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Unpaired accounts */}
              {unpaired.length > 0 && (
                <div>
                  {hasPairs && (
                    <div className="flex items-center gap-2 mb-2 mt-2">
                      <span className="text-[10px] text-[var(--text-dim)] uppercase tracking-wider">Other</span>
                      <div className="flex-1 h-px bg-[var(--border)]" />
                    </div>
                  )}
                  <div className={cn('grid gap-3', gridCols(unpaired.length))}>
                    {unpaired.map((account: any) => (
                      <AccountCard key={account.account_number} account={account} isWeekend={data?.is_weekend} onToggleLock={handleToggleLock} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        };

        if (!showGrouped) {
          return (
            <div>
              <h2 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">
                Accounts
              </h2>
              {renderAccounts(accounts)}
            </div>
          );
        }

        // Group accounts by owner
        const grouped: Record<string, any[]> = {};
        for (const a of accounts) {
          const key = a.owner || 'Unassigned';
          if (!grouped[key]) grouped[key] = [];
          grouped[key].push(a);
        }
        const sortedOwners = Object.keys(grouped).sort((a, b) => {
          if (a === 'Unassigned') return 1;
          if (b === 'Unassigned') return -1;
          return a.localeCompare(b);
        });

        return (
          <div className="space-y-5">
            {sortedOwners.map((ownerName) => (
              <div key={ownerName}>
                <h2 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">
                  {ownerName} <span className="text-[var(--text-dim)]">({grouped[ownerName].length})</span>
                </h2>
                {renderAccounts(grouped[ownerName])}
              </div>
            ))}
          </div>
        );
      })()}

      {/* Section: Charts (Daily P&L / XAUUSD) */}
      <div>
        <ChartSection accountCount={filtered.totals?.count || data.account_count} />
      </div>

      {/* Section: Trade History with Date Filter */}
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-4">
        <h2 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">
          Trade History
        </h2>
        <DateRangeFilter onChange={setDateRange} />
        {(dateRange.from || dateRange.to) && (
          <div className="text-[10px] text-[var(--text-dim)] font-mono mt-2">
            Showing: {dateRange.from || 'beginning'} → {dateRange.to || 'now'}
          </div>
        )}
      </div>

      {/* Portfolio Trade Stats — shown when date filter is active */}
      {statsData && (
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-4">
          <h3 className="text-sm font-semibold text-[var(--text-body)] mb-3">
            Portfolio Statistics
            {dateRange.from && <span className="text-[10px] text-[var(--text-secondary)] font-normal ml-2">({dateRange.from} → {dateRange.to || 'now'})</span>}
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
            <div>
              <div className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider">Total Trades</div>
              <div className="font-mono text-lg text-[var(--text-heading)] font-bold">{statsData.total_trades}</div>
            </div>
            <div>
              <div className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider">Win Rate</div>
              <div className={cn('font-mono text-lg font-bold', statsData.win_rate >= 50 ? 'text-green-400' : 'text-orange-400')}>
                {statsData.win_rate}%
              </div>
            </div>
            <div>
              <div className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider">Net Profit</div>
              <div className={cn('font-mono text-lg font-bold', pnlColor(statsData.total_profit))}>
                {formatPnl(convert(statsData.total_profit), symbol)}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider">Profit Factor</div>
              <div className={cn('font-mono text-lg font-bold', statsData.profit_factor >= 1.5 ? 'text-green-400' : statsData.profit_factor >= 1 ? 'text-yellow-400' : 'text-red-400')}>
                {statsData.profit_factor >= 999 ? '∞' : statsData.profit_factor}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-3 border-t border-[var(--border)]">
            <div>
              <div className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider">W / L</div>
              <div className="font-mono text-sm text-[var(--text-body)]">{statsData.wins} / {statsData.losses}</div>
            </div>
            <div>
              <div className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider">Gross Profit</div>
              <div className="font-mono text-sm text-green-400">{formatMoney(convert(statsData.gross_profit), symbol)}</div>
            </div>
            <div>
              <div className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider">Gross Loss</div>
              <div className="font-mono text-sm text-red-400">-{formatMoney(convert(statsData.gross_loss), symbol)}</div>
            </div>
            <div>
              <div className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider">Total Lots</div>
              <div className="font-mono text-sm text-[var(--text-body)]">{statsData.total_lots}</div>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-3 border-t border-[var(--border)] mt-3">
            <div>
              <div className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider">Avg Profit</div>
              <div className="font-mono text-sm text-green-400">{formatPnl(convert(statsData.avg_profit), symbol)}</div>
            </div>
            <div>
              <div className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider">Avg Loss</div>
              <div className="font-mono text-sm text-red-400">{formatPnl(convert(statsData.avg_loss), symbol)}</div>
            </div>
            <div>
              <div className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider">Best Trade</div>
              <div className="font-mono text-sm text-green-400">{formatPnl(convert(statsData.best_trade), symbol)}</div>
            </div>
            <div>
              <div className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider">Worst Trade</div>
              <div className="font-mono text-sm text-red-400">{formatPnl(convert(statsData.worst_trade), symbol)}</div>
            </div>
          </div>
        </div>
      )}
    </div>
    </PullToRefresh>
  );
}
