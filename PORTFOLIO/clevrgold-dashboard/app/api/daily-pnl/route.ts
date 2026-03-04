import { NextRequest, NextResponse } from 'next/server';
import sql, { MT4_TZ } from '@/lib/db';
import { getSessionAndAccounts } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// Use MT4 server timezone for date grouping — consistent with snapshot daily_pnl reset
function toMT4Date(d: Date | string): string {
  return new Date(d).toLocaleDateString('sv-SE', { timeZone: MT4_TZ });
}

export async function GET(request: NextRequest) {
  try {
    const auth = await getSessionAndAccounts();
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');
    const account = searchParams.get('account') || 'all';

    // Historical daily P&L from trades table — grouped by MT4 server date
    // This aligns with snapshot daily_pnl which resets at MT4 midnight
    let tradesData;

    if (account === 'all') {
      tradesData = auth.accountFilter === null
        ? await sql`
          SELECT
            TO_CHAR(t.close_time, 'YYYY-MM-DD') as day,
            ROUND(SUM(t.profit + COALESCE(t.swap, 0) + COALESCE(t.commission, 0))::numeric, 2) as pnl,
            COUNT(*) as trades,
            COUNT(CASE WHEN t.profit > 0 THEN 1 END) as wins
          FROM trades t
          JOIN accounts a ON t.account_number = a.account_number
          WHERE a.is_active = TRUE
            AND t.close_time > NOW() - make_interval(days => ${days})
          GROUP BY 1
          ORDER BY day
        `
        : await sql`
          SELECT
            TO_CHAR(t.close_time, 'YYYY-MM-DD') as day,
            ROUND(SUM(t.profit + COALESCE(t.swap, 0) + COALESCE(t.commission, 0))::numeric, 2) as pnl,
            COUNT(*) as trades,
            COUNT(CASE WHEN t.profit > 0 THEN 1 END) as wins
          FROM trades t
          WHERE t.account_number = ANY(${auth.accountFilter})
            AND t.close_time > NOW() - make_interval(days => ${days})
          GROUP BY 1
          ORDER BY day
        `;
    } else {
      const accountNum = parseInt(account);
      tradesData = await sql`
        SELECT
          TO_CHAR(t.close_time, 'YYYY-MM-DD') as day,
          ROUND(SUM(t.profit + COALESCE(t.swap, 0) + COALESCE(t.commission, 0))::numeric, 2) as pnl,
          COUNT(*) as trades,
          COUNT(CASE WHEN t.profit > 0 THEN 1 END) as wins
        FROM trades t
        WHERE t.account_number = ${accountNum}
          AND t.close_time > NOW() - make_interval(days => ${days})
        GROUP BY 1
        ORDER BY day
      `;
    }

    // Get real-time P&L from snapshots (more accurate than trades table)
    // Also fetch updated_at to determine which MT4 date the snapshot belongs to
    let todaySnapshot;
    if (account === 'all') {
      todaySnapshot = auth.accountFilter === null
        ? await sql`
          SELECT
            ROUND(SUM(COALESCE(s.daily_pnl, 0))::numeric, 2) as pnl,
            SUM(COALESCE(s.open_orders, 0) + COALESCE(s.aw_orders, 0)) as trades,
            MAX(s.updated_at) as latest_update
          FROM accounts a
          LEFT JOIN snapshots s ON a.account_number = s.account_number
          WHERE a.is_active = TRUE
        `
        : await sql`
          SELECT
            ROUND(SUM(COALESCE(s.daily_pnl, 0))::numeric, 2) as pnl,
            SUM(COALESCE(s.open_orders, 0) + COALESCE(s.aw_orders, 0)) as trades,
            MAX(s.updated_at) as latest_update
          FROM accounts a
          LEFT JOIN snapshots s ON a.account_number = s.account_number
          WHERE a.is_active = TRUE
            AND a.account_number = ANY(${auth.accountFilter})
        `;
    } else {
      const accountNum = parseInt(account);
      todaySnapshot = await sql`
        SELECT
          ROUND(COALESCE(s.daily_pnl, 0)::numeric, 2) as pnl,
          COALESCE(s.open_orders, 0) + COALESCE(s.aw_orders, 0) as trades,
          s.updated_at as latest_update
        FROM accounts a
        LEFT JOIN snapshots s ON a.account_number = s.account_number
        WHERE a.account_number = ${accountNum}
      `;
    }

    const snapshotPnl = Number(todaySnapshot[0]?.pnl) || 0;
    const latestUpdate = todaySnapshot[0]?.latest_update;
    // Determine which MT4 date the snapshot actually belongs to
    const snapshotDay = latestUpdate ? toMT4Date(latestUpdate) : toMT4Date(new Date());

    // Build result — use MT4 server date for consistency with snapshot
    const result = tradesData.map((r) => ({
      day: String(r.day),
      pnl: Number(r.pnl) || 0,
      trades: Number(r.trades) || 0,
      wins: Number(r.wins) || 0,
    }));

    // Merge snapshot P&L with the correct MT4 date (not blindly "today")
    // This prevents stale snapshots from creating a fake entry on the wrong day
    // Skip weekends — snapshot updated on Fri night can land on Sat in MT4 timezone
    const snapDow = new Date(snapshotDay + 'T12:00:00Z').getUTCDay();
    const isWeekend = snapDow === 0 || snapDow === 6;

    if (snapshotPnl !== 0 && !isWeekend) {
      const snapIndex = result.findIndex((d) => d.day === snapshotDay);
      if (snapIndex >= 0) {
        const tradesPnl = result[snapIndex].pnl;
        if (Math.abs(snapshotPnl) > Math.abs(tradesPnl)) {
          result[snapIndex].pnl = snapshotPnl;
        }
      } else {
        result.push({
          day: snapshotDay,
          pnl: snapshotPnl,
          trades: 0,
          wins: 0,
        });
      }
    }

    return NextResponse.json({
      data: result,
    }, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
    });
  } catch (error) {
    console.error('Daily PnL API error:', error);
    return NextResponse.json({ error: 'Failed to fetch daily PnL data' }, { status: 500 });
  }
}
