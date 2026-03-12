import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { getSessionAndAccounts } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const AW_MAGIC = 9751421;

export async function GET(request: NextRequest) {
  try {
    const auth = await getSessionAndAccounts();
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');
    const days = parseInt(searchParams.get('days') || '30');
    const accountFilter = auth.accountFilter;

    const useDateRange = !!fromParam;
    const fromDate = fromParam ? `${fromParam}T00:00:00` : null;
    const toDate = toParam ? `${toParam}T23:59:59` : (fromParam ? `${fromParam}T23:59:59` : null);

    // Helper to build WHERE clause fragments
    const accWhere = accountFilter !== null;

    // ── AW by account (from trades) ──
    const byAccount = accWhere
      ? (useDateRange
        ? await sql`
          SELECT t.account_number, a.name, COALESCE(a.avatar_text, '') as avatar_text,
                 COUNT(*)::int as aw_trades,
                 SUM(t.profit + COALESCE(t.swap,0) + COALESCE(t.commission,0)) as aw_pnl
          FROM trades t LEFT JOIN accounts a ON t.account_number = a.account_number
          WHERE t.magic_number = ${AW_MAGIC}
            AND (t.close_time + INTERVAL '5 hours') >= ${fromDate}::timestamp
            AND (t.close_time + INTERVAL '5 hours') <= ${toDate}::timestamp
            AND t.account_number = ANY(${accountFilter})
          GROUP BY t.account_number, a.name, a.avatar_text ORDER BY aw_trades DESC`
        : await sql`
          SELECT t.account_number, a.name, COALESCE(a.avatar_text, '') as avatar_text,
                 COUNT(*)::int as aw_trades,
                 SUM(t.profit + COALESCE(t.swap,0) + COALESCE(t.commission,0)) as aw_pnl
          FROM trades t LEFT JOIN accounts a ON t.account_number = a.account_number
          WHERE t.magic_number = ${AW_MAGIC}
            AND t.close_time > NOW() - make_interval(days => ${days})
            AND t.account_number = ANY(${accountFilter})
          GROUP BY t.account_number, a.name, a.avatar_text ORDER BY aw_trades DESC`)
      : (useDateRange
        ? await sql`
          SELECT t.account_number, a.name, COALESCE(a.avatar_text, '') as avatar_text,
                 COUNT(*)::int as aw_trades,
                 SUM(t.profit + COALESCE(t.swap,0) + COALESCE(t.commission,0)) as aw_pnl
          FROM trades t LEFT JOIN accounts a ON t.account_number = a.account_number
          WHERE t.magic_number = ${AW_MAGIC}
            AND (t.close_time + INTERVAL '5 hours') >= ${fromDate}::timestamp
            AND (t.close_time + INTERVAL '5 hours') <= ${toDate}::timestamp
          GROUP BY t.account_number, a.name, a.avatar_text ORDER BY aw_trades DESC`
        : await sql`
          SELECT t.account_number, a.name, COALESCE(a.avatar_text, '') as avatar_text,
                 COUNT(*)::int as aw_trades,
                 SUM(t.profit + COALESCE(t.swap,0) + COALESCE(t.commission,0)) as aw_pnl
          FROM trades t LEFT JOIN accounts a ON t.account_number = a.account_number
          WHERE t.magic_number = ${AW_MAGIC}
            AND t.close_time > NOW() - make_interval(days => ${days})
          GROUP BY t.account_number, a.name, a.avatar_text ORDER BY aw_trades DESC`);

    // ── AW by hour (Thai time) ──
    const byHour = accWhere
      ? (useDateRange
        ? await sql`
          SELECT EXTRACT(HOUR FROM close_time + INTERVAL '5 hours')::int as hour, COUNT(*)::int as count
          FROM trades WHERE magic_number = ${AW_MAGIC}
            AND (close_time + INTERVAL '5 hours') >= ${fromDate}::timestamp
            AND (close_time + INTERVAL '5 hours') <= ${toDate}::timestamp
            AND account_number = ANY(${accountFilter})
          GROUP BY hour ORDER BY hour`
        : await sql`
          SELECT EXTRACT(HOUR FROM close_time + INTERVAL '5 hours')::int as hour, COUNT(*)::int as count
          FROM trades WHERE magic_number = ${AW_MAGIC}
            AND close_time > NOW() - make_interval(days => ${days})
            AND account_number = ANY(${accountFilter})
          GROUP BY hour ORDER BY hour`)
      : (useDateRange
        ? await sql`
          SELECT EXTRACT(HOUR FROM close_time + INTERVAL '5 hours')::int as hour, COUNT(*)::int as count
          FROM trades WHERE magic_number = ${AW_MAGIC}
            AND (close_time + INTERVAL '5 hours') >= ${fromDate}::timestamp
            AND (close_time + INTERVAL '5 hours') <= ${toDate}::timestamp
          GROUP BY hour ORDER BY hour`
        : await sql`
          SELECT EXTRACT(HOUR FROM close_time + INTERVAL '5 hours')::int as hour, COUNT(*)::int as count
          FROM trades WHERE magic_number = ${AW_MAGIC}
            AND close_time > NOW() - make_interval(days => ${days})
          GROUP BY hour ORDER BY hour`);

    // ── AW by day of week ──
    const byDay = accWhere
      ? (useDateRange
        ? await sql`
          SELECT EXTRACT(DOW FROM close_time + INTERVAL '5 hours')::int as dow, COUNT(*)::int as count
          FROM trades WHERE magic_number = ${AW_MAGIC}
            AND (close_time + INTERVAL '5 hours') >= ${fromDate}::timestamp
            AND (close_time + INTERVAL '5 hours') <= ${toDate}::timestamp
            AND account_number = ANY(${accountFilter})
          GROUP BY dow ORDER BY dow`
        : await sql`
          SELECT EXTRACT(DOW FROM close_time + INTERVAL '5 hours')::int as dow, COUNT(*)::int as count
          FROM trades WHERE magic_number = ${AW_MAGIC}
            AND close_time > NOW() - make_interval(days => ${days})
            AND account_number = ANY(${accountFilter})
          GROUP BY dow ORDER BY dow`)
      : (useDateRange
        ? await sql`
          SELECT EXTRACT(DOW FROM close_time + INTERVAL '5 hours')::int as dow, COUNT(*)::int as count
          FROM trades WHERE magic_number = ${AW_MAGIC}
            AND (close_time + INTERVAL '5 hours') >= ${fromDate}::timestamp
            AND (close_time + INTERVAL '5 hours') <= ${toDate}::timestamp
          GROUP BY dow ORDER BY dow`
        : await sql`
          SELECT EXTRACT(DOW FROM close_time + INTERVAL '5 hours')::int as dow, COUNT(*)::int as count
          FROM trades WHERE magic_number = ${AW_MAGIC}
            AND close_time > NOW() - make_interval(days => ${days})
          GROUP BY dow ORDER BY dow`);

    // ── AW by week ──
    const byWeek = accWhere
      ? (useDateRange
        ? await sql`
          SELECT date_trunc('week', close_time + INTERVAL '5 hours')::date as week_start,
                 COUNT(*)::int as count,
                 SUM(profit + COALESCE(swap,0) + COALESCE(commission,0)) as pnl
          FROM trades WHERE magic_number = ${AW_MAGIC}
            AND (close_time + INTERVAL '5 hours') >= ${fromDate}::timestamp
            AND (close_time + INTERVAL '5 hours') <= ${toDate}::timestamp
            AND account_number = ANY(${accountFilter})
          GROUP BY week_start ORDER BY week_start`
        : await sql`
          SELECT date_trunc('week', close_time + INTERVAL '5 hours')::date as week_start,
                 COUNT(*)::int as count,
                 SUM(profit + COALESCE(swap,0) + COALESCE(commission,0)) as pnl
          FROM trades WHERE magic_number = ${AW_MAGIC}
            AND close_time > NOW() - make_interval(days => ${days})
            AND account_number = ANY(${accountFilter})
          GROUP BY week_start ORDER BY week_start`)
      : (useDateRange
        ? await sql`
          SELECT date_trunc('week', close_time + INTERVAL '5 hours')::date as week_start,
                 COUNT(*)::int as count,
                 SUM(profit + COALESCE(swap,0) + COALESCE(commission,0)) as pnl
          FROM trades WHERE magic_number = ${AW_MAGIC}
            AND (close_time + INTERVAL '5 hours') >= ${fromDate}::timestamp
            AND (close_time + INTERVAL '5 hours') <= ${toDate}::timestamp
          GROUP BY week_start ORDER BY week_start`
        : await sql`
          SELECT date_trunc('week', close_time + INTERVAL '5 hours')::date as week_start,
                 COUNT(*)::int as count,
                 SUM(profit + COALESCE(swap,0) + COALESCE(commission,0)) as pnl
          FROM trades WHERE magic_number = ${AW_MAGIC}
            AND close_time > NOW() - make_interval(days => ${days})
          GROUP BY week_start ORDER BY week_start`);

    // ── NEW: AW by date (daily breakdown) ──
    const byDate = accWhere
      ? (useDateRange
        ? await sql`
          SELECT (close_time + INTERVAL '5 hours')::date as trade_date,
                 COUNT(*)::int as count,
                 SUM(profit + COALESCE(swap,0) + COALESCE(commission,0)) as pnl
          FROM trades WHERE magic_number = ${AW_MAGIC}
            AND (close_time + INTERVAL '5 hours') >= ${fromDate}::timestamp
            AND (close_time + INTERVAL '5 hours') <= ${toDate}::timestamp
            AND account_number = ANY(${accountFilter})
          GROUP BY trade_date ORDER BY trade_date DESC`
        : await sql`
          SELECT (close_time + INTERVAL '5 hours')::date as trade_date,
                 COUNT(*)::int as count,
                 SUM(profit + COALESCE(swap,0) + COALESCE(commission,0)) as pnl
          FROM trades WHERE magic_number = ${AW_MAGIC}
            AND close_time > NOW() - make_interval(days => ${days})
            AND account_number = ANY(${accountFilter})
          GROUP BY trade_date ORDER BY trade_date DESC`)
      : (useDateRange
        ? await sql`
          SELECT (close_time + INTERVAL '5 hours')::date as trade_date,
                 COUNT(*)::int as count,
                 SUM(profit + COALESCE(swap,0) + COALESCE(commission,0)) as pnl
          FROM trades WHERE magic_number = ${AW_MAGIC}
            AND (close_time + INTERVAL '5 hours') >= ${fromDate}::timestamp
            AND (close_time + INTERVAL '5 hours') <= ${toDate}::timestamp
          GROUP BY trade_date ORDER BY trade_date DESC`
        : await sql`
          SELECT (close_time + INTERVAL '5 hours')::date as trade_date,
                 COUNT(*)::int as count,
                 SUM(profit + COALESCE(swap,0) + COALESCE(commission,0)) as pnl
          FROM trades WHERE magic_number = ${AW_MAGIC}
            AND close_time > NOW() - make_interval(days => ${days})
          GROUP BY trade_date ORDER BY trade_date DESC`);

    // ── NEW: AW Events (from aw_events table) ──
    const events = accWhere
      ? (useDateRange
        ? await sql`
          SELECT e.id, e.account_number, a.name as account_name, COALESCE(a.avatar_text,'') as avatar_text,
                 e.round, e.triggered_at, e.ended_at,
                 e.trigger_pnl, e.trigger_orders, e.trigger_direction, e.trigger_price,
                 e.peak_dd, e.end_pnl, e.end_reason, e.aw_orders_max, e.duration_minutes
          FROM aw_events e LEFT JOIN accounts a ON e.account_number = a.account_number
          WHERE (e.triggered_at + INTERVAL '5 hours') >= ${fromDate}::timestamp
            AND (e.triggered_at + INTERVAL '5 hours') <= ${toDate}::timestamp
            AND e.account_number = ANY(${accountFilter})
          ORDER BY e.triggered_at DESC LIMIT 200`
        : await sql`
          SELECT e.id, e.account_number, a.name as account_name, COALESCE(a.avatar_text,'') as avatar_text,
                 e.round, e.triggered_at, e.ended_at,
                 e.trigger_pnl, e.trigger_orders, e.trigger_direction, e.trigger_price,
                 e.peak_dd, e.end_pnl, e.end_reason, e.aw_orders_max, e.duration_minutes
          FROM aw_events e LEFT JOIN accounts a ON e.account_number = a.account_number
          WHERE e.triggered_at > NOW() - make_interval(days => ${days})
            AND e.account_number = ANY(${accountFilter})
          ORDER BY e.triggered_at DESC LIMIT 200`)
      : (useDateRange
        ? await sql`
          SELECT e.id, e.account_number, a.name as account_name, COALESCE(a.avatar_text,'') as avatar_text,
                 e.round, e.triggered_at, e.ended_at,
                 e.trigger_pnl, e.trigger_orders, e.trigger_direction, e.trigger_price,
                 e.peak_dd, e.end_pnl, e.end_reason, e.aw_orders_max, e.duration_minutes
          FROM aw_events e LEFT JOIN accounts a ON e.account_number = a.account_number
          WHERE (e.triggered_at + INTERVAL '5 hours') >= ${fromDate}::timestamp
            AND (e.triggered_at + INTERVAL '5 hours') <= ${toDate}::timestamp
          ORDER BY e.triggered_at DESC LIMIT 200`
        : await sql`
          SELECT e.id, e.account_number, a.name as account_name, COALESCE(a.avatar_text,'') as avatar_text,
                 e.round, e.triggered_at, e.ended_at,
                 e.trigger_pnl, e.trigger_orders, e.trigger_direction, e.trigger_price,
                 e.peak_dd, e.end_pnl, e.end_reason, e.aw_orders_max, e.duration_minutes
          FROM aw_events e LEFT JOIN accounts a ON e.account_number = a.account_number
          WHERE e.triggered_at > NOW() - make_interval(days => ${days})
          ORDER BY e.triggered_at DESC LIMIT 200`);

    // ── NEW: Recovery Stats (from aw_events) ──
    const recoveryRaw = accWhere
      ? await sql`
        SELECT
          COUNT(*)::int as total_events,
          COUNT(CASE WHEN ended_at IS NOT NULL THEN 1 END)::int as completed,
          COUNT(CASE WHEN ended_at IS NULL THEN 1 END)::int as active,
          COUNT(CASE WHEN end_reason = 'AW_TP' THEN 1 END)::int as win_count,
          COUNT(CASE WHEN end_reason IS NOT NULL AND end_reason != 'AW_TP' THEN 1 END)::int as loss_count,
          ROUND(AVG(CASE WHEN ended_at IS NOT NULL THEN duration_minutes END))::int as avg_duration,
          ROUND(AVG(CASE WHEN ended_at IS NOT NULL THEN peak_dd END)::numeric, 2) as avg_peak_dd,
          ROUND(AVG(trigger_pnl)::numeric, 2) as avg_trigger_pnl,
          ROUND(AVG(CASE WHEN ended_at IS NOT NULL THEN end_pnl END)::numeric, 2) as avg_end_pnl,
          COUNT(CASE WHEN trigger_direction = 'BUY' THEN 1 END)::int as buy_triggers,
          COUNT(CASE WHEN trigger_direction = 'SELL' THEN 1 END)::int as sell_triggers,
          MAX(CASE WHEN ended_at IS NOT NULL THEN duration_minutes END)::int as max_duration,
          MIN(CASE WHEN ended_at IS NOT NULL AND peak_dd IS NOT NULL THEN peak_dd END) as worst_dd
        FROM aw_events
        WHERE triggered_at > NOW() - make_interval(days => ${useDateRange ? 9999 : days})
          ${useDateRange ? sql`AND (triggered_at + INTERVAL '5 hours') >= ${fromDate}::timestamp AND (triggered_at + INTERVAL '5 hours') <= ${toDate}::timestamp` : sql``}
          AND account_number = ANY(${accountFilter})`
      : await sql`
        SELECT
          COUNT(*)::int as total_events,
          COUNT(CASE WHEN ended_at IS NOT NULL THEN 1 END)::int as completed,
          COUNT(CASE WHEN ended_at IS NULL THEN 1 END)::int as active,
          COUNT(CASE WHEN end_reason = 'AW_TP' THEN 1 END)::int as win_count,
          COUNT(CASE WHEN end_reason IS NOT NULL AND end_reason != 'AW_TP' THEN 1 END)::int as loss_count,
          ROUND(AVG(CASE WHEN ended_at IS NOT NULL THEN duration_minutes END))::int as avg_duration,
          ROUND(AVG(CASE WHEN ended_at IS NOT NULL THEN peak_dd END)::numeric, 2) as avg_peak_dd,
          ROUND(AVG(trigger_pnl)::numeric, 2) as avg_trigger_pnl,
          ROUND(AVG(CASE WHEN ended_at IS NOT NULL THEN end_pnl END)::numeric, 2) as avg_end_pnl,
          COUNT(CASE WHEN trigger_direction = 'BUY' THEN 1 END)::int as buy_triggers,
          COUNT(CASE WHEN trigger_direction = 'SELL' THEN 1 END)::int as sell_triggers,
          MAX(CASE WHEN ended_at IS NOT NULL THEN duration_minutes END)::int as max_duration,
          MIN(CASE WHEN ended_at IS NOT NULL AND peak_dd IS NOT NULL THEN peak_dd END) as worst_dd
        FROM aw_events
        WHERE triggered_at > NOW() - make_interval(days => ${useDateRange ? 9999 : days})
          ${useDateRange ? sql`AND (triggered_at + INTERVAL '5 hours') >= ${fromDate}::timestamp AND (triggered_at + INTERVAL '5 hours') <= ${toDate}::timestamp` : sql``}`;

    const rs = recoveryRaw[0] || {};

    // ── NEW: Daily Insight (today vs 30-day avg) ──
    const todayEvents = accWhere
      ? await sql`
        SELECT COUNT(*)::int as count,
               ROUND(AVG(duration_minutes))::int as avg_duration,
               ROUND(AVG(peak_dd)::numeric, 2) as avg_dd
        FROM aw_events
        WHERE (triggered_at + INTERVAL '5 hours')::date = (NOW() + INTERVAL '5 hours')::date
          AND account_number = ANY(${accountFilter})`
      : await sql`
        SELECT COUNT(*)::int as count,
               ROUND(AVG(duration_minutes))::int as avg_duration,
               ROUND(AVG(peak_dd)::numeric, 2) as avg_dd
        FROM aw_events
        WHERE (triggered_at + INTERVAL '5 hours')::date = (NOW() + INTERVAL '5 hours')::date`;

    const avg30Events = accWhere
      ? await sql`
        SELECT ROUND(COUNT(*)::numeric / GREATEST(COUNT(DISTINCT (triggered_at + INTERVAL '5 hours')::date), 1), 1) as avg_per_day,
               ROUND(AVG(duration_minutes))::int as avg_duration,
               ROUND(AVG(peak_dd)::numeric, 2) as avg_dd
        FROM aw_events
        WHERE triggered_at > NOW() - INTERVAL '30 days'
          AND account_number = ANY(${accountFilter})`
      : await sql`
        SELECT ROUND(COUNT(*)::numeric / GREATEST(COUNT(DISTINCT (triggered_at + INTERVAL '5 hours')::date), 1), 1) as avg_per_day,
               ROUND(AVG(duration_minutes))::int as avg_duration,
               ROUND(AVG(peak_dd)::numeric, 2) as avg_dd
        FROM aw_events
        WHERE triggered_at > NOW() - INTERVAL '30 days'`;

    // Recent AW trades (from trades table)
    const recent = accWhere
      ? (useDateRange
        ? await sql`
          SELECT t.ticket, t.account_number, t.type, t.lots,
                 t.profit, t.swap, t.commission, t.open_time, t.close_time, t.magic_number,
                 a.name as account_name, COALESCE(a.avatar_text, '') as avatar_text
          FROM trades t LEFT JOIN accounts a ON t.account_number = a.account_number
          WHERE t.magic_number = ${AW_MAGIC}
            AND (t.close_time + INTERVAL '5 hours') >= ${fromDate}::timestamp
            AND (t.close_time + INTERVAL '5 hours') <= ${toDate}::timestamp
            AND t.account_number = ANY(${accountFilter})
          ORDER BY t.close_time DESC LIMIT 100`
        : await sql`
          SELECT t.ticket, t.account_number, t.type, t.lots,
                 t.profit, t.swap, t.commission, t.open_time, t.close_time, t.magic_number,
                 a.name as account_name, COALESCE(a.avatar_text, '') as avatar_text
          FROM trades t LEFT JOIN accounts a ON t.account_number = a.account_number
          WHERE t.magic_number = ${AW_MAGIC}
            AND t.close_time > NOW() - make_interval(days => ${days})
            AND t.account_number = ANY(${accountFilter})
          ORDER BY t.close_time DESC LIMIT 100`)
      : (useDateRange
        ? await sql`
          SELECT t.ticket, t.account_number, t.type, t.lots,
                 t.profit, t.swap, t.commission, t.open_time, t.close_time, t.magic_number,
                 a.name as account_name, COALESCE(a.avatar_text, '') as avatar_text
          FROM trades t LEFT JOIN accounts a ON t.account_number = a.account_number
          WHERE t.magic_number = ${AW_MAGIC}
            AND (t.close_time + INTERVAL '5 hours') >= ${fromDate}::timestamp
            AND (t.close_time + INTERVAL '5 hours') <= ${toDate}::timestamp
          ORDER BY t.close_time DESC LIMIT 100`
        : await sql`
          SELECT t.ticket, t.account_number, t.type, t.lots,
                 t.profit, t.swap, t.commission, t.open_time, t.close_time, t.magic_number,
                 a.name as account_name, COALESCE(a.avatar_text, '') as avatar_text
          FROM trades t LEFT JOIN accounts a ON t.account_number = a.account_number
          WHERE t.magic_number = ${AW_MAGIC}
            AND t.close_time > NOW() - make_interval(days => ${days})
          ORDER BY t.close_time DESC LIMIT 100`);

    // Total accounts count
    const totalAccounts = accWhere
      ? await sql`SELECT COUNT(*)::int as cnt FROM accounts WHERE is_active = true AND account_number = ANY(${accountFilter})`
      : await sql`SELECT COUNT(*)::int as cnt FROM accounts WHERE is_active = true`;

    // Summary
    const totalAwTrades = byAccount.reduce((s: number, r: any) => s + Number(r.aw_trades), 0);
    const totalAwPnl = byAccount.reduce((s: number, r: any) => s + Number(r.aw_pnl), 0);

    const todayData = todayEvents[0] || {};
    const avg30Data = avg30Events[0] || {};

    return NextResponse.json({
      by_account: byAccount.map((r: any) => ({
        account_number: r.account_number,
        name: r.name,
        avatar_text: r.avatar_text,
        aw_trades: Number(r.aw_trades),
        aw_pnl: Number(Number(r.aw_pnl).toFixed(2)),
      })),
      by_hour: byHour.map((r: any) => ({ hour: r.hour, count: r.count })),
      by_day: byDay.map((r: any) => ({ dow: r.dow, count: r.count })),
      by_week: byWeek.map((r: any) => ({
        week_start: r.week_start instanceof Date ? r.week_start.toISOString().slice(0, 10) : String(r.week_start).slice(0, 10),
        count: r.count,
        pnl: Number(Number(r.pnl).toFixed(2)),
      })),
      by_date: byDate.map((r: any) => ({
        date: r.trade_date instanceof Date ? r.trade_date.toISOString().slice(0, 10) : String(r.trade_date).slice(0, 10),
        count: r.count,
        pnl: Number(Number(r.pnl).toFixed(2)),
      })),
      events: events.map((e: any) => ({
        id: e.id,
        account_number: e.account_number,
        account_name: e.account_name,
        avatar_text: e.avatar_text,
        round: e.round,
        triggered_at: e.triggered_at,
        ended_at: e.ended_at,
        trigger_pnl: Number(e.trigger_pnl) || 0,
        trigger_orders: Number(e.trigger_orders) || 0,
        trigger_direction: e.trigger_direction,
        trigger_price: Number(e.trigger_price) || 0,
        peak_dd: Number(e.peak_dd) || 0,
        end_pnl: Number(e.end_pnl) || 0,
        end_reason: e.end_reason,
        aw_orders_max: Number(e.aw_orders_max) || 0,
        duration_minutes: Number(e.duration_minutes) || 0,
      })),
      recovery_stats: {
        total_events: rs.total_events || 0,
        completed: rs.completed || 0,
        active: rs.active || 0,
        win_count: rs.win_count || 0,
        loss_count: rs.loss_count || 0,
        win_rate: rs.completed > 0 ? Number(((rs.win_count / rs.completed) * 100).toFixed(1)) : 0,
        avg_duration: Number(rs.avg_duration) || 0,
        max_duration: Number(rs.max_duration) || 0,
        avg_peak_dd: Number(rs.avg_peak_dd) || 0,
        worst_dd: Number(rs.worst_dd) || 0,
        avg_trigger_pnl: Number(rs.avg_trigger_pnl) || 0,
        avg_end_pnl: Number(rs.avg_end_pnl) || 0,
        buy_triggers: rs.buy_triggers || 0,
        sell_triggers: rs.sell_triggers || 0,
      },
      daily_insight: {
        today_count: todayData.count || 0,
        today_avg_duration: Number(todayData.avg_duration) || 0,
        today_avg_dd: Number(todayData.avg_dd) || 0,
        avg30_per_day: Number(avg30Data.avg_per_day) || 0,
        avg30_duration: Number(avg30Data.avg_duration) || 0,
        avg30_dd: Number(avg30Data.avg_dd) || 0,
      },
      recent: recent.map((t: any) => ({
        ticket: t.ticket,
        account_number: t.account_number,
        account_name: t.account_name,
        avatar_text: t.avatar_text,
        type: t.type,
        lots: Number(t.lots),
        profit: Number(t.profit) || 0,
        swap: Number(t.swap) || 0,
        commission: Number(t.commission) || 0,
        open_time: t.open_time,
        close_time: t.close_time,
        magic_number: t.magic_number,
      })),
      summary: {
        total_aw_trades: totalAwTrades,
        total_aw_pnl: Number(totalAwPnl.toFixed(2)),
        aw_accounts: byAccount.length,
        total_accounts: totalAccounts[0]?.cnt || 0,
        avg_pnl_per_trade: totalAwTrades > 0 ? Number((totalAwPnl / totalAwTrades).toFixed(2)) : 0,
      },
    }, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
    });
  } catch (error) {
    console.error('AW Report API error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
