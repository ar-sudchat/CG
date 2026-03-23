import { NextResponse } from 'next/server';
import sql from '@/lib/db';
import { getSessionAndAccounts } from '@/lib/auth';
import { MT4_TZ } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const auth = await getSessionAndAccounts();
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const af = auth.accountFilter;

    // Cent account lookup
    const centAccounts = await sql`
      SELECT account_number FROM accounts WHERE account_type = 'cent' AND is_active = TRUE
    `;
    const centSet = new Set(centAccounts.map((r) => String(r.account_number)));
    const centDiv = (accNum: string | number) => centSet.has(String(accNum)) ? 100 : 1;

    // Current month start (MT4 timezone)
    const monthStart = await sql`SELECT date_trunc('month', NOW() AT TIME ZONE ${MT4_TZ})::date::text as d`;
    const monthStartDate = monthStart[0].d;

    // Current week start (Monday)
    const weekStart = await sql`SELECT date_trunc('week', NOW() AT TIME ZONE ${MT4_TZ})::date::text as d`;
    const weekStartDate = weekStart[0].d;

    // Today
    const todayRow = await sql`SELECT (NOW() AT TIME ZONE ${MT4_TZ})::date::text as d`;
    const todayDate = todayRow[0].d;

    // Current snapshots (balance + equity per account)
    const snapshots = af === null
      ? await sql`
          SELECT s.account_number, s.balance, s.equity, s.floating_pnl, s.open_orders, s.aw_orders,
                 a.name, a.owner, a.pair_group
          FROM snapshots s
          JOIN accounts a ON s.account_number = a.account_number
          WHERE a.is_active = TRUE AND s.account_number != 0
        `
      : await sql`
          SELECT s.account_number, s.balance, s.equity, s.floating_pnl, s.open_orders, s.aw_orders,
                 a.name, a.owner, a.pair_group
          FROM snapshots s
          JOIN accounts a ON s.account_number = a.account_number
          WHERE a.is_active = TRUE AND s.account_number = ANY(${af})
        `;

    // Start of month equity (first record per account in this month)
    const monthStartEquity = af === null
      ? await sql`
          SELECT DISTINCT ON (account_number) account_number, balance, equity
          FROM balance_history
          WHERE recorded_at >= ${monthStartDate}::date AND account_number != 0
          ORDER BY account_number, recorded_at ASC
        `
      : await sql`
          SELECT DISTINCT ON (account_number) account_number, balance, equity
          FROM balance_history
          WHERE recorded_at >= ${monthStartDate}::date AND account_number = ANY(${af})
          ORDER BY account_number, recorded_at ASC
        `;

    // Start of week equity
    const weekStartEquity = af === null
      ? await sql`
          SELECT DISTINCT ON (account_number) account_number, balance, equity
          FROM balance_history
          WHERE recorded_at >= ${weekStartDate}::date AND account_number != 0
          ORDER BY account_number, recorded_at ASC
        `
      : await sql`
          SELECT DISTINCT ON (account_number) account_number, balance, equity
          FROM balance_history
          WHERE recorded_at >= ${weekStartDate}::date AND account_number = ANY(${af})
          ORDER BY account_number, recorded_at ASC
        `;

    // Start of day equity
    const dayStartEquity = af === null
      ? await sql`
          SELECT DISTINCT ON (account_number) account_number, balance, equity
          FROM balance_history
          WHERE recorded_at >= ${todayDate}::date AND account_number != 0
          ORDER BY account_number, recorded_at ASC
        `
      : await sql`
          SELECT DISTINCT ON (account_number) account_number, balance, equity
          FROM balance_history
          WHERE recorded_at >= ${todayDate}::date AND account_number = ANY(${af})
          ORDER BY account_number, recorded_at ASC
        `;

    // Withdrawals & Deposits per period
    const feMonth = af === null
      ? await sql`SELECT type, COALESCE(SUM(amount), 0)::decimal as total FROM financial_entries WHERE entry_date >= ${monthStartDate}::date GROUP BY type`
      : await sql`SELECT type, COALESCE(SUM(amount), 0)::decimal as total FROM financial_entries WHERE entry_date >= ${monthStartDate}::date AND account_number = ANY(${af}) GROUP BY type`;

    const feWeek = af === null
      ? await sql`SELECT type, COALESCE(SUM(amount), 0)::decimal as total FROM financial_entries WHERE entry_date >= ${weekStartDate}::date GROUP BY type`
      : await sql`SELECT type, COALESCE(SUM(amount), 0)::decimal as total FROM financial_entries WHERE entry_date >= ${weekStartDate}::date AND account_number = ANY(${af}) GROUP BY type`;

    const feDay = af === null
      ? await sql`SELECT type, COALESCE(SUM(amount), 0)::decimal as total FROM financial_entries WHERE entry_date >= ${todayDate}::date GROUP BY type`
      : await sql`SELECT type, COALESCE(SUM(amount), 0)::decimal as total FROM financial_entries WHERE entry_date >= ${todayDate}::date AND account_number = ANY(${af}) GROUP BY type`;

    const sumByType = (rows: { type: string; total: string }[], type: string) => {
      const row = rows.find(r => r.type === type);
      return Number(row?.total || 0);
    };

    // Calculate totals (cent accounts divided by 100)
    const totalBalance = snapshots.reduce((s, r) => s + Number(r.balance) / centDiv(r.account_number), 0);
    const totalEquity = snapshots.reduce((s, r) => s + Number(r.equity) / centDiv(r.account_number), 0);
    const totalFloating = totalEquity - totalBalance;

    const monthEquityStart = monthStartEquity.reduce((s, r) => s + Number(r.equity) / centDiv(r.account_number), 0);
    const weekEquityStart = weekStartEquity.reduce((s, r) => s + Number(r.equity) / centDiv(r.account_number), 0);
    const dayEquityStart = dayStartEquity.reduce((s, r) => s + Number(r.equity) / centDiv(r.account_number), 0);

    const monthWithdrawals = sumByType(feMonth as { type: string; total: string }[], 'withdrawal');
    const monthDeposits = sumByType(feMonth as { type: string; total: string }[], 'deposit');
    const weekWithdrawals = sumByType(feWeek as { type: string; total: string }[], 'withdrawal');
    const weekDeposits = sumByType(feWeek as { type: string; total: string }[], 'deposit');
    const dayWithdrawals = sumByType(feDay as { type: string; total: string }[], 'withdrawal');
    const dayDeposits = sumByType(feDay as { type: string; total: string }[], 'deposit');

    // P&L = Current Equity + Withdrawals - Deposits - Start Equity
    const monthPnl = totalEquity + monthWithdrawals - monthDeposits - monthEquityStart;
    const weekPnl = totalEquity + weekWithdrawals - weekDeposits - weekEquityStart;
    const dayPnl = totalEquity + dayWithdrawals - dayDeposits - dayEquityStart;

    // Cut loss simulation: if close everything now
    // You keep: current equity (all floating realized)
    // Already withdrawn this month: monthWithdrawals
    // Started with: monthEquityStart
    // Net result = totalEquity + monthWithdrawals - monthEquityStart (same as monthPnl)
    // But show it as: "if you close now, your equity = X, total loss from start = Y"

    // Per-account breakdown for cut loss (cent→USD)
    const accountDetails = snapshots.map(s => {
      const d = centDiv(s.account_number);
      const floating = (Number(s.floating_pnl) || (Number(s.equity) - Number(s.balance))) / d;
      return {
        account_number: s.account_number,
        name: s.name,
        owner: s.owner,
        pair_group: s.pair_group,
        balance: Number(s.balance) / d,
        equity: Number(s.equity) / d,
        floating,
        open_orders: Number(s.open_orders),
        aw_orders: Number(s.aw_orders),
      };
    }).filter(a => a.balance > 0);

    return NextResponse.json({
      current: {
        balance: totalBalance,
        equity: totalEquity,
        floating: totalFloating,
      },
      month: {
        start_equity: monthEquityStart,
        withdrawals: monthWithdrawals,
        deposits: monthDeposits,
        pnl: monthPnl,
      },
      week: {
        start_equity: weekEquityStart,
        withdrawals: weekWithdrawals,
        deposits: weekDeposits,
        pnl: weekPnl,
      },
      day: {
        start_equity: dayEquityStart,
        withdrawals: dayWithdrawals,
        deposits: dayDeposits,
        pnl: dayPnl,
      },
      cut_loss: {
        total_floating: totalFloating,
        equity_after: totalEquity,
        month_result: monthPnl,
      },
      accounts: accountDetails,
    }, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
    });
  } catch (error) {
    console.error('Capital summary API error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
