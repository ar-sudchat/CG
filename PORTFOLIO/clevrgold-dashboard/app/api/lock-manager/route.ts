import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

export const dynamic = 'force-dynamic';

const headers = { 'Cache-Control': 'no-store, no-cache, must-revalidate' };

function authEA(request: NextRequest): boolean {
  const apiKey =
    request.nextUrl.searchParams.get('key') ||
    request.headers.get('X-API-Key');
  return !!apiKey && apiKey === process.env.EA_API_KEY;
}

/**
 * GET /api/lock-manager?key=<EA_API_KEY>
 * Returns all accounts with latest snapshot status
 */
export async function GET(request: NextRequest) {
  try {
    if (!authEA(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers });
    }

    const rows = await sql`
      SELECT
        a.account_number,
        a.name,
        COALESCE(a.avatar_text, '') AS avatar_text,
        a.ea_strategy,
        a.pair_group,
        COALESCE(s.balance, 0)       AS balance,
        COALESCE(s.equity, 0)        AS equity,
        COALESCE(s.floating_pnl, 0)  AS floating_pnl,
        COALESCE(s.open_orders, 0)   AS open_orders,
        COALESCE(s.aw_orders, 0)     AS aw_orders,
        COALESCE(s.mode, 'OFF')      AS mode,
        COALESCE(s.margin_level, 0)  AS margin_level,
        COALESCE(s.daily_pnl, 0)     AS daily_pnl,
        s.updated_at
      FROM accounts a
      LEFT JOIN snapshots s ON a.account_number = s.account_number
      WHERE a.is_active = true
      ORDER BY a.pair_group ASC, a.ea_strategy ASC
    `;

    return NextResponse.json(rows, { headers });
  } catch (error) {
    console.error('Lock Manager GET error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500, headers });
  }
}
