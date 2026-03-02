import { timeAgoFromSeconds } from '@/lib/utils';

interface StatusBadgeProps {
  mode: string;
  orders: number;
  awOrders?: number;
  secondsAgo?: number;
  isWeekend?: boolean;
}

export default function StatusBadge({ mode, orders, awOrders = 0, secondsAgo, isWeekend }: StatusBadgeProps) {
  const isOffline = secondsAgo != null && secondsAgo > 1800; // 30 min = truly offline
  const isSyncDelayed = secondsAgo != null && secondsAgo > 120 && !isOffline; // > 2 min

  // AW always shown first
  if (awOrders > 0 || mode === 'AW') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-bold bg-red-500/20 text-red-400 animate-pulse">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
        AW {awOrders > 0 ? `#${awOrders}` : ''}
      </span>
    );
  }

  // Weekend: show CLOSED instead of OFFLINE (market is closed, not an error)
  if (isWeekend && isOffline) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-bold bg-slate-700/50 text-slate-400">
        CLOSED
      </span>
    );
  }

  if (isOffline) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-bold bg-red-500/15 text-red-400">
        OFFLINE
      </span>
    );
  }

  if (isSyncDelayed) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-bold bg-yellow-500/15 text-yellow-500">
        <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
        {timeAgoFromSeconds(secondsAgo)}
      </span>
    );
  }

  if (orders > 0) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-bold bg-green-500/20 text-green-400">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
        LIVE
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-bold bg-slate-700/50 text-slate-400">
      <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
      IDLE
    </span>
  );
}
