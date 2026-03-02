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
} from 'recharts';
import { cn, formatMoney } from '@/lib/utils';
import { format } from 'date-fns';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const periods = [
  { label: '1D', days: 1 },
  { label: '7D', days: 7 },
  { label: '30D', days: 30 },
  { label: 'ALL', days: 365 },
];

interface EquityChartProps {
  account?: string;
}

export default function EquityChart({ account = 'all' }: EquityChartProps) {
  const [selectedPeriod, setSelectedPeriod] = useState(1); // 7D default

  const { data, isLoading } = useSWR(
    `/api/equity?days=${periods[selectedPeriod].days}&account=${account}`,
    fetcher,
    { refreshInterval: 15000 }
  );

  const chartData = data?.data?.map((d: { time: string; balance: number; equity: number }) => ({
    ...d,
    time: new Date(d.time).getTime(),
  })) || [];

  return (
    <div className="bg-[#111827] rounded-xl border border-[#1e2a3a] p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-300">Equity Curve</h3>
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
                <linearGradient id="balanceGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#eab308" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#eab308" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2a3a" />
              <XAxis
                dataKey="time"
                type="number"
                domain={['dataMin', 'dataMax']}
                tickFormatter={(v) => format(new Date(v), periods[selectedPeriod].days <= 1 ? 'HH:mm' : 'MM/dd')}
                stroke="#475569"
                tick={{ fontSize: 10, fill: '#64748b' }}
              />
              <YAxis
                stroke="#475569"
                tick={{ fontSize: 10, fill: '#64748b' }}
                tickFormatter={(v) => `$${v.toLocaleString()}`}
                domain={['auto', 'auto']}
                width={70}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1a2332',
                  border: '1px solid #2a3a4a',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                labelFormatter={(v) => format(new Date(v), 'yyyy-MM-dd HH:mm')}
                formatter={(value: any, name: any) => [formatMoney(Number(value)), name === 'balance' ? 'Balance' : 'Equity']}
              />
              <Area
                type="monotone"
                dataKey="balance"
                stroke="#eab308"
                strokeWidth={2}
                fill="url(#balanceGrad)"
              />
              <Area
                type="monotone"
                dataKey="equity"
                stroke="#3b82f6"
                strokeWidth={1.5}
                fill="url(#equityGrad)"
                strokeDasharray="4 2"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="flex items-center gap-4 mt-2 justify-center">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 bg-[#eab308]" />
          <span className="text-[10px] text-slate-500">Balance</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 bg-[#3b82f6] border-dashed" />
          <span className="text-[10px] text-slate-500">Equity</span>
        </div>
      </div>
    </div>
  );
}
