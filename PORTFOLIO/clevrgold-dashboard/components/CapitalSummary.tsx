'use client';

import useSWR from 'swr';
import { cn } from '@/lib/utils';
import { useCurrency } from '@/lib/currency';

const fetcher = (url: string) => fetch(url).then(r => r.json());

function PnlValue({ value, size = 'sm', convert, symbol }: { value: number; size?: 'sm' | 'lg' | 'xl'; convert: (v: number) => number; symbol: string }) {
  const converted = convert(value);
  const prefix = converted >= 0 ? '+' : '';
  const textSize = size === 'xl' ? 'text-2xl' : size === 'lg' ? 'text-lg' : 'text-sm';
  return (
    <span className={cn(textSize, 'font-mono font-bold', converted >= 0 ? 'text-emerald-400' : 'text-red-400')}>
      {prefix}{symbol}{Math.abs(converted).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
    </span>
  );
}

interface AccountDetail {
  account_number: number;
  name: string;
  owner: string;
  pair_group: string;
  balance: number;
  equity: number;
  floating: number;
  open_orders: number;
  aw_orders: number;
}

export default function CapitalSummary() {
  const { data, error } = useSWR('/api/capital-summary', fetcher, { refreshInterval: 10000 });
  const { convert, symbol } = useCurrency();

  const fmtVal = (v: number) => {
    const c = convert(v);
    return symbol + Math.abs(c).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  if (error) return <div className="text-red-400 text-sm p-4">Failed to load</div>;
  if (!data) return <div className="text-slate-500 text-sm p-8 text-center">Loading...</div>;

  const { current, month, week, day, cut_loss, accounts } = data;

  const accountsWithLoss = (accounts as AccountDetail[])
    .filter(a => a.floating < 0)
    .sort((a, b) => a.floating - b.floating);

  const accountsWithProfit = (accounts as AccountDetail[])
    .filter(a => a.floating >= 0 && a.open_orders > 0)
    .sort((a, b) => b.floating - a.floating);

  return (
    <div className="bg-[#111827] rounded-xl border border-[#1e2a3a] p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-mono text-[#eab308] uppercase tracking-wider">Capital Summary</h3>
        <div className="text-xs text-slate-500 font-mono">Real-time</div>
      </div>

      {/* Current Status */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-[#0a0e17] rounded-lg p-3 border border-[#1e2a3a]">
          <div className="text-[10px] text-slate-500 uppercase mb-1">Balance</div>
          <div className="text-lg font-mono font-bold text-slate-200">{fmtVal(current.balance)}</div>
        </div>
        <div className="bg-[#0a0e17] rounded-lg p-3 border border-[#1e2a3a]">
          <div className="text-[10px] text-slate-500 uppercase mb-1">Equity</div>
          <div className="text-lg font-mono font-bold text-slate-200">{fmtVal(current.equity)}</div>
        </div>
        <div className={cn('rounded-lg p-3 border', current.floating >= 0 ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-red-500/10 border-red-500/30')}>
          <div className="text-[10px] text-slate-500 uppercase mb-1">Floating P&L</div>
          <PnlValue value={current.floating} size="lg" convert={convert} symbol={symbol} />
        </div>
      </div>

      {/* P&L Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        {/* Daily */}
        <div className="bg-[#0a0e17] rounded-lg p-3 border border-[#1e2a3a]">
          <div className="text-[10px] text-slate-500 uppercase mb-2">Today</div>
          <PnlValue value={day.pnl} size="lg" convert={convert} symbol={symbol} />
          <div className="text-[10px] text-slate-500 mt-1">
            start: {fmtVal(day.start_equity)}
            {day.deposits > 0 && <span className="text-blue-400"> +dp: {fmtVal(day.deposits)}</span>}
          </div>
        </div>

        {/* Weekly */}
        <div className="bg-[#0a0e17] rounded-lg p-3 border border-[#1e2a3a]">
          <div className="text-[10px] text-slate-500 uppercase mb-2">This Week</div>
          <PnlValue value={week.pnl} size="lg" convert={convert} symbol={symbol} />
          <div className="text-[10px] text-slate-500 mt-1">
            start: {fmtVal(week.start_equity)}
            {week.withdrawals > 0 && <span className="text-amber-400"> -wd: {fmtVal(week.withdrawals)}</span>}
            {week.deposits > 0 && <span className="text-blue-400"> +dp: {fmtVal(week.deposits)}</span>}
          </div>
        </div>

        {/* Monthly */}
        <div className="bg-[#0a0e17] rounded-lg p-3 border border-[#1e2a3a]">
          <div className="text-[10px] text-slate-500 uppercase mb-2">This Month</div>
          <PnlValue value={month.pnl} size="lg" convert={convert} symbol={symbol} />
          <div className="text-[10px] text-slate-500 mt-1">
            start: {fmtVal(month.start_equity)}
            {month.withdrawals > 0 && <span className="text-amber-400"> -wd: {fmtVal(month.withdrawals)}</span>}
            {month.deposits > 0 && <span className="text-blue-400"> +dp: {fmtVal(month.deposits)}</span>}
          </div>
        </div>
      </div>

      {/* Cut Loss Simulation */}
      <div className={cn(
        'rounded-lg p-4 border-2 border-dashed',
        cut_loss.total_floating >= 0
          ? 'border-emerald-500/30 bg-emerald-500/5'
          : 'border-red-500/40 bg-red-500/10'
      )}>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-mono text-slate-400 uppercase">
            {cut_loss.total_floating >= 0 ? 'Close All Profit' : 'Cut Loss Simulation'}
          </span>
          <span className="text-[10px] text-slate-600">— ถ้าปิดทุก order ตอนนี้</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <div className="text-[10px] text-slate-500 mb-1">Floating</div>
            <PnlValue value={cut_loss.total_floating} size="lg" convert={convert} symbol={symbol} />
          </div>
          <div>
            <div className="text-[10px] text-slate-500 mb-1">Equity หลังปิด</div>
            <div className="text-lg font-mono font-bold text-slate-200">{fmtVal(cut_loss.equity_after)}</div>
          </div>
          <div>
            <div className="text-[10px] text-slate-500 mb-1">ผลเดือนนี้</div>
            <PnlValue value={cut_loss.month_result} size="lg" convert={convert} symbol={symbol} />
          </div>
          <div>
            <div className="text-[10px] text-slate-500 mb-1">Drawdown</div>
            <div className={cn('text-lg font-mono font-bold', current.floating >= 0 ? 'text-emerald-400' : 'text-red-400')}>
              {current.balance > 0 ? ((current.floating / current.balance) * 100).toFixed(1) : '0.0'}%
            </div>
          </div>
        </div>
      </div>

      {/* Per-Account Floating Breakdown */}
      {accountsWithLoss.length > 0 && (
        <div>
          <div className="text-[10px] text-slate-500 uppercase mb-2">Accounts with Floating Loss</div>
          <div className="space-y-1">
            {accountsWithLoss.map(a => (
              <div key={a.account_number} className="flex items-center justify-between bg-red-500/5 rounded px-3 py-1.5 border border-red-500/10">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-slate-400">{a.account_number}</span>
                  <span className="text-[10px] text-slate-500">{a.pair_group}</span>
                  {a.aw_orders > 0 && <span className="text-[10px] text-orange-400 font-bold">AW</span>}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-slate-500">{a.open_orders} orders</span>
                  <PnlValue value={a.floating} size="sm" convert={convert} symbol={symbol} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {accountsWithProfit.length > 0 && (
        <div>
          <div className="text-[10px] text-slate-500 uppercase mb-2">Accounts with Floating Profit</div>
          <div className="space-y-1">
            {accountsWithProfit.map(a => (
              <div key={a.account_number} className="flex items-center justify-between bg-emerald-500/5 rounded px-3 py-1.5 border border-emerald-500/10">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-slate-400">{a.account_number}</span>
                  <span className="text-[10px] text-slate-500">{a.pair_group}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-slate-500">{a.open_orders} orders</span>
                  <PnlValue value={a.floating} size="sm" convert={convert} symbol={symbol} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
