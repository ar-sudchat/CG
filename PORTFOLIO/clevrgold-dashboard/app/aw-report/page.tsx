'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { cn, formatPnl, pnlColor } from '@/lib/utils';
import { useCurrency } from '@/lib/currency';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const DAY_NAMES_TH = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];

function todayStr() {
  const d = new Date();
  return d.toLocaleDateString('en-CA'); // YYYY-MM-DD
}

type FilterMode = { type: 'days'; days: number } | { type: 'date'; from: string; to: string };

export default function AWReportPage() {
  const [filter, setFilter] = useState<FilterMode>({ type: 'days', days: 30 });
  const [fromDate, setFromDate] = useState(todayStr());
  const [toDate, setToDate] = useState(todayStr());
  const { convert, symbol } = useCurrency();

  const apiUrl = filter.type === 'days'
    ? `/api/aw-report?days=${filter.days}`
    : `/api/aw-report?from=${filter.from}&to=${filter.to}`;

  const { data, isLoading } = useSWR(
    apiUrl,
    fetcher,
    { refreshInterval: 30000 }
  );

  const days = filter.type === 'days' ? filter.days : 0;

  const summary = data?.summary;
  const byAccount = data?.by_account || [];
  const byHour = data?.by_hour || [];
  const byDay = data?.by_day || [];
  const byWeek = data?.by_week || [];

  const maxTrades = Math.max(...byAccount.map((a: any) => a.aw_trades), 1);
  const maxHourCount = Math.max(...byHour.map((h: any) => h.count), 1);
  const maxDayCount = Math.max(...byDay.map((d: any) => d.count), 1);
  const maxWeekCount = Math.max(...byWeek.map((w: any) => w.count), 1);
  const maxWeekPnl = Math.max(...byWeek.map((w: any) => Math.abs(w.pnl)), 1);

  return (
    <div className="p-4 space-y-4 pb-20 md:pb-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-[var(--text-heading)]">AW Report</h1>
            <p className="text-[10px] text-[var(--text-dim)] mt-0.5">วิเคราะห์ความเสี่ยง AW Recovery</p>
          </div>
          <div className="flex gap-1.5 flex-wrap justify-end">
            <button
              onClick={() => {
                const t = todayStr();
                setFromDate(t);
                setToDate(t);
                setFilter({ type: 'date', from: t, to: t });
              }}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-colors',
                filter.type === 'date' && filter.from === todayStr() && filter.to === todayStr()
                  ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                  : 'bg-[var(--bg-card)] text-[var(--text-secondary)] border border-[var(--border)] hover:border-[var(--text-dim)]'
              )}
            >
              Today
            </button>
            {[7, 30, 90].map((d) => (
              <button
                key={d}
                onClick={() => setFilter({ type: 'days', days: d })}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-colors',
                  filter.type === 'days' && filter.days === d
                    ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                    : 'bg-[var(--bg-card)] text-[var(--text-secondary)] border border-[var(--border)] hover:border-[var(--text-dim)]'
                )}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>

        {/* Date Range Picker */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg px-2.5 py-1.5 text-xs font-mono text-[var(--text-body)] focus:outline-none focus:border-red-500/50"
          />
          <span className="text-[10px] text-[var(--text-dim)]">ถึง</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg px-2.5 py-1.5 text-xs font-mono text-[var(--text-body)] focus:outline-none focus:border-red-500/50"
          />
          <button
            onClick={() => setFilter({ type: 'date', from: fromDate, to: toDate })}
            className="px-3 py-1.5 rounded-lg text-xs font-mono font-semibold bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-colors"
          >
            ค้นหา
          </button>
        </div>

        {isLoading && !data ? (
          <div className="text-center text-[var(--text-dim)] py-20 font-mono">Loading...</div>
        ) : !summary ? (
          <div className="text-center text-[var(--text-dim)] py-20 font-mono">No data</div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <SummaryCard label="AW Trades" value={String(summary.total_aw_trades)} />
              <SummaryCard
                label="Total PnL"
                value={formatPnl(convert(summary.total_aw_pnl), symbol)}
                color={pnlColor(summary.total_aw_pnl)}
              />
              <SummaryCard
                label="Accounts"
                value={`${summary.aw_accounts} / ${summary.total_accounts}`}
              />
              <SummaryCard
                label="Avg / Trade"
                value={formatPnl(convert(summary.avg_pnl_per_trade), symbol)}
                color={pnlColor(summary.avg_pnl_per_trade)}
              />
            </div>

            {/* AW Weekly Trend — count + PnL */}
            {byWeek.length > 0 && (
              <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-4 mb-4">
                <h2 className="text-sm font-semibold text-[var(--text-heading)] mb-1">AW รายสัปดาห์</h2>
                <p className="text-[9px] text-[var(--text-dim)] mb-3">จำนวนครั้ง + ผลกำไร/ขาดทุนสะสม</p>
                <div className="space-y-1.5">
                  {byWeek.map((w: any) => {
                    const weekLabel = new Date(w.week_start + 'T00:00:00').toLocaleDateString('th-TH', {
                      day: 'numeric', month: 'short',
                    });
                    const countPct = (w.count / maxWeekCount) * 100;
                    const pnlPct = (Math.abs(w.pnl) / maxWeekPnl) * 100;
                    return (
                      <div key={w.week_start} className="space-y-0.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono text-[var(--text-dim)] w-14">
                            {weekLabel}
                          </span>
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] font-mono text-[var(--text-secondary)]">
                              {w.count} trades
                            </span>
                            <span className={cn('text-[10px] font-mono font-semibold w-16 text-right', pnlColor(w.pnl))}>
                              {formatPnl(convert(w.pnl), symbol)}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-1 h-2">
                          {/* Count bar */}
                          <div className="flex-1 bg-[var(--bar-track)] rounded overflow-hidden">
                            <div
                              className="h-full bg-red-500/40 rounded transition-all duration-500"
                              style={{ width: `${countPct}%` }}
                            />
                          </div>
                          {/* PnL bar */}
                          <div className="flex-1 bg-[var(--bar-track)] rounded overflow-hidden">
                            <div
                              className={cn(
                                'h-full rounded transition-all duration-500',
                                w.pnl >= 0 ? 'bg-green-500/40' : 'bg-red-500/50'
                              )}
                              style={{ width: `${pnlPct}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex gap-4 mt-3 pt-2 border-t border-[var(--border)]">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-2 bg-red-500/40 rounded" />
                    <span className="text-[9px] text-[var(--text-dim)]">จำนวน AW</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-2 bg-green-500/40 rounded" />
                    <span className="text-[9px] text-[var(--text-dim)]">กำไร</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-2 bg-red-500/50 rounded" />
                    <span className="text-[9px] text-[var(--text-dim)]">ขาดทุน</span>
                  </div>
                </div>
              </div>
            )}

            {/* AW by Hour + AW by Day */}
            {(byHour.length > 0 || byDay.length > 0) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {/* AW by Hour */}
                {byHour.length > 0 && (
                  <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-4">
                    <h2 className="text-sm font-semibold text-[var(--text-heading)] mb-1">AW ตามชั่วโมง</h2>
                    <p className="text-[9px] text-[var(--text-dim)] mb-3">เวลาไทย (UTC+7)</p>
                    <div className="space-y-0.5">
                      {byHour.map((h: any) => {
                        const pct = (h.count / maxHourCount) * 100;
                        const isDanger = pct >= 80;
                        const isWarn = pct >= 50 && !isDanger;
                        return (
                          <div key={h.hour} className="flex items-center gap-2">
                            <span className="text-[10px] font-mono text-[var(--text-dim)] w-10 text-right">
                              {String(h.hour).padStart(2, '0')}:00
                            </span>
                            <div className="flex-1 h-4 bg-[var(--bar-track)] rounded overflow-hidden">
                              <div
                                className={cn(
                                  'h-full rounded transition-all duration-500',
                                  isDanger ? 'bg-red-500/60' : isWarn ? 'bg-orange-500/50' : 'bg-red-500/30'
                                )}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className={cn(
                              'text-[10px] font-mono w-6 text-right font-semibold',
                              isDanger ? 'text-red-400' : isWarn ? 'text-orange-400' : 'text-[var(--text-secondary)]'
                            )}>
                              {h.count}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* AW by Day */}
                {byDay.length > 0 && (
                  <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-4">
                    <h2 className="text-sm font-semibold text-[var(--text-heading)] mb-1">AW ตามวัน</h2>
                    <p className="text-[9px] text-[var(--text-dim)] mb-3">วันไหน AW บ่อยสุด</p>
                    <div className="space-y-1.5">
                      {byDay.map((d: any) => {
                        const pct = (d.count / maxDayCount) * 100;
                        const isDanger = pct >= 80;
                        const isWarn = pct >= 50 && !isDanger;
                        return (
                          <div key={d.dow} className="flex items-center gap-2">
                            <span className="text-[11px] font-mono text-[var(--text-dim)] w-8 text-right">
                              {DAY_NAMES_TH[d.dow]}
                            </span>
                            <div className="flex-1 h-5 bg-[var(--bar-track)] rounded overflow-hidden">
                              <div
                                className={cn(
                                  'h-full rounded transition-all duration-500',
                                  isDanger ? 'bg-red-500/60' : isWarn ? 'bg-orange-500/50' : 'bg-red-500/30'
                                )}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className={cn(
                              'text-[11px] font-mono w-6 text-right font-semibold',
                              isDanger ? 'text-red-400' : isWarn ? 'text-orange-400' : 'text-[var(--text-secondary)]'
                            )}>
                              {d.count}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* AW by Account */}
            {byAccount.length > 0 && (
              <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-4 mb-4">
                <h2 className="text-sm font-semibold text-[var(--text-heading)] mb-3">AW ตามบัญชี</h2>
                <div className="space-y-2.5">
                  {byAccount.map((a: any) => (
                    <div key={a.account_number} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                        <span className="text-[10px] font-mono font-bold text-red-400">
                          {a.avatar_text || String(a.account_number).slice(-2)}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-mono text-[var(--text-body)]">
                            {a.name || a.account_number}
                          </span>
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] font-mono text-[var(--text-secondary)]">
                              {a.aw_trades} trades
                            </span>
                            <span className={cn('text-xs font-mono font-semibold', pnlColor(a.aw_pnl))}>
                              {formatPnl(convert(a.aw_pnl), symbol)}
                            </span>
                          </div>
                        </div>
                        <div className="h-1.5 bg-[var(--bar-track)] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-red-500/50 rounded-full transition-all duration-500"
                            style={{ width: `${(a.aw_trades / maxTrades) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* No AW data message */}
            {summary.total_aw_trades === 0 && (
              <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-8 text-center mb-4">
                <div className="text-[var(--text-dim)] font-mono text-sm">
                  ไม่มี AW trades {filter.type === 'days' ? `ใน ${days} วันที่ผ่านมา` : `ช่วง ${filter.from} ถึง ${filter.to}`}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function SummaryCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-3">
      <div className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider mb-1">{label}</div>
      <div className={cn('font-mono text-lg font-bold', color || 'text-[var(--text-heading)]')}>
        {value}
      </div>
    </div>
  );
}
