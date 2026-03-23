import { NextResponse } from 'next/server';
import sql from '@/lib/db';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const users = await sql`
      SELECT
        u.id, u.username, u.display_name, u.role, u.is_approved, u.created_at,
        COUNT(ua.account_number) as account_count
      FROM users u
      LEFT JOIN user_accounts ua ON u.id = ua.user_id
      GROUP BY u.id
      ORDER BY u.created_at DESC
    `;

    // Get all accounts for assignment UI (including inactive)
    const accounts = await sql`
      SELECT account_number, name, owner, is_active FROM accounts ORDER BY account_number
    `;

    return NextResponse.json({
      users: users.map((u) => ({
        id: u.id,
        username: u.username,
        display_name: u.display_name,
        role: u.role,
        is_approved: u.is_approved,
        account_count: Number(u.account_count) || 0,
        created_at: u.created_at,
      })),
      accounts: accounts.map((a) => ({
        account_number: a.account_number,
        name: a.name,
        owner: a.owner,
        is_active: a.is_active,
      })),
    });
  } catch (error) {
    console.error('Admin users error:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}
