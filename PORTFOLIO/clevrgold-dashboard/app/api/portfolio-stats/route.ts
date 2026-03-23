import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { getSessionAndAccounts } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = await getSessionAndAccounts();
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const fromDate = searchParams.get('from') || '';
    const toDate = searchParams.get('to') || '';
    const hasDateFilter = fromDate || toDate;

    // Build account filter condition
    const af = auth.accountFilter;

    // Cent account lookup for /100 divisor
    const centAccounts = await sql`
      SELECT account_number FROM accounts WHERE account_type = 'cent' AND is_active = TRUE
    `;
    const centArr = centAccounts.length > 0 ? centAccounts.map((r) => r.account_number) : [0];

    const statsRows = hasDateFilter
      ? (af === null
        ? await sql`
          SELECT
            COUNT(*) as total_trades,
            COUNT(CASE WHEN profit > 0 THEN 1 END) as wins,
            COUNT(CASE WHEN profit < 0 THEN 1 END) as losses,
            ROUND(COUNT(CASE WHEN profit > 0 THEN 1 END)::numeric / NULLIF(COUNT(*), 0) * 100, 1) as win_rate,
            ROUND(SUM((profit + COALESCE(swap, 0) + COALESCE(commission, 0)) / CASE WHEN t.account_number = ANY(${centArr}) THEN 100.0 ELSE 1.0 END)::numeric, 2) as total_profit,
            ROUND(SUM(CASE WHEN profit > 0 THEN (profit + COALESCE(swap, 0) + COALESCE(commission, 0)) / CASE WHEN t.account_number = ANY(${centArr}) THEN 100.0 ELSE 1.0 END ELSE 0 END)::numeric, 2) as gross_profit,
            ROUND(ABS(SUM(CASE WHEN profit < 0 THEN (profit + COALESCE(swap, 0) + COALESCE(commission, 0)) / CASE WHEN t.account_number = ANY(${centArr}) THEN 100.0 ELSE 1.0 END ELSE 0 END))::numeric, 2) as gross_loss,
            ROUND(AVG(CASE WHEN profit > 0 THEN profit / CASE WHEN t.account_number = ANY(${centArr}) THEN 100.0 ELSE 1.0 END END)::numeric, 2) as avg_profit,
            ROUND(AVG(CASE WHEN profit < 0 THEN profit / CASE WHEN t.account_number = ANY(${centArr}) THEN 100.0 ELSE 1.0 END END)::numeric, 2) as avg_loss,
            ROUND(MAX((profit + COALESCE(swap, 0) + COALESCE(commission, 0)) / CASE WHEN t.account_number = ANY(${centArr}) THEN 100.0 ELSE 1.0 END)::numeric, 2) as best_trade,
            ROUND(MIN((profit + COALESCE(swap, 0) + COALESCE(commission, 0)) / CASE WHEN t.account_number = ANY(${centArr}) THEN 100.0 ELSE 1.0 END)::numeric, 2) as worst_trade,
            ROUND(SUM(lots)::numeric, 2) as total_lots
          FROM trades t
          JOIN accounts a ON t.account_number = a.account_number
          WHERE a.is_active = TRUE
            AND (${fromDate} = '' OR t.close_time >= ${fromDate}::date)
            AND (${toDate} = '' OR t.close_time < (${toDate}::date + interval '1 day'))
        `
        : await sql`
          SELECT
            COUNT(*) as total_trades,
            COUNT(CASE WHEN profit > 0 THEN 1 END) as wins,
            COUNT(CASE WHEN profit < 0 THEN 1 END) as losses,
            ROUND(COUNT(CASE WHEN profit > 0 THEN 1 END)::numeric / NULLIF(COUNT(*), 0) * 100, 1) as win_rate,
            ROUND(SUM((profit + COALESCE(swap, 0) + COALESCE(commission, 0)) / CASE WHEN t.account_number = ANY(${centArr}) THEN 100.0 ELSE 1.0 END)::numeric, 2) as total_profit,
            ROUND(SUM(CASE WHEN profit > 0 THEN (profit + COALESCE(swap, 0) + COALESCE(commission, 0)) / CASE WHEN t.account_number = ANY(${centArr}) THEN 100.0 ELSE 1.0 END ELSE 0 END)::numeric, 2) as gross_profit,
            ROUND(ABS(SUM(CASE WHEN profit < 0 THEN (profit + COALESCE(swap, 0) + COALESCE(commission, 0)) / CASE WHEN t.account_number = ANY(${centArr}) THEN 100.0 ELSE 1.0 END ELSE 0 END))::numeric, 2) as gross_loss,
            ROUND(AVG(CASE WHEN profit > 0 THEN profit / CASE WHEN t.account_number = ANY(${centArr}) THEN 100.0 ELSE 1.0 END END)::numeric, 2) as avg_profit,
            ROUND(AVG(CASE WHEN profit < 0 THEN profit / CASE WHEN t.account_number = ANY(${centArr}) THEN 100.0 ELSE 1.0 END END)::numeric, 2) as avg_loss,
            ROUND(MAX((profit + COALESCE(swap, 0) + COALESCE(commission, 0)) / CASE WHEN t.account_number = ANY(${centArr}) THEN 100.0 ELSE 1.0 END)::numeric, 2) as best_trade,
            ROUND(MIN((profit + COALESCE(swap, 0) + COALESCE(commission, 0)) / CASE WHEN t.account_number = ANY(${centArr}) THEN 100.0 ELSE 1.0 END)::numeric, 2) as worst_trade,
            ROUND(SUM(lots)::numeric, 2) as total_lots
          FROM trades t
          WHERE t.account_number = ANY(${af})
            AND (${fromDate} = '' OR t.close_time >= ${fromDate}::date)
            AND (${toDate} = '' OR t.close_time < (${toDate}::date + interval '1 day'))
        `)
      : (af === null
        ? await sql`
          SELECT
            COUNT(*) as total_trades,
            COUNT(CASE WHEN profit > 0 THEN 1 END) as wins,
            COUNT(CASE WHEN profit < 0 THEN 1 END) as losses,
            ROUND(COUNT(CASE WHEN profit > 0 THEN 1 END)::numeric / NULLIF(COUNT(*), 0) * 100, 1) as win_rate,
            ROUND(SUM((profit + COALESCE(swap, 0) + COALESCE(commission, 0)) / CASE WHEN t.account_number = ANY(${centArr}) THEN 100.0 ELSE 1.0 END)::numeric, 2) as total_profit,
            ROUND(SUM(CASE WHEN profit > 0 THEN (profit + COALESCE(swap, 0) + COALESCE(commission, 0)) / CASE WHEN t.account_number = ANY(${centArr}) THEN 100.0 ELSE 1.0 END ELSE 0 END)::numeric, 2) as gross_profit,
            ROUND(ABS(SUM(CASE WHEN profit < 0 THEN (profit + COALESCE(swap, 0) + COALESCE(commission, 0)) / CASE WHEN t.account_number = ANY(${centArr}) THEN 100.0 ELSE 1.0 END ELSE 0 END))::numeric, 2) as gross_loss,
            ROUND(AVG(CASE WHEN profit > 0 THEN profit / CASE WHEN t.account_number = ANY(${centArr}) THEN 100.0 ELSE 1.0 END END)::numeric, 2) as avg_profit,
            ROUND(AVG(CASE WHEN profit < 0 THEN profit / CASE WHEN t.account_number = ANY(${centArr}) THEN 100.0 ELSE 1.0 END END)::numeric, 2) as avg_loss,
            ROUND(MAX((profit + COALESCE(swap, 0) + COALESCE(commission, 0)) / CASE WHEN t.account_number = ANY(${centArr}) THEN 100.0 ELSE 1.0 END)::numeric, 2) as best_trade,
            ROUND(MIN((profit + COALESCE(swap, 0) + COALESCE(commission, 0)) / CASE WHEN t.account_number = ANY(${centArr}) THEN 100.0 ELSE 1.0 END)::numeric, 2) as worst_trade,
            ROUND(SUM(lots)::numeric, 2) as total_lots
          FROM trades t
          JOIN accounts a ON t.account_number = a.account_number
          WHERE a.is_active = TRUE
        `
        : await sql`
          SELECT
            COUNT(*) as total_trades,
            COUNT(CASE WHEN profit > 0 THEN 1 END) as wins,
            COUNT(CASE WHEN profit < 0 THEN 1 END) as losses,
            ROUND(COUNT(CASE WHEN profit > 0 THEN 1 END)::numeric / NULLIF(COUNT(*), 0) * 100, 1) as win_rate,
            ROUND(SUM((profit + COALESCE(swap, 0) + COALESCE(commission, 0)) / CASE WHEN t.account_number = ANY(${centArr}) THEN 100.0 ELSE 1.0 END)::numeric, 2) as total_profit,
            ROUND(SUM(CASE WHEN profit > 0 THEN (profit + COALESCE(swap, 0) + COALESCE(commission, 0)) / CASE WHEN t.account_number = ANY(${centArr}) THEN 100.0 ELSE 1.0 END ELSE 0 END)::numeric, 2) as gross_profit,
            ROUND(ABS(SUM(CASE WHEN profit < 0 THEN (profit + COALESCE(swap, 0) + COALESCE(commission, 0)) / CASE WHEN t.account_number = ANY(${centArr}) THEN 100.0 ELSE 1.0 END ELSE 0 END))::numeric, 2) as gross_loss,
            ROUND(AVG(CASE WHEN profit > 0 THEN profit / CASE WHEN t.account_number = ANY(${centArr}) THEN 100.0 ELSE 1.0 END END)::numeric, 2) as avg_profit,
            ROUND(AVG(CASE WHEN profit < 0 THEN profit / CASE WHEN t.account_number = ANY(${centArr}) THEN 100.0 ELSE 1.0 END END)::numeric, 2) as avg_loss,
            ROUND(MAX((profit + COALESCE(swap, 0) + COALESCE(commission, 0)) / CASE WHEN t.account_number = ANY(${centArr}) THEN 100.0 ELSE 1.0 END)::numeric, 2) as best_trade,
            ROUND(MIN((profit + COALESCE(swap, 0) + COALESCE(commission, 0)) / CASE WHEN t.account_number = ANY(${centArr}) THEN 100.0 ELSE 1.0 END)::numeric, 2) as worst_trade,
            ROUND(SUM(lots)::numeric, 2) as total_lots
          FROM trades t
          WHERE t.account_number = ANY(${af})
        `);

    const s = statsRows[0];
    const grossProfit = Number(s.gross_profit) || 0;
    const grossLoss = Number(s.gross_loss) || 0;
    const profitFactor = grossLoss > 0 ? Math.round((grossProfit / grossLoss) * 100) / 100 : grossProfit > 0 ? 999 : 0;

    return NextResponse.json({
      total_trades: Number(s.total_trades) || 0,
      wins: Number(s.wins) || 0,
      losses: Number(s.losses) || 0,
      win_rate: Number(s.win_rate) || 0,
      total_profit: Number(s.total_profit) || 0,
      gross_profit: grossProfit,
      gross_loss: grossLoss,
      profit_factor: profitFactor,
      avg_profit: Number(s.avg_profit) || 0,
      avg_loss: Number(s.avg_loss) || 0,
      best_trade: Number(s.best_trade) || 0,
      worst_trade: Number(s.worst_trade) || 0,
      total_lots: Number(s.total_lots) || 0,
    }, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
    });
  } catch (error) {
    console.error('Portfolio stats API error:', error);
    return NextResponse.json({ error: 'Failed to fetch portfolio stats' }, { status: 500 });
  }
}
