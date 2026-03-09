'use client';

import { useState, useMemo } from 'react';
import useSWR from 'swr';
import { cn } from '@/lib/utils';
import { useCurrency } from '@/lib/currency';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function fmt(v: number, symbol: string) {
  const abs = Math.abs(v);
  const s = abs.toLocaleString('en-US', { maximumFractionDigits: 0 });
  return `${v < 0 ? '-' : '+'}${symbol}${s}`;
}

export default function PnlCalendar() {
  const { convert, symbol } = useCurrency();
  const [viewDate, setViewDate] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

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

  // Build calendar grid
  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthName = new Date(year, month, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Pad start
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // Pad end to complete last row
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
  const isCurrentMonth = () => {
    const now = new Date();
    return year === now.getFullYear() && month === now.getMonth();
  };
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

  return (
    <div className="bg-[#111827] rounded-xl border border-[#1e2a3a] p-3 sm:p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
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
          disabled={isCurrentMonth()}
          className="p-1.5 rounded-lg hover:bg-[#1e2a3a] text-slate-400 hover:text-slate-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
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
                // Week total
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
                      return (
                        <td key={di} className="p-0 border-r border-[#1e2a3a]">
                          <div className={cn(
                            'p-1 min-h-[44px] flex flex-col items-center justify-center transition-colors relative',
                            isToday ? 'ring-1 ring-[#eab308]/60' : '',
                            !isFuture && hasPnl
                              ? entry!.pnl >= 0
                                ? 'bg-green-500/15 hover:bg-green-500/25'
                                : 'bg-red-500/15 hover:bg-red-500/25'
                              : 'hover:bg-[#1e2a3a]'
                          )}>
                            <span className={cn(
                              'text-[10px] font-mono mb-0.5',
                              isToday ? 'text-[#eab308]' : 'text-slate-500'
                            )}>{day}</span>
                            {!isFuture && hasPnl ? (
                              <>
                                <span className={cn(
                                  'font-mono font-bold leading-none',
                                  'text-[10px] sm:text-[11px]',
                                  entry!.pnl >= 0 ? 'text-green-400' : 'text-red-400'
                                )}>
                                  {entry!.pnl >= 0 ? '+' : '-'}{Math.abs(convert(entry!.pnl)).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                                </span>
                                {entry!.trades > 0 && (
                                  <span className="text-[9px] text-slate-600 mt-0.5">{entry!.trades}t</span>
                                )}
                              </>
                            ) : null}
                          </div>
                        </td>
                      );
                    })}
                    {/* Week total */}
                    <td className="pl-2">
                      {weekHasData ? (
                        <div className="flex flex-col items-end justify-center min-h-[44px]">
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
          </table>
        </div>
      )}
    </div>
  );
}
