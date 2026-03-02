import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { computeLockStatus, type AccountForLock } from '@/lib/lock';

export const dynamic = 'force-dynamic';

/**
 * GET /api/lock-status/[account_number]?key=<EA_API_KEY>
 * EA calls this before opening orders. Fail-safe: errors return is_locked: true
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { account_number: string } }
) {
  const headers = { 'Cache-Control': 'no-store, no-cache, must-revalidate' };

  try {
    // Auth: API key via query param or header
    const apiKey =
      request.nextUrl.searchParams.get('key') ||
      request.headers.get('X-API-Key');

    if (!apiKey || apiKey !== process.env.EA_API_KEY) {
      return NextResponse.json(
        { error: 'Unauthorized', is_locked: true },
        { status: 401, headers }
      );
    }

    const accountNumber = parseInt(params.account_number);
    if (isNaN(accountNumber)) {
      return NextResponse.json(
        { error: 'Invalid account number', is_locked: true },
        { status: 400, headers }
      );
    }

    // Fetch the target account's pair_group
    const targetRows = await sql`
      SELECT a.account_number, a.pair_group
      FROM accounts a
      WHERE a.account_number = ${accountNumber} AND a.is_active = TRUE
    `;

    if (targetRows.length === 0) {
      return NextResponse.json(
        { error: 'Account not found', is_locked: true },
        { status: 404, headers }
      );
    }

    const pairGroup = targetRows[0].pair_group;

    // No pair group = never locked
    if (!pairGroup) {
      return NextResponse.json({
        account_number: accountNumber,
        is_locked: false,
        lock_reason: null,
        locked_by: null,
        pair_group: null,
        timestamp: new Date().toISOString(),
      }, { headers });
    }

    // Fetch all accounts in the same pair group with snapshots
    const pairRows = await sql`
      SELECT a.account_number, a.pair_group,
             COALESCE(s.aw_orders, 0) as aw_orders,
             COALESCE(s.open_orders, 0) as open_orders,
             COALESCE(s.floating_pnl, 0) as floating_pnl
      FROM accounts a
      LEFT JOIN snapshots s ON a.account_number = s.account_number
      WHERE a.pair_group = ${pairGroup} AND a.is_active = TRUE
    `;

    const allAccounts: AccountForLock[] = pairRows.map((r) => ({
      account_number: Number(r.account_number),
      pair_group: r.pair_group || '',
      aw_orders: Number(r.aw_orders) || 0,
      open_orders: Number(r.open_orders) || 0,
      floating_pnl: Number(r.floating_pnl) || 0,
    }));

    const target = allAccounts.find((a) => a.account_number === accountNumber)!;
    const lock = computeLockStatus(target, allAccounts);

    return NextResponse.json({
      account_number: accountNumber,
      is_locked: lock.is_locked,
      lock_reason: lock.lock_reason,
      lock_reasons: lock.lock_reasons,
      locked_by: lock.locked_by,
      pair_group: pairGroup,
      timestamp: new Date().toISOString(),
    }, { headers });
  } catch (error) {
    console.error('Lock status API error:', error);
    // Fail-safe: on error, lock the account
    return NextResponse.json(
      { error: 'Internal server error', is_locked: true },
      { status: 500, headers }
    );
  }
}
