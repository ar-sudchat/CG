import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/** GET /api/notify-settings — get current user's notify settings */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const rows = await sql`
      SELECT notify_token, notify_enabled,
             notify_server, notify_tp, notify_aw, notify_mg,
             notify_accounts
      FROM users WHERE id = ${session.userId}
    `;
    if (rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const u = rows[0];
    // Get user's assigned accounts for the UI
    const accounts = await sql`
      SELECT ua.account_number, a.name
      FROM user_accounts ua
      JOIN accounts a ON ua.account_number = a.account_number
      WHERE ua.user_id = ${session.userId} AND ua.is_active = TRUE AND a.is_active = TRUE
      ORDER BY a.name
    `;

    return NextResponse.json({
      notify_token: u.notify_token || '',
      notify_enabled: u.notify_enabled !== false,
      notify_server: u.notify_server !== false,
      notify_tp: u.notify_tp === true,
      notify_aw: u.notify_aw !== false,
      notify_mg: u.notify_mg !== false,
      notify_accounts: u.notify_accounts || [],  // empty = all
      accounts: accounts.map((a: any) => ({ account_number: Number(a.account_number), name: a.name })),
    });
  } catch (error) {
    console.error('Notify settings GET error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

/** PATCH /api/notify-settings — update notify settings */
export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const id = session.userId;

    if (body.notify_token !== undefined) {
      await sql`UPDATE users SET notify_token = ${body.notify_token || null} WHERE id = ${id}`;
    }
    if (body.notify_enabled !== undefined) {
      await sql`UPDATE users SET notify_enabled = ${body.notify_enabled} WHERE id = ${id}`;
    }
    if (body.notify_server !== undefined) {
      await sql`UPDATE users SET notify_server = ${body.notify_server} WHERE id = ${id}`;
    }
    if (body.notify_tp !== undefined) {
      await sql`UPDATE users SET notify_tp = ${body.notify_tp} WHERE id = ${id}`;
    }
    if (body.notify_aw !== undefined) {
      await sql`UPDATE users SET notify_aw = ${body.notify_aw} WHERE id = ${id}`;
    }
    if (body.notify_mg !== undefined) {
      await sql`UPDATE users SET notify_mg = ${body.notify_mg} WHERE id = ${id}`;
    }
    if (body.notify_accounts !== undefined) {
      const arr = body.notify_accounts.length > 0 ? body.notify_accounts : null;
      await sql`UPDATE users SET notify_accounts = ${arr} WHERE id = ${id}`;
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Notify settings PATCH error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

/** POST /api/notify-settings — test send notification */
export async function POST() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const rows = await sql`SELECT notify_token FROM users WHERE id = ${session.userId}`;
    const token = rows[0]?.notify_token;
    if (!token) return NextResponse.json({ error: 'No token configured' }, { status: 400 });

    const res = await fetch('https://www.akara01.com/api/notify', {
      method: 'POST',
      headers: {
        'Authorization': token,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `message=${encodeURIComponent('\n✅ ClevrGold Test\nการแจ้งเตือนทำงานปกติ')}`,
    });

    if (res.ok) {
      return NextResponse.json({ ok: true, message: 'Test message sent!' });
    } else {
      const text = await res.text();
      return NextResponse.json({ error: `Send failed: ${res.status} ${text}` }, { status: 400 });
    }
  } catch (error) {
    console.error('Notify test error:', error);
    return NextResponse.json({ error: 'Failed to send' }, { status: 500 });
  }
}
