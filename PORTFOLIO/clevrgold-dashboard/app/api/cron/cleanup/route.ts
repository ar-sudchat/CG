import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

async function countBH() {
  const r = await sql`SELECT count(*)::int as c FROM balance_history`;
  return r[0].c;
}
async function countTrades() {
  const r = await sql`SELECT count(*)::int as c FROM trades`;
  return r[0].c;
}
async function countAW() {
  const r = await sql`SELECT count(*)::int as c FROM aw_events`;
  return r[0].c;
}
async function countAlerts() {
  const r = await sql`SELECT count(*)::int as c FROM alerts`;
  return r[0].c;
}
async function countFE() {
  const r = await sql`SELECT count(*)::int as c FROM financial_entries`;
  return r[0].c;
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const stats: Record<string, { before: number; after: number }> = {};

  // ─── balance_history ───────────────────────────────────
  // Designed for: 5 users, up to 50 accounts, Neon Free Tier (512 MB)
  // 0-7 days:  keep all (5-min granularity for 1D/7D chart)
  // 7-60 days: keep 1 row per hour per account (30D chart)
  // 60+ days:  delete (daily_summary covers long-term view)

  const bhBefore = await countBH();

  await sql`DELETE FROM balance_history WHERE account_number = 0`;

  // Delete everything older than 60 days
  await sql`DELETE FROM balance_history WHERE recorded_at < NOW() - INTERVAL '60 days'`;

  // Downsample 7-60 days to hourly
  await sql`
    DELETE FROM balance_history
    WHERE recorded_at < NOW() - INTERVAL '7 days'
      AND recorded_at >= NOW() - INTERVAL '60 days'
      AND id NOT IN (
        SELECT DISTINCT ON (account_number, date_trunc('hour', recorded_at)) id
        FROM balance_history
        WHERE recorded_at < NOW() - INTERVAL '7 days'
          AND recorded_at >= NOW() - INTERVAL '60 days'
        ORDER BY account_number, date_trunc('hour', recorded_at), recorded_at ASC
      )
  `;

  stats.balance_history = { before: bhBefore, after: await countBH() };

  // ─── trades ────────────────────────────────────────────
  // Dashboard queries max 90 days. Keep 6 months.
  // Aggregate into daily_summary before deleting.

  const trBefore = await countTrades();

  await sql`
    INSERT INTO daily_summary (account_number, date, pnl, tp_count)
    SELECT
      account_number,
      close_time::date as date,
      SUM(profit)::decimal as pnl,
      count(*)::int as tp_count
    FROM trades
    WHERE close_time < NOW() - INTERVAL '6 months'
    GROUP BY account_number, close_time::date
    ON CONFLICT (account_number, date)
    DO UPDATE SET
      pnl = EXCLUDED.pnl,
      tp_count = EXCLUDED.tp_count
  `;

  await sql`DELETE FROM trades WHERE close_time < NOW() - INTERVAL '6 months'`;

  stats.trades = { before: trBefore, after: await countTrades() };

  // ─── aw_events ─────────────────────────────────────────
  // AW report queries max 90 days. Keep 6 months.

  const awBefore = await countAW();
  await sql`DELETE FROM aw_events WHERE triggered_at < NOW() - INTERVAL '180 days'`;
  stats.aw_events = { before: awBefore, after: await countAW() };

  // ─── alerts ────────────────────────────────────────────
  // Keep unread forever. Delete read alerts older than 90 days.

  const alBefore = await countAlerts();
  await sql`DELETE FROM alerts WHERE is_read = TRUE AND created_at < NOW() - INTERVAL '90 days'`;
  stats.alerts = { before: alBefore, after: await countAlerts() };

  // ─── financial_entries ─────────────────────────────────
  // Withdrawal records — keep 2 years for accounting/tax.

  const feBefore = await countFE();
  await sql`DELETE FROM financial_entries WHERE entry_date < NOW() - INTERVAL '2 years'`;
  stats.financial_entries = { before: feBefore, after: await countFE() };

  return NextResponse.json({
    ok: true,
    timestamp: new Date().toISOString(),
    stats,
  });
}
