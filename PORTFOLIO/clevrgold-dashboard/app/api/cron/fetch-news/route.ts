import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type FFImpact = 'High' | 'Medium' | 'Low' | 'Holiday';

interface FFEvent {
  title: string;
  country: string;
  date: string; // ISO with ET offset
  impact: FFImpact;
  forecast?: string;
  previous?: string;
}

async function ensureNewsTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS news_events (
      id SERIAL PRIMARY KEY,
      event_date DATE NOT NULL,
      event_time_est TEXT,
      event_time_th TEXT,
      currency TEXT NOT NULL,
      impact TEXT NOT NULL,
      title TEXT NOT NULL,
      type_short TEXT,
      forecast TEXT,
      previous TEXT,
      actual TEXT,
      fetched_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(event_date, currency, title)
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_news_date ON news_events(event_date)`;
}

// Classify event into VERY_HIGH / HIGH / MEDIUM
function classifyImpact(title: string, ffImpact: FFImpact): 'VERY_HIGH' | 'HIGH' | 'MEDIUM' | null {
  const t = title.toLowerCase();
  // Mega-movers always VERY_HIGH regardless of FF label
  if (
    t.includes('non-farm') || t.includes('nonfarm') || t.includes('nfp') ||
    t.includes('fomc') || t.includes('federal funds') || t.includes('fed chair') ||
    t.includes('rate statement') || t.includes('rate decision')
  ) return 'VERY_HIGH';
  if (ffImpact === 'High') return 'HIGH';
  if (ffImpact === 'Medium') return 'MEDIUM';
  return null; // skip Low / Holiday
}

// Short code for calendar cell (NFP, CPI, PPI, ISM, RS=Retail Sales, JC=Jobless Claims, etc.)
function shortCode(title: string): string {
  const t = title.toLowerCase();
  if (t.includes('non-farm') || t.includes('nonfarm') || t.includes('nfp')) return 'NFP';
  if (t.includes('fomc') || t.includes('federal funds') || t.includes('rate statement') || t.includes('rate decision')) return 'FOMC';
  if (t.includes('fed chair')) return 'FED';
  if (t.includes('core cpi')) return 'CCPI';
  if (t.includes('cpi')) return 'CPI';
  if (t.includes('core ppi')) return 'CPPI';
  if (t.includes('ppi')) return 'PPI';
  if (t.includes('core pce')) return 'CPCE';
  if (t.includes('pce')) return 'PCE';
  if (t.includes('ism manufacturing')) return 'ISM-M';
  if (t.includes('ism services') || t.includes('ism non-manufacturing')) return 'ISM-S';
  if (t.includes('retail sales')) return 'RS';
  if (t.includes('unemployment rate')) return 'UR';
  if (t.includes('unemployment claims') || t.includes('jobless claims')) return 'JC';
  if (t.includes('gdp')) return 'GDP';
  if (t.includes('consumer confidence')) return 'CC';
  if (t.includes('consumer sentiment')) return 'CS';
  if (t.includes('empire state')) return 'NY';
  if (t.includes('philly fed') || t.includes('philadelphia fed')) return 'PHIL';
  if (t.includes('jolts')) return 'JOLTS';
  if (t.includes('adp')) return 'ADP';
  if (t.includes('durable goods')) return 'DG';
  if (t.includes('housing starts')) return 'HS';
  if (t.includes('existing home')) return 'EHS';
  if (t.includes('new home')) return 'NHS';
  // Fallback: first 4 letters uppercase
  return title.replace(/[^A-Za-z]/g, '').slice(0, 4).toUpperCase() || 'NEWS';
}

function parseEventDateTime(iso: string): { date: string; time_EST: string; time_TH: string } {
  // ISO includes ET offset, e.g. "2026-04-10T08:30:00-04:00"
  const d = new Date(iso);
  // Date = YYYY-MM-DD in ET
  const etDate = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/New_York' }).format(d);
  const etTime = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit', hour12: true,
  }).format(d);
  const thTime = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(d);
  return { date: etDate, time_EST: etTime, time_TH: thTime };
}

async function fetchFF(url: string): Promise<FFEvent[]> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'ClevrGold/1.0' },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`FF fetch failed ${res.status}: ${url}`);
  return res.json();
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const internalKey = request.headers.get('x-internal-key');
  if (
    authHeader !== `Bearer ${process.env.CRON_SECRET}` &&
    internalKey !== process.env.CRON_SECRET
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await ensureNewsTable();

  const urls = [
    'https://nfs.faireconomy.media/ff_calendar_thisweek.json',
    'https://nfs.faireconomy.media/ff_calendar_nextweek.json',
  ];

  let fetched = 0, inserted = 0, updated = 0, skipped = 0;

  for (const url of urls) {
    let events: FFEvent[];
    try {
      events = await fetchFF(url);
    } catch (e) {
      return NextResponse.json({ error: String(e) }, { status: 500 });
    }

    for (const ev of events) {
      fetched++;
      if (ev.country !== 'USD') { skipped++; continue; }
      const impact = classifyImpact(ev.title, ev.impact);
      if (!impact) { skipped++; continue; }

      const { date, time_EST, time_TH } = parseEventDateTime(ev.date);
      const type_short = shortCode(ev.title);

      const res = await sql`
        INSERT INTO news_events (event_date, event_time_est, event_time_th, currency, impact, title, type_short, forecast, previous, fetched_at)
        VALUES (${date}, ${time_EST}, ${time_TH}, ${ev.country}, ${impact}, ${ev.title}, ${type_short}, ${ev.forecast || null}, ${ev.previous || null}, NOW())
        ON CONFLICT (event_date, currency, title)
        DO UPDATE SET
          event_time_est = EXCLUDED.event_time_est,
          event_time_th = EXCLUDED.event_time_th,
          impact = EXCLUDED.impact,
          type_short = EXCLUDED.type_short,
          forecast = EXCLUDED.forecast,
          previous = EXCLUDED.previous,
          fetched_at = NOW()
        RETURNING (xmax = 0) AS inserted
      `;
      if (res[0]?.inserted) inserted++;
      else updated++;
    }
  }

  return NextResponse.json({
    ok: true,
    timestamp: new Date().toISOString(),
    fetched,
    inserted,
    updated,
    skipped,
  });
}
