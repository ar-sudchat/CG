import { cn } from '@/lib/utils';
import { timeAgo } from '@/lib/utils';

interface Alert {
  id: number;
  account_number: number;
  type: string;
  message: string;
  severity: string;
  created_at: string;
  is_read: boolean;
}

export default function AlertItem({ alert }: { alert: Alert }) {
  const severityConfig: Record<string, { bg: string; border: string; text: string; icon: string }> = {
    critical: {
      bg: 'bg-red-500/5',
      border: 'border-red-500/30',
      text: 'text-red-400',
      icon: '🔴',
    },
    warning: {
      bg: 'bg-orange-500/5',
      border: 'border-orange-500/30',
      text: 'text-orange-400',
      icon: '🟡',
    },
    info: {
      bg: 'bg-blue-500/5',
      border: 'border-blue-500/30',
      text: 'text-blue-400',
      icon: '🟢',
    },
  };

  const config = severityConfig[alert.severity] || severityConfig.info;

  return (
    <div
      className={cn(
        'rounded-xl border p-4 transition-all',
        config.bg,
        config.border,
        !alert.is_read && 'ring-1 ring-inset ring-white/5'
      )}
    >
      <div className="flex items-start gap-3">
        <span className="text-lg">{config.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={cn('text-xs font-mono font-bold uppercase', config.text)}>
              {alert.severity}
            </span>
            <span className="text-xs font-mono text-slate-600">
              ACC {alert.account_number}
            </span>
          </div>
          <p className="text-sm text-slate-300">{alert.message}</p>
          <p className="text-[10px] text-slate-500 mt-1 font-mono">{timeAgo(alert.created_at)}</p>
        </div>
      </div>
    </div>
  );
}
