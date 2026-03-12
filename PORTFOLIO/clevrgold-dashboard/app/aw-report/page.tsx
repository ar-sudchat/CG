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
  const [showEvents, setShowEvents] = useState(false);
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
  const byDate = data?.by_date || [];
  const events = data?.events || [];
  const recovery = data?.recovery_stats;
  const insight = data?.daily_insight;

  const maxTrades = Math.max(...byAccount.map((a: any) => a.aw_trades), 1);
  const maxHourCount = Math.max(...byHour.map((h: any) => h.count), 1);
  const maxDayCount = Math.max(...byDay.map((d: any) => d.count), 1);
  const maxWeekCount = Math.max(...byWeek.map((w: any) => w.count), 1);
  const maxWeekPnl = Math.max(...byWeek.map((w: any) => Math.abs(w.pnl)), 1);
  const maxDateCount = Math.max(...byDate.map((d: any) => d.count), 1);

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
            {/* ── Daily Insight (Today vs 30d avg) — only when "Today" is selected ── */}
            {filter.type === 'date' && filter.from === filter.to && insight && (insight.today_count > 0 || insight.avg30_per_day > 0) && (
              <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-4 mb-4">
                <h2 className="text-sm font-semibold text-[var(--text-heading)] mb-3">
                  วันนี้ vs ค่าเฉลี่ย 30 วัน
                </h2>
                <div className="grid grid-cols-3 gap-3">
                  <InsightMetric
                    label="AW ครั้ง"
                    today={insight.today_count}
                    avg={insight.avg30_per_day}
                    format="count"
                  />
                  <InsightMetric
                    label="Duration"
                    today={insight.today_avg_duration}
                    avg={insight.avg30_duration}
                    format="minutes"
                    invertColor
                  />
                  <InsightMetric
                    label="Peak DD"
                    today={Math.abs(insight.today_avg_dd)}
                    avg={Math.abs(insight.avg30_dd)}
                    format="dollar"
                    invertColor
                    symbol={symbol}
                    convert={convert}
                  />
                </div>
              </div>
            )}

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

            {/* ── Recovery Stats ── */}
            {recovery && recovery.total_events > 0 && (
              <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-4 mb-4">
                <h2 className="text-sm font-semibold text-[var(--text-heading)] mb-1">Recovery Stats</h2>
                <p className="text-[9px] text-[var(--text-dim)] mb-3">สถิติจาก AW Events ทั้งหมด</p>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                  <MiniStat
                    label="Win Rate"
                    value={`${recovery.win_rate}%`}
                    sub={`${recovery.win_count}W / ${recovery.loss_count}L`}
                    color={recovery.win_rate >= 50 ? 'text-green-500' : 'text-red-400'}
                  />
                  <MiniStat
                    label="Avg Duration"
                    value={`${recovery.avg_duration} min`}
                    sub={`max ${recovery.max_duration} min`}
                  />
                  <MiniStat
                    label="Avg Peak DD"
                    value={formatPnl(convert(recovery.avg_peak_dd), symbol)}
                    sub={`worst ${formatPnl(convert(recovery.worst_dd), symbol)}`}
                    color="text-red-400"
                  />
                  <MiniStat
                    label="Trigger → End"
                    value={formatPnl(convert(recovery.avg_end_pnl), symbol)}
                    sub={`trigger ${formatPnl(convert(recovery.avg_trigger_pnl), symbol)}`}
                    color={pnlColor(recovery.avg_end_pnl)}
                  />
                </div>

                {/* BUY vs SELL direction bar */}
                {(recovery.buy_triggers > 0 || recovery.sell_triggers > 0) && (
                  <div>
                    <div className="text-[10px] text-[var(--text-dim)] mb-1.5">Trigger Direction</div>
                    <div className="flex h-5 rounded-lg overflow-hidden">
                      {recovery.buy_triggers > 0 && (
                        <div
                          className="bg-blue-500/40 flex items-center justify-center transition-all duration-500"
                          style={{ width: `${(recovery.buy_triggers / (recovery.buy_triggers + recovery.sell_triggers)) * 100}%` }}
                        >
                          <span className="text-[9px] font-mono font-bold text-blue-300">
                            BUY {recovery.buy_triggers}
                          </span>
                        </div>
                      )}
                      {recovery.sell_triggers > 0 && (
                        <div
                          className="bg-red-500/40 flex items-center justify-center transition-all duration-500"
                          style={{ width: `${(recovery.sell_triggers / (recovery.buy_triggers + recovery.sell_triggers)) * 100}%` }}
                        >
                          <span className="text-[9px] font-mono font-bold text-red-300">
                            SELL {recovery.sell_triggers}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Recovery Duration Chart ── */}
            {events.length > 0 && events.some((e: any) => e.ended_at) && (
              <RecoveryDurationChart events={events} convert={convert} symbol={symbol} />
            )}

            {/* ── Daily AW Timeline ── */}
            {byDate.length > 0 && (
              <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-4 mb-4">
                <h2 className="text-sm font-semibold text-[var(--text-heading)] mb-1">AW รายวัน</h2>
                <p className="text-[9px] text-[var(--text-dim)] mb-3">จำนวนครั้ง + PnL แต่ละวัน</p>
                <div className="space-y-1">
                  {byDate.slice(0, 14).map((d: any) => {
                    const dateObj = new Date(d.date + 'T00:00:00');
                    const dayLabel = dateObj.toLocaleDateString('th-TH', {
                      weekday: 'short', day: 'numeric', month: 'short',
                    });
                    const countPct = (d.count / maxDateCount) * 100;
                    return (
                      <div key={d.date} className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-[var(--text-dim)] w-20 text-right shrink-0">
                          {dayLabel}
                        </span>
                        <div className="flex-1 h-5 bg-[var(--bar-track)] rounded overflow-hidden relative">
                          <div
                            className={cn(
                              'h-full rounded transition-all duration-500',
                              d.pnl >= 0 ? 'bg-green-500/30' : 'bg-red-500/40'
                            )}
                            style={{ width: `${countPct}%` }}
                          />
                          <span className="absolute inset-0 flex items-center px-2 text-[9px] font-mono text-[var(--text-secondary)]">
                            {d.count} trades
                          </span>
                        </div>
                        <span className={cn('text-[10px] font-mono font-semibold w-16 text-right shrink-0', pnlColor(d.pnl))}>
                          {formatPnl(convert(d.pnl), symbol)}
                        </span>
                      </div>
                    );
                  })}
                </div>
                {byDate.length > 14 && (
                  <div className="text-[9px] text-[var(--text-dim)] text-center mt-2">
                    แสดง 14 วันล่าสุด จากทั้งหมด {byDate.length} วัน
                  </div>
                )}
              </div>
            )}

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

            {/* ── AW Event Detail Cards ── */}
            {events.length > 0 && (
              <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-4 mb-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h2 className="text-sm font-semibold text-[var(--text-heading)]">AW Events</h2>
                    <p className="text-[9px] text-[var(--text-dim)]">รายละเอียดแต่ละ event ({events.length} events)</p>
                  </div>
                  <button
                    onClick={() => setShowEvents(!showEvents)}
                    className="px-3 py-1 rounded-lg text-[10px] font-mono font-semibold bg-[var(--bg-page)] text-[var(--text-secondary)] border border-[var(--border)] hover:border-[var(--text-dim)] transition-colors"
                  >
                    {showEvents ? 'ซ่อน' : 'แสดง'}
                  </button>
                </div>
                {showEvents && (
                  <div className="space-y-2">
                    {events.slice(0, 30).map((e: any) => (
                      <EventCard key={e.id} event={e} convert={convert} symbol={symbol} />
                    ))}
                    {events.length > 30 && (
                      <div className="text-[9px] text-[var(--text-dim)] text-center mt-2">
                        แสดง 30 จาก {events.length} events
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* No AW data message */}
            {summary.total_aw_trades === 0 && events.length === 0 && (
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

/* ── Sub-components ── */

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

function MiniStat({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="bg-[var(--bg-page)] rounded-lg p-2.5">
      <div className="text-[9px] text-[var(--text-dim)] uppercase tracking-wider mb-0.5">{label}</div>
      <div className={cn('font-mono text-sm font-bold', color || 'text-[var(--text-heading)]')}>
        {value}
      </div>
      {sub && <div className="text-[9px] font-mono text-[var(--text-dim)] mt-0.5">{sub}</div>}
    </div>
  );
}

function InsightMetric({
  label, today, avg, format, invertColor, symbol: sym, convert: conv,
}: {
  label: string;
  today: number;
  avg: number;
  format: 'count' | 'minutes' | 'dollar';
  invertColor?: boolean;
  symbol?: string;
  convert?: (v: number) => number;
}) {
  const diff = today - avg;
  // For count/duration/DD: lower is better when invertColor
  const isGood = invertColor ? diff <= 0 : diff >= 0;
  const diffColor = diff === 0 ? 'text-slate-400' : isGood ? 'text-green-500' : 'text-red-400';

  const formatVal = (v: number) => {
    if (format === 'count') return String(v);
    if (format === 'minutes') return `${v} min`;
    if (format === 'dollar' && conv && sym) return `${sym}${Math.abs(conv(v)).toFixed(0)}`;
    return String(v);
  };

  const diffStr = diff === 0 ? '-' : `${diff > 0 ? '+' : ''}${format === 'dollar' && conv && sym
    ? `${sym}${Math.abs(conv(diff)).toFixed(0)}`
    : format === 'minutes' ? `${diff} min` : diff}`;

  return (
    <div className="bg-[var(--bg-page)] rounded-lg p-2.5 text-center">
      <div className="text-[9px] text-[var(--text-dim)] uppercase tracking-wider mb-1">{label}</div>
      <div className="font-mono text-base font-bold text-[var(--text-heading)]">
        {formatVal(today)}
      </div>
      <div className="text-[9px] font-mono text-[var(--text-dim)] mt-0.5">
        avg {formatVal(avg)}
      </div>
      <div className={cn('text-[10px] font-mono font-semibold mt-0.5', diffColor)}>
        {diffStr}
      </div>
    </div>
  );
}

function RecoveryDurationChart({
  events, convert: conv, symbol: sym,
}: {
  events: any[];
  convert: (v: number) => number;
  symbol: string;
}) {
  // Only completed events, sorted by time (oldest first)
  const completed = events
    .filter((e: any) => e.ended_at && e.duration_minutes > 0)
    .sort((a: any, b: any) => new Date(a.triggered_at).getTime() - new Date(b.triggered_at).getTime())
    .slice(-40); // Last 40 events max

  if (completed.length === 0) return null;

  const maxDuration = Math.max(...completed.map((e: any) => e.duration_minutes), 1);
  const avgDuration = Math.round(completed.reduce((s: number, e: any) => s + e.duration_minutes, 0) / completed.length);
  // Use sqrt scale to make short bars visible while preserving relative heights
  const sqrtMax = Math.sqrt(maxDuration);
  const avgPct = (Math.sqrt(avgDuration) / sqrtMax) * 100;

  return (
    <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-4 mb-4">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-sm font-semibold text-[var(--text-heading)]">Recovery Duration</h2>
        <span className="text-[10px] font-mono text-[var(--text-dim)]">
          avg {avgDuration} min / max {maxDuration} min
        </span>
      </div>
      <p className="text-[9px] text-[var(--text-dim)] mb-3">แต่ละรอบใช้เวลา recovery เท่าไร ({completed.length} events)</p>

      {/* Chart */}
      <div className="relative">
        {/* Average line */}
        <div
          className="absolute left-0 right-0 border-t border-dashed border-yellow-500/50 z-10 pointer-events-none"
          style={{ bottom: `${avgPct}%` }}
        >
          <span className="absolute -top-3.5 right-0 text-[8px] font-mono text-yellow-400/80 bg-[var(--bg-card)] px-1">
            avg {avgDuration}m
          </span>
        </div>

        {/* Bars */}
        <div className="flex items-end gap-[2px] h-52">
          {completed.map((e: any, i: number) => {
            const pct = (Math.sqrt(e.duration_minutes) / sqrtMax) * 100;
            const isWin = e.end_reason === 'AW_TP';
            const dateStr = new Date(e.triggered_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
            const accLabel = e.avatar_text || String(e.account_number).slice(-4);
            return (
              <div
                key={e.id || i}
                className="flex-1 min-w-0 group relative flex items-end h-full"
                style={{ maxWidth: completed.length < 10 ? '40px' : undefined }}
              >
                {/* Tooltip */}
                <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover:block z-20 pointer-events-none">
                  <div className="bg-[var(--bg-page)] border border-[var(--border)] rounded-lg px-2 py-1.5 shadow-lg whitespace-nowrap">
                    <div className="text-[9px] font-mono text-[var(--text-body)] font-bold">{accLabel}</div>
                    <div className="text-[8px] font-mono text-[var(--text-dim)]">{dateStr}</div>
                    <div className="text-[9px] font-mono text-[var(--text-body)]">{e.duration_minutes} min</div>
                    <div className={cn('text-[9px] font-mono font-bold', isWin ? 'text-green-400' : 'text-red-400')}>
                      {isWin ? 'TP' : e.end_reason} {e.end_pnl != null ? formatPnl(conv(e.end_pnl), sym) : ''}
                    </div>
                    {e.peak_dd > 0 && (
                      <div className="text-[8px] font-mono text-red-400">DD: {formatPnl(conv(e.peak_dd), sym)}</div>
                    )}
                  </div>
                </div>
                {/* Duration label on top */}
                <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center" style={{ height: `${Math.max(pct, 5)}%` }}>
                  <span className="text-[7px] font-mono text-[var(--text-secondary)] -mt-3 whitespace-nowrap">
                    {e.duration_minutes}m
                  </span>
                </div>
                {/* Bar */}
                <div
                  className={cn(
                    'w-full rounded-t transition-all duration-300 cursor-pointer',
                    isWin ? 'bg-green-500/70 hover:bg-green-500/90' : 'bg-red-500/70 hover:bg-red-500/90'
                  )}
                  style={{ height: `${Math.max(pct, 5)}%` }}
                />
              </div>
            );
          })}
        </div>

        {/* X-axis labels (show some dates) */}
        <div className="flex justify-between mt-1">
          {completed.length > 0 && (
            <span className="text-[8px] font-mono text-[var(--text-dim)]">
              {new Date(completed[0].triggered_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
            </span>
          )}
          {completed.length > 1 && (
            <span className="text-[8px] font-mono text-[var(--text-dim)]">
              {new Date(completed[completed.length - 1].triggered_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
            </span>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-4 mt-3 pt-2 border-t border-[var(--border)]">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 bg-green-500/50 rounded" />
          <span className="text-[9px] text-[var(--text-dim)]">TP สำเร็จ</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 bg-red-500/50 rounded" />
          <span className="text-[9px] text-[var(--text-dim)]">จบแบบอื่น</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-8 border-t border-dashed border-yellow-500/50" />
          <span className="text-[9px] text-[var(--text-dim)]">ค่าเฉลี่ย</span>
        </div>
      </div>
    </div>
  );
}

function EventCard({
  event: e, convert: conv, symbol: sym,
}: {
  event: any;
  convert: (v: number) => number;
  symbol: string;
}) {
  const triggerTime = new Date(e.triggered_at);
  const timeStr = triggerTime.toLocaleString('th-TH', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });
  const isActive = !e.ended_at;
  const isWin = e.end_reason === 'AW_TP';

  return (
    <div className={cn(
      'rounded-lg border p-3 transition-colors',
      isActive
        ? 'border-orange-500/30 bg-orange-500/5'
        : isWin
          ? 'border-green-500/20 bg-green-500/5'
          : 'border-[var(--border)] bg-[var(--bg-page)]'
    )}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={cn(
            'w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-mono font-bold shrink-0',
            isActive ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
              : isWin ? 'bg-green-500/20 text-green-400 border border-green-500/30'
              : 'bg-red-500/10 text-red-400 border border-red-500/20'
          )}>
            {e.avatar_text || String(e.account_number).slice(-2)}
          </div>
          <div>
            <span className="text-[11px] font-mono text-[var(--text-body)]">
              {e.account_name || e.account_number}
            </span>
            <span className="text-[9px] text-[var(--text-dim)] ml-2">{timeStr}</span>
          </div>
        </div>
        <span className={cn(
          'text-[9px] font-mono font-bold px-1.5 py-0.5 rounded',
          isActive ? 'bg-orange-500/20 text-orange-400'
            : isWin ? 'bg-green-500/20 text-green-400'
            : 'bg-red-500/20 text-red-400'
        )}>
          {isActive ? 'ACTIVE' : e.end_reason || 'DONE'}
        </span>
      </div>
      <div className="grid grid-cols-4 gap-2 text-center">
        <div>
          <div className="text-[8px] text-[var(--text-dim)] uppercase">Direction</div>
          <div className={cn('text-[10px] font-mono font-bold',
            e.trigger_direction === 'BUY' ? 'text-blue-400' : 'text-red-400'
          )}>
            {e.trigger_direction || '-'}
          </div>
        </div>
        <div>
          <div className="text-[8px] text-[var(--text-dim)] uppercase">Duration</div>
          <div className="text-[10px] font-mono font-bold text-[var(--text-body)]">
            {isActive ? 'ongoing' : `${e.duration_minutes} min`}
          </div>
        </div>
        <div>
          <div className="text-[8px] text-[var(--text-dim)] uppercase">Peak DD</div>
          <div className="text-[10px] font-mono font-bold text-red-400">
            {e.peak_dd ? formatPnl(conv(e.peak_dd), sym) : '-'}
          </div>
        </div>
        <div>
          <div className="text-[8px] text-[var(--text-dim)] uppercase">End PnL</div>
          <div className={cn('text-[10px] font-mono font-bold', pnlColor(e.end_pnl))}>
            {e.ended_at ? formatPnl(conv(e.end_pnl), sym) : '-'}
          </div>
        </div>
      </div>
      {e.trigger_orders > 0 && (
        <div className="flex gap-3 mt-1.5 pt-1.5 border-t border-[var(--border)]">
          <span className="text-[9px] font-mono text-[var(--text-dim)]">
            Trigger: {e.trigger_orders} orders @ {formatPnl(conv(e.trigger_pnl), sym)}
          </span>
          {e.aw_orders_max > 0 && (
            <span className="text-[9px] font-mono text-[var(--text-dim)]">
              Max AW orders: {e.aw_orders_max}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
