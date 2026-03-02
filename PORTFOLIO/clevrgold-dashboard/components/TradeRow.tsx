import { cn, formatPnl, pnlColor } from '@/lib/utils';

interface Trade {
  ticket: number;
  account_number?: number;
  type: string;
  lots: number;
  profit: number;
  swap?: number;
  commission?: number;
  close_time: string;
  magic_number?: number;
  comment?: string;
}

interface TradeRowProps {
  trade: Trade;
  showAccount?: boolean;
}

export default function TradeRow({ trade, showAccount = false }: TradeRowProps) {
  const isAW = trade.magic_number === 9751421;
  const totalPnl = trade.profit + (trade.swap || 0) + (trade.commission || 0);

  return (
    <div className="flex items-center justify-between py-2.5 px-3 hover:bg-[#1a2332] rounded-lg transition-colors">
      <div className="flex items-center gap-3">
        <div className="flex flex-col items-center min-w-[36px]">
          <span
            className={cn(
              'text-[10px] font-mono font-bold px-1.5 py-0.5 rounded',
              trade.type === 'BUY' || trade.type === 'buy'
                ? 'bg-blue-500/20 text-blue-400'
                : 'bg-orange-500/20 text-orange-400'
            )}
          >
            {trade.type?.toUpperCase()}
          </span>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-slate-400">#{trade.ticket}</span>
            {showAccount && trade.account_number && (
              <span className="text-[10px] font-mono text-slate-600">{trade.account_number}</span>
            )}
            {isAW && (
              <span className="text-[9px] font-mono font-bold px-1 py-0.5 rounded bg-red-500/20 text-red-400">
                AW
              </span>
            )}
          </div>
          <div className="text-[10px] text-slate-500 font-mono">
            {trade.lots} lots
            {trade.close_time && (
              <span className="ml-2">
                {new Date(trade.close_time).toLocaleString('th-TH', {
                  timeZone: 'Asia/Bangkok',
                  day: '2-digit',
                  month: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: false,
                })}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className={cn('font-mono text-sm font-semibold', pnlColor(totalPnl))}>
        {formatPnl(totalPnl)}
      </div>
    </div>
  );
}
