'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import { cn } from '@/lib/utils';
import { useCurrency } from '@/lib/currency';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

interface AccountInfo {
  account_number: number;
  name: string;
  avatar_text: string;
  account_type: string;
  is_active?: boolean;
  user_is_active?: boolean;
}

interface DayRow {
  day: string;
  profit: number;
  loss: number;
  net: number;
  trades: number;
  wins: number;
  losses: number;
}

interface StatementResponse {
  from: string;
  to: string;
  accounts: AccountInfo[];
  days: DayRow[];
  totals: { profit: number; loss: number; net: number; trades: number; wins: number; losses: number };
}

function StatementContent() {
  const searchParams = useSearchParams();
  const { convert, symbol } = useCurrency();

  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  const [from, setFrom] = useState(ymd(monthStart));
  const [to, setTo] = useState(ymd(today));
  const [selectedAccounts, setSelectedAccounts] = useState<number[]>([]);
  const [didInit, setDidInit] = useState(false);

  // All accounts user can see
  const { data: accountsData } = useSWR<{ accounts: AccountInfo[] }>('/api/my-accounts', fetcher);
  const allAccounts = accountsData?.accounts || [];

  // Init from URL once
  useEffect(() => {
    if (didInit) return;
    const accs = searchParams.get('accounts');
    if (accs) {
      setSelectedAccounts(accs.split(',').map(Number).filter((n) => !isNaN(n)));
    }
    const f = searchParams.get('from');
    const t = searchParams.get('to');
    if (f && /^\d{4}-\d{2}-\d{2}$/.test(f)) setFrom(f);
    if (t && /^\d{4}-\d{2}-\d{2}$/.test(t)) setTo(t);
    setDidInit(true);
  }, [searchParams, didInit]);

  // Default to user's active-marked accounts if none selected (after accounts load)
  useEffect(() => {
    if (didInit && allAccounts.length > 0 && selectedAccounts.length === 0 && !searchParams.get('accounts')) {
      const userActive = allAccounts.filter((a) => a.user_is_active).map((a) => a.account_number);
      setSelectedAccounts(userActive);
    }
  }, [didInit, allAccounts, selectedAccounts.length, searchParams]);

  const accountsParam = selectedAccounts.join(',');
  const queryUrl = accountsParam ? `/api/statement?accounts=${accountsParam}&from=${from}&to=${to}` : null;
  const { data, isLoading } = useSWR<StatementResponse>(queryUrl, fetcher);

  // Quick presets
  const setPreset = (preset: 'today' | 'week' | 'month' | 'lastMonth' | 'all') => {
    const now = new Date();
    if (preset === 'today') {
      setFrom(ymd(now));
      setTo(ymd(now));
    } else if (preset === 'week') {
      const dow = now.getDay() || 7; // Mon=1..Sun=7
      const monday = new Date(now);
      monday.setDate(now.getDate() - (dow - 1));
      setFrom(ymd(monday));
      setTo(ymd(now));
    } else if (preset === 'month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      setFrom(ymd(start));
      setTo(ymd(now));
    } else if (preset === 'lastMonth') {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      setFrom(ymd(start));
      setTo(ymd(end));
    } else if (preset === 'all') {
      const start = new Date('2026-01-01');
      setFrom(ymd(start));
      setTo(ymd(now));
    }
  };

  const toggleAccount = (acc: number) => {
    setSelectedAccounts((prev) =>
      prev.includes(acc) ? prev.filter((a) => a !== acc) : [...prev, acc]
    );
  };

  // Only show days that actually had trades (newest first)
  const tradingDays: DayRow[] = useMemo(() => {
    if (!data?.days) return [];
    return [...data.days].filter((d) => d.trades > 0).sort((a, b) => b.day.localeCompare(a.day));
  }, [data]);

  const fmt = (v: number) => {
    const abs = Math.abs(convert(v));
    return abs.toLocaleString('en-US', { maximumFractionDigits: 2, minimumFractionDigits: 2 });
  };

  const totals = data?.totals;

  return (
    <div className="max-w-5xl mx-auto p-3 sm:p-5 pb-24">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-xl font-bold text-slate-200 mb-1">Daily Statement</h1>
        <p className="text-xs text-slate-500">รายรับ (กำไร) / รายจ่าย (ขาดทุน) แยกรายวัน</p>
      </div>

      {/* Filters */}
      <div className="bg-[#111827] border border-[#1e2a3a] rounded-xl p-3 sm:p-4 mb-4 space-y-3">
        {/* Date range */}
        <div className="flex flex-wrap items-end gap-2">
          <div>
            <label className="block text-[10px] text-slate-500 mb-1 font-mono">จากวันที่</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="bg-[#0d1424] border border-[#2a3a4a] rounded px-2 py-1 text-xs text-slate-200 font-mono"
            />
          </div>
          <div>
            <label className="block text-[10px] text-slate-500 mb-1 font-mono">ถึงวันที่</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="bg-[#0d1424] border border-[#2a3a4a] rounded px-2 py-1 text-xs text-slate-200 font-mono"
            />
          </div>
          <div className="flex flex-wrap gap-1">
            {[
              { k: 'today', l: 'วันนี้' },
              { k: 'week', l: 'สัปดาห์นี้' },
              { k: 'month', l: 'เดือนนี้' },
              { k: 'lastMonth', l: 'เดือนที่แล้ว' },
              { k: 'all', l: 'ทั้งหมด' },
            ].map((p) => (
              <button
                key={p.k}
                onClick={() => setPreset(p.k as 'today' | 'week' | 'month' | 'lastMonth' | 'all')}
                className="text-[10px] px-2 py-1 rounded bg-[#0d1424] border border-[#2a3a4a] text-slate-400 hover:text-slate-200 hover:border-[#3a4a5a]"
              >
                {p.l}
              </button>
            ))}
          </div>
        </div>

        {/* Account multi-select */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[10px] text-slate-500 font-mono">บัญชี ({selectedAccounts.length} เลือก)</label>
            <div className="flex gap-1">
              <button
                onClick={() => setSelectedAccounts(allAccounts.map((a) => a.account_number))}
                className="text-[10px] text-slate-500 hover:text-slate-300"
              >
                เลือกทั้งหมด
              </button>
              <span className="text-[10px] text-slate-700">|</span>
              <button
                onClick={() => setSelectedAccounts([])}
                className="text-[10px] text-slate-500 hover:text-slate-300"
              >
                ล้าง
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {allAccounts.map((a) => {
              const active = selectedAccounts.includes(a.account_number);
              const label = a.avatar_text || a.name?.slice(0, 14) || String(a.account_number);
              return (
                <button
                  key={a.account_number}
                  onClick={() => toggleAccount(a.account_number)}
                  className={cn(
                    'text-[11px] font-mono px-2 py-1 rounded border transition-colors',
                    active
                      ? 'bg-[#eab308]/10 border-[#eab308]/40 text-[#eab308]'
                      : 'bg-[#0d1424] border-[#2a3a4a] text-slate-500 hover:text-slate-300'
                  )}
                  title={`${a.account_number} ${a.name || ''}`}
                >
                  {label}{' '}
                  <span className="text-slate-600 ml-1">{String(a.account_number).slice(-4)}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Totals */}
      {totals && (
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="bg-[#111827] border border-green-500/20 rounded-lg p-3">
            <div className="text-[10px] text-slate-500 font-mono mb-0.5">รายรับ</div>
            <div className="text-base sm:text-lg font-mono font-bold text-green-400">
              +{symbol}{fmt(totals.profit)}
            </div>
            <div className="text-[10px] text-slate-600 font-mono mt-0.5">{totals.wins} ครั้ง</div>
          </div>
          <div className="bg-[#111827] border border-red-500/20 rounded-lg p-3">
            <div className="text-[10px] text-slate-500 font-mono mb-0.5">รายจ่าย</div>
            <div className="text-base sm:text-lg font-mono font-bold text-red-400">
              -{symbol}{fmt(totals.loss)}
            </div>
            <div className="text-[10px] text-slate-600 font-mono mt-0.5">{totals.losses} ครั้ง</div>
          </div>
          <div className={cn(
            'bg-[#111827] border rounded-lg p-3',
            totals.net >= 0 ? 'border-green-500/30' : 'border-red-500/30'
          )}>
            <div className="text-[10px] text-slate-500 font-mono mb-0.5">สุทธิ</div>
            <div className={cn(
              'text-base sm:text-lg font-mono font-bold',
              totals.net >= 0 ? 'text-green-400' : 'text-red-400'
            )}>
              {totals.net >= 0 ? '+' : '-'}{symbol}{fmt(totals.net)}
            </div>
            <div className="text-[10px] text-slate-600 font-mono mt-0.5">{totals.trades} trades</div>
          </div>
        </div>
      )}

      {/* Statement table */}
      <div className="bg-[#111827] border border-[#1e2a3a] rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-slate-500 text-sm">กำลังโหลด...</div>
        ) : !accountsParam ? (
          <div className="p-8 text-center text-slate-500 text-sm">เลือกบัญชีอย่างน้อย 1 บัญชี</div>
        ) : tradingDays.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm">ไม่มี trade ในช่วงเวลาที่เลือก</div>
        ) : (
          <table className="w-full text-xs">
            <thead className="bg-[#0d1424] border-b border-[#1e2a3a]">
              <tr>
                <th className="text-left px-3 py-2 text-[10px] text-slate-500 font-normal w-[28%]">วันที่</th>
                <th className="text-right px-2 py-2 text-[10px] text-slate-500 font-normal w-[14%]">trades</th>
                <th className="text-right px-2 py-2 text-[10px] text-green-500/70 font-normal w-[19%]">รายรับ</th>
                <th className="text-right px-2 py-2 text-[10px] text-red-500/70 font-normal w-[19%]">รายจ่าย</th>
                <th className="text-right px-3 py-2 text-[10px] text-slate-500 font-normal w-[20%]">สุทธิ</th>
              </tr>
            </thead>
            <tbody>
              {tradingDays.map((row) => {
                const d = new Date(row.day + 'T12:00:00');
                const dayLabel = d.toLocaleDateString('th-TH', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                });
                return (
                  <tr key={row.day} className="border-b border-[#1e2a3a]/50 last:border-b-0 hover:bg-[#0d1424]/50">
                    <td className="px-3 py-2 font-mono">
                      <div className="text-slate-300">{dayLabel}</div>
                      <div className="text-[10px] text-slate-600">{row.day}</div>
                    </td>
                    <td className="px-2 py-2 text-right font-mono">
                      <span className="text-slate-400">
                        {row.trades}
                        <span className="text-slate-600 text-[10px] ml-0.5">
                          ({row.wins}W/{row.losses}L)
                        </span>
                      </span>
                    </td>
                    <td className="px-2 py-2 text-right font-mono">
                      {row.profit === 0 ? (
                        <span className="text-slate-700">—</span>
                      ) : (
                        <span className="text-green-400">+{symbol}{fmt(row.profit)}</span>
                      )}
                    </td>
                    <td className="px-2 py-2 text-right font-mono">
                      {row.loss === 0 ? (
                        <span className="text-slate-700">—</span>
                      ) : (
                        <span className="text-red-400">-{symbol}{fmt(row.loss)}</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right font-mono font-bold">
                      <span className={row.net >= 0 ? 'text-green-400' : 'text-red-400'}>
                        {row.net >= 0 ? '+' : '-'}{symbol}{fmt(row.net)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {totals && (
              <tfoot>
                <tr className="bg-[#0d1424] border-t-2 border-[#2a3a4a]">
                  <td className="px-3 py-2.5 text-[11px] uppercase tracking-wider text-slate-400 font-bold">
                    รวม
                  </td>
                  <td className="px-2 py-2.5 text-right font-mono text-slate-300">{totals.trades}</td>
                  <td className="px-2 py-2.5 text-right font-mono text-green-400 font-bold">
                    +{symbol}{fmt(totals.profit)}
                  </td>
                  <td className="px-2 py-2.5 text-right font-mono text-red-400 font-bold">
                    -{symbol}{fmt(totals.loss)}
                  </td>
                  <td className={cn(
                    'px-3 py-2.5 text-right font-mono font-bold',
                    totals.net >= 0 ? 'text-green-400' : 'text-red-400'
                  )}>
                    {totals.net >= 0 ? '+' : '-'}{symbol}{fmt(totals.net)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        )}
      </div>
    </div>
  );
}

export default function StatementPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500 text-sm">กำลังโหลด...</div>}>
      <StatementContent />
    </Suspense>
  );
}
