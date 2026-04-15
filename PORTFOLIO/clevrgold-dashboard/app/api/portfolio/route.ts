import { NextResponse } from 'next/server';
import sql, { MT4_TZ, ensureInsightColumn } from '@/lib/db';
import { getSessionAndAccounts } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await ensureInsightColumn();
    const auth = await getSessionAndAccounts();
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const rows = auth.accountFilter === null
      ? await sql`
        SELECT
          a.account_number, a.name, a.owner, a.initial_deposit, a.avatar_url, a.avatar_text, a.ea_strategy, a.pair_group, a.description,
          COALESCE(a.account_type, 'standard') as account_type,
          s.balance, s.equity, s.floating_pnl, s.margin, s.free_margin,
          s.margin_level, s.daily_pnl, s.weekly_pnl,
          s.open_orders, s.aw_orders, s.mode, s.tp_today, s.spread, s.updated_at,
          s.insight,
          EXTRACT(EPOCH FROM (NOW() - s.updated_at)) as seconds_ago
        FROM accounts a
        LEFT JOIN snapshots s ON a.account_number = s.account_number
        WHERE a.is_active = TRUE
        ORDER BY a.account_number
      `
      : await sql`
        SELECT
          a.account_number, a.name, a.owner, a.initial_deposit, a.avatar_url, a.avatar_text, a.ea_strategy, a.pair_group, a.description,
          COALESCE(a.account_type, 'standard') as account_type,
          s.balance, s.equity, s.floating_pnl, s.margin, s.free_margin,
          s.margin_level, s.daily_pnl, s.weekly_pnl,
          s.open_orders, s.aw_orders, s.mode, s.tp_today, s.spread, s.updated_at,
          s.insight,
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
             SUM(lots) as total_lots,
             SUM(profit + COALESCE(commission, 0) + COALESCE(swap, 0)) as total_pnl
      FROM open_positions
      GROUP BY account_number, type
    `;
    const posMap = new Map<string, { buy_orders: number; buy_lots: number; sell_orders: number; sell_lots: number; floating: number }>();
    for (const p of openPos) {
      const key = String(p.account_number);
      if (!posMap.has(key)) posMap.set(key, { buy_orders: 0, buy_lots: 0, sell_orders: 0, sell_lots: 0, floating: 0 });
      const entry = posMap.get(key)!;
      entry.floating += Number(p.total_pnl) || 0;
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
    let totalDailyClosed = 0;
    let totalWeekly = 0;
    let totalMonthly = 0;
    let totalOrders = 0;
    let awActive = 0;

    const accounts = rows.map((r) => {
      const isCent = r.account_type === 'cent';
      const centDiv = isCent ? 100 : 1;  // Cent account: divide PnL by 100 to show in USD
      const balance = Number(r.balance) || 0;
      const equity = Number(r.equity) || 0;
      const pos = posMap.get(String(r.account_number));
      const posFloating = (pos?.floating || 0) / centDiv;
      const snapshotFloating = (Number(r.floating_pnl) || 0) / centDiv;
      // Use open_positions floating when available (includes manual orders), fall back to snapshot
      const floating = pos ? posFloating : snapshotFloating;
      const rawSnapshotWeekly = (Number(r.weekly_pnl) || 0) / centDiv;
      const rawSnapshotFloating = (Number(r.floating_pnl) || 0) / centDiv;
      const snapshotWeekly = rawSnapshotWeekly - rawSnapshotFloating + floating;
      const orders = (pos ? (pos.buy_orders + pos.sell_orders) : 0) || Number(r.open_orders) || 0;
      const aw = Number(r.aw_orders) || 0;

      const tp = tradesMap.get(String(r.account_number));
      const tradesDailyClosed = isWeekend ? 0 : ((tp?.today || 0) / centDiv);
      const tradesWeeklyPnl = ((tp?.week || 0) / centDiv) + floating;
      const tradesMonthlyPnl = ((tp?.month || 0) / centDiv) + floating;

      const daily = tradesDailyClosed;
      const weekly = Math.abs(tradesWeeklyPnl) > Math.abs(snapshotWeekly) ? tradesWeeklyPnl : snapshotWeekly;
      const monthly = tradesMonthlyPnl;

      totalBalance += balance / centDiv;
      totalEquity += equity / centDiv;
      totalFloating += floating;
      totalDaily += daily;
      totalDailyClosed += daily;
      totalWeekly += weekly;
      totalMonthly += monthly;
      totalOrders += orders;
      if (aw > 0) awActive++;

      return {
        account_number: r.account_number,
        name: r.name,
        owner: r.owner || '',
        avatar_url: r.avatar_url || null,
        avatar_text: r.avatar_text || '',
        ea_strategy: r.ea_strategy || '',
        description: r.description || '',
        pair_group: r.pair_group || '',
        account_type: r.account_type || 'standard',
        initial_deposit: (Number(r.initial_deposit) || 0) / centDiv,
        balance: balance / centDiv,
        equity: equity / centDiv,
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
        insight: r.insight || null,
      };
    });

    // Unique owners list for filter
    const owners = Array.from(new Set(accounts.map((a) => a.owner).filter(Boolean))).sort();

    // Fire-and-forget: trigger LINE alert if any stale account has open orders
    const hasStaleWithOrders = accounts.some(
      (a) => a.seconds_ago > 180 && (a.open_orders + a.aw_orders) > 0
    );
    if (hasStaleWithOrders && process.env.CRON_SECRET) {
      const baseUrl = process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : 'http://localhost:3000';
      fetch(`${baseUrl}/api/cron/server-alert`, {
        headers: { 'x-internal-key': process.env.CRON_SECRET },
      }).catch(() => {});
    }

    return NextResponse.json({
      total_balance: totalBalance,
      total_equity: totalEquity,
      total_floating: totalFloating,
      total_daily: totalDaily,
      total_daily_closed: totalDailyClosed,
      total_weekly: totalWeekly,
      total_monthly: totalMonthly,
      total_orders: totalOrders,
      aw_active: awActive,
      account_count: accounts.length,
      is_weekend: isWeekend,
      owners,
      accounts,
    }, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
    });
  } catch (error) {
    console.error('Portfolio API error:', error);
    return NextResponse.json({ error: 'Failed to fetch portfolio data' }, { status: 500 });
  }
}
