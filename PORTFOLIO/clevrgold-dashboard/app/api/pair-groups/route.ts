import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { getSessionAndAccounts } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const auth = await getSessionAndAccounts();
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const filterClause = auth.accountFilter !== null;
    const rows = filterClause
      ? await sql`
          SELECT account_number, name, owner, ea_strategy, pair_group,
                 COALESCE(auto_lock_enabled, true) as auto_lock_enabled,
                 COALESCE(auto_lock_threshold, 3.0) as auto_lock_threshold
          FROM accounts
          WHERE is_active = true AND account_number = ANY(${auth.accountFilter})
          ORDER BY name, account_number
        `
      : await sql`
          SELECT account_number, name, owner, ea_strategy, pair_group,
                 COALESCE(auto_lock_enabled, true) as auto_lock_enabled,
                 COALESCE(auto_lock_threshold, 3.0) as auto_lock_threshold
          FROM accounts
          WHERE is_active = true
          ORDER BY name, account_number
        `;

    return NextResponse.json({
      accounts: rows.map((r) => ({
        account_number: r.account_number,
        name: r.name || String(r.account_number),
        owner: r.owner || '',
        ea_strategy: r.ea_strategy || '',
        pair_group: r.pair_group || '',
        auto_lock_enabled: r.auto_lock_enabled,
        auto_lock_threshold: Number(r.auto_lock_threshold),
      })),
    });
  } catch (error) {
    console.error('Pair groups API error:', error);
    return NextResponse.json({ error: 'Failed to fetch pair groups' }, { status: 500 });
  }
}

/**
 * PATCH /api/pair-groups — Toggle auto-lock or set threshold for a pair group
 * Body: { pair_group: string, auto_lock_enabled?: boolean, auto_lock_threshold?: number }
 */
export async function PATCH(request: NextRequest) {
  try {
    const auth = await getSessionAndAccounts();
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { pair_group, auto_lock_enabled, auto_lock_threshold } = body;

    if (!pair_group) {
      return NextResponse.json({ error: 'pair_group required' }, { status: 400 });
    }

    // Bulk: pair_group = "all" → update only user's assigned accounts
    const isAll = pair_group === 'all';
    const allowed = auth.accountFilter; // number[] of user's accounts

    if (auto_lock_enabled !== undefined) {
      if (isAll) {
        if (allowed && allowed.length > 0) {
          await sql`UPDATE accounts SET auto_lock_enabled = ${auto_lock_enabled} WHERE is_active = TRUE AND account_number = ANY(${allowed})`;
          // Auto On → evaluate lock logic immediately
          // Auto Off → unlock all (no auto managing anymore)
          if (!auto_lock_enabled) {
            // Auto Off → unlock all, let user control manually
            await sql`UPDATE accounts SET manual_lock = FALSE WHERE is_active = TRUE AND account_number = ANY(${allowed})`;
          }
          // Auto On → just enable the flag, don't lock/unlock immediately
          // Python sync will monitor and lock when conditions are met going forward
        }
      } else {
        if (allowed && allowed.length > 0) {
          await sql`UPDATE accounts SET auto_lock_enabled = ${auto_lock_enabled} WHERE pair_group = ${pair_group} AND account_number = ANY(${allowed})`;
          if (!auto_lock_enabled) {
            // Auto Off → unlock pair, let user control manually
            await sql`UPDATE accounts SET manual_lock = FALSE WHERE pair_group = ${pair_group} AND account_number = ANY(${allowed})`;
          }
          // Auto On → just enable the flag for this pair group
        }
      }
    }

    if (auto_lock_threshold !== undefined) {
      const threshold = Math.max(0, Number(auto_lock_threshold));
      if (isAll) {
        if (allowed && allowed.length > 0) {
          await sql`UPDATE accounts SET auto_lock_threshold = ${threshold} WHERE is_active = TRUE AND account_number = ANY(${allowed})`;
        }
      } else {
        if (allowed && allowed.length > 0) {
          await sql`UPDATE accounts SET auto_lock_threshold = ${threshold} WHERE pair_group = ${pair_group} AND account_number = ANY(${allowed})`;
        }
      }
    }

    return NextResponse.json({ ok: true, pair_group });
  } catch (error) {
    console.error('Pair groups PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update pair group' }, { status: 500 });
  }
}
