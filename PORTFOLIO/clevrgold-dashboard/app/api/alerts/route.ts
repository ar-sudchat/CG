import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { getSessionAndAccounts } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = await getSessionAndAccounts();
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const unread = searchParams.get('unread') === 'true';

    let alerts;
    const af = auth.accountFilter;

    if (unread) {
      alerts = af === null
        ? await sql`
          SELECT id, account_number, type, message, severity, created_at, is_read
          FROM alerts WHERE is_read = FALSE
          ORDER BY created_at DESC LIMIT 50
        `
        : await sql`
          SELECT id, account_number, type, message, severity, created_at, is_read
          FROM alerts WHERE is_read = FALSE AND account_number = ANY(${af})
          ORDER BY created_at DESC LIMIT 50
        `;
    } else {
      alerts = af === null
        ? await sql`
          SELECT id, account_number, type, message, severity, created_at, is_read
          FROM alerts
          ORDER BY created_at DESC LIMIT 50
        `
        : await sql`
          SELECT id, account_number, type, message, severity, created_at, is_read
          FROM alerts WHERE account_number = ANY(${af})
          ORDER BY created_at DESC LIMIT 50
        `;
    }

    return NextResponse.json({
      alerts: alerts.map((a) => ({
        id: a.id,
        account_number: a.account_number,
        type: a.type,
        message: a.message,
        severity: a.severity,
        created_at: a.created_at,
        is_read: a.is_read,
      })),
    }, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
    });
  } catch (error) {
    console.error('Alerts API error:', error);
    return NextResponse.json({ error: 'Failed to fetch alerts' }, { status: 500 });
  }
}
