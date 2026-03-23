'use client';

import { useState } from 'react';
import useSWR from 'swr';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import { cn, formatPnl } from '@/lib/utils';
import { useCurrency } from '@/lib/currency';
import { format } from 'date-fns';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const periods = [
  { label: '7D', days: 7 },
  { label: '14D', days: 14 },
  { label: '30D', days: 30 },
  { label: 'ALL', days: 365 },
];

export default function GrowthChart() {
  const [selectedPeriod, setSelectedPeriod] = useState(3); // ALL default
  const { convert, symbol } = useCurrency();

  const { data, isLoading } = useSWR(
    `/api/daily-pnl?days=${periods[selectedPeriod].days}&account=all`,
    fetcher,
    { refreshInterval: 30000 }
  );

  // Build cumulative growth from daily PnL
  const chartData = (() => {
    if (!data?.data?.length) return [];
    let cumulative = 0;
    return data.data.map((d: { day: string; pnl: number; trades: number; wins: number }) => {
      cumulative += d.pnl;
      return {
        day: d.day,
        pnl: d.pnl,
        cumulative,
        cumulativeConverted: convert(cumulative),
        trades: d.trades,
        wins: d.wins,
        label: format(new Date(d.day + 'T00:00:00'), 'MMM d'),
      };
    });
  })();

  const totalGrowth = chartData.length > 0 ? chartData[chartData.length - 1].cumulative : 0;
  const minGrowth = Math.min(...chartData.map((d: { cumulative: number }) => d.cumulative), 0);
  const maxDrawdown = (() => {
    let peak = 0, maxDd = 0;
    for (const d of chartData) {
      if (d.cumulative > peak) peak = d.cumulative;
      const dd = peak - d.cumulative;
      if (dd > maxDd) maxDd = dd;
    }
    return maxDd;
  })();

  return (
    <div className="bg-[#111827] rounded-xl border border-[#1e2a3a] p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-300">Portfolio Growth</h3>
          <div className="flex items-center gap-3 mt-1">
            <span className={cn('font-mono text-xs font-semibold', totalGrowth >= 0 ? 'text-green-400' : 'text-red-400')}>
              {formatPnl(convert(totalGrowth), symbol)}
            </span>
            {maxDrawdown > 0 && (
              <span className="text-[10px] font-mono text-red-400/60">
                Max DD: {formatPnl(convert(-maxDrawdown), symbol)}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-1">
          {periods.map((p, i) => (
            <button
              key={p.label}
              onClick={() => setSelectedPeriod(i)}
              className={cn(
                'px-2 py-0.5 text-xs font-mono rounded transition-colors',
                selectedPeriod === i
                  ? 'bg-[#eab308]/20 text-[#eab308]'
                  : 'text-slate-500 hover:text-slate-300'
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="h-[200px] sm:h-[280px]">
        {isLoading ? (
          <div className="h-full flex items-center justify-center text-slate-500 text-sm">
            Loading chart...
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-500 text-sm">
            No data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="growthGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2a3a" vertical={false} />
              <XAxis
                dataKey="label"
                stroke="#475569"
                tick={{ fontSize: 10, fill: '#64748b' }}
                axisLine={{ stroke: '#1e2a3a' }}
                interval="preserveStartEnd"
              />
              <YAxis
                stroke="#475569"
                tick={{ fontSize: 10, fill: '#64748b' }}
                tickFormatter={(v) => {
                  const av = Math.abs(v);
                  if (av >= 1000) return `${symbol}${(v / 1000).toFixed(1)}k`;
                  return `${symbol}${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
                }}
                width={65}
                axisLine={{ stroke: '#1e2a3a' }}
                domain={[
                  (dataMin: number) => Math.min(dataMin, minGrowth, 0) * 1.1,
                  (dataMax: number) => dataMax * 1.15,
                ]}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1a2332',
                  border: '1px solid #2a3a4a',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                labelFormatter={(label) => label}
                formatter={(value: any, _name: any, props: any) => {
                  const d = props.payload;
                  return [
                    `${formatPnl(convert(Number(value)), symbol)}  (day: ${d.pnl >= 0 ? '+' : ''}${formatPnl(convert(d.pnl), symbol)})`,
                    'Cumulative',
                  ];
                }}
              />
              <ReferenceLine y={0} stroke="#ef4444" strokeWidth={1} strokeDasharray="6 3" />
              <Area
                type="monotone"
                dataKey="cumulative"
                stroke="#3b82f6"
                strokeWidth={2}
                fill="url(#growthGradient)"
                dot={{ r: 3, fill: '#3b82f6', stroke: '#1a2332', strokeWidth: 1 }}
                activeDot={{ r: 5, fill: '#3b82f6', stroke: '#1a2332', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="flex items-center gap-4 mt-2 justify-center">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 bg-blue-500 rounded" />
          <span className="text-[10px] text-slate-500">Cumulative P&L</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0 border-t border-dashed border-red-500" />
          <span className="text-[10px] text-slate-500">Break Even</span>
        </div>
      </div>
    </div>
  );
}
