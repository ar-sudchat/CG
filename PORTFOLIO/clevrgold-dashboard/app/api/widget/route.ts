import { NextRequest, NextResponse } from 'next/server';
import sql, { MT4_TZ, ensureInsightColumn } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const key = request.headers.get('x-api-key') || request.nextUrl.searchParams.get('key');
  if (!key || key !== process.env.EA_API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const ownerFilter = request.nextUrl.searchParams.get('owner');

  try {
    await ensureInsightColumn();

    const rows = await sql`
      SELECT
        a.account_number, a.name, a.owner, a.avatar_text, a.ea_strategy, a.pair_group,
        COALESCE(a.account_type, 'standard') as account_type,
        s.balance, s.equity, s.floating_pnl,
        s.daily_pnl, s.weekly_pnl,
        s.open_orders, s.aw_orders, s.mode, s.spread,
        s.margin, s.free_margin, s.margin_level,
        EXTRACT(EPOCH FROM (NOW() - s.updated_at)) as seconds_ago
      FROM accounts a
      LEFT JOIN snapshots s ON a.account_number = s.account_number
      WHERE a.is_active = TRUE
      ORDER BY a.account_number
    `;

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

    const tradesMap = new Map<string, { today: number; week: number; month: number }>();
    for (const t of tradesPnl) {
      tradesMap.set(String(t.account_number), {
        today: Number(t.today_pnl) || 0,
        week: Number(t.week_pnl) || 0,
        month: Number(t.month_pnl) || 0,
      });
    }

    // Buy/Sell breakdown per account
    const openPos = await sql`
      SELECT account_number, type,
             COUNT(*)::int as cnt,
             SUM(lots) as total_lots
      FROM open_positions
      GROUP BY account_number, type
    `;
    const posMap = new Map<string, { buy: number; sell: number; buy_lots: number; sell_lots: number }>();
    for (const p of openPos) {
      const key = String(p.account_number);
      if (!posMap.has(key)) posMap.set(key, { buy: 0, sell: 0, buy_lots: 0, sell_lots: 0 });
      const e = posMap.get(key)!;
      if (p.type === 'BUY') { e.buy = Number(p.cnt) || 0; e.buy_lots = Number(p.total_lots) || 0; }
      else if (p.type === 'SELL') { e.sell = Number(p.cnt) || 0; e.sell_lots = Number(p.total_lots) || 0; }
    }

    const todayMT4 = new Date().toLocaleDateString('sv-SE', { timeZone: MT4_TZ });
    const todayDow = new Date(todayMT4 + 'T12:00:00Z').getUTCDay();
    const isWeekend = todayDow === 0 || todayDow === 6;

    const filteredRows = ownerFilter
      ? rows.filter((r) => r.name?.toLowerCase().includes(ownerFilter.toLowerCase()) || r.owner?.toLowerCase().includes(ownerFilter.toLowerCase()))
      : rows;

    let totalBalance = 0, totalEquity = 0, totalFloating = 0;
    let totalDaily = 0, totalWeekly = 0, totalMonthly = 0, totalOrders = 0;
    let totalMargin = 0, totalFreeMargin = 0;
    let lowestML: number | null = null;

    const accounts = filteredRows.map((r) => {
      const isCent = r.account_type === 'cent';
      const centDiv = isCent ? 100 : 1;
      const balance = (Number(r.balance) || 0) / centDiv;
      const equity = (Number(r.equity) || 0) / centDiv;
      const floating = (Number(r.floating_pnl) || 0) / centDiv;
      const orders = Number(r.open_orders) || 0;
      const aw = Number(r.aw_orders) || 0;

      const snapshotMT4Date = r.updated_at
        ? new Date(r.updated_at).toLocaleDateString('sv-SE', { timeZone: MT4_TZ })
        : null;
      const snapshotDaily = (!isWeekend && snapshotMT4Date === todayMT4)
        ? ((Number(r.daily_pnl) || 0) / centDiv) : 0;

      const tp = tradesMap.get(String(r.account_number));
      const tradesDailyPnl = isWeekend ? 0 : ((tp?.today || 0) / centDiv) + floating;
      const tradesWeeklyPnl = ((tp?.week || 0) / centDiv) + floating;
      const tradesMonthlyPnl = ((tp?.month || 0) / centDiv) + floating;

      const daily = Math.abs(tradesDailyPnl) > Math.abs(snapshotDaily) ? tradesDailyPnl : snapshotDaily;
      const weekly = tradesWeeklyPnl;
      const monthly = tradesMonthlyPnl;

      const margin = (Number(r.margin) || 0) / centDiv;
      const freeMargin = (Number(r.free_margin) || 0) / centDiv;
      const marginLevel = Number(r.margin_level) || 0;

      totalBalance += balance;
      totalEquity += equity;
      totalFloating += floating;
      totalDaily += daily;
      totalWeekly += weekly;
      totalMonthly += monthly;
      totalOrders += orders + aw;
      totalMargin += margin;
      totalFreeMargin += freeMargin;
      if (margin > 0 && marginLevel > 0) {
        if (lowestML === null || marginLevel < lowestML) lowestML = marginLevel;
      }

      const pos = posMap.get(String(r.account_number));

      return {
        account_number: r.account_number,
        name: r.name,
        avatar_text: r.avatar_text || '',
        balance, equity, floating_pnl: floating,
        daily_pnl: daily, weekly_pnl: weekly,
        open_orders: orders, aw_orders: aw,
        buy_orders: pos?.buy || 0,
        buy_lots: pos?.buy_lots || 0,
        sell_orders: pos?.sell || 0,
        sell_lots: pos?.sell_lots || 0,
        margin, free_margin: freeMargin, margin_level: marginLevel,
        mode: r.mode || 'OK',
        seconds_ago: Math.round(Number(r.seconds_ago) || 0),
      };
    });

    return NextResponse.json({
      total_balance: totalBalance,
      total_equity: totalEquity,
      total_floating: totalFloating,
      total_daily: totalDaily,
      total_weekly: totalWeekly,
      total_monthly: totalMonthly,
      total_orders: totalOrders,
      total_margin: totalMargin,
      total_free_margin: totalFreeMargin,
      lowest_margin_level: lowestML,
      account_count: accounts.length,
      is_weekend: isWeekend,
      accounts,
    }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    console.error('Widget API error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
