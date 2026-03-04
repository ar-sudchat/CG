'use client';

import Link from 'next/link';
import { cn, formatMoneyShort, formatPnl, formatPnlShort, formatMarginLevel, pnlColor, pnlBgColor, WEEKLY_TARGET_USD, timeAgoFromSeconds } from '@/lib/utils';
import { useCurrency } from '@/lib/currency';
import StatusBadge from './StatusBadge';

interface Account {
  account_number: number;
  name?: string;
  owner?: string;
  avatar_url?: string | null;
  avatar_text?: string;
  ea_strategy?: string;
  pair_group?: string;
  balance: number;
  equity: number;
  floating_pnl: number;
  daily_pnl: number;
  weekly_pnl: number;
  open_orders: number;
  aw_orders: number;
  buy_orders?: number;
  buy_lots?: number;
  sell_orders?: number;
  sell_lots?: number;
  mode: string;
  margin_level: number;
  spread: number;
  tp_today: number;
  updated_at: string;
  seconds_ago?: number;
  is_offline?: boolean;
  manual_lock?: boolean;
  is_locked?: boolean;
  lock_reason?: string | null;
  locked_by?: number | null;
}

export default function AccountCard({ account, isWeekend, onToggleLock }: { account: Account; isWeekend?: boolean; onToggleLock?: (accountNumber: number, lock: boolean) => void }) {
  const { convert, symbol } = useCurrency();
  const isAW = account.aw_orders > 0 || account.mode === 'AW';
  const totalOrders = account.open_orders + account.aw_orders;
  const hasOrders = totalOrders > 0;
  const floatIsLoss = account.floating_pnl < 0;
  const floatIsBigLoss = account.floating_pnl < -10;
  const lowMargin = account.margin_level > 0 && account.margin_level < 500 && hasOrders;
  const warnMargin = account.margin_level > 0 && account.margin_level < 1000 && !lowMargin && hasOrders;
  // Determine card border/glow based on severity
  const cardBorder = isAW
    ? 'border-red-500/60 shadow-[0_0_20px_rgba(239,68,68,0.2)]'
    : floatIsBigLoss
      ? 'border-red-500/40 shadow-[0_0_10px_rgba(239,68,68,0.1)]'
      : lowMargin
        ? 'border-orange-500/40'
        : warnMargin
          ? 'border-yellow-500/30'
          : hasOrders && floatIsLoss
          ? 'border-orange-500/25'
          : hasOrders
            ? 'border-green-500/25'
            : 'border-[var(--border)] hover:border-[#2a3a4a]';

  return (
    <Link href={`/account/${account.account_number}`}>
      <div
        className={cn(
          'bg-[var(--bg-card)] rounded-xl border p-4 transition-all hover:bg-[var(--bg-card-hover)] cursor-pointer relative overflow-hidden',
          cardBorder,
          isAW && 'animate-border-pulse'
        )}
      >
        {/* Alert banner at top of card */}
        {(isAW || floatIsBigLoss || lowMargin) && (
          <div className={cn(
            'absolute top-0 left-0 right-0 h-0.5',
            isAW ? 'bg-red-500' : floatIsBigLoss ? 'bg-red-500/70' : 'bg-orange-500'
          )} />
        )}

        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            {account.avatar_url ? (
              <img src={account.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover border border-[var(--border)] shrink-0" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-[#eab308]/5 border border-[#eab308]/15 flex items-center justify-center shrink-0">
                <span className="text-sm font-mono font-bold text-[#eab308]">
                  {account.avatar_text || String(account.account_number).slice(-2)}
                </span>
              </div>
            )}
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-sm text-[var(--text-body)] font-semibold">
                  {account.account_number}
                </span>
                {account.ea_strategy && (
                  <span className={cn(
                    'text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider',
                    account.ea_strategy === 'Buy'
                      ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                      : 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                  )}>
                    {account.ea_strategy.toUpperCase()}
                  </span>
                )}
              </div>
              {account.owner && (
                <div className="text-[10px] text-[var(--text-secondary)] truncate max-w-[160px]">{account.owner}</div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {onToggleLock && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onToggleLock(account.account_number, !account.manual_lock);
                }}
                className={cn(
                  'w-7 h-7 rounded-md flex items-center justify-center transition-all border',
                  account.is_locked
                    ? 'bg-red-500/20 border-red-500/40 text-red-400 hover:bg-red-500/30'
                    : 'bg-transparent border-[var(--border)] text-[var(--text-dim)] hover:text-[var(--text-secondary)] hover:border-[var(--text-dim)]'
                )}
                title={account.is_locked ? (account.lock_reason || 'Locked') : 'Lock account'}
              >
                {account.is_locked ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                    <path d="M12 2C9.24 2 7 4.24 7 7v3H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-1V7c0-2.76-2.24-5-5-5zm-3 8V7a3 3 0 1 1 6 0v3H9zm3 4a2 2 0 1 1 0 4 2 2 0 0 1 0-4z"/>
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0 1 9.9-1"/>
                  </svg>
                )}
              </button>
            )}
            <StatusBadge
              mode={account.mode}
              orders={account.open_orders}
              awOrders={account.aw_orders}
              secondsAgo={account.seconds_ago}
              isWeekend={isWeekend}
            />
          </div>
        </div>

        {/* Floating PnL — big & prominent when has orders */}
        {hasOrders && (
          <div className={cn(
            'rounded-lg p-3 mb-3 text-center',
            pnlBgColor(account.floating_pnl),
            floatIsLoss ? 'bg-red-500/10' : 'bg-green-500/10'
          )}>
            <div className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider mb-0.5">
              Floating P&L ({account.open_orders + account.aw_orders} order{(account.open_orders + account.aw_orders) > 1 ? 's' : ''})
            </div>
            <div className={cn('font-mono text-xl font-bold', pnlColor(account.floating_pnl))}>
              {formatPnl(convert(account.floating_pnl), symbol)}
            </div>
            {/* Buy / Sell breakdown */}
            {(account.buy_orders || account.sell_orders) ? (
              <div className="flex items-center justify-center gap-3 mt-1.5">
                {account.buy_orders ? (
                  <span className="text-[10px] font-mono text-blue-400">
                    BUY {account.buy_orders} <span className="text-blue-400/70">({account.buy_lots?.toFixed(2)} lot)</span>
                  </span>
                ) : null}
                {account.buy_orders && account.sell_orders ? (
                  <span className="text-[10px] text-[var(--text-dim)]">|</span>
                ) : null}
                {account.sell_orders ? (
                  <span className="text-[10px] font-mono text-red-400">
                    SELL {account.sell_orders} <span className="text-red-400/70">({account.sell_lots?.toFixed(2)} lot)</span>
                  </span>
                ) : null}
              </div>
            ) : null}
            {isAW && (
              <div className="text-[10px] font-mono text-red-400 mt-1 font-bold">
                ⚠ AW RECOVERY — {account.aw_orders} orders
              </div>
            )}
          </div>
        )}

        {/* Balance / Equity / Daily */}
        <div className="grid grid-cols-3 gap-3 mb-3">
          <div>
            <div className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider">Balance</div>
            <div className="font-mono text-sm text-[var(--text-body)] font-semibold">
              {formatMoneyShort(convert(account.balance), symbol)}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider">Equity</div>
            <div className="font-mono text-sm text-[var(--text-body)] font-semibold">
              {formatMoneyShort(convert(account.equity), symbol)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider">Daily</div>
            <div className={cn('font-mono text-sm font-semibold', pnlColor(account.daily_pnl))}>
              {formatPnlShort(convert(account.daily_pnl), symbol)}
            </div>
          </div>
        </div>

        {/* Weekly Target */}
        <div className="mb-3">
          {(() => {
            const wPct = WEEKLY_TARGET_USD > 0 ? Math.min((account.weekly_pnl / WEEKLY_TARGET_USD) * 100, 100) : 0;
            const wHit = account.weekly_pnl >= WEEKLY_TARGET_USD;
            return (
              <div className="flex items-center gap-2">
                <span className="text-[9px] text-[var(--text-dim)] uppercase w-10 shrink-0">Weekly</span>
                <div className="flex-1 h-1 bg-[var(--bar-track)] rounded-full overflow-hidden">
                  <div
                    className={cn('h-full rounded-full transition-all duration-500', wHit ? 'bg-green-500/70' : wPct > 0 ? 'bg-slate-500/50' : 'bg-transparent')}
                    style={{ width: `${Math.max(wPct, 0)}%` }}
                  />
                </div>
                <span className={cn('font-mono text-[10px] w-16 text-right', wHit ? 'text-green-500' : 'text-[var(--text-dim)]')}>
                  {formatPnl(convert(account.weekly_pnl), symbol)}
                </span>
              </div>
            );
          })()}
        </div>


        {/* Footer: Margin + Spread */}
        <div className="flex items-center justify-between pt-2 border-t border-[var(--border)]">
          <div className="flex items-center gap-2">
            {!hasOrders && (
              <span className="text-xs text-[var(--text-dim)] font-mono">No orders</span>
            )}
            {lowMargin && (
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-orange-500/15 text-orange-400">
                LOW MARGIN
              </span>
            )}
            {warnMargin && (
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-yellow-500/15 text-yellow-400">
                MARGIN {formatMarginLevel(account.margin_level)}
              </span>
            )}
            {hasOrders && !lowMargin && !warnMargin && (
              <span className="text-xs text-[var(--text-secondary)] font-mono">
                Margin: {formatMarginLevel(account.margin_level)}
              </span>
            )}
          </div>
          <span className="text-[10px] text-[var(--text-dim)] font-mono">
            {account.spread > 0 ? `Sp ${account.spread}` : ''}{account.spread > 0 && account.seconds_ago != null ? ' · ' : ''}{account.seconds_ago != null ? timeAgoFromSeconds(account.seconds_ago) : ''}
          </span>
        </div>
      </div>
    </Link>
  );
}
