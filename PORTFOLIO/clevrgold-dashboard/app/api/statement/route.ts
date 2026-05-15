import { NextRequest, NextResponse } from 'next/server';
import sql, { MT4_TZ } from '@/lib/db';
import { getSessionAndAccounts } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = await getSessionAndAccounts();
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const accountsParam = searchParams.get('accounts') || '';
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    if (!from || !to || !/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
      return NextResponse.json({ error: 'from and to (YYYY-MM-DD) required' }, { status: 400 });
    }

    const accountNums = accountsParam
      .split(',')
      .map((s) => parseInt(s.trim()))
      .filter((n) => !isNaN(n));

    if (accountNums.length === 0) {
      return NextResponse.json({ error: 'accounts required' }, { status: 400 });
    }

    // Restrict to accounts the user is allowed to see
    const allowed = auth.accountFilter === null
      ? accountNums
      : accountNums.filter((a) => auth.accountFilter!.includes(a));

    if (allowed.length === 0) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Daily aggregated PnL — gross profit, gross loss, net, counts
    // Adjusts for cent accounts (divide by 100)
    const days = await sql`
      SELECT
        TO_CHAR(sub.close_time AT TIME ZONE ${MT4_TZ}, 'YYYY-MM-DD') AS day,
        ROUND(COALESCE(SUM(adjusted_pnl) FILTER (WHERE adjusted_pnl > 0), 0)::numeric, 2) AS profit,
        ROUND(COALESCE(SUM(adjusted_pnl) FILTER (WHERE adjusted_pnl < 0), 0)::numeric, 2) AS loss,
        ROUND(COALESCE(SUM(adjusted_pnl), 0)::numeric, 2) AS net,
        COUNT(*)::int AS trades,
        COUNT(*) FILTER (WHERE adjusted_pnl > 0)::int AS wins,
        COUNT(*) FILTER (WHERE adjusted_pnl < 0)::int AS losses
      FROM (
        SELECT
          t.close_time,
          (t.profit + COALESCE(t.swap, 0) + COALESCE(t.commission, 0))
            / CASE WHEN a.account_type = 'cent' THEN 100.0 ELSE 1.0 END AS adjusted_pnl
        FROM trades t
        JOIN accounts a ON a.account_number = t.account_number
        WHERE t.account_number = ANY(${allowed})
          AND t.close_time AT TIME ZONE ${MT4_TZ} >= ${from}::date
          AND t.close_time AT TIME ZONE ${MT4_TZ} < (${to}::date + INTERVAL '1 day')
      ) sub
      GROUP BY 1
      ORDER BY day
    `;

    // Account labels for UI
    const accLabels = await sql`
      SELECT account_number, name, COALESCE(avatar_text, '') AS avatar_text, COALESCE(account_type, 'standard') AS account_type
      FROM accounts
      WHERE account_number = ANY(${allowed})
      ORDER BY account_number
    `;

    // Totals across the range
    const totals = days.reduce(
      (acc, d) => ({
        profit: acc.profit + Number(d.profit),
        loss: acc.loss + Number(d.loss),
        net: acc.net + Number(d.net),
        trades: acc.trades + Number(d.trades),
        wins: acc.wins + Number(d.wins),
        losses: acc.losses + Number(d.losses),
      }),
      { profit: 0, loss: 0, net: 0, trades: 0, wins: 0, losses: 0 }
    );

    return NextResponse.json({
      from,
      to,
      accounts: accLabels.map((a) => ({
        account_number: Number(a.account_number),
        name: a.name,
        avatar_text: a.avatar_text,
        account_type: a.account_type,
      })),
      days: days.map((d) => ({
        day: d.day,
        profit: Number(d.profit),
        loss: Number(d.loss),
        net: Number(d.net),
        trades: Number(d.trades),
        wins: Number(d.wins),
        losses: Number(d.losses),
      })),
      totals,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
