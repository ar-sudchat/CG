import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { getSessionAndAccounts } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/** PATCH /api/account/[id]/lock — toggle manual lock
 *  Special: id = "all" → lock/unlock user's assigned accounts only
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await getSessionAndAccounts();
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    // Support tri-state: true (force lock), false (force unlock), null (auto)
    const manualLock = body.manual_lock === null || body.manual_lock === undefined
      ? null
      : body.manual_lock === true;

    const allowed = auth.accountFilter; // number[] of user's accounts

    // Bulk lock/unlock — only user's accounts
    // Manual override → disable auto_lock so it won't flip back
    if (params.id === 'all') {
      if (allowed && allowed.length > 0) {
        if (manualLock === null) {
          await sql`UPDATE accounts SET manual_lock = NULL WHERE is_active = TRUE AND account_number = ANY(${allowed})`;
        } else {
          await sql`UPDATE accounts SET manual_lock = ${manualLock}, auto_lock_enabled = FALSE WHERE is_active = TRUE AND account_number = ANY(${allowed})`;
        }
      }
      return NextResponse.json({ all: true, manual_lock: manualLock, affected: allowed?.length || 0 });
    }

    // Single account — check permission
    const accountNumber = parseInt(params.id);
    if (isNaN(accountNumber)) {
      return NextResponse.json({ error: 'Invalid account number' }, { status: 400 });
    }

    if (allowed && !allowed.includes(accountNumber)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Manual override → disable auto_lock so it won't flip back
    if (manualLock === null) {
      await sql`UPDATE accounts SET manual_lock = NULL WHERE account_number = ${accountNumber}`;
    } else {
      await sql`UPDATE accounts SET manual_lock = ${manualLock}, auto_lock_enabled = FALSE WHERE account_number = ${accountNumber}`;
    }

    return NextResponse.json({ account_number: accountNumber, manual_lock: manualLock });
  } catch (error) {
    console.error('Lock toggle error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
