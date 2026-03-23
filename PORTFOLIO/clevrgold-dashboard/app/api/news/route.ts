import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const CRITICAL_KEYWORDS = ['FOMC', 'Non-Farm', 'Nonfarm', 'NFP', 'CPI', 'GDP', 'Interest Rate', 'Federal Funds Rate'];

interface FFEvent {
  title: string;
  country: string;
  date: string;
  impact: string;
  forecast: string;
  previous: string;
}

interface NewsEvent {
  title: string;
  date: string;
  time_bangkok: string;
  impact: string;
  is_critical: boolean;
  minutes_until: number;
  forecast: string;
  previous: string;
}

// In-memory cache
let cache: { data: NewsEvent[]; timestamp: number } | null = null;
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

function toBangkokTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleString('en-GB', {
    timeZone: 'Asia/Bangkok',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function toBangkokDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', {
    timeZone: 'Asia/Bangkok',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

function isCritical(title: string): boolean {
  return CRITICAL_KEYWORDS.some((kw) => title.toLowerCase().includes(kw.toLowerCase()));
}

async function fetchNews(): Promise<NewsEvent[]> {
  const now = Date.now();
  if (cache && now - cache.timestamp < CACHE_TTL) {
    // Recalculate minutes_until from cached data
    return cache.data.map((e) => ({
      ...e,
      minutes_until: Math.round((new Date(e.date).getTime() - now) / 60000),
    }));
  }

  const [thisWeek, nextWeek] = await Promise.all([
    fetch('https://nfs.faireconomy.media/ff_calendar_thisweek.json', {
      next: { revalidate: 1800 },
    })
      .then((r) => r.json())
      .catch(() => []),
    fetch('https://nfs.faireconomy.media/ff_calendar_nextweek.json', {
      next: { revalidate: 1800 },
    })
      .then((r) => r.json())
      .catch(() => []),
  ]);

  const allEvents: FFEvent[] = [...thisWeek, ...nextWeek];

  // Filter: USD only, High impact only
  const events: NewsEvent[] = allEvents
    .filter((e) => e.country === 'USD' && e.impact === 'High')
    .map((e) => {
      const eventTime = new Date(e.date).getTime();
      return {
        title: e.title,
        date: e.date,
        time_bangkok: `${toBangkokDate(e.date)} ${toBangkokTime(e.date)}`,
        impact: e.impact,
        is_critical: isCritical(e.title),
        minutes_until: Math.round((eventTime - now) / 60000),
        forecast: e.forecast || '',
        previous: e.previous || '',
      };
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  cache = { data: events, timestamp: now };
  return events;
}

export async function GET() {
  try {
    const events = await fetchNews();

    // Return all events but mark upcoming ones
    const now = Date.now();
    const upcoming = events.filter((e) => new Date(e.date).getTime() > now - 60 * 60000); // include events from past 1h
    const next_alert = upcoming.find((e) => e.minutes_until > 0);

    return NextResponse.json(
      {
        events: upcoming,
        next_event: next_alert || null,
        has_imminent: upcoming.some((e) => e.minutes_until > 0 && e.minutes_until <= 60),
        has_upcoming: upcoming.some((e) => e.minutes_until > 0 && e.minutes_until <= 240),
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      }
    );
  } catch (error) {
    console.error('News API error:', error);
    return NextResponse.json({ events: [], next_event: null, has_imminent: false, has_upcoming: false }, { status: 200 });
  }
}
