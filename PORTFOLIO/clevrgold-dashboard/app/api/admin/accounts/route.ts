import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { account_number, name, owner, pair_group, initial_deposit } = body;

    if (!account_number || !name) {
      return NextResponse.json({ error: 'account_number and name are required' }, { status: 400 });
    }

    const existing = await sql`SELECT id FROM accounts WHERE account_number = ${account_number}`;
    if (existing.length > 0) {
      return NextResponse.json({ error: 'Account already exists' }, { status: 409 });
    }

    const result = await sql`
      INSERT INTO accounts (account_number, name, owner, pair_group, initial_deposit)
      VALUES (${account_number}, ${name}, ${owner || name}, ${pair_group || 'XAUUSD'}, ${initial_deposit || 0})
      RETURNING account_number, name
    `;

    return NextResponse.json({ account: result[0] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
