import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import sql from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    const rows = await sql`
      SELECT id, username, display_name, role, is_approved
      FROM users WHERE id = ${session.userId}
    `;

    if (rows.length === 0) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    const u = rows[0];
    return NextResponse.json({
      user: {
        id: u.id,
        username: u.username,
        display_name: u.display_name,
        role: u.role,
      },
    });
  } catch {
    return NextResponse.json({ user: null }, { status: 500 });
  }
}
