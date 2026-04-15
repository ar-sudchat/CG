import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const year = parseInt(searchParams.get('year') || '0');
  const month = parseInt(searchParams.get('month') || '0'); // 1-indexed
  if (!year || !month || month < 1 || month > 12) {
    return NextResponse.json({ error: 'year and month (1-12) required' }, { status: 400 });
  }

  const pad = (n: number) => String(n).padStart(2, '0');
  const firstDay = `${year}-${pad(month)}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDay = `${year}-${pad(month)}-${pad(lastDay)}`;

  try {
    const rows = await sql`
      SELECT
        to_char(event_date, 'YYYY-MM-DD') AS date,
        event_time_est,
        event_time_th,
        impact,
        title,
        type_short,
        forecast,
        previous,
        actual
      FROM news_events
      WHERE event_date >= ${firstDay}::date
        AND event_date <= ${endDay}::date
        AND currency = 'USD'
      ORDER BY event_date ASC, title ASC
    `;
    return NextResponse.json({ events: rows });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    // Table may not exist yet — return empty list rather than 500
    if (msg.includes('does not exist') || msg.includes('news_events')) {
      return NextResponse.json({ events: [] });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
