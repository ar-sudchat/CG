import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { getSessionAndAccounts } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const AW_MAGIC = 9751421;

export async function GET(request: NextRequest) {
  try {
    const auth = await getSessionAndAccounts();
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');
    const days = parseInt(searchParams.get('days') || '30');
    const accountFilter = auth.accountFilter;

    // Build date filter: if from/to provided, use date range; otherwise use days
    const useDateRange = !!fromParam;
    // MT4 server time is UTC+2, Thai time is UTC+7, offset = 5h
    // Convert Thai date to MT4 server time by subtracting 5 hours
    const fromDate = fromParam ? `${fromParam}T00:00:00` : null;
    const toDate = toParam ? `${toParam}T23:59:59` : (fromParam ? `${fromParam}T23:59:59` : null);

    // AW by account
    const byAccount = accountFilter === null
      ? (useDateRange
        ? await sql`
          SELECT t.account_number,
                 a.name, COALESCE(a.avatar_text, '') as avatar_text,
                 COUNT(*)::int as aw_trades,
                 SUM(t.profit + COALESCE(t.swap,0) + COALESCE(t.commission,0)) as aw_pnl
          FROM trades t
          LEFT JOIN accounts a ON t.account_number = a.account_number
          WHERE t.magic_number = ${AW_MAGIC}
            AND (t.close_time + INTERVAL '5 hours') >= ${fromDate}::timestamp
            AND (t.close_time + INTERVAL '5 hours') <= ${toDate}::timestamp
          GROUP BY t.account_number, a.name, a.avatar_text
          ORDER BY aw_trades DESC
        `
        : await sql`
          SELECT t.account_number,
                 a.name, COALESCE(a.avatar_text, '') as avatar_text,
                 COUNT(*)::int as aw_trades,
                 SUM(t.profit + COALESCE(t.swap,0) + COALESCE(t.commission,0)) as aw_pnl
          FROM trades t
          LEFT JOIN accounts a ON t.account_number = a.account_number
          WHERE t.magic_number = ${AW_MAGIC}
            AND t.close_time > NOW() - make_interval(days => ${days})
          GROUP BY t.account_number, a.name, a.avatar_text
          ORDER BY aw_trades DESC
        `)
      : (useDateRange
        ? await sql`
          SELECT t.account_number,
                 a.name, COALESCE(a.avatar_text, '') as avatar_text,
                 COUNT(*)::int as aw_trades,
                 SUM(t.profit + COALESCE(t.swap,0) + COALESCE(t.commission,0)) as aw_pnl
          FROM trades t
          LEFT JOIN accounts a ON t.account_number = a.account_number
          WHERE t.magic_number = ${AW_MAGIC}
            AND (t.close_time + INTERVAL '5 hours') >= ${fromDate}::timestamp
            AND (t.close_time + INTERVAL '5 hours') <= ${toDate}::timestamp
            AND t.account_number = ANY(${accountFilter})
          GROUP BY t.account_number, a.name, a.avatar_text
          ORDER BY aw_trades DESC
        `
        : await sql`
          SELECT t.account_number,
                 a.name, COALESCE(a.avatar_text, '') as avatar_text,
                 COUNT(*)::int as aw_trades,
                 SUM(t.profit + COALESCE(t.swap,0) + COALESCE(t.commission,0)) as aw_pnl
          FROM trades t
          LEFT JOIN accounts a ON t.account_number = a.account_number
          WHERE t.magic_number = ${AW_MAGIC}
            AND t.close_time > NOW() - make_interval(days => ${days})
            AND t.account_number = ANY(${accountFilter})
          GROUP BY t.account_number, a.name, a.avatar_text
          ORDER BY aw_trades DESC
        `);

    // AW by hour (Thai time = MT4 server +5h)
    // close_time stored as MT4 server time (UTC+2), Thai = UTC+7
    const byHour = accountFilter === null
      ? (useDateRange
        ? await sql`
          SELECT EXTRACT(HOUR FROM close_time + INTERVAL '5 hours')::int as hour,
                 COUNT(*)::int as count
          FROM trades
          WHERE magic_number = ${AW_MAGIC}
            AND (close_time + INTERVAL '5 hours') >= ${fromDate}::timestamp
            AND (close_time + INTERVAL '5 hours') <= ${toDate}::timestamp
          GROUP BY hour ORDER BY hour
        `
        : await sql`
          SELECT EXTRACT(HOUR FROM close_time + INTERVAL '5 hours')::int as hour,
                 COUNT(*)::int as count
          FROM trades
          WHERE magic_number = ${AW_MAGIC}
            AND close_time > NOW() - make_interval(days => ${days})
          GROUP BY hour ORDER BY hour
        `)
      : (useDateRange
        ? await sql`
          SELECT EXTRACT(HOUR FROM close_time + INTERVAL '5 hours')::int as hour,
                 COUNT(*)::int as count
          FROM trades
          WHERE magic_number = ${AW_MAGIC}
            AND (close_time + INTERVAL '5 hours') >= ${fromDate}::timestamp
            AND (close_time + INTERVAL '5 hours') <= ${toDate}::timestamp
            AND account_number = ANY(${accountFilter})
          GROUP BY hour ORDER BY hour
        `
        : await sql`
          SELECT EXTRACT(HOUR FROM close_time + INTERVAL '5 hours')::int as hour,
                 COUNT(*)::int as count
          FROM trades
          WHERE magic_number = ${AW_MAGIC}
            AND close_time > NOW() - make_interval(days => ${days})
            AND account_number = ANY(${accountFilter})
          GROUP BY hour ORDER BY hour
        `);

    // AW by day of week (Thai time)
    const byDay = accountFilter === null
      ? (useDateRange
        ? await sql`
          SELECT EXTRACT(DOW FROM close_time + INTERVAL '5 hours')::int as dow,
                 COUNT(*)::int as count
          FROM trades
          WHERE magic_number = ${AW_MAGIC}
            AND (close_time + INTERVAL '5 hours') >= ${fromDate}::timestamp
            AND (close_time + INTERVAL '5 hours') <= ${toDate}::timestamp
          GROUP BY dow ORDER BY dow
        `
        : await sql`
          SELECT EXTRACT(DOW FROM close_time + INTERVAL '5 hours')::int as dow,
                 COUNT(*)::int as count
          FROM trades
          WHERE magic_number = ${AW_MAGIC}
            AND close_time > NOW() - make_interval(days => ${days})
          GROUP BY dow ORDER BY dow
        `)
      : (useDateRange
        ? await sql`
          SELECT EXTRACT(DOW FROM close_time + INTERVAL '5 hours')::int as dow,
                 COUNT(*)::int as count
          FROM trades
          WHERE magic_number = ${AW_MAGIC}
            AND (close_time + INTERVAL '5 hours') >= ${fromDate}::timestamp
            AND (close_time + INTERVAL '5 hours') <= ${toDate}::timestamp
            AND account_number = ANY(${accountFilter})
          GROUP BY dow ORDER BY dow
        `
        : await sql`
          SELECT EXTRACT(DOW FROM close_time + INTERVAL '5 hours')::int as dow,
                 COUNT(*)::int as count
          FROM trades
          WHERE magic_number = ${AW_MAGIC}
            AND close_time > NOW() - make_interval(days => ${days})
            AND account_number = ANY(${accountFilter})
          GROUP BY dow ORDER BY dow
        `);

    // AW by week (count + PnL per week)
    const byWeek = accountFilter === null
      ? (useDateRange
        ? await sql`
          SELECT date_trunc('week', close_time + INTERVAL '5 hours')::date as week_start,
                 COUNT(*)::int as count,
                 SUM(profit + COALESCE(swap,0) + COALESCE(commission,0)) as pnl
          FROM trades
          WHERE magic_number = ${AW_MAGIC}
            AND (close_time + INTERVAL '5 hours') >= ${fromDate}::timestamp
            AND (close_time + INTERVAL '5 hours') <= ${toDate}::timestamp
          GROUP BY week_start ORDER BY week_start
        `
        : await sql`
          SELECT date_trunc('week', close_time + INTERVAL '5 hours')::date as week_start,
                 COUNT(*)::int as count,
                 SUM(profit + COALESCE(swap,0) + COALESCE(commission,0)) as pnl
          FROM trades
          WHERE magic_number = ${AW_MAGIC}
            AND close_time > NOW() - make_interval(days => ${days})
          GROUP BY week_start ORDER BY week_start
        `)
      : (useDateRange
        ? await sql`
          SELECT date_trunc('week', close_time + INTERVAL '5 hours')::date as week_start,
                 COUNT(*)::int as count,
                 SUM(profit + COALESCE(swap,0) + COALESCE(commission,0)) as pnl
          FROM trades
          WHERE magic_number = ${AW_MAGIC}
            AND (close_time + INTERVAL '5 hours') >= ${fromDate}::timestamp
            AND (close_time + INTERVAL '5 hours') <= ${toDate}::timestamp
            AND account_number = ANY(${accountFilter})
          GROUP BY week_start ORDER BY week_start
        `
        : await sql`
          SELECT date_trunc('week', close_time + INTERVAL '5 hours')::date as week_start,
                 COUNT(*)::int as count,
                 SUM(profit + COALESCE(swap,0) + COALESCE(commission,0)) as pnl
          FROM trades
          WHERE magic_number = ${AW_MAGIC}
            AND close_time > NOW() - make_interval(days => ${days})
            AND account_number = ANY(${accountFilter})
          GROUP BY week_start ORDER BY week_start
        `);

    // Recent AW trades
    const recent = accountFilter === null
      ? (useDateRange
        ? await sql`
          SELECT t.ticket, t.account_number, t.type, t.lots,
                 t.profit, t.swap, t.commission,
                 t.open_time, t.close_time, t.magic_number,
                 a.name as account_name, COALESCE(a.avatar_text, '') as avatar_text
          FROM trades t
          LEFT JOIN accounts a ON t.account_number = a.account_number
          WHERE t.magic_number = ${AW_MAGIC}
            AND (t.close_time + INTERVAL '5 hours') >= ${fromDate}::timestamp
            AND (t.close_time + INTERVAL '5 hours') <= ${toDate}::timestamp
          ORDER BY t.close_time DESC
          LIMIT 100
        `
        : await sql`
          SELECT t.ticket, t.account_number, t.type, t.lots,
                 t.profit, t.swap, t.commission,
                 t.open_time, t.close_time, t.magic_number,
                 a.name as account_name, COALESCE(a.avatar_text, '') as avatar_text
          FROM trades t
          LEFT JOIN accounts a ON t.account_number = a.account_number
          WHERE t.magic_number = ${AW_MAGIC}
            AND t.close_time > NOW() - make_interval(days => ${days})
          ORDER BY t.close_time DESC
          LIMIT 100
        `)
      : (useDateRange
        ? await sql`
          SELECT t.ticket, t.account_number, t.type, t.lots,
                 t.profit, t.swap, t.commission,
                 t.open_time, t.close_time, t.magic_number,
                 a.name as account_name, COALESCE(a.avatar_text, '') as avatar_text
          FROM trades t
          LEFT JOIN accounts a ON t.account_number = a.account_number
          WHERE t.magic_number = ${AW_MAGIC}
            AND (t.close_time + INTERVAL '5 hours') >= ${fromDate}::timestamp
            AND (t.close_time + INTERVAL '5 hours') <= ${toDate}::timestamp
            AND t.account_number = ANY(${accountFilter})
          ORDER BY t.close_time DESC
          LIMIT 100
        `
        : await sql`
          SELECT t.ticket, t.account_number, t.type, t.lots,
                 t.profit, t.swap, t.commission,
                 t.open_time, t.close_time, t.magic_number,
                 a.name as account_name, COALESCE(a.avatar_text, '') as avatar_text
          FROM trades t
          LEFT JOIN accounts a ON t.account_number = a.account_number
          WHERE t.magic_number = ${AW_MAGIC}
            AND t.close_time > NOW() - make_interval(days => ${days})
            AND t.account_number = ANY(${accountFilter})
          ORDER BY t.close_time DESC
          LIMIT 100
        `);

    // Total accounts count
    const totalAccounts = accountFilter === null
      ? await sql`SELECT COUNT(*)::int as cnt FROM accounts WHERE is_active = true`
      : await sql`SELECT COUNT(*)::int as cnt FROM accounts WHERE is_active = true AND account_number = ANY(${accountFilter})`;

    // Summary
    const totalAwTrades = byAccount.reduce((s, r) => s + Number(r.aw_trades), 0);
    const totalAwPnl = byAccount.reduce((s, r) => s + Number(r.aw_pnl), 0);

    return NextResponse.json({
      by_account: byAccount.map((r) => ({
        account_number: r.account_number,
        name: r.name,
        avatar_text: r.avatar_text,
        aw_trades: Number(r.aw_trades),
        aw_pnl: Number(Number(r.aw_pnl).toFixed(2)),
      })),
      by_hour: byHour.map((r) => ({ hour: r.hour, count: r.count })),
      by_day: byDay.map((r) => ({ dow: r.dow, count: r.count })),
      by_week: byWeek.map((r) => ({
        week_start: r.week_start,
        count: r.count,
        pnl: Number(Number(r.pnl).toFixed(2)),
      })),
      recent: recent.map((t) => ({
        ticket: t.ticket,
        account_number: t.account_number,
        account_name: t.account_name,
        avatar_text: t.avatar_text,
        type: t.type,
        lots: Number(t.lots),
        profit: Number(t.profit) || 0,
        swap: Number(t.swap) || 0,
        commission: Number(t.commission) || 0,
        open_time: t.open_time,
        close_time: t.close_time,
        magic_number: t.magic_number,
      })),
      summary: {
        total_aw_trades: totalAwTrades,
        total_aw_pnl: Number(totalAwPnl.toFixed(2)),
        aw_accounts: byAccount.length,
        total_accounts: totalAccounts[0]?.cnt || 0,
        avg_pnl_per_trade: totalAwTrades > 0 ? Number((totalAwPnl / totalAwTrades).toFixed(2)) : 0,
      },
    }, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
    });
  } catch (error) {
    console.error('AW Report API error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
