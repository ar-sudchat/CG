'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { cn, formatPnl, pnlColor } from '@/lib/utils';
import TradeRow from '@/components/TradeRow';

function toBangkokDate(d: string | Date): string {
  return new Date(d).toLocaleDateString('sv-SE', { timeZone: 'Asia/Bangkok' });
}

function toBangkokLabel(d: string | Date): string {
  return new Date(d).toLocaleDateString('th-TH', {
    timeZone: 'Asia/Bangkok',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const dayOptions = [
  { label: '1D', value: 1 },
  { label: '7D', value: 7 },
  { label: '30D', value: 30 },
  { label: 'ALL', value: 365 },
];

export default function TradesPage() {
  const [days, setDays] = useState(7);
  const [account, setAccount] = useState('all');

  const { data: portfolioData } = useSWR('/api/portfolio', fetcher);
  const { data, isLoading } = useSWR(
    `/api/trades?account=${account}&days=${days}&limit=200`,
    fetcher,
    { refreshInterval: 5000 }
  );

  // Group trades by date
  const groupedTrades: Record<string, { trades: any[]; total: number }> = {};
  if (data?.trades) {
    data.trades.forEach((trade: any) => {
      const dateKey = trade.close_time
        ? toBangkokDate(trade.close_time)
        : 'unknown';
      if (!groupedTrades[dateKey]) {
        groupedTrades[dateKey] = { trades: [], total: 0 };
      }
      groupedTrades[dateKey].trades.push(trade);
      groupedTrades[dateKey].total += trade.profit + (trade.swap || 0) + (trade.commission || 0);
    });
  }

  const sortedDates = Object.keys(groupedTrades).sort((a, b) => b.localeCompare(a));

  function formatDateLabel(dateStr: string): string {
    try {
      const today = toBangkokDate(new Date());
      const yesterday = toBangkokDate(new Date(Date.now() - 86400000));
      if (dateStr === today) return 'วันนี้';
      if (dateStr === yesterday) return 'เมื่อวาน';
      return toBangkokLabel(dateStr + 'T00:00:00+07:00');
    } catch {
      return dateStr;
    }
  }

  return (
    <div className="p-4 space-y-4 pb-20 md:pb-4">
      <h1 className="text-lg font-bold text-slate-200">Trade History</h1>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Account filter */}
        <select
          value={account}
          onChange={(e) => setAccount(e.target.value)}
          className="bg-[#111827] border border-[#1e2a3a] text-slate-300 text-xs rounded-lg px-3 py-2 font-mono focus:border-[#eab308] focus:outline-none"
        >
          <option value="all">All Accounts</option>
          {portfolioData?.accounts?.map((acc: any) => (
            <option key={acc.account_number} value={acc.account_number}>
              {acc.account_number}
            </option>
          ))}
        </select>

        {/* Period filter */}
        <div className="flex gap-1">
          {dayOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setDays(opt.value)}
              className={cn(
                'px-3 py-1.5 text-xs font-mono rounded-lg transition-colors',
                days === opt.value
                  ? 'bg-[#eab308]/20 text-[#eab308]'
                  : 'bg-[#111827] text-slate-500 hover:text-slate-300 border border-[#1e2a3a]'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary */}
      {data?.summary && (
        <div className="flex items-center gap-4 bg-[#111827] rounded-xl border border-[#1e2a3a] p-3">
          <div>
            <span className="text-[10px] text-slate-500 uppercase">Total P&L</span>
            <div className={cn('font-mono text-sm font-bold', pnlColor(data.summary.total_profit))}>
              {formatPnl(data.summary.total_profit)}
            </div>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase">Trades</span>
            <div className="font-mono text-sm text-slate-300 font-bold">{data.summary.total_trades}</div>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase">Win Rate</span>
            <div className="font-mono text-sm text-slate-300 font-bold">{data.summary.win_rate}%</div>
          </div>
        </div>
      )}

      {/* Trades grouped by date */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-[#111827] rounded-lg h-12 animate-pulse" />
          ))}
        </div>
      ) : sortedDates.length === 0 ? (
        <div className="text-center text-slate-500 py-8">No trades found</div>
      ) : (
        sortedDates.map((dateStr) => {
          const group = groupedTrades[dateStr];
          return (
            <div key={dateStr}>
              <div className="flex items-center justify-between mb-1 px-1">
                <span className="text-xs font-semibold text-slate-400">
                  {formatDateLabel(dateStr)}
                </span>
                <span className={cn('text-xs font-mono font-semibold', pnlColor(group.total))}>
                  {formatPnl(group.total)} ({group.trades.length} trades)
                </span>
              </div>
              <div className="bg-[#111827] rounded-xl border border-[#1e2a3a] divide-y divide-[#1e2a3a]">
                {group.trades.map((trade: any) => (
                  <TradeRow key={trade.ticket} trade={trade} showAccount={account === 'all'} />
                ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
