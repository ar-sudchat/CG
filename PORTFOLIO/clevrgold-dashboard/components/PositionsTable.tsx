'use client';

import { cn, formatPnl, pnlColor } from '@/lib/utils';
import { useCurrency } from '@/lib/currency';

interface Position {
  ticket: number;
  type: string;
  lots: number;
  symbol: string;
  open_price: number;
  current_price: number;
  sl: number;
  tp: number;
  commission: number;
  swap: number;
  profit: number;
  open_time: string;
}

interface PositionsTableProps {
  positions: Position[];
  awOrders: number;
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${month}/${day} ${hours}:${minutes}`;
}

function timeSinceOpen(dateStr: string) {
  const now = new Date();
  const open = new Date(dateStr);
  const diffMs = now.getTime() - open.getTime();
  const diffH = Math.floor(diffMs / 3600000);
  const diffM = Math.floor((diffMs % 3600000) / 60000);
  if (diffH > 24) {
    const days = Math.floor(diffH / 24);
    return `${days}d ${diffH % 24}h`;
  }
  if (diffH > 0) return `${diffH}h ${diffM}m`;
  return `${diffM}m`;
}

export default function PositionsTable({ positions, awOrders }: PositionsTableProps) {
  const { convert, symbol } = useCurrency();

  if (positions.length === 0) {
    return (
      <div className="bg-[#111827] rounded-xl border border-[#1e2a3a] p-4">
        <h3 className="text-sm font-semibold text-slate-300 mb-3">Open Positions</h3>
        <p className="text-sm text-slate-500 text-center py-4">No open positions</p>
      </div>
    );
  }

  const totalProfit = positions.reduce((sum, p) => sum + p.profit, 0);
  const totalCommission = positions.reduce((sum, p) => sum + p.commission, 0);
  const totalSwap = positions.reduce((sum, p) => sum + p.swap, 0);
  const totalNet = totalProfit + totalCommission + totalSwap;
  const totalLots = positions.reduce((sum, p) => sum + p.lots, 0);

  return (
    <div className={cn(
      'bg-[#111827] rounded-xl border p-4',
      awOrders > 0 ? 'border-red-500/30' : 'border-[#1e2a3a]'
    )}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-slate-300">
            Open Positions
          </h3>
          <span className="text-xs font-mono text-slate-500">
            {positions.length} order{positions.length > 1 ? 's' : ''}
          </span>
          {awOrders > 0 && (
            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-red-500/15 text-red-400">
              AW {awOrders}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-slate-500 uppercase">Total Lots</span>
          <span className="font-mono text-xs text-slate-300">{totalLots.toFixed(2)}</span>
        </div>
      </div>

      {/* Position cards */}
      <div className="space-y-2">
        {positions.map((pos) => {
          const isBuy = pos.type.toLowerCase() === 'buy';
          const pips = isBuy
            ? (pos.current_price - pos.open_price)
            : (pos.open_price - pos.current_price);

          return (
            <div
              key={pos.ticket}
              className={cn(
                'rounded-lg border p-3',
                pos.profit >= 0
                  ? 'bg-green-500/5 border-green-500/15'
                  : 'bg-red-500/5 border-red-500/15'
              )}
            >
              {/* Row 1: Type + Ticket + Profit */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={cn(
                    'px-1.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase',
                    isBuy
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-red-500/20 text-red-400'
                  )}>
                    {pos.type}
                  </span>
                  <span className="font-mono text-xs text-slate-400">
                    {pos.lots} lot
                  </span>
                  <span className="text-[10px] text-slate-600">#{pos.ticket}</span>
                </div>
                <div className="text-right">
                  <div className={cn('font-mono text-sm font-bold', pnlColor(pos.profit))}>
                    {formatPnl(convert(pos.profit), symbol)}
                  </div>
                </div>
              </div>

              {/* Row 2: Prices */}
              <div className="grid grid-cols-3 gap-2 text-[11px]">
                <div>
                  <span className="text-slate-500">Open: </span>
                  <span className="font-mono text-slate-300">{pos.open_price.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-slate-500">Now: </span>
                  <span className={cn('font-mono', pnlColor(pos.profit))}>
                    {pos.current_price.toFixed(2)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Pips: </span>
                  <span className={cn('font-mono', pnlColor(pips))}>
                    {pips >= 0 ? '+' : ''}{pips.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Row 3: Time + Costs */}
              <div className="flex items-center justify-between mt-2 text-[10px] text-slate-500">
                <span className="font-mono">
                  {formatTime(pos.open_time)} ({timeSinceOpen(pos.open_time)})
                </span>
                <span className="font-mono">
                  {pos.commission !== 0 && `comm: ${pos.commission.toFixed(2)}`}
                  {pos.swap !== 0 && ` swap: ${pos.swap.toFixed(2)}`}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div className="mt-3 pt-3 border-t border-[#1e2a3a]">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-500">Total P&L (incl. costs)</span>
          <div className="flex items-center gap-3">
            {totalCommission !== 0 && (
              <span className="text-[10px] font-mono text-slate-500">
                Comm: {totalCommission.toFixed(2)}
              </span>
            )}
            <span className={cn('font-mono text-sm font-bold', pnlColor(totalNet))}>
              {formatPnl(convert(totalNet), symbol)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
