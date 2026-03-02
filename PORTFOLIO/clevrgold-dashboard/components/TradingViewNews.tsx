'use client';

import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const impactColor: Record<string, { bg: string; border: string; text: string }> = {
  High: { bg: 'bg-red-500/20', border: 'border-red-500/50', text: 'text-red-400' },
  Medium: { bg: 'bg-orange-500/20', border: 'border-orange-500/50', text: 'text-orange-400' },
  Low: { bg: 'bg-yellow-500/20', border: 'border-yellow-500/50', text: 'text-yellow-400' },
  Holiday: { bg: 'bg-slate-500/20', border: 'border-slate-500/50', text: 'text-slate-400' },
};

function formatEventTime(dateStr: string): { date: string; time: string } {
  const d = new Date(dateStr);
  const date = d.toLocaleDateString('th-TH', {
    timeZone: 'Asia/Bangkok',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
  const time = d.toLocaleTimeString('th-TH', {
    timeZone: 'Asia/Bangkok',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  return { date, time };
}

interface CalendarEvent {
  title: string;
  date: string;
  impact: string;
}

export default function TradingViewNews() {
  const { data, isLoading } = useSWR('/api/calendar', fetcher, {
    refreshInterval: 30 * 60 * 1000, // refresh every 30 min
  });

  const events: CalendarEvent[] = data?.events || [];

  // Group by date
  const grouped: Record<string, CalendarEvent[]> = {};
  for (const e of events) {
    const { date } = formatEventTime(e.date);
    if (!grouped[date]) grouped[date] = [];
    grouped[date].push(e);
  }

  return (
    <div className="p-3 space-y-3 overflow-y-auto h-full">
      {isLoading ? (
        <div className="flex items-center justify-center h-full text-slate-500 text-sm">
          Loading calendar...
        </div>
      ) : events.length === 0 ? (
        <div className="flex items-center justify-center h-full text-slate-500 text-sm">
          No upcoming USD events
        </div>
      ) : (
        Object.entries(grouped).map(([date, dayEvents]) => (
          <div key={date}>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1.5">
              {date}
            </div>
            <div className="space-y-1">
              {dayEvents.map((e, i) => {
                const colors = impactColor[e.impact] || impactColor.Low;
                const { time } = formatEventTime(e.date);
                return (
                  <div
                    key={`${e.date}-${i}`}
                    className="flex items-center gap-2 py-1.5 px-2 rounded-lg bg-[#0a0e17]/50"
                  >
                    {/* Impact dot */}
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${colors.bg} border ${colors.border}`} />
                    {/* Time */}
                    <span className="text-[11px] font-mono text-slate-400 w-[42px] flex-shrink-0">
                      {time}
                    </span>
                    {/* Title */}
                    <span className="text-xs text-slate-300 truncate">
                      {e.title}
                    </span>
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
