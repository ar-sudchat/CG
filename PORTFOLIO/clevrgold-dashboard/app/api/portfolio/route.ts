import { NextResponse } from 'next/server';
import sql, { MT4_TZ } from '@/lib/db';
import { getSessionAndAccounts } from '@/lib/auth';
import { computeAllLockStatuses, findStaleOverrides } from '@/lib/lock';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const auth = await getSessionAndAccounts();
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const rows = auth.accountFilter === null
      ? await sql`
        SELECT
          a.account_number, a.name, a.owner, a.initial_deposit, a.avatar_url, a.avatar_text, a.ea_strategy, a.pair_group, a.manual_lock,
          s.balance, s.equity, s.floating_pnl, s.margin, s.free_margin,
          s.margin_level, s.daily_pnl, s.weekly_pnl,
          s.open_orders, s.aw_orders, s.mode, s.tp_today, s.spread, s.updated_at,
          EXTRACT(EPOCH FROM (NOW() - s.updated_at)) as seconds_ago
        FROM accounts a
        LEFT JOIN snapshots s ON a.account_number = s.account_number
        WHERE a.is_active = TRUE
        ORDER BY a.account_number
      `
      : await sql`
        SELECT
          a.account_number, a.name, a.owner, a.initial_deposit, a.avatar_url, a.avatar_text, a.ea_strategy, a.pair_group, a.manual_lock,
          s.balance, s.equity, s.floating_pnl, s.margin, s.free_margin,
          s.margin_level, s.daily_pnl, s.weekly_pnl,
          s.open_orders, s.aw_orders, s.mode, s.tp_today, s.spread, s.updated_at,
          EXTRACT(EPOCH FROM (NOW() - s.updated_at)) as seconds_ago
        FROM accounts a
        LEFT JOIN snapshots s ON a.account_number = s.account_number
        WHERE a.is_active = TRUE
          AND a.account_number = ANY(${auth.accountFilter})
        ORDER BY a.account_number
      `;

    // Calculate daily, weekly & monthly P&L from trades table
    // close_time is stored as MT4 server time (timestamp without timezone)
    // So we compare directly — no AT TIME ZONE on close_time
    const tradesPnl = await sql`
      SELECT
        account_number,
        COALESCE(SUM(CASE
          WHEN close_time::date = (NOW() AT TIME ZONE ${MT4_TZ})::date
          THEN profit + COALESCE(swap, 0) + COALESCE(commission, 0) ELSE 0 END), 0) as today_pnl,
        COALESCE(SUM(CASE
          WHEN close_time >= date_trunc('week', NOW() AT TIME ZONE ${MT4_TZ})
          THEN profit + COALESCE(swap, 0) + COALESCE(commission, 0) ELSE 0 END), 0) as week_pnl,
        COALESCE(SUM(profit + COALESCE(swap, 0) + COALESCE(commission, 0)), 0) as month_pnl
      FROM trades
      WHERE close_time >= date_trunc('month', NOW() AT TIME ZONE ${MT4_TZ})
      GROUP BY account_number
    `;

    // Build lookup map: account_number → { today_pnl, week_pnl }
    const tradesMap = new Map<string, { today: number; week: number; month: number }>();
    for (const t of tradesPnl) {
      tradesMap.set(String(t.account_number), {
        today: Number(t.today_pnl) || 0,
        week: Number(t.week_pnl) || 0,
        month: Number(t.month_pnl) || 0,
      });
    }

    // Open positions summary: buy/sell count & lots per account
    const openPos = await sql`
      SELECT account_number, type,
             COUNT(*)::int as cnt,
             SUM(lots) as total_lots
      FROM open_positions
      GROUP BY account_number, type
    `;
    const posMap = new Map<string, { buy_orders: number; buy_lots: number; sell_orders: number; sell_lots: number }>();
    for (const p of openPos) {
      const key = String(p.account_number);
      if (!posMap.has(key)) posMap.set(key, { buy_orders: 0, buy_lots: 0, sell_orders: 0, sell_lots: 0 });
      const entry = posMap.get(key)!;
      if (p.type === 'BUY') {
        entry.buy_orders = Number(p.cnt) || 0;
        entry.buy_lots = Number(p.total_lots) || 0;
      } else if (p.type === 'SELL') {
        entry.sell_orders = Number(p.cnt) || 0;
        entry.sell_lots = Number(p.total_lots) || 0;
      }
    }

    // Current MT4 date — used to check if snapshot daily_pnl is from today
    const todayMT4 = new Date().toLocaleDateString('sv-SE', { timeZone: MT4_TZ });
    // Weekend check — snapshot daily_pnl is stale on Sat/Sun
    const todayDow = new Date(todayMT4 + 'T12:00:00Z').getUTCDay();
    const isWeekend = todayDow === 0 || todayDow === 6;

    let totalBalance = 0;
    let totalEquity = 0;
    let totalFloating = 0;
    let totalDaily = 0;
    let totalWeekly = 0;
    let totalMonthly = 0;
    let totalOrders = 0;
    let awActive = 0;

    const accounts = rows.map((r) => {
      const balance = Number(r.balance) || 0;
      const equity = Number(r.equity) || 0;
      const floating = Number(r.floating_pnl) || 0;
      const snapshotWeekly = Number(r.weekly_pnl) || 0;
      const orders = Number(r.open_orders) || 0;
      const aw = Number(r.aw_orders) || 0;

      // Only use snapshot daily_pnl if it was updated on today's MT4 date
      // Otherwise it's stale data from a previous trading day
      // On weekends, daily_pnl is always 0 (market closed, snapshot is stale from Friday)
      const snapshotMT4Date = r.updated_at
        ? new Date(r.updated_at).toLocaleDateString('sv-SE', { timeZone: MT4_TZ })
        : null;
      const snapshotDaily = (!isWeekend && snapshotMT4Date === todayMT4) ? (Number(r.daily_pnl) || 0) : 0;

      // Use whichever is higher: snapshot P&L or trades-based P&L + floating
      const tp = tradesMap.get(String(r.account_number));
      const tradesDailyPnl = isWeekend ? 0 : (tp?.today || 0) + floating;
      const tradesWeeklyPnl = (tp?.week || 0) + floating;
      const tradesMonthlyPnl = (tp?.month || 0) + floating;

      const daily = Math.abs(tradesDailyPnl) > Math.abs(snapshotDaily) ? tradesDailyPnl : snapshotDaily;
      const weekly = Math.abs(tradesWeeklyPnl) > Math.abs(snapshotWeekly) ? tradesWeeklyPnl : snapshotWeekly;
      const monthly = tradesMonthlyPnl;

      totalBalance += balance;
      totalEquity += equity;
      totalFloating += floating;
      totalDaily += daily;
      totalWeekly += weekly;
      totalMonthly += monthly;
      totalOrders += orders;
      if (aw > 0) awActive++;

      const pos = posMap.get(String(r.account_number));

      return {
        account_number: r.account_number,
        name: r.name,
        owner: r.owner || '',
        avatar_url: r.avatar_url || null,
        avatar_text: r.avatar_text || '',
        ea_strategy: r.ea_strategy || '',
        pair_group: r.pair_group || '',
        manual_lock: r.manual_lock === true ? true : r.manual_lock === false ? false : null,
        initial_deposit: Number(r.initial_deposit) || 0,
        balance,
        equity,
        floating_pnl: floating,
        daily_pnl: daily,
        weekly_pnl: weekly,
        monthly_pnl: monthly,
        open_orders: orders,
        aw_orders: aw,
        buy_orders: pos?.buy_orders || 0,
        buy_lots: pos?.buy_lots || 0,
        sell_orders: pos?.sell_orders || 0,
        sell_lots: pos?.sell_lots || 0,
        mode: r.mode || 'OK',
        margin_level: Number(r.margin_level) || 0,
        spread: Number(r.spread) || 0,
        tp_today: Number(r.tp_today) || 0,
        updated_at: r.updated_at,
        seconds_ago: Math.round(Number(r.seconds_ago) || 0),
        is_offline: (Number(r.seconds_ago) || 999999) > 300,
      };
    });

    // Reset stale overrides (manual_lock=false where AW already cleared)
    const staleIds = findStaleOverrides(accounts);
    if (staleIds.length > 0) {
      void sql`UPDATE accounts SET manual_lock = NULL WHERE account_number = ANY(${staleIds})`;
      for (const acc of accounts) {
        if (staleIds.includes(acc.account_number)) acc.manual_lock = null;
      }
    }

    // Compute lock status for all accounts
    const lockMap = computeAllLockStatuses(accounts);
    const accountsWithLock = accounts.map((a) => {
      const lock = lockMap.get(a.account_number);
      return {
        ...a,
        is_locked: lock?.is_locked ?? false,
        lock_reason: lock?.lock_reason ?? null,
        locked_by: lock?.locked_by ?? null,
      };
    });

    // Unique owners list for filter
    const owners = Array.from(new Set(accounts.map((a) => a.owner).filter(Boolean))).sort();
    const lockedCount = accountsWithLock.filter((a) => a.is_locked).length;

    return NextResponse.json({
      total_balance: totalBalance,
      total_equity: totalEquity,
      total_floating: totalFloating,
      total_daily: totalDaily,
      total_weekly: totalWeekly,
      total_monthly: totalMonthly,
      total_orders: totalOrders,
      aw_active: awActive,
      locked_count: lockedCount,
      account_count: accounts.length,
      is_weekend: isWeekend,
      owners,
      accounts: accountsWithLock,
    }, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
    });
  } catch (error) {
    console.error('Portfolio API error:', error);
    return NextResponse.json({ error: 'Failed to fetch portfolio data' }, { status: 500 });
  }
}
