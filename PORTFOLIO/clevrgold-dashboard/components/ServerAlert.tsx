'use client';

import { useEffect, useRef, useState } from 'react';
import useSWR from 'swr';

const STALE_THRESHOLD = 180; // 3 minutes

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface Account {
  account_number: number;
  name: string;
  seconds_ago: number;
  open_orders: number;
  aw_orders: number;
}

interface NewsEvent {
  title: string;
  date: string;
  time_bangkok: string;
  impact: string;
  is_critical: boolean;
  minutes_until: number;
}

interface ServerAlertProps {
  accounts: Account[];
}

export default function ServerAlert({ accounts }: ServerAlertProps) {
  const [dismissed, setDismissed] = useState(false);
  const [newsDismissed, setNewsDismissed] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hasPlayedRef = useRef(false);

  // Fetch high-impact USD news
  const { data: newsData } = useSWR('/api/news', fetcher, {
    refreshInterval: 5 * 60 * 1000, // refresh every 5 min
    revalidateOnFocus: true,
  });

  // Find accounts that are stale AND have open orders
  const dangerAccounts = accounts.filter(
    (a) => a.seconds_ago > STALE_THRESHOLD && (a.open_orders + a.aw_orders) > 0
  );

  // Find accounts that are stale but no orders (less urgent)
  const warnAccounts = accounts.filter(
    (a) => a.seconds_ago > STALE_THRESHOLD && (a.open_orders + a.aw_orders) === 0
  );

  const hasDanger = dangerAccounts.length > 0;

  // News alerts
  const newsEvents: NewsEvent[] = newsData?.events || [];
  const imminentNews = newsEvents.filter((e) => e.minutes_until > 0 && e.minutes_until <= 60);
  const upcomingNews = newsEvents.filter((e) => e.minutes_until > 0 && e.minutes_until <= 240);
  const hasImminentNews = imminentNews.length > 0;
  const hasUpcomingNews = upcomingNews.length > 0 && !hasImminentNews;

  // Reset news dismiss when imminent news appears
  useEffect(() => {
    if (hasImminentNews) {
      setNewsDismissed(false);
    }
  }, [hasImminentNews]);

  // Play alert sound when danger first appears
  useEffect(() => {
    if (hasDanger && !hasPlayedRef.current) {
      hasPlayedRef.current = true;
      setDismissed(false);
      // Play sound
      try {
        if (!audioRef.current) {
          audioRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdH2JkJWTi4B2bWRfXWBmanN+iJCVlZGKgXdtZF9dYGpzfoiRlpaRioF3bGRfXGBqc36IkZaWkYqBd2xkX1xganN+iJGWlpGKgXdsZF9cYGpzfoiRlpaRioF3bGRfXA==');
          audioRef.current.volume = 0.5;
        }
        audioRef.current.play().catch(() => {});
        // Repeat sound every 30 seconds if not dismissed
        const interval = setInterval(() => {
          if (!dismissed && dangerAccounts.length > 0) {
            audioRef.current?.play().catch(() => {});
          }
        }, 30000);
        return () => clearInterval(interval);
      } catch {
        // Audio not supported
      }
    }
    if (!hasDanger) {
      hasPlayedRef.current = false;
    }
  }, [hasDanger, dismissed, dangerAccounts.length]);

  // Request browser notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Send browser notification
  useEffect(() => {
    if (hasDanger && !dismissed && 'Notification' in window && Notification.permission === 'granted') {
      const names = dangerAccounts.map(a => a.account_number).join(', ');
      const n = new Notification('SERVER DOWN - Orders at risk!', {
        body: `${dangerAccounts.length} account(s) offline with open orders: ${names}`,
        icon: '/favicon.ico',
        tag: 'server-alert',
        requireInteraction: true,
      });
      n.onclick = () => {
        window.focus();
        n.close();
      };
    }
  }, [hasDanger, dismissed, dangerAccounts]);

  // Send browser notification for imminent news
  useEffect(() => {
    if (hasImminentNews && !newsDismissed && 'Notification' in window && Notification.permission === 'granted') {
      const ev = imminentNews[0];
      const n = new Notification(`USD NEWS IN ${ev.minutes_until}min`, {
        body: `${ev.title} — Consider closing EA`,
        icon: '/favicon.ico',
        tag: 'news-alert',
      });
      n.onclick = () => {
        window.focus();
        n.close();
      };
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasImminentNews, newsDismissed]);

  const showServerAlert = hasDanger || (warnAccounts.length > 0 && !dismissed);
  const showNewsAlert = (hasImminentNews || hasUpcomingNews) && !newsDismissed;

  if (!showServerAlert && !showNewsAlert) return null;

  return (
    <div className="space-y-2">
      {/* News Alert — Imminent (RED pulsing) */}
      {hasImminentNews && !newsDismissed && (
        <div className="rounded-xl border p-3 bg-red-500/15 border-red-500/50 animate-pulse">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-lg flex-shrink-0">!!!</span>
              <div className="min-w-0">
                {imminentNews.map((ev, i) => (
                  <div key={i} className="text-xs font-bold text-red-400">
                    USD NEWS IN {ev.minutes_until}min: {ev.title}
                    {ev.is_critical && (
                      <span className="ml-1.5 px-1.5 py-0.5 rounded bg-red-500/30 text-red-300 text-[10px] font-bold border border-red-500/50">
                        CRITICAL
                      </span>
                    )}
                    <span className="text-red-300/70 font-normal ml-1">— CLOSE EA NOW</span>
                  </div>
                ))}
              </div>
            </div>
            <button
              onClick={() => setNewsDismissed(true)}
              className="text-red-400/60 hover:text-red-300 text-xs px-2 py-1 flex-shrink-0"
            >
              X
            </button>
          </div>
        </div>
      )}

      {/* News Alert — Upcoming within 4h (YELLOW) */}
      {hasUpcomingNews && !newsDismissed && (
        <div className="rounded-xl border p-3 bg-yellow-500/10 border-yellow-500/30">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm flex-shrink-0">!!</span>
              <div className="min-w-0">
                {upcomingNews.slice(0, 3).map((ev, i) => (
                  <div key={i} className="text-xs text-yellow-400">
                    <span className="font-bold">USD News today:</span>{' '}
                    <span className="text-yellow-300">{ev.title}</span>
                    {ev.is_critical && (
                      <span className="ml-1.5 px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-300 text-[10px] font-bold border border-yellow-500/40">
                        CRITICAL
                      </span>
                    )}
                    <span className="text-yellow-400/60 ml-1">
                      at {ev.time_bangkok.split(' ').slice(-1)[0]} ({ev.minutes_until}min)
                    </span>
                  </div>
                ))}
                {upcomingNews.length > 3 && (
                  <div className="text-[10px] text-yellow-400/50 mt-0.5">
                    +{upcomingNews.length - 3} more events
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={() => setNewsDismissed(true)}
              className="text-yellow-400/60 hover:text-yellow-300 text-xs px-2 py-1 flex-shrink-0"
            >
              X
            </button>
          </div>
        </div>
      )}

      {/* Server Alert */}
      {showServerAlert && (
        <div className={`rounded-xl border p-3 ${
          hasDanger
            ? 'bg-red-500/10 border-red-500/40 animate-pulse'
            : 'bg-yellow-500/10 border-yellow-500/30'
        }`}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className={`text-lg ${hasDanger ? 'text-red-400' : 'text-yellow-400'}`}>
                {hasDanger ? '!!!' : '!'}
              </span>
              <div>
                <div className={`text-xs font-bold ${hasDanger ? 'text-red-400' : 'text-yellow-400'}`}>
                  {hasDanger
                    ? `SERVER DOWN — ${dangerAccounts.length} account${dangerAccounts.length > 1 ? 's' : ''} with open orders at risk`
                    : `Server Disconnected — ${warnAccounts.length} account${warnAccounts.length > 1 ? 's' : ''} offline`}
                </div>
              </div>
            </div>
            {!hasDanger && (
              <button
                onClick={() => setDismissed(true)}
                className="text-[var(--text-dim)] hover:text-[var(--text-body)] text-xs px-2 py-1"
              >
                X
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
