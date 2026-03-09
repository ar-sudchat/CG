import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const accountNumber = parseInt(params.id);
    if (isNaN(accountNumber)) {
      return NextResponse.json({ error: 'Invalid account number' }, { status: 400 });
    }

    // Admin can edit anything. Users need can_edit permission.
    if (session.role !== 'admin') {
      const perm = await sql`
        SELECT can_edit FROM user_accounts
        WHERE user_id = ${session.userId} AND account_number = ${accountNumber}
      `;
      if (perm.length === 0 || !perm[0].can_edit) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const body = await request.json();
    const {
      name, owner, initial_deposit, description,
      broker, leverage, account_type, currency,
      avatar_url, avatar_text, ea_strategy, pair_with, is_active, notes,
    } = body;

    // pair_with: account number to pair with, null = unpair, undefined = no change
    const hasPairChange = pair_with !== undefined;

    // Check at least one field is provided
    const hasUpdate = [name, owner, initial_deposit, description, broker, leverage, account_type, currency, avatar_url, avatar_text, ea_strategy, notes].some(v => v !== undefined)
      || is_active !== undefined || hasPairChange;

    if (!hasUpdate) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    // Handle pairing logic (1:1 — each pair is exactly 2 accounts)
    let newPairGroup: string | null | undefined = undefined; // undefined = no change
    if (hasPairChange) {
      // First, remove this account from its current pair group
      const currentRows = await sql`
        SELECT pair_group FROM accounts WHERE account_number = ${accountNumber}
      `;
      const currentPG = currentRows[0]?.pair_group;
      if (currentPG) {
        // Clear this account's pair_group, then check if old partner is alone
        await sql`UPDATE accounts SET pair_group = NULL WHERE account_number = ${accountNumber}`;
        const remaining = await sql`
          SELECT COUNT(*) as cnt FROM accounts WHERE pair_group = ${currentPG}
        `;
        if (Number(remaining[0].cnt) <= 1) {
          // Old partner is alone → clear their pair_group too
          await sql`UPDATE accounts SET pair_group = NULL WHERE pair_group = ${currentPG}`;
        }
      }

      if (pair_with === null) {
        // Unpair: already cleared above
        newPairGroup = null;
      } else {
        // Create a new pair group for these 2 accounts
        const maxRows = await sql`
          SELECT pair_group FROM accounts
          WHERE pair_group IS NOT NULL AND pair_group != ''
          ORDER BY pair_group DESC LIMIT 1
        `;
        const maxNum = maxRows.length > 0 ? parseInt(maxRows[0].pair_group) || 0 : 0;
        newPairGroup = String(maxNum + 1);

        // Remove target from its old pair group first
        const targetRows = await sql`
          SELECT pair_group FROM accounts WHERE account_number = ${pair_with}
        `;
        if (targetRows.length === 0) {
          return NextResponse.json({ error: 'Target account not found' }, { status: 400 });
        }
        const targetPG = targetRows[0]?.pair_group;
        if (targetPG) {
          await sql`UPDATE accounts SET pair_group = NULL WHERE account_number = ${pair_with}`;
          const targetRemaining = await sql`
            SELECT COUNT(*) as cnt FROM accounts WHERE pair_group = ${targetPG}
          `;
          if (Number(targetRemaining[0].cnt) <= 1) {
            await sql`UPDATE accounts SET pair_group = NULL WHERE pair_group = ${targetPG}`;
          }
        }

        // Set target's pair_group to the new group
        await sql`UPDATE accounts SET pair_group = ${newPairGroup} WHERE account_number = ${pair_with}`;
      }
    }

    await sql`
      UPDATE accounts
      SET
        name = COALESCE(${name ?? null}, name),
        owner = COALESCE(${owner ?? null}, owner),
        initial_deposit = COALESCE(${initial_deposit !== undefined ? initial_deposit : null}, initial_deposit),
        description = COALESCE(${description ?? null}, description),
        broker = COALESCE(${broker ?? null}, broker),
        leverage = COALESCE(${leverage ?? null}, leverage),
        account_type = COALESCE(${account_type ?? null}, account_type),
        currency = COALESCE(${currency ?? null}, currency),
        avatar_url = COALESCE(${avatar_url ?? null}, avatar_url),
        avatar_text = COALESCE(${avatar_text ?? null}, avatar_text),
        ea_strategy = COALESCE(${ea_strategy ?? null}, ea_strategy),
        pair_group = CASE WHEN ${newPairGroup !== undefined}::boolean THEN ${newPairGroup ?? null}::varchar ELSE pair_group END,
        notes = COALESCE(${notes ?? null}, notes),
        is_active = CASE WHEN ${is_active !== undefined}::boolean THEN ${is_active ?? null}::boolean ELSE is_active END
      WHERE account_number = ${accountNumber}
    `;

    // Return updated account
    const rows = await sql`
      SELECT account_number, name, owner, initial_deposit, server, is_active,
             description, broker, leverage, account_type, currency, avatar_url, avatar_text, ea_strategy, pair_group, notes
      FROM accounts
      WHERE account_number = ${accountNumber}
    `;

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    return NextResponse.json({ account: rows[0] });
  } catch (error) {
    console.error('Account update error:', error);
    return NextResponse.json({ error: 'Failed to update account' }, { status: 500 });
  }
}
