import { NextRequest, NextResponse } from 'next/server';
import sql, { MT4_TZ } from '@/lib/db';
import { getSessionAndAccounts } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await getSessionAndAccounts();
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const accountNumber = parseInt(params.id);
    if (isNaN(accountNumber)) {
      return NextResponse.json({ error: 'Invalid account number' }, { status: 400 });
    }

    // Check access
    if (auth.accountFilter !== null && !auth.accountFilter.includes(accountNumber)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Date range filter
    const { searchParams } = new URL(request.url);
    const fromDate = searchParams.get('from') || '';
    const toDate = searchParams.get('to') || '';
    const hasDateFilter = fromDate || toDate;

    // Get account + snapshot
    const accountRows = await sql`
      SELECT
        a.account_number, a.name, a.owner, a.initial_deposit, a.server, a.is_active,
        a.avatar_url, a.avatar_text, a.ea_strategy, a.pair_group, COALESCE(a.manual_lock, FALSE) as manual_lock, a.description, a.broker, a.leverage, a.account_type, a.currency, a.notes,
        s.balance, s.equity, s.floating_pnl, s.margin, s.free_margin,
        s.margin_level, s.daily_pnl, s.weekly_pnl,
        s.open_orders, s.aw_orders, s.mode, s.tp_today, s.spread, s.updated_at,
        EXTRACT(EPOCH FROM (NOW() - s.updated_at)) as seconds_ago
      FROM accounts a
      LEFT JOIN snapshots s ON a.account_number = s.account_number
      WHERE a.account_number = ${accountNumber}
    `;

    if (accountRows.length === 0) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    const r = accountRows[0];

    // Get stats (filtered by date range if provided)
    const statsRows = hasDateFilter
      ? await sql`
        SELECT
          COUNT(*) as total_trades,
          COUNT(CASE WHEN profit > 0 THEN 1 END) as wins,
          COUNT(CASE WHEN profit < 0 THEN 1 END) as losses,
          COUNT(CASE WHEN profit = 0 THEN 1 END) as breakeven,
          ROUND(COUNT(CASE WHEN profit > 0 THEN 1 END)::numeric / NULLIF(COUNT(*), 0) * 100, 1) as win_rate,
          ROUND(AVG(CASE WHEN profit > 0 THEN profit END)::numeric, 2) as avg_profit,
          ROUND(AVG(CASE WHEN profit < 0 THEN profit END)::numeric, 2) as avg_loss,
          ROUND(SUM(profit + COALESCE(swap, 0) + COALESCE(commission, 0))::numeric, 2) as total_profit,
          ROUND(MAX(profit + COALESCE(swap, 0) + COALESCE(commission, 0))::numeric, 2) as best_trade,
          ROUND(MIN(profit + COALESCE(swap, 0) + COALESCE(commission, 0))::numeric, 2) as worst_trade,
          ROUND(SUM(CASE WHEN profit > 0 THEN profit + COALESCE(swap, 0) + COALESCE(commission, 0) ELSE 0 END)::numeric, 2) as gross_profit,
          ROUND(ABS(SUM(CASE WHEN profit < 0 THEN profit + COALESCE(swap, 0) + COALESCE(commission, 0) ELSE 0 END))::numeric, 2) as gross_loss,
          ROUND(SUM(lots)::numeric, 2) as total_lots,
          ROUND(AVG(lots)::numeric, 3) as avg_lots,
          ROUND(MAX(lots)::numeric, 2) as max_lots,
          COUNT(CASE WHEN type = 'BUY' THEN 1 END) as buy_count,
          COUNT(CASE WHEN type = 'SELL' THEN 1 END) as sell_count,
          COUNT(CASE WHEN type = 'BUY' AND profit > 0 THEN 1 END) as buy_wins,
          COUNT(CASE WHEN type = 'SELL' AND profit > 0 THEN 1 END) as sell_wins,
          ROUND(SUM(COALESCE(swap, 0))::numeric, 2) as total_swap,
          ROUND(SUM(COALESCE(commission, 0))::numeric, 2) as total_commission
        FROM trades
        WHERE account_number = ${accountNumber}
          AND (${fromDate} = '' OR close_time >= ${fromDate}::date)
          AND (${toDate} = '' OR close_time < (${toDate}::date + interval '1 day'))
      `
      : await sql`
        SELECT
          COUNT(*) as total_trades,
          COUNT(CASE WHEN profit > 0 THEN 1 END) as wins,
          COUNT(CASE WHEN profit < 0 THEN 1 END) as losses,
          COUNT(CASE WHEN profit = 0 THEN 1 END) as breakeven,
          ROUND(COUNT(CASE WHEN profit > 0 THEN 1 END)::numeric / NULLIF(COUNT(*), 0) * 100, 1) as win_rate,
          ROUND(AVG(CASE WHEN profit > 0 THEN profit END)::numeric, 2) as avg_profit,
          ROUND(AVG(CASE WHEN profit < 0 THEN profit END)::numeric, 2) as avg_loss,
          ROUND(SUM(profit + COALESCE(swap, 0) + COALESCE(commission, 0))::numeric, 2) as total_profit,
          ROUND(MAX(profit + COALESCE(swap, 0) + COALESCE(commission, 0))::numeric, 2) as best_trade,
          ROUND(MIN(profit + COALESCE(swap, 0) + COALESCE(commission, 0))::numeric, 2) as worst_trade,
          ROUND(SUM(CASE WHEN profit > 0 THEN profit + COALESCE(swap, 0) + COALESCE(commission, 0) ELSE 0 END)::numeric, 2) as gross_profit,
          ROUND(ABS(SUM(CASE WHEN profit < 0 THEN profit + COALESCE(swap, 0) + COALESCE(commission, 0) ELSE 0 END))::numeric, 2) as gross_loss,
          ROUND(SUM(lots)::numeric, 2) as total_lots,
          ROUND(AVG(lots)::numeric, 3) as avg_lots,
          ROUND(MAX(lots)::numeric, 2) as max_lots,
          COUNT(CASE WHEN type = 'BUY' THEN 1 END) as buy_count,
          COUNT(CASE WHEN type = 'SELL' THEN 1 END) as sell_count,
          COUNT(CASE WHEN type = 'BUY' AND profit > 0 THEN 1 END) as buy_wins,
          COUNT(CASE WHEN type = 'SELL' AND profit > 0 THEN 1 END) as sell_wins,
          ROUND(SUM(COALESCE(swap, 0))::numeric, 2) as total_swap,
          ROUND(SUM(COALESCE(commission, 0))::numeric, 2) as total_commission
        FROM trades
        WHERE account_number = ${accountNumber}
      `;

    // Get today's trades (Bangkok timezone)
    const todayRows = await sql`
      SELECT
        COUNT(*) as today_trades,
        ROUND(COALESCE(SUM(profit + COALESCE(swap, 0) + COALESCE(commission, 0)), 0)::numeric, 2) as today_pnl,
        COUNT(CASE WHEN profit > 0 THEN 1 END) as today_wins
      FROM trades
      WHERE account_number = ${accountNumber}
        AND (close_time AT TIME ZONE ${MT4_TZ} AT TIME ZONE 'Asia/Bangkok')::date = (NOW() AT TIME ZONE 'Asia/Bangkok')::date
    `;

    // Calculate daily & weekly P&L from trades (Bangkok timezone) as fallback
    const tradesPnlRows = await sql`
      SELECT
        COALESCE(SUM(CASE
          WHEN (close_time AT TIME ZONE ${MT4_TZ} AT TIME ZONE 'Asia/Bangkok')::date = (NOW() AT TIME ZONE 'Asia/Bangkok')::date
          THEN profit + COALESCE(swap, 0) + COALESCE(commission, 0) ELSE 0 END), 0) as today_pnl,
        COALESCE(SUM(profit + COALESCE(swap, 0) + COALESCE(commission, 0)), 0) as week_pnl
      FROM trades
      WHERE account_number = ${accountNumber}
        AND close_time >= date_trunc('week', NOW() AT TIME ZONE 'Asia/Bangkok') AT TIME ZONE 'Asia/Bangkok' AT TIME ZONE ${MT4_TZ}
    `;

    // Get open positions
    const openPositions = await sql`
      SELECT ticket, type, lots, symbol, open_price, current_price,
             sl, tp, commission, swap, profit,
             open_time AT TIME ZONE ${MT4_TZ} as open_time,
             magic_number, comment
      FROM open_positions
      WHERE account_number = ${accountNumber}
      ORDER BY open_time ASC
    `;

    // Get recent trades (filtered by date range if provided)
    const recentTrades = hasDateFilter
      ? await sql`
        SELECT ticket, type, lots, open_price, close_price,
               profit, swap, commission,
               open_time AT TIME ZONE ${MT4_TZ} as open_time,
               close_time AT TIME ZONE ${MT4_TZ} as close_time,
               magic_number, comment
        FROM trades
        WHERE account_number = ${accountNumber}
          AND (${fromDate} = '' OR close_time >= ${fromDate}::date)
          AND (${toDate} = '' OR close_time < (${toDate}::date + interval '1 day'))
        ORDER BY close_time DESC
        LIMIT 100
      `
      : await sql`
        SELECT ticket, type, lots, open_price, close_price,
               profit, swap, commission,
               open_time AT TIME ZONE ${MT4_TZ} as open_time,
               close_time AT TIME ZONE ${MT4_TZ} as close_time,
               magic_number, comment
        FROM trades
        WHERE account_number = ${accountNumber}
        ORDER BY close_time DESC
        LIMIT 20
      `;

    const stats = statsRows[0];
    const today = todayRows[0];
    const tpnl = tradesPnlRows[0];
    const initialDeposit = Number(r.initial_deposit) || 0;
    const totalProfit = Number(stats.total_profit) || 0;
    const profitPct = initialDeposit > 0 ? (totalProfit / initialDeposit) * 100 : 0;
    const grossProfit = Number(stats.gross_profit) || 0;
    const grossLoss = Number(stats.gross_loss) || 0;
    const profitFactor = grossLoss > 0 ? Math.round((grossProfit / grossLoss) * 100) / 100 : grossProfit > 0 ? 999 : 0;
    const buyCount = Number(stats.buy_count) || 0;
    const sellCount = Number(stats.sell_count) || 0;
    const buyWinRate = buyCount > 0 ? Math.round((Number(stats.buy_wins) / buyCount) * 1000) / 10 : 0;
    const sellWinRate = sellCount > 0 ? Math.round((Number(stats.sell_wins) / sellCount) * 1000) / 10 : 0;

    // Drawdown: how much equity has dropped from the "peak" (initial + total profit)
    const balance = Number(r.balance) || 0;
    const equity = Number(r.equity) || 0;
    const floating = Number(r.floating_pnl) || 0;

    // Supplement daily/weekly with trades data when snapshot is 0 (MT4 server day rollover)
    const snapshotDaily = Number(r.daily_pnl) || 0;
    const snapshotWeekly = Number(r.weekly_pnl) || 0;
    const tradesDailyPnl = (Number(tpnl?.today_pnl) || 0) + floating;
    const tradesWeeklyPnl = (Number(tpnl?.week_pnl) || 0) + floating;
    const effectiveDaily = Math.abs(tradesDailyPnl) > Math.abs(snapshotDaily) ? tradesDailyPnl : snapshotDaily;
    const effectiveWeekly = Math.abs(tradesWeeklyPnl) > Math.abs(snapshotWeekly) ? tradesWeeklyPnl : snapshotWeekly;
    const growth = balance - initialDeposit;
    const growthPct = initialDeposit > 0 ? Math.round((growth / initialDeposit) * 1000) / 10 : 0;

    return NextResponse.json({
      account: {
        account_number: r.account_number,
        name: r.name,
        owner: r.owner || '',
        server: r.server,
        initial_deposit: initialDeposit,
        is_active: r.is_active,
        avatar_url: r.avatar_url || null,
        avatar_text: r.avatar_text || '',
        ea_strategy: r.ea_strategy || '',
        pair_group: r.pair_group || '',
        manual_lock: r.manual_lock === true,
        description: r.description || '',
        broker: r.broker || '',
        leverage: r.leverage || '',
        account_type: r.account_type || '',
        currency: r.currency || 'USD',
        notes: r.notes || '',
      },
      snapshot: {
        balance,
        equity,
        floating_pnl: Number(r.floating_pnl) || 0,
        margin: Number(r.margin) || 0,
        free_margin: Number(r.free_margin) || 0,
        margin_level: Number(r.margin_level) || 0,
        daily_pnl: effectiveDaily,
        weekly_pnl: effectiveWeekly,
        open_orders: Number(r.open_orders) || 0,
        aw_orders: Number(r.aw_orders) || 0,
        mode: r.mode || 'OK',
        tp_today: Number(r.tp_today) || 0,
        spread: Number(r.spread) || 0,
        updated_at: r.updated_at,
        seconds_ago: Math.round(Number(r.seconds_ago) || 0),
        is_offline: (Number(r.seconds_ago) || 999999) > 300,
      },
      stats: {
        total_profit: totalProfit,
        profit_pct: Math.round(profitPct * 10) / 10,
        total_trades: Number(stats.total_trades) || 0,
        wins: Number(stats.wins) || 0,
        losses: Number(stats.losses) || 0,
        breakeven: Number(stats.breakeven) || 0,
        win_rate: Number(stats.win_rate) || 0,
        avg_profit: Number(stats.avg_profit) || 0,
        avg_loss: Number(stats.avg_loss) || 0,
        best_trade: Number(stats.best_trade) || 0,
        worst_trade: Number(stats.worst_trade) || 0,
        gross_profit: grossProfit,
        gross_loss: grossLoss,
        profit_factor: profitFactor,
        total_lots: Number(stats.total_lots) || 0,
        avg_lots: Number(stats.avg_lots) || 0,
        max_lots: Number(stats.max_lots) || 0,
        buy_count: buyCount,
        sell_count: sellCount,
        buy_win_rate: buyWinRate,
        sell_win_rate: sellWinRate,
        total_swap: Number(stats.total_swap) || 0,
        total_commission: Number(stats.total_commission) || 0,
        growth,
        growth_pct: growthPct,
      },
      today: {
        trades: Number(today.today_trades) || 0,
        pnl: Number(today.today_pnl) || 0,
        wins: Number(today.today_wins) || 0,
      },
      open_positions: openPositions.map((p) => ({
        ticket: p.ticket,
        type: p.type,
        lots: Number(p.lots),
        symbol: p.symbol,
        open_price: Number(p.open_price),
        current_price: Number(p.current_price),
        sl: Number(p.sl),
        tp: Number(p.tp),
        commission: Number(p.commission) || 0,
        swap: Number(p.swap) || 0,
        profit: Number(p.profit) || 0,
        open_time: p.open_time,
      })),
      recent_trades: recentTrades.map((t) => ({
        ticket: t.ticket,
        type: t.type,
        lots: Number(t.lots),
        open_price: Number(t.open_price),
        close_price: Number(t.close_price),
        profit: Number(t.profit) || 0,
        swap: Number(t.swap) || 0,
        commission: Number(t.commission) || 0,
        open_time: t.open_time,
        close_time: t.close_time,
        magic_number: t.magic_number,
        comment: t.comment,
      })),
    }, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
    });
  } catch (error) {
    console.error('Account API error:', error);
    return NextResponse.json({ error: 'Failed to fetch account data' }, { status: 500 });
  }
}
