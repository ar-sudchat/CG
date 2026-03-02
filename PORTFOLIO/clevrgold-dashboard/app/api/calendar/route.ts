import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface FFEvent {
  title: string;
  country: string;
  date: string;
  impact: string;
  forecast: string;
  previous: string;
}

export async function GET() {
  try {
    // Fetch this week + next week from Forex Factory unofficial JSON
    const [thisWeek, nextWeek] = await Promise.all([
      fetch('https://nfs.faireconomy.media/ff_calendar_thisweek.json', {
        next: { revalidate: 3600 },
      }).then((r) => r.json()).catch(() => []),
      fetch('https://nfs.faireconomy.media/ff_calendar_nextweek.json', {
        next: { revalidate: 3600 },
      }).then((r) => r.json()).catch(() => []),
    ]);

    const allEvents: FFEvent[] = [...thisWeek, ...nextWeek];

    // Filter: USD only (affects XAUUSD), next 3 days
    const now = new Date();
    const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    const events = allEvents
      .filter((e: FFEvent) => e.country === 'USD')
      .filter((e: FFEvent) => {
        const eventDate = new Date(e.date);
        return eventDate >= now && eventDate <= threeDaysLater;
      })
      .map((e: FFEvent) => ({
        title: e.title,
        date: e.date,
        impact: e.impact,
      }))
      .slice(0, 30);

    return NextResponse.json({ events }, {
      headers: { 'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600' },
    });
  } catch (error) {
    console.error('Calendar API error:', error);
    return NextResponse.json({ events: [] }, { status: 200 });
  }
}
