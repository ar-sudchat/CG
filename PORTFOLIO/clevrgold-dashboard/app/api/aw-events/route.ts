import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { getSessionAndAccounts } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const headers = { 'Cache-Control': 'no-store, no-cache, must-revalidate' };

function authEA(request: NextRequest): boolean {
  const apiKey =
    request.nextUrl.searchParams.get('key') ||
    request.headers.get('X-API-Key');
  return !!apiKey && apiKey === process.env.EA_API_KEY;
}

/**
 * POST /api/aw-events — EA sends when AW triggers
 * Body: { account_number, round, trigger_pnl, trigger_orders, trigger_direction, trigger_price }
 * Returns: { id }
 */
export async function POST(request: NextRequest) {
  try {
    if (!authEA(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers });
    }

    const body = await request.json();
    const {
      account_number, round, trigger_pnl, trigger_orders,
      trigger_direction, trigger_price,
    } = body;

    if (!account_number) {
      return NextResponse.json({ error: 'account_number required' }, { status: 400, headers });
    }

    // Use server time for triggered_at
    const now = new Date();
    const dayOfWeek = now.getUTCDay();
    const hourOfDay = now.getUTCHours();

    const result = await sql`
      INSERT INTO aw_events (
        account_number, round, triggered_at,
        trigger_pnl, trigger_orders, trigger_direction, trigger_price,
        day_of_week, hour_of_day
      ) VALUES (
        ${account_number}, ${round || 1}, NOW(),
        ${trigger_pnl || 0}, ${trigger_orders || 0},
        ${trigger_direction || null}, ${trigger_price || 0},
        ${dayOfWeek}, ${hourOfDay}
      )
      RETURNING id
    `;

    return NextResponse.json({ id: result[0].id, ok: true }, { headers });
  } catch (error) {
    console.error('AW Event POST error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500, headers });
  }
}

/**
 * PATCH /api/aw-events — EA sends when AW ends
 * Body: { id, peak_dd, end_pnl, end_reason, aw_orders_max }
 */
export async function PATCH(request: NextRequest) {
  try {
    if (!authEA(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers });
    }

    const body = await request.json();
    const { id, peak_dd, end_pnl, end_reason, aw_orders_max } = body;

    if (!id) {
      return NextResponse.json({ error: 'id required' }, { status: 400, headers });
    }

    await sql`
      UPDATE aw_events SET
        ended_at = NOW(),
        peak_dd = ${peak_dd || 0},
        aw_orders_max = ${aw_orders_max || 0},
        end_pnl = ${end_pnl || 0},
        end_reason = ${end_reason || 'UNKNOWN'},
        duration_minutes = EXTRACT(EPOCH FROM (NOW() - triggered_at))::int / 60
      WHERE id = ${id}
    `;

    return NextResponse.json({ ok: true }, { headers });
  } catch (error) {
    console.error('AW Event PATCH error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500, headers });
  }
}

/**
 * GET /api/aw-events?account=all&days=90 — Dashboard reads AW history
 */
export async function GET(request: NextRequest) {
  try {
    // Dashboard auth (JWT)
    const auth = await getSessionAndAccounts();
    if (!auth) {
      // Also allow EA API key
      if (!authEA(request)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers });
      }
    }

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '90');
    const account = searchParams.get('account') || 'all';

    let rows;
    if (account === 'all') {
      rows = await sql`
        SELECT e.*, a.name as account_name
        FROM aw_events e
        LEFT JOIN accounts a ON e.account_number = a.account_number
        WHERE e.triggered_at > NOW() - make_interval(days => ${days})
        ORDER BY e.triggered_at DESC
      `;
    } else {
      const accountNum = parseInt(account);
      rows = await sql`
        SELECT e.*, a.name as account_name
        FROM aw_events e
        LEFT JOIN accounts a ON e.account_number = a.account_number
        WHERE e.account_number = ${accountNum}
          AND e.triggered_at > NOW() - make_interval(days => ${days})
        ORDER BY e.triggered_at DESC
      `;
    }

    // Summary stats
    const completed = rows.filter((r: any) => r.ended_at);
    const avgDuration = completed.length > 0
      ? Math.round(completed.reduce((s: number, r: any) => s + (Number(r.duration_minutes) || 0), 0) / completed.length)
      : 0;
    const avgTriggerPnl = rows.length > 0
      ? Number((rows.reduce((s: number, r: any) => s + (Number(r.trigger_pnl) || 0), 0) / rows.length).toFixed(2))
      : 0;

    return NextResponse.json({
      events: rows,
      summary: {
        total: rows.length,
        active: rows.length - completed.length,
        completed: completed.length,
        avg_duration_min: avgDuration,
        avg_trigger_pnl: avgTriggerPnl,
      },
    }, { headers });
  } catch (error) {
    console.error('AW Event GET error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500, headers });
  }
}
