import { NextResponse } from 'next/server';
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
          SELECT account_number, name, owner, ea_strategy, pair_group
          FROM accounts
          WHERE is_active = true AND account_number = ANY(${auth.accountFilter})
          ORDER BY name, account_number
        `
      : await sql`
          SELECT account_number, name, owner, ea_strategy, pair_group
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
      })),
    });
  } catch (error) {
    console.error('Pair groups API error:', error);
    return NextResponse.json({ error: 'Failed to fetch pair groups' }, { status: 500 });
  }
}
