'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import useSWR from 'swr';
import { cn } from '@/lib/utils';
import { useCurrency } from '@/lib/currency';
import type { NewsEvent, NewsImpact } from '@/lib/news-calendar';
import { impactRank, buildNewsMap as buildHardcodedMap } from '@/lib/news-calendar';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function fmt(v: number, symbol: string) {
  const abs = Math.abs(v);
  const s = abs.toLocaleString('en-US', { maximumFractionDigits: 0 });
  return `${v < 0 ? '-' : '+'}${symbol}${s}`;
}

// ── News Detail Popup ───────────────────────────────────────
function NewsPopup({ date, events, onClose }: { date: string; events: NewsEvent[]; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const d = new Date(date + 'T12:00:00');
  const dayName = d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        ref={ref}
        className="bg-[#111827] border border-[#2a3a4a] rounded-xl p-4 max-w-sm w-full shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-slate-400 font-mono">{dayName}</span>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 p-1">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {events.some(e => e.impact === 'VERY_HIGH' || e.impact === 'HIGH') && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 mb-3 text-center">
            <span className="text-xs font-bold text-red-400 uppercase tracking-wider">No Trade Day</span>
          </div>
        )}

        <div className="space-y-3">
          {events.map((ev, i) => (
            <div key={i} className={cn(
              'rounded-lg p-3 border',
              ev.impact === 'VERY_HIGH'
                ? 'bg-red-500/5 border-red-500/30'
                : ev.impact === 'HIGH'
                  ? 'bg-orange-500/5 border-orange-500/30'
                  : 'bg-yellow-500/5 border-yellow-500/30'
            )}>
              <div className="flex items-center gap-2 mb-1.5">
                <span className={cn(
                  'w-2 h-2 rounded-full flex-shrink-0',
                  ev.impact === 'VERY_HIGH' ? 'bg-red-400' : ev.impact === 'HIGH' ? 'bg-orange-400' : 'bg-yellow-400'
                )} />
                <span className="text-xs font-bold text-slate-200">{ev.label}</span>
              </div>
              <div className="text-[11px] text-slate-400 space-y-0.5 pl-4">
                <div>Release: {ev.releaseTime_EST} EST ({ev.releaseTime_TH} TH)</div>
                <div>Impact: <span className={ev.impact === 'VERY_HIGH' ? 'text-red-400' : ev.impact === 'HIGH' ? 'text-orange-400' : 'text-yellow-400'}>{ev.impact.replace('_', ' ')}</span></div>
                <div className="text-slate-500">{ev.description}</div>
                {ev.fomcDetail && <div className="text-slate-500">{ev.fomcDetail}</div>}
                <div className="text-slate-500 mt-1">Rule: {ev.rule}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main Calendar ───────────────────────────────────────────
export default function PnlCalendar() {
  const { convert, symbol } = useCurrency();
  const [viewDate, setViewDate] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [popupData, setPopupData] = useState<{ date: string; events: NewsEvent[] } | null>(null);

  const { data, isLoading } = useSWR('/api/daily-pnl?days=120', fetcher, {
    refreshInterval: 60000,
  });

  const dayMap = useMemo(() => {
    const m = new Map<string, { pnl: number; trades: number }>();
    if (!data?.data) return m;
    for (const d of data.data) {
      m.set(d.day, { pnl: Number(d.pnl), trades: Number(d.trades) });
    }
    return m;
  }, [data]);

  const { year, month } = viewDate;

  // News data for current view month (fetched from DB via /api/news-events)
  const { data: newsData } = useSWR(
    `/api/news-events?year=${year}&month=${month + 1}`,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 60000 }
  );

  const newsMap = useMemo(() => {
    // Baseline: hardcoded FOMC/NFP/CPI/PPI/ISM for full year (future-proof coverage)
    const m = buildHardcodedMap(year, month + 1);

    // Overlay: live ForexFactory events (this week + next week detailed)
    const rows: Array<{
      date: string; event_time_est: string | null; event_time_th: string | null;
      impact: string; title: string; type_short: string | null;
      forecast: string | null; previous: string | null;
    }> = newsData?.events || [];

    // Dedupe key — if DB has an event matching a hardcoded one (same date + type), drop hardcoded
    const dbKeys = new Set(rows.map(r => `${r.date}|${r.type_short}`));
    const datesToProcess = Array.from(m.keys());
    for (const date of datesToProcess) {
      const evs = m.get(date)!;
      const kept = evs.filter((e: NewsEvent) => !dbKeys.has(`${date}|${e.type}`));
      if (kept.length === 0) m.delete(date);
      else m.set(date, kept);
    }

    for (const r of rows) {
      const ev: NewsEvent = {
        date: r.date,
        type: r.type_short || 'NEWS',
        impact: (r.impact as NewsImpact) || 'MEDIUM',
        label: r.title,
        description: [
          r.forecast ? `Forecast: ${r.forecast}` : '',
          r.previous ? `Previous: ${r.previous}` : '',
        ].filter(Boolean).join(' · ') || 'USD economic release',
        releaseTime_EST: r.event_time_est || '—',
        releaseTime_TH: r.event_time_th || '—',
        rule: r.impact === 'VERY_HIGH' ? 'Skip entire trading day'
             : r.impact === 'HIGH' ? 'Avoid trading near release'
             : 'Watch for volatility',
      };
      if (!m.has(ev.date)) m.set(ev.date, []);
      m.get(ev.date)!.push(ev);
    }
    return m;
  }, [newsData, year, month]);

  const summary = useMemo(() => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    let tradingDays = 0;
    const newsDateSet = new Set<string>();
    const breakdown: Record<string, number> = {};
    for (let d = 1; d <= daysInMonth; d++) {
      const dow = new Date(year, month, d).getDay();
      if (dow === 0 || dow === 6) continue;
      tradingDays++;
      const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const evs = newsMap.get(key);
      if (evs && evs.length > 0) {
        newsDateSet.add(key);
        for (const e of evs) breakdown[e.type] = (breakdown[e.type] || 0) + 1;
      }
    }
    const newsDays = newsDateSet.size;
    const activeDays = tradingDays - newsDays;
    return {
      totalTradingDays: tradingDays,
      newsDays,
      activeDays,
      activePercent: tradingDays > 0 ? Math.round((activeDays / tradingDays) * 100) : 0,
      breakdown,
    };
  }, [year, month, newsMap]);

  // Build calendar grid
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthName = new Date(year, month, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  const pad = (n: number) => String(n).padStart(2, '0');
  const toKey = (d: number) => `${year}-${pad(month + 1)}-${pad(d)}`;

  // Monthly total
  let monthTotal = 0;
  let monthTrades = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const entry = dayMap.get(toKey(d));
    if (entry) { monthTotal += entry.pnl; monthTrades += entry.trades; }
  }

  const prevMonth = () => setViewDate(({ year, month }) =>
    month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 }
  );
  const nextMonth = () => setViewDate(({ year, month }) =>
    month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 }
  );
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

  // Breakdown string
  const breakdownStr = Object.entries(summary.breakdown)
    .map(([k, v]) => `${k} x${v}`)
    .join(' | ');

  return (
    <div className="bg-[#111827] rounded-xl border border-[#1e2a3a] p-3 sm:p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={prevMonth}
          className="p-1.5 rounded-lg hover:bg-[#1e2a3a] text-slate-400 hover:text-slate-200 transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <div className="text-center">
          <div className="text-sm font-semibold text-slate-200 font-mono">{monthName}</div>
          <div className={cn('text-xs font-mono font-bold', monthTotal >= 0 ? 'text-green-400' : 'text-red-400')}>
            {fmt(convert(monthTotal), symbol)}
            <span className="text-slate-500 font-normal ml-1.5">{monthTrades} trades</span>
          </div>
        </div>
        <button
          onClick={nextMonth}
          className="p-1.5 rounded-lg hover:bg-[#1e2a3a] text-slate-400 hover:text-slate-200 transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>

      {/* Monthly News Summary */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-2 px-1">
        <span className="text-[10px] font-mono text-green-400/80">
          {summary.activeDays} active
        </span>
        <span className="text-[10px] font-mono text-red-400/70">
          {summary.newsDays} news skip
        </span>
        <span className="text-[10px] font-mono text-slate-500">
          {summary.activePercent}% of {summary.totalTradingDays}d
        </span>
        {breakdownStr && (
          <span className="text-[9px] font-mono text-slate-600 hidden sm:inline">
            {breakdownStr}
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="h-48 flex items-center justify-center text-slate-500 text-sm">Loading...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs border border-[#1e2a3a]">
            <thead>
              <tr className="border-b border-[#1e2a3a]">
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
                  <th key={d} className="text-[10px] text-slate-500 font-normal py-1.5 text-center w-[13%] border-r border-[#1e2a3a] last:border-r-0">{d}</th>
                ))}
                <th className="text-[10px] text-slate-500 font-normal py-1.5 text-right pr-2 w-[9%]">Week</th>
              </tr>
            </thead>
            <tbody>
              {weeks.map((week, wi) => {
                let weekTotal = 0;
                let weekHasData = false;
                for (const day of week) {
                  if (day) {
                    const e = dayMap.get(toKey(day));
                    if (e) { weekTotal += e.pnl; weekHasData = true; }
                  }
                }
                return (
                  <tr key={wi} className="border-b border-[#1e2a3a] last:border-b-0">
                    {week.map((day, di) => {
                      if (!day) return <td key={di} className="p-0 border-r border-[#1e2a3a]" />;
                      const key = toKey(day);
                      const entry = dayMap.get(key);
                      const isToday = key === todayKey;
                      const isFuture = new Date(key) > today;
                      const hasPnl = entry && entry.pnl !== 0;
                      const newsEvents = newsMap.get(key);
                      const hasNews = !!newsEvents && newsEvents.length > 0;
                      const topImpact: NewsImpact = (newsEvents || []).reduce<NewsImpact>(
                        (acc, e) => impactRank(e.impact) > impactRank(acc) ? e.impact : acc,
                        'MEDIUM'
                      );

                      return (
                        <td key={di} className="p-0 border-r border-[#1e2a3a]">
                          <div
                            className={cn(
                              'p-1 min-h-[44px] flex flex-col items-center justify-center transition-colors relative',
                              hasNews ? 'cursor-pointer' : '',
                              isToday ? 'ring-1 ring-[#eab308]/60' : '',
                              hasNews
                                ? topImpact === 'VERY_HIGH'
                                  ? 'border-l-2 border-l-red-500/70'
                                  : topImpact === 'HIGH'
                                    ? 'border-l-2 border-l-orange-500/60'
                                    : 'border-l-2 border-l-yellow-500/50'
                                : '',
                              !isFuture && hasPnl && !hasNews
                                ? entry!.pnl >= 0
                                  ? 'bg-green-500/15 hover:bg-green-500/25'
                                  : 'bg-red-500/15 hover:bg-red-500/25'
                                : hasNews
                                  ? topImpact === 'VERY_HIGH'
                                    ? 'bg-red-500/5 hover:bg-red-500/10'
                                    : topImpact === 'HIGH'
                                      ? 'bg-orange-500/5 hover:bg-orange-500/10'
                                      : 'bg-yellow-500/5 hover:bg-yellow-500/10'
                                  : 'hover:bg-[#1e2a3a]'
                            )}
                            onClick={() => {
                              if (hasNews) setPopupData({ date: key, events: newsEvents! });
                            }}
                          >
                            {/* Day number + news badges */}
                            <div className="flex items-center gap-0.5 mb-0.5 w-full justify-center">
                              <span className={cn(
                                'text-[10px] font-mono',
                                isToday ? 'text-[#eab308]' : hasNews ? (topImpact === 'VERY_HIGH' ? 'text-red-400/80' : topImpact === 'HIGH' ? 'text-orange-400/80' : 'text-yellow-400/80') : 'text-slate-500'
                              )}>{day}</span>
                              {hasNews && newsEvents!.length > 0 && (
                                <span className={cn(
                                  'text-[7px] font-mono font-bold leading-none px-0.5 rounded',
                                  topImpact === 'VERY_HIGH'
                                    ? 'bg-red-500/20 text-red-400'
                                    : topImpact === 'HIGH'
                                      ? 'bg-orange-500/20 text-orange-400'
                                      : 'bg-yellow-500/20 text-yellow-400'
                                )}>
                                  {newsEvents!.map(e => e.type).filter((v, i, a) => a.indexOf(v) === i).join('+')}
                                </span>
                              )}
                            </div>

                            {/* PnL or NO TRADE */}
                            {!isFuture && hasPnl ? (
                              <>
                                <span className={cn(
                                  'font-mono font-bold leading-none text-[10px] sm:text-[11px]',
                                  entry!.pnl >= 0 ? 'text-green-400' : 'text-red-400'
                                )}>
                                  {entry!.pnl >= 0 ? '+' : '-'}{Math.abs(convert(entry!.pnl)).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                                </span>
                                {entry!.trades > 0 && (
                                  <span className="text-[9px] text-slate-600 mt-0.5">{entry!.trades}t</span>
                                )}
                              </>
                            ) : hasNews && !isFuture ? (
                              <span className="text-[8px] text-slate-600 font-mono">skip</span>
                            ) : null}
                          </div>
                        </td>
                      );
                    })}
                    {/* Week total */}
                    <td className="pl-1 pr-2">
                      {weekHasData ? (
                        <div className="flex items-center justify-end min-h-[44px]">
                          <span className={cn(
                            'text-[10px] font-mono font-bold',
                            weekTotal >= 0 ? 'text-green-400/70' : 'text-red-400/70'
                          )}>
                            {weekTotal >= 0 ? '+' : '-'}{Math.abs(convert(weekTotal)).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                          </span>
                        </div>
                      ) : <div className="min-h-[44px]" />}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-[#1e2a3a]">
                <td colSpan={7} className="py-2.5 pl-3">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider">Month Total</span>
                </td>
                <td className="py-2.5 pr-2 text-right">
                  <span className={cn(
                    'font-mono text-xs font-bold',
                    monthTotal >= 0 ? 'text-green-400' : 'text-red-400'
                  )}>
                    {monthTotal >= 0 ? '+' : '-'}{symbol}{Math.abs(convert(monthTotal)).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 px-1">
        <span className="flex items-center gap-1 text-[9px] text-slate-500">
          <span className="w-1.5 h-1.5 rounded-full bg-red-400" /> VERY HIGH (NFP/FOMC)
        </span>
        <span className="flex items-center gap-1 text-[9px] text-slate-500">
          <span className="w-1.5 h-1.5 rounded-full bg-orange-400" /> HIGH (CPI/PPI/ISM)
        </span>
        <span className="flex items-center gap-1 text-[9px] text-slate-500">
          <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" /> MEDIUM
        </span>
        <span className="flex items-center gap-1 text-[9px] text-slate-500">
          <span className="w-2 h-2 rounded-sm bg-green-500/20" /> Profit
        </span>
        <span className="flex items-center gap-1 text-[9px] text-slate-500">
          <span className="w-2 h-2 rounded-sm bg-red-500/20" /> Loss
        </span>
      </div>

      {/* News Detail Popup */}
      {popupData && (
        <NewsPopup
          date={popupData.date}
          events={popupData.events}
          onClose={() => setPopupData(null)}
        />
      )}
    </div>
  );
}
