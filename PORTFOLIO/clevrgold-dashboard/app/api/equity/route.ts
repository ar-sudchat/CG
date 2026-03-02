import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { getSessionAndAccounts } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = await getSessionAndAccounts();
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '7');
    const account = searchParams.get('account') || 'all';

    let data;

    if (account === 'all') {
      data = auth.accountFilter === null
        ? await sql`
          SELECT
            date_trunc('hour', recorded_at) as time,
            SUM(balance) as balance,
            SUM(equity) as equity
          FROM balance_history
          WHERE recorded_at > NOW() - make_interval(days => ${days})
          GROUP BY date_trunc('hour', recorded_at)
          ORDER BY time
        `
        : await sql`
          SELECT
            date_trunc('hour', recorded_at) as time,
            SUM(balance) as balance,
            SUM(equity) as equity
          FROM balance_history
          WHERE account_number = ANY(${auth.accountFilter})
            AND recorded_at > NOW() - make_interval(days => ${days})
          GROUP BY date_trunc('hour', recorded_at)
          ORDER BY time
        `;
    } else {
      const accountNum = parseInt(account);
      if (auth.accountFilter !== null && !auth.accountFilter.includes(accountNum)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      data = await sql`
        SELECT recorded_at as time, balance, equity
        FROM balance_history
        WHERE account_number = ${accountNum}
        AND recorded_at > NOW() - make_interval(days => ${days})
        ORDER BY recorded_at
      `;
    }

    return NextResponse.json({
      data: data.map((r) => ({
        time: r.time,
        balance: Number(r.balance) || 0,
        equity: Number(r.equity) || 0,
      })),
    }, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
    });
  } catch (error) {
    console.error('Equity API error:', error);
    return NextResponse.json({ error: 'Failed to fetch equity data' }, { status: 500 });
  }
}
