'use client';

import { useState } from 'react';
import useSWR from 'swr';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
  ReferenceLine,
  LabelList,
} from 'recharts';
import { cn, formatPnl, DAILY_TARGET_USD } from '@/lib/utils';
import { useCurrency } from '@/lib/currency';
import { format } from 'date-fns';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const periods = [
  { label: '7D', days: 7 },
  { label: '14D', days: 14 },
  { label: '30D', days: 30 },
  { label: 'ALL', days: 365 },
];

interface DailyPnlChartProps {
  account?: string;
  accountCount?: number;
}

export default function DailyPnlChart({ account = 'all', accountCount = 1 }: DailyPnlChartProps) {
  const [selectedPeriod, setSelectedPeriod] = useState(1); // 14D default
  const { convert, symbol } = useCurrency();

  const { data, isLoading } = useSWR(
    `/api/daily-pnl?days=${periods[selectedPeriod].days}&account=${account}`,
    fetcher,
    { refreshInterval: 15000 }
  );

  const chartData = data?.data?.map((d: { day: string; pnl: number; trades: number; wins: number }) => ({
    day: d.day,
    pnl: d.pnl,
    pnlConverted: convert(d.pnl),
    trades: d.trades,
    wins: d.wins,
    label: format(new Date(d.day), 'MM/dd'),
  })) || [];

  const totalPnl = chartData.reduce((sum: number, d: { pnl: number }) => sum + d.pnl, 0);
  const winDays = chartData.filter((d: { pnl: number }) => d.pnl > 0).length;
  const lossDays = chartData.filter((d: { pnl: number }) => d.pnl < 0).length;
  const target = DAILY_TARGET_USD * accountCount;

  return (
    <div className="bg-[#111827] rounded-xl border border-[#1e2a3a] p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-300">Daily P&L</h3>
          <div className="flex items-center gap-3 mt-1">
            <span className={cn('font-mono text-xs font-semibold', totalPnl >= 0 ? 'text-green-400' : 'text-red-400')}>
              {formatPnl(convert(totalPnl), symbol)}
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              {winDays}W / {lossDays}L
            </span>
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
            No trade data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2a3a" vertical={false} />
              <XAxis
                dataKey="label"
                stroke="#475569"
                tick={{ fontSize: 10, fill: '#64748b' }}
                axisLine={{ stroke: '#1e2a3a' }}
              />
              <YAxis
                stroke="#475569"
                tick={{ fontSize: 10, fill: '#64748b' }}
                tickFormatter={(v) => `${symbol}${Math.abs(v).toLocaleString()}`}
                width={65}
                axisLine={{ stroke: '#1e2a3a' }}
                domain={[(dataMin: number) => Math.min(dataMin, 0), (dataMax: number) => Math.max(dataMax, target) * 1.2]}
                tickCount={7}
              />
              <Tooltip
                cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                contentStyle={{
                  backgroundColor: '#1a2332',
                  border: '1px solid #2a3a4a',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                labelFormatter={(label) => `${label}`}
                formatter={(value: any, _name: any, props: any) => {
                  const d = props.payload;
                  return [
                    `${formatPnl(convert(Number(value)), symbol)}  (${d.wins}/${d.trades} wins)`,
                    'P&L',
                  ];
                }}
              />
              <ReferenceLine y={0} stroke="#475569" strokeWidth={1} />
              <ReferenceLine
                y={target}
                stroke="#eab308"
                strokeWidth={1}
                strokeDasharray="6 3"
                label={{ value: 'Target', position: 'right', fill: '#eab308', fontSize: 10 }}
              />
              <Bar dataKey="pnl" radius={[3, 3, 0, 0]} maxBarSize={32}>
                {chartData.map((entry: { pnl: number }, index: number) => (
                  <Cell
                    key={index}
                    fill={entry.pnl >= 0 ? '#22c55e' : '#ef4444'}
                    fillOpacity={0.8}
                  />
                ))}
                <LabelList
                  dataKey="pnlConverted"
                  position="top"
                  formatter={(v: any) => `${symbol}${Math.abs(Number(v)).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
                  style={{ fontSize: 9, fontFamily: 'monospace', fill: '#94a3b8' }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="flex items-center gap-4 mt-2 justify-center">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-green-500/80" />
          <span className="text-[10px] text-slate-500">Profit Day</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-red-500/80" />
          <span className="text-[10px] text-slate-500">Loss Day</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0 border-t border-dashed border-[#eab308]" />
          <span className="text-[10px] text-slate-500">Target {symbol}{target.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}
