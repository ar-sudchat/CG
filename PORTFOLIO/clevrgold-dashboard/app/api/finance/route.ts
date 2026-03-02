import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { getSessionAndAccounts } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = await getSessionAndAccounts();
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const account = searchParams.get('account') || 'all';
    const weeks = parseInt(searchParams.get('weeks') || '4');
    const af = auth.accountFilter;

    // Fetch entries
    let entries;
    if (account === 'all') {
      entries = af === null
        ? await sql`
          SELECT fe.id, fe.account_number, fe.entry_date, fe.type, fe.amount, fe.note, fe.created_at, fe.created_by,
                 a.name AS account_name
          FROM financial_entries fe
          JOIN accounts a ON fe.account_number = a.account_number
          WHERE fe.entry_date >= CURRENT_DATE - make_interval(weeks => ${weeks})
          ORDER BY fe.entry_date DESC, fe.created_at DESC
        `
        : await sql`
          SELECT fe.id, fe.account_number, fe.entry_date, fe.type, fe.amount, fe.note, fe.created_at, fe.created_by,
                 a.name AS account_name
          FROM financial_entries fe
          JOIN accounts a ON fe.account_number = a.account_number
          WHERE fe.account_number = ANY(${af})
            AND fe.entry_date >= CURRENT_DATE - make_interval(weeks => ${weeks})
          ORDER BY fe.entry_date DESC, fe.created_at DESC
        `;
    } else {
      const accountNum = parseInt(account);
      if (af !== null && !af.includes(accountNum)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      entries = await sql`
        SELECT fe.id, fe.account_number, fe.entry_date, fe.type, fe.amount, fe.note, fe.created_at, fe.created_by,
               a.name AS account_name
        FROM financial_entries fe
        JOIN accounts a ON fe.account_number = a.account_number
        WHERE fe.account_number = ${accountNum}
          AND fe.entry_date >= CURRENT_DATE - make_interval(weeks => ${weeks})
        ORDER BY fe.entry_date DESC, fe.created_at DESC
      `;
    }

    // Weekly summary
    let summary;
    if (account === 'all') {
      summary = af === null
        ? await sql`
          SELECT
            date_trunc('week', entry_date::timestamp)::date AS week_start,
            type,
            SUM(amount) AS total
          FROM financial_entries
          WHERE entry_date >= CURRENT_DATE - make_interval(weeks => ${weeks})
          GROUP BY week_start, type
          ORDER BY week_start DESC
        `
        : await sql`
          SELECT
            date_trunc('week', entry_date::timestamp)::date AS week_start,
            type,
            SUM(amount) AS total
          FROM financial_entries
          WHERE account_number = ANY(${af})
            AND entry_date >= CURRENT_DATE - make_interval(weeks => ${weeks})
          GROUP BY week_start, type
          ORDER BY week_start DESC
        `;
    } else {
      const accountNum = parseInt(account);
      summary = await sql`
        SELECT
          date_trunc('week', entry_date::timestamp)::date AS week_start,
          type,
          SUM(amount) AS total
        FROM financial_entries
        WHERE account_number = ${accountNum}
          AND entry_date >= CURRENT_DATE - make_interval(weeks => ${weeks})
        GROUP BY week_start, type
        ORDER BY week_start DESC
      `;
    }

    // Build weekly summary map
    const weekMap = new Map<string, { withdrawal: number; deposit: number }>();
    for (const row of summary) {
      const key = row.week_start;
      if (!weekMap.has(key)) weekMap.set(key, { withdrawal: 0, deposit: 0 });
      const w = weekMap.get(key)!;
      if (row.type === 'withdrawal') w.withdrawal = Number(row.total) || 0;
      if (row.type === 'deposit') w.deposit = Number(row.total) || 0;
    }

    const weeks_summary = Array.from(weekMap.entries()).map(([week_start, totals]) => ({
      week_start,
      withdrawal: totals.withdrawal,
      deposit: totals.deposit,
      net: totals.deposit - totals.withdrawal,
    }));

    return NextResponse.json({
      entries: entries.map((e) => ({
        id: e.id,
        account_number: e.account_number,
        account_name: e.account_name,
        entry_date: e.entry_date,
        type: e.type,
        amount: Number(e.amount) || 0,
        note: e.note,
        created_at: e.created_at,
        created_by: e.created_by,
      })),
      weeks_summary,
    }, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
    });
  } catch (error) {
    console.error('Finance GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch finance data' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getSessionAndAccounts();
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { account_number, entry_date, type, amount, note } = body;

    if (!account_number || !type || !amount) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!['withdrawal', 'deposit'].includes(type)) {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }

    // Check account access
    const af = auth.accountFilter;
    if (af !== null && !af.includes(Number(account_number))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const result = await sql`
      INSERT INTO financial_entries (account_number, entry_date, type, amount, note, created_by)
      VALUES (${account_number}, ${entry_date || new Date().toISOString().split('T')[0]}, ${type}, ${amount}, ${note || null}, ${auth.session.userId})
      RETURNING id
    `;

    return NextResponse.json({ id: result[0].id, success: true });
  } catch (error) {
    console.error('Finance POST error:', error);
    return NextResponse.json({ error: 'Failed to create entry' }, { status: 500 });
  }
}
