'use client';

import { useState, useMemo, useCallback } from 'react';
import useSWR from 'swr';
import { cn, formatMoney, formatPnl, pnlColor } from '@/lib/utils';
import { useCurrency } from '@/lib/currency';
import PortfolioSummary from '@/components/PortfolioSummary';
import AccountCard from '@/components/AccountCard';
import ChartSection from '@/components/ChartSection';
import DateRangeFilter from '@/components/DateRangeFilter';
import PullToRefresh from '@/components/PullToRefresh';
import ServerAlert from '@/components/ServerAlert';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function PortfolioPage() {
  const [selectedOwner, setSelectedOwner] = useState<string>('all');
  const [orderFilter, setOrderFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [editingThreshold, setEditingThreshold] = useState<string | null>(null);
  const [thresholdValue, setThresholdValue] = useState('');
  const { convert, symbol } = useCurrency();

  const { data, error, isLoading, mutate } = useSWR('/api/portfolio', fetcher, {
    refreshInterval: 5000,
    revalidateOnFocus: true,
    errorRetryCount: 5,
    errorRetryInterval: 3000,
    shouldRetryOnError: true,
    keepPreviousData: true,
  });

  const [bulkLocking, setBulkLocking] = useState(false);

  const handleToggleLock = async (accountNumber: number, lock: boolean | null) => {
    await fetch(`/api/account/${accountNumber}/lock`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ manual_lock: lock }),
    });
    mutate();
  };

  const handleBulkLock = async (lock: boolean | null) => {
    setBulkLocking(true);
    await fetch('/api/account/all/lock', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ manual_lock: lock }),
    });
    await mutate();
    setBulkLocking(false);
  };

  const handleBulkAutoLock = async (enabled: boolean) => {
    setBulkLocking(true);
    await fetch('/api/pair-groups', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pair_group: 'all', auto_lock_enabled: enabled }),
    });
    await mutate();
    setBulkLocking(false);
  };

  const handleToggleAutoLock = useCallback(async (pairGroup: string, enabled: boolean) => {
    await fetch('/api/pair-groups', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pair_group: pairGroup, auto_lock_enabled: enabled }),
    });
    mutate();
  }, [mutate]);

  const handleSetThreshold = useCallback(async (pairGroup: string, value: number) => {
    await fetch('/api/pair-groups', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pair_group: pairGroup, auto_lock_threshold: value }),
    });
    setEditingThreshold(null);
    mutate();
  }, [mutate]);

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
      {/* Server Alert — stale accounts with open orders */}
      {data?.accounts && <ServerAlert accounts={data.accounts} />}

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

      {/* Bulk Controls — above Portfolio */}
      {t && (
        <div>
          <div className="grid grid-cols-4 gap-1.5 mb-3">
            <button
              onClick={() => handleBulkAutoLock(true)}
              disabled={bulkLocking}
              className="flex items-center justify-center gap-1 py-1.5 rounded-lg text-[11px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
            >
              Auto On
            </button>
            <button
              onClick={() => handleBulkAutoLock(false)}
              disabled={bulkLocking}
              className="flex items-center justify-center gap-1 py-1.5 rounded-lg text-[11px] font-mono font-bold bg-slate-500/10 text-slate-400 border border-slate-500/20 hover:bg-slate-500/20 transition-colors disabled:opacity-50"
            >
              Auto Off
            </button>
            <button
              onClick={() => handleBulkLock(true)}
              disabled={bulkLocking}
              className="flex items-center justify-center gap-1 py-1.5 rounded-lg text-[11px] font-mono font-bold bg-red-500/15 text-red-400 border border-red-500/25 hover:bg-red-500/25 transition-colors disabled:opacity-50"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              Lock
            </button>
            <button
              onClick={() => handleBulkLock(false)}
              disabled={bulkLocking}
              className="flex items-center justify-center gap-1 py-1.5 rounded-lg text-[11px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 hover:bg-emerald-500/25 transition-colors disabled:opacity-50"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              Unlock
            </button>
          </div>
          <h2 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">
            {selectedOwner === 'all' ? 'Portfolio Summary' : selectedOwner}
          </h2>
        </div>
      )}

      {/* Section: Portfolio Summary */}
      {t && (
        <div>
          <PortfolioSummary
            totalBalance={t.totalBalance}
            totalEquity={t.totalEquity}
            totalFloating={t.totalFloating}
            totalDaily={t.totalDaily}
            totalDailyClosed={data?.total_daily_closed || 0}
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
                    const autoLockOn = pair[0]?.auto_lock_enabled !== false;
                    const threshold = pair[0]?.auto_lock_threshold ?? 3;
                    return (
                      <div key={pg}>
                        {/* Pair label + Auto-lock + Net PnL */}
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#6366f1]/15 text-[#818cf8] border border-[#6366f1]/25">
                            {pg}
                          </span>
                          {/* Auto-lock toggle */}
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              handleToggleAutoLock(pg, !autoLockOn);
                            }}
                            className={cn(
                              'flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-bold transition-colors border',
                              autoLockOn
                                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                                : 'bg-red-500/10 text-red-400/70 border-red-500/25'
                            )}
                            title={autoLockOn ? 'Auto-lock เปิด — คลิกเพื่อปิด' : 'Auto-lock ปิด — คลิกเพื่อเปิด'}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill={autoLockOn ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                            </svg>
                            {autoLockOn ? 'AUTO ON' : 'AUTO OFF'}
                          </button>
                          {/* Threshold config */}
                          {autoLockOn && (
                            editingThreshold === pg ? (
                              <form
                                className="flex items-center gap-1"
                                onSubmit={(e) => {
                                  e.preventDefault();
                                  const v = parseFloat(thresholdValue);
                                  if (!isNaN(v) && v >= 0) handleSetThreshold(pg, v);
                                }}
                              >
                                <span className="text-[11px] text-[var(--text-dim)]">$</span>
                                <input
                                  type="number"
                                  step="0.5"
                                  min="0"
                                  value={thresholdValue}
                                  onChange={(e) => setThresholdValue(e.target.value)}
                                  className="w-14 bg-[var(--bg-card)] border border-[var(--border)] rounded px-1.5 py-0.5 text-[11px] font-mono text-[var(--text-body)] focus:outline-none focus:border-emerald-500/50"
                                  autoFocus
                                />
                                <button type="submit" className="text-[11px] text-emerald-400 font-bold">OK</button>
                                <button type="button" onClick={() => setEditingThreshold(null)} className="text-[11px] text-[var(--text-dim)]">X</button>
                              </form>
                            ) : (
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  setEditingThreshold(pg);
                                  setThresholdValue(String(threshold));
                                }}
                                className="text-[11px] font-mono font-semibold text-yellow-400/80 hover:text-yellow-300 transition-colors px-1.5 py-0.5 rounded border border-yellow-500/20 bg-yellow-500/10"
                                title="คลิกเพื่อแก้ threshold"
                              >
                                -${threshold}
                              </button>
                            )
                          )}
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
