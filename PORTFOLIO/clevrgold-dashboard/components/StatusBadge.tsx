import { timeAgoFromSeconds } from '@/lib/utils';

interface StatusBadgeProps {
  mode: string;
  orders: number;
  awOrders?: number;
  secondsAgo?: number;
  isWeekend?: boolean;
}

export default function StatusBadge({ mode, orders, awOrders = 0, secondsAgo, isWeekend }: StatusBadgeProps) {
  // A future timestamp (secondsAgo < -120) means corrupt/stale data — the sync
  // hasn't written a fresh value, so we genuinely don't know the live state.
  const isFuture = secondsAgo != null && secondsAgo < -120;
  const isOffline = secondsAgo != null && (secondsAgo > 1800 || isFuture); // 30 min or future
  const isSyncDelayed = secondsAgo != null && secondsAgo > 120 && !isOffline; // 2-30 min

  // Staleness first — if we haven't heard from the account we cannot claim it's
  // LIVE or even reliably in AW; show CLOSED/OFFLINE so the user isn't misled.
  if (isOffline) {
    if (isWeekend) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-bold bg-slate-700/50 text-slate-400">
          CLOSED
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-bold bg-red-500/15 text-red-400">
        OFFLINE
      </span>
    );
  }

  // AW — only when data is fresh enough to trust
  if (awOrders > 0 || mode === 'AW') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-bold bg-red-500/20 text-red-400 animate-pulse">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
        AW {awOrders > 0 ? `#${awOrders}` : ''}
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
