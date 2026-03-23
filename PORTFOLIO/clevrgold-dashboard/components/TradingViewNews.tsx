'use client';

import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

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

function formatCountdown(minutes: number): string {
  if (minutes <= 0) return 'PASSED';
  if (minutes < 60) return `${minutes}min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function getEventStatus(minutes: number): { label: string; color: string; bg: string } {
  if (minutes <= 0) return { label: 'DONE', color: 'text-slate-500', bg: 'bg-slate-500/10' };
  if (minutes <= 30) return { label: 'IMMINENT', color: 'text-red-400', bg: 'bg-red-500/15' };
  if (minutes <= 60) return { label: 'SOON', color: 'text-orange-400', bg: 'bg-orange-500/10' };
  if (minutes <= 240) return { label: 'TODAY', color: 'text-yellow-400', bg: 'bg-yellow-500/10' };
  return { label: '', color: 'text-slate-400', bg: '' };
}

export default function TradingViewNews() {
  const { data, isLoading } = useSWR('/api/news', fetcher, {
    refreshInterval: 5 * 60 * 1000, // refresh every 5 min
  });

  const events: NewsEvent[] = data?.events || [];

  // Group by date portion of time_bangkok
  const grouped: Record<string, NewsEvent[]> = {};
  for (const e of events) {
    const parts = e.time_bangkok.split(' ');
    const dateKey = parts.slice(0, -1).join(' '); // everything except the time
    if (!grouped[dateKey]) grouped[dateKey] = [];
    grouped[dateKey].push(e);
  }

  return (
    <div className="p-3 space-y-3 overflow-y-auto h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
            USD High Impact News
          </span>
        </div>
        {data?.next_event && data.next_event.minutes_until > 0 && (
          <span className="text-[10px] font-mono text-slate-400">
            Next in {formatCountdown(data.next_event.minutes_until)}
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-full text-slate-500 text-sm">
          Loading news...
        </div>
      ) : events.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-[80%] text-slate-500">
          <div className="text-2xl mb-2">---</div>
          <div className="text-sm">No high-impact USD events this week</div>
          <div className="text-[10px] text-slate-600 mt-1">Check back Monday</div>
        </div>
      ) : (
        Object.entries(grouped).map(([date, dayEvents]) => (
          <div key={date}>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1.5 border-b border-slate-800 pb-1">
              {date}
            </div>
            <div className="space-y-1">
              {dayEvents.map((e, i) => {
                const status = getEventStatus(e.minutes_until);
                const timePart = e.time_bangkok.split(' ').slice(-1)[0];
                const isPassed = e.minutes_until <= 0;

                return (
                  <div
                    key={`${e.date}-${i}`}
                    className={`flex items-center gap-2 py-2 px-2.5 rounded-lg transition-colors ${
                      isPassed
                        ? 'bg-[#0a0e17]/30 opacity-50'
                        : e.minutes_until <= 60
                          ? 'bg-red-500/5 border border-red-500/20'
                          : 'bg-[#0a0e17]/50'
                    }`}
                  >
                    {/* Impact dot */}
                    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                      isPassed ? 'bg-slate-600' : 'bg-red-500 border border-red-400/50'
                    } ${!isPassed && e.minutes_until <= 60 ? 'animate-pulse' : ''}`} />

                    {/* Time */}
                    <span className={`text-[11px] font-mono w-[42px] flex-shrink-0 ${
                      isPassed ? 'text-slate-600' : 'text-slate-300 font-semibold'
                    }`}>
                      {timePart}
                    </span>

                    {/* Title + badges */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-xs truncate ${
                          isPassed ? 'text-slate-600' : e.is_critical ? 'text-red-300 font-semibold' : 'text-slate-300'
                        }`}>
                          {e.title}
                        </span>
                        {e.is_critical && !isPassed && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-500/25 text-red-300 border border-red-500/40 flex-shrink-0">
                            CRITICAL
                          </span>
                        )}
                      </div>
                      {/* Forecast / Previous */}
                      {(e.forecast || e.previous) && !isPassed && (
                        <div className="flex gap-3 mt-0.5">
                          {e.forecast && (
                            <span className="text-[10px] text-slate-500">
                              F: <span className="text-slate-400 font-mono">{e.forecast}</span>
                            </span>
                          )}
                          {e.previous && (
                            <span className="text-[10px] text-slate-500">
                              P: <span className="text-slate-400 font-mono">{e.previous}</span>
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Countdown / Status */}
                    <div className="flex-shrink-0 text-right">
                      {!isPassed && status.label && (
                        <div className={`text-[9px] font-bold uppercase ${status.color}`}>
                          {status.label}
                        </div>
                      )}
                      <div className={`text-[10px] font-mono ${isPassed ? 'text-slate-600' : status.color}`}>
                        {isPassed ? 'done' : formatCountdown(e.minutes_until)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
