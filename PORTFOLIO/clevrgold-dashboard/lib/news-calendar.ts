// ============================================================
// US Economic News Calendar — No-Trade Days for XAUUSD
// ============================================================

export type NewsImpact = 'VERY_HIGH' | 'HIGH' | 'MEDIUM';

export interface NewsEvent {
  date: string;
  type: string;
  impact: NewsImpact;
  label: string;
  description: string;
  releaseTime_EST: string;
  releaseTime_TH: string;
  rule: string;
  fomcDetail?: string;
}

export interface MonthSummary {
  totalTradingDays: number;
  newsDays: number;
  activeDays: number;
  activePercent: number;
  breakdown: Record<string, number>;
}

// ── FOMC 2025-2026 ──────────────────────────────────────────
const FOMC_DATES: { start: string; end: string; block: string[] }[] = [
  // 2025
  { start: '2025-01-28', end: '2025-01-29', block: ['2025-01-27','2025-01-28','2025-01-29','2025-01-30'] },
  { start: '2025-03-18', end: '2025-03-19', block: ['2025-03-17','2025-03-18','2025-03-19','2025-03-20'] },
  { start: '2025-05-06', end: '2025-05-07', block: ['2025-05-05','2025-05-06','2025-05-07','2025-05-08'] },
  { start: '2025-06-17', end: '2025-06-18', block: ['2025-06-16','2025-06-17','2025-06-18','2025-06-19'] },
  { start: '2025-07-29', end: '2025-07-30', block: ['2025-07-28','2025-07-29','2025-07-30','2025-07-31'] },
  { start: '2025-09-16', end: '2025-09-17', block: ['2025-09-15','2025-09-16','2025-09-17','2025-09-18'] },
  { start: '2025-10-28', end: '2025-10-29', block: ['2025-10-27','2025-10-28','2025-10-29','2025-10-30'] },
  { start: '2025-12-09', end: '2025-12-10', block: ['2025-12-08','2025-12-09','2025-12-10','2025-12-11'] },
  // 2026
  { start: '2026-01-27', end: '2026-01-28', block: ['2026-01-26','2026-01-27','2026-01-28','2026-01-29'] },
  { start: '2026-03-17', end: '2026-03-18', block: ['2026-03-16','2026-03-17','2026-03-18','2026-03-19'] },
  { start: '2026-05-05', end: '2026-05-06', block: ['2026-05-04','2026-05-05','2026-05-06','2026-05-07'] },
  { start: '2026-06-16', end: '2026-06-17', block: ['2026-06-15','2026-06-16','2026-06-17','2026-06-18'] },
  { start: '2026-07-28', end: '2026-07-29', block: ['2026-07-27','2026-07-28','2026-07-29','2026-07-30'] },
  { start: '2026-09-15', end: '2026-09-16', block: ['2026-09-14','2026-09-15','2026-09-16','2026-09-17'] },
  { start: '2026-10-27', end: '2026-10-28', block: ['2026-10-26','2026-10-27','2026-10-28','2026-10-29'] },
  { start: '2026-12-08', end: '2026-12-09', block: ['2026-12-07','2026-12-08','2026-12-09','2026-12-10'] },
];

// ── CPI 2025-2026 ───────────────────────────────────────────
const CPI_DATES = [
  // 2025
  '2025-01-15','2025-02-12','2025-03-12','2025-04-10',
  '2025-05-13','2025-06-11','2025-07-15','2025-08-12',
  '2025-09-10','2025-10-14','2025-11-12','2025-12-10',
  // 2026
  '2026-01-14','2026-02-11','2026-03-11','2026-04-10',
  '2026-05-13','2026-06-10','2026-07-14','2026-08-12',
  '2026-09-11','2026-10-14','2026-11-12','2026-12-10',
];

// ── PPI 2025-2026 ───────────────────────────────────────────
const PPI_DATES = [
  // 2025
  '2025-01-14','2025-02-13','2025-03-13','2025-04-11',
  '2025-05-15','2025-06-12','2025-07-15','2025-08-14',
  '2025-09-11','2025-10-15','2025-11-13','2025-12-11',
  // 2026
  '2026-01-15','2026-02-12','2026-03-12','2026-04-11',
  '2026-05-14','2026-06-11','2026-07-15','2026-08-13',
  '2026-09-12','2026-10-15','2026-11-13','2026-12-11',
];

const CPI_SET = new Set(CPI_DATES);
const PPI_SET = new Set(PPI_DATES);

// ── Generate events for a given month ───────────────────────
export function getNewsEvents(year: number, month: number): NewsEvent[] {
  const events: NewsEvent[] = [];
  const daysInMonth = new Date(year, month, 0).getDate();
  const pad = (n: number) => String(n).padStart(2, '0');

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month - 1, day);
    const dateStr = `${year}-${pad(month)}-${pad(day)}`;
    const dow = date.getDay();

    if (dow === 0 || dow === 6) continue;

    // NFP: First Friday
    if (dow === 5 && day <= 7) {
      events.push({
        date: dateStr, type: 'NFP', impact: 'VERY_HIGH',
        label: 'NFP (Non-Farm Payrolls)',
        description: 'US Employment data - strongest gold mover',
        releaseTime_EST: '8:30 AM', releaseTime_TH: '19:30',
        rule: 'Skip entire trading day',
      });
    }

    // FOMC
    const fomc = FOMC_DATES.find(f => f.block.includes(dateStr));
    if (fomc) {
      const isMeeting = dateStr === fomc.start || dateStr === fomc.end;
      events.push({
        date: dateStr, type: 'FOMC', impact: 'VERY_HIGH',
        label: isMeeting ? 'FOMC Meeting Day' : 'FOMC +/-1 Day',
        description: 'Fed interest rate decision + economic projections',
        releaseTime_EST: '2:00 PM (day 2)', releaseTime_TH: '01:00+1',
        rule: `FOMC block ${fomc.block[0]} to ${fomc.block[3]}`,
        fomcDetail: `Meeting ${fomc.start} to ${fomc.end}`,
      });
    }

    // CPI
    if (CPI_SET.has(dateStr)) {
      events.push({
        date: dateStr, type: 'CPI', impact: 'HIGH',
        label: 'CPI (Consumer Price Index)',
        description: 'Consumer inflation - affects Fed policy & gold',
        releaseTime_EST: '8:30 AM', releaseTime_TH: '19:30',
        rule: 'Skip entire trading day',
      });
    }

    // PPI
    if (PPI_SET.has(dateStr)) {
      events.push({
        date: dateStr, type: 'PPI', impact: 'HIGH',
        label: 'PPI (Producer Price Index)',
        description: 'Producer inflation - leading indicator for CPI',
        releaseTime_EST: '8:30 AM', releaseTime_TH: '19:30',
        rule: 'Skip entire trading day',
      });
    }

    // ISM Manufacturing: First business day
    if (day <= 3 && dow >= 1 && dow <= 5) {
      let isFirst = true;
      for (let d = 1; d < day; d++) {
        const ch = new Date(year, month - 1, d).getDay();
        if (ch >= 1 && ch <= 5) { isFirst = false; break; }
      }
      if (isFirst) {
        events.push({
          date: dateStr, type: 'ISM', impact: 'HIGH',
          label: 'ISM Manufacturing PMI',
          description: 'Manufacturing health - market sentiment mover',
          releaseTime_EST: '10:00 AM', releaseTime_TH: '22:00',
          rule: 'Skip entire trading day',
        });
      }
    }
  }

  return events;
}

// ── Build lookup: dateStr → NewsEvent[] ─────────────────────
export function buildNewsMap(year: number, month: number): Map<string, NewsEvent[]> {
  const events = getNewsEvents(year, month);
  const map = new Map<string, NewsEvent[]>();
  for (const e of events) {
    if (!map.has(e.date)) map.set(e.date, []);
    map.get(e.date)!.push(e);
  }
  return map;
}

// ── Monthly summary ─────────────────────────────────────────
export function getMonthSummary(year: number, month: number): MonthSummary {
  const newsMap = buildNewsMap(year, month);
  const daysInMonth = new Date(year, month, 0).getDate();
  const pad = (n: number) => String(n).padStart(2, '0');

  let tradingDays = 0;
  const newsDateSet = new Set<string>();

  for (let day = 1; day <= daysInMonth; day++) {
    const dow = new Date(year, month - 1, day).getDay();
    if (dow === 0 || dow === 6) continue;
    tradingDays++;
    const key = `${year}-${pad(month)}-${pad(day)}`;
    if (newsMap.has(key)) newsDateSet.add(key);
  }

  const newsDays = newsDateSet.size;
  const activeDays = tradingDays - newsDays;
  const breakdown: Record<string, number> = {};
  newsMap.forEach((events) => {
    for (const e of events) {
      breakdown[e.type] = (breakdown[e.type] || 0) + 1;
    }
  });

  return {
    totalTradingDays: tradingDays,
    newsDays,
    activeDays,
    activePercent: tradingDays > 0 ? Math.round((activeDays / tradingDays) * 100) : 0,
    breakdown,
  };
}

// ── Impact color helpers ────────────────────────────────────
export function impactBorderColor(impact: NewsImpact) {
  if (impact === 'VERY_HIGH') return 'border-red-500/60';
  if (impact === 'HIGH') return 'border-orange-500/50';
  return 'border-yellow-500/40';
}

export function impactBgColor(impact: NewsImpact) {
  if (impact === 'VERY_HIGH') return 'bg-red-500/8';
  if (impact === 'HIGH') return 'bg-orange-500/8';
  return 'bg-yellow-500/8';
}

export function impactDot(impact: NewsImpact) {
  if (impact === 'VERY_HIGH') return 'text-red-400';
  if (impact === 'HIGH') return 'text-orange-400';
  return 'text-yellow-400';
}

export function typeShort(type: string) {
  return type;
}

// Rank impacts for "top impact of the day" selection
export function impactRank(impact: NewsImpact): number {
  if (impact === 'VERY_HIGH') return 3;
  if (impact === 'HIGH') return 2;
  return 1;
}
