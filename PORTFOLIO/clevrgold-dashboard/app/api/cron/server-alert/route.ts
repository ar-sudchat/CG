import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const STALE_SECONDS = 180; // 3 minutes

/**
 * GET /api/cron/server-alert
 * Checks for stale accounts with open orders and notifies users via LINE (AKARA 01)
 * Run every 1-2 minutes via Vercel Cron
 */
/**
 * Can be called by:
 * 1. Vercel Cron (with CRON_SECRET)
 * 2. Internal call from portfolio API (with internal header)
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const internalKey = request.headers.get('x-internal-key');
  const isAuthed = authHeader === `Bearer ${process.env.CRON_SECRET}` ||
                   internalKey === process.env.CRON_SECRET;
  if (!isAuthed) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Find accounts that are stale AND have open orders
    const staleAccounts = await sql`
      SELECT
        s.account_number,
        a.name,
        s.open_orders,
        s.aw_orders,
        EXTRACT(EPOCH FROM (NOW() - s.updated_at))::int as seconds_ago
      FROM snapshots s
      JOIN accounts a ON s.account_number = a.account_number
      WHERE a.is_active = TRUE
        AND EXTRACT(EPOCH FROM (NOW() - s.updated_at)) > ${STALE_SECONDS}
        AND (s.open_orders > 0 OR s.aw_orders > 0)
    `;

    if (staleAccounts.length === 0) {
      return NextResponse.json({ ok: true, alerts_sent: 0, reason: 'no stale accounts' });
    }

    // Get all users who have notify_token + notify_enabled
    const users = await sql`
      SELECT u.id, u.notify_token, u.display_name
      FROM users u
      WHERE u.notify_token IS NOT NULL
        AND u.notify_enabled = TRUE
    `;

    if (users.length === 0) {
      return NextResponse.json({ ok: true, alerts_sent: 0, reason: 'no users with notify token' });
    }

    // For each user, find which stale accounts they manage
    let alertsSent = 0;
    for (const user of users) {
      // Get user's assigned accounts
      const userAccounts = await sql`
        SELECT account_number FROM user_accounts
        WHERE user_id = ${user.id} AND is_active = TRUE
      `;
      const userAccountNums = new Set(userAccounts.map((r: any) => Number(r.account_number)));

      // Filter stale accounts to only those this user manages
      const userStale = staleAccounts.filter((a: any) => userAccountNums.has(Number(a.account_number)));

      if (userStale.length === 0) continue;

      // Check if we already sent an alert recently (prevent spam)
      const recentAlert = await sql`
        SELECT id FROM line_alerts_log
        WHERE user_id = ${user.id}
          AND alert_type = 'server_stale'
          AND sent_at > NOW() - INTERVAL '5 minutes'
        LIMIT 1
      `;

      if (recentAlert.length > 0) continue; // Already alerted recently

      // Build message
      const lines = userStale.map((a: any) => {
        const mins = Math.round(a.seconds_ago / 60);
        const orders = a.open_orders + a.aw_orders;
        return `⚠️ ${a.account_number} ${a.name}\n   ${orders} orders open, offline ${mins}m`;
      });

      const message = `\n🚨 SERVER DOWN — ORDERS AT RISK\n\n${lines.join('\n\n')}\n\nกรุณาตรวจสอบ VPS ทันที!`;

      // Send via AKARA 01
      try {
        const res = await fetch('https://www.akara01.com/api/notify', {
          method: 'POST',
          headers: {
            'Authorization': user.notify_token,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: `message=${encodeURIComponent(message)}`,
        });

        if (res.ok) {
          alertsSent++;
          // Log the alert to prevent spam
          await sql`
            INSERT INTO line_alerts_log (user_id, alert_type, message, sent_at)
            VALUES (${user.id}, 'server_stale', ${message}, NOW())
          `;
        }
      } catch (e) {
        console.error(`Failed to send LINE alert to user ${user.id}:`, e);
      }
    }

    return NextResponse.json({ ok: true, alerts_sent: alertsSent, stale_accounts: staleAccounts.length });
  } catch (error) {
    console.error('Server alert cron error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
