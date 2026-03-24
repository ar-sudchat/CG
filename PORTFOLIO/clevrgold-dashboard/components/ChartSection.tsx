'use client';

import { useState, useCallback, useRef } from 'react';
import { cn } from '@/lib/utils';
import DailyPnlChart from '@/components/DailyPnlChart';
import PnlCalendar from '@/components/PnlCalendar';
import dynamic from 'next/dynamic';

const TradingViewChart = dynamic(() => import('@/components/TradingViewChart'), {
  ssr: false,
  loading: () => (
    <div className="h-[300px] sm:h-[400px] flex items-center justify-center text-slate-500 text-sm">
      Loading chart...
    </div>
  ),
});

const GrowthChart = dynamic(() => import('@/components/GrowthChart'), {
  ssr: false,
  loading: () => (
    <div className="h-[300px] sm:h-[400px] flex items-center justify-center text-slate-500 text-sm">
      Loading chart...
    </div>
  ),
});

const TradingViewNews = dynamic(() => import('@/components/TradingViewNews'), {
  ssr: false,
  loading: () => (
    <div className="h-[350px] flex items-center justify-center text-slate-500 text-sm">
      Loading news...
    </div>
  ),
});

const CapitalSummary = dynamic(() => import('@/components/CapitalSummary'), {
  ssr: false,
  loading: () => (
    <div className="h-[300px] flex items-center justify-center text-slate-500 text-sm">
      Loading...
    </div>
  ),
});

type TabKey = 'pnl' | 'growth' | 'capital' | 'calendar' | 'xauusd' | 'news';

const tabs: { key: TabKey; label: string }[] = [
  { key: 'pnl', label: 'Daily P&L' },
  { key: 'growth', label: 'Growth' },
  { key: 'capital', label: 'Capital' },
  { key: 'calendar', label: 'Calendar' },
  { key: 'xauusd', label: 'TradingView' },
  { key: 'news', label: 'News' },
];

interface ChartSectionProps {
  accountCount?: number;
}

export default function ChartSection({ accountCount }: ChartSectionProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('pnl');
  const [showFullscreen, setShowFullscreen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const openFullscreen = useCallback(() => setShowFullscreen(true), []);
  const closeFullscreen = useCallback(() => setShowFullscreen(false), []);

  const scroll = useCallback((dir: 'left' | 'right') => {
    scrollRef.current?.scrollBy({ left: dir === 'left' ? -120 : 120, behavior: 'smooth' });
  }, []);

  return (
    <div className="min-w-0">
      {/* Tab bar */}
      <div className="flex items-center gap-1 mb-2">
        <button
          onClick={() => scroll('left')}
          className="flex-shrink-0 w-6 h-7 flex items-center justify-center text-slate-500 hover:text-slate-300 md:hidden"
          aria-label="Scroll left"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <div ref={scrollRef} className="overflow-x-auto no-scrollbar flex-1 min-w-0">
          <div className="flex gap-1 w-max">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'px-3 py-1.5 text-xs font-mono rounded-lg transition-colors whitespace-nowrap',
                  activeTab === tab.key
                    ? 'bg-[#eab308]/20 text-[#eab308]'
                    : 'bg-[#111827] text-slate-500 hover:text-slate-300 border border-[#1e2a3a]'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={() => scroll('right')}
          className="flex-shrink-0 w-6 h-7 flex items-center justify-center text-slate-500 hover:text-slate-300 md:hidden"
          aria-label="Scroll right"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>

      {/* Chart content */}
      {activeTab === 'pnl' && (
        <DailyPnlChart accountCount={accountCount} />
      )}

      {activeTab === 'growth' && (
        <GrowthChart />
      )}

      {activeTab === 'capital' && (
        <CapitalSummary />
      )}

      {activeTab === 'calendar' && (
        <PnlCalendar />
      )}

      {activeTab === 'xauusd' && (
        <div className="bg-[#111827] rounded-xl border border-[#1e2a3a] overflow-hidden relative">
          {/* Fullscreen button */}
          <button
            onClick={openFullscreen}
            className="absolute top-2 right-2 z-10 p-1.5 bg-[#1a2332]/90 hover:bg-[#2a3a4a] border border-[#2a3a4a] rounded-lg transition-colors"
            title="Fullscreen"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
            </svg>
          </button>
          <div className="h-[300px] sm:h-[400px]">
            <TradingViewChart />
          </div>
        </div>
      )}

      {activeTab === 'news' && (
        <div className="bg-[#111827] rounded-xl border border-[#1e2a3a] overflow-hidden">
          <div className="h-[350px]">
            <TradingViewNews />
          </div>
        </div>
      )}

      {/* Fullscreen modal */}
      {showFullscreen && (
        <div className="fixed inset-0 z-50 bg-[#0a0e17]">
          {/* Close button */}
          <button
            onClick={closeFullscreen}
            className="absolute top-3 right-3 z-50 p-2 bg-[#1a2332]/90 hover:bg-[#2a3a4a] border border-[#2a3a4a] rounded-lg transition-colors"
            title="Close"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
          <div className="w-full h-full">
            <TradingViewChart fullscreen />
          </div>
        </div>
      )}
    </div>
  );
}
