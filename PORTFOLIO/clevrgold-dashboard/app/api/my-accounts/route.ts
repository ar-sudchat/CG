import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (session.role === 'admin') {
      // Admin sees all globally-active accounts; user_is_active reflects this
      // admin's own user_accounts row (used by UI to pre-select "their" accounts)
      const rows = await sql`
        SELECT a.account_number, a.name, a.owner,
               s.balance, s.equity,
               COALESCE(ua.is_active, FALSE) AS user_is_active
        FROM accounts a
        LEFT JOIN snapshots s ON a.account_number = s.account_number
        LEFT JOIN user_accounts ua
          ON ua.account_number = a.account_number AND ua.user_id = ${session.userId}
        WHERE a.is_active = TRUE
        ORDER BY a.account_number
      `;
      return NextResponse.json({
        accounts: rows.map((r) => ({
          account_number: Number(r.account_number),
          name: r.name,
          owner: r.owner,
          balance: Number(r.balance) || 0,
          equity: Number(r.equity) || 0,
          is_active: true,
          user_is_active: r.user_is_active === true,
        })),
      });
    }

    const rows = await sql`
      SELECT a.account_number, a.name, a.owner,
             s.balance, s.equity, ua.is_active
      FROM user_accounts ua
      JOIN accounts a ON ua.account_number = a.account_number
      LEFT JOIN snapshots s ON a.account_number = s.account_number
      WHERE ua.user_id = ${session.userId} AND a.is_active = TRUE
      ORDER BY a.account_number
    `;

    return NextResponse.json({
      accounts: rows.map((r) => ({
        account_number: Number(r.account_number),
        name: r.name,
        owner: r.owner,
        balance: Number(r.balance) || 0,
        equity: Number(r.equity) || 0,
        is_active: r.is_active,
        user_is_active: r.is_active === true,
      })),
    });
  } catch (error) {
    console.error('My accounts error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { account_number, is_active } = await request.json();

    if (session.role === 'admin') {
      // Admin toggles the global is_active on accounts table
      await sql`UPDATE accounts SET is_active = ${is_active} WHERE account_number = ${account_number}`;
    } else {
      await sql`
        UPDATE user_accounts SET is_active = ${is_active}
        WHERE user_id = ${session.userId} AND account_number = ${account_number}
      `;
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('My accounts toggle error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
