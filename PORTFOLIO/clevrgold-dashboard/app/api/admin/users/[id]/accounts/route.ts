import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = parseInt(params.id);
    const rows = await sql`
      SELECT account_number, can_edit, is_active FROM user_accounts WHERE user_id = ${userId}
    `;
    return NextResponse.json({
      accounts: rows.map((r) => ({
        account_number: Number(r.account_number),
        can_edit: r.can_edit,
        is_active: r.is_active,
      })),
    });
  } catch (error) {
    console.error('Admin user accounts error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = parseInt(params.id);
    const { accounts } = await request.json();
    // accounts: Array<{ account_number: number, can_edit?: boolean }>

    // Delete existing assignments
    await sql`DELETE FROM user_accounts WHERE user_id = ${userId}`;

    // Insert new assignments
    for (const a of accounts) {
      await sql`
        INSERT INTO user_accounts (user_id, account_number, can_edit)
        VALUES (${userId}, ${a.account_number}, ${a.can_edit || false})
      `;
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Admin assign accounts error:', error);
    return NextResponse.json({ error: 'Failed to assign accounts' }, { status: 500 });
  }
}
