import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { getSessionAndAccounts } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = await getSessionAndAccounts();
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const account = searchParams.get('account') || 'all';
    const days = parseInt(searchParams.get('days') || '7');
    const limit = parseInt(searchParams.get('limit') || '50');

    let trades;

    if (account === 'all') {
      trades = auth.accountFilter === null
        ? await sql`
          SELECT ticket, account_number, type, lots, open_price, close_price,
                 profit, swap, commission,
                 open_time, close_time,
                 magic_number, comment
          FROM trades
          WHERE close_time > NOW() - make_interval(days => ${days})
          ORDER BY close_time DESC
          LIMIT ${limit}
        `
        : await sql`
          SELECT ticket, account_number, type, lots, open_price, close_price,
                 profit, swap, commission,
                 open_time, close_time,
                 magic_number, comment
          FROM trades
          WHERE account_number = ANY(${auth.accountFilter})
            AND close_time > NOW() - make_interval(days => ${days})
          ORDER BY close_time DESC
          LIMIT ${limit}
        `;
    } else {
      const accountNum = parseInt(account);
      if (auth.accountFilter !== null && !auth.accountFilter.includes(accountNum)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      trades = await sql`
        SELECT ticket, account_number, type, lots, open_price, close_price,
               profit, swap, commission,
               open_time, close_time,
               magic_number, comment
        FROM trades
        WHERE account_number = ${accountNum}
        AND close_time > NOW() - make_interval(days => ${days})
        ORDER BY close_time DESC
        LIMIT ${limit}
      `;
    }

    // Calculate summary
    let totalProfit = 0;
    let wins = 0;
    trades.forEach((t) => {
      const p = Number(t.profit) || 0;
      totalProfit += p;
      if (p > 0) wins++;
    });

    return NextResponse.json({
      trades: trades.map((t) => ({
        ticket: t.ticket,
        account_number: t.account_number,
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
      summary: {
        total_profit: totalProfit,
        total_trades: trades.length,
        win_rate: trades.length > 0 ? Math.round((wins / trades.length) * 1000) / 10 : 0,
      },
    }, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
    });
  } catch (error) {
    console.error('Trades API error:', error);
    return NextResponse.json({ error: 'Failed to fetch trades' }, { status: 500 });
  }
}
