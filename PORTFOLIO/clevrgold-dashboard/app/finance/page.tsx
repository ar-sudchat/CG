'use client';

import { useState, useMemo } from 'react';
import useSWR from 'swr';
import { cn, formatMoney } from '@/lib/utils';
import { useCurrency } from '@/lib/currency';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface Entry {
  id: number;
  account_number: number;
  account_name: string;
  entry_date: string;
  type: 'withdrawal' | 'deposit';
  amount: number;
  note: string | null;
  created_at: string;
}

interface WeekSummary {
  week_start: string;
  withdrawal: number;
  deposit: number;
  net: number;
}

export default function FinancePage() {
  const [account, setAccount] = useState('all');
  const [weeks, setWeeks] = useState(4);
  const [showForm, setShowForm] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const { convert, symbol } = useCurrency();

  // Form state
  const [formAccount, setFormAccount] = useState('');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formAmount, setFormAmount] = useState('');
  const [formNote, setFormNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { data, mutate, isLoading } = useSWR(
    `/api/finance?account=${account}&weeks=${weeks}`,
    fetcher,
    { refreshInterval: 30000 }
  );

  const { data: portfolioData } = useSWR('/api/portfolio', fetcher);

  const accounts = useMemo(() => {
    if (!portfolioData?.accounts) return [];
    return portfolioData.accounts.map((a: any) => ({
      account_number: a.account_number,
      name: a.name,
    }));
  }, [portfolioData]);

  // Set default form account
  useMemo(() => {
    if (accounts.length > 0 && !formAccount) {
      setFormAccount(String(accounts[0].account_number));
    }
  }, [accounts, formAccount]);

  const entries: Entry[] = data?.entries || [];
  const weeksSummary: WeekSummary[] = useMemo(() => data?.weeks_summary || [], [data]);

  // Grand totals
  const grandTotal = useMemo(() => {
    let withdrawal = 0;
    for (const w of weeksSummary) {
      withdrawal += w.withdrawal;
    }
    return { withdrawal };
  }, [weeksSummary]);

  // Weekly average
  const weeklyAvg = useMemo(() => {
    if (weeksSummary.length === 0) return 0;
    return grandTotal.withdrawal / weeksSummary.filter(w => w.withdrawal > 0).length || 0;
  }, [weeksSummary, grandTotal]);

  // Max withdrawal in a week (for bar chart scale)
  const maxWeekWithdrawal = useMemo(() => {
    return Math.max(...weeksSummary.map(w => w.withdrawal), 1);
  }, [weeksSummary]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formAmount || !formAccount) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/finance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_number: parseInt(formAccount),
          entry_date: formDate,
          type: 'withdrawal',
          amount: parseFloat(formAmount),
          note: formNote || null,
        }),
      });
      if (res.ok) {
        setFormAmount('');
        setFormNote('');
        setShowForm(false);
        mutate();
      }
    } catch {
      // error
    }
    setSubmitting(false);
  };

  const handleDelete = async (id: number) => {
    setDeleting(id);
    try {
      const res = await fetch(`/api/finance/${id}`, { method: 'DELETE' });
      if (res.ok) mutate();
    } catch {
      // error
    }
    setDeleting(null);
  };

  function formatWeekLabel(dateStr: string) {
    const d = new Date(dateStr + 'T00:00:00');
    if (isNaN(d.getTime())) return dateStr;
    const weekNum = getISOWeek(d);
    const mon = d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
    const fri = new Date(d.getTime() + 4 * 86400000);
    const friStr = fri.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
    return `W${weekNum} (${mon} – ${friStr})`;
  }

  function getISOWeek(date: Date) {
    const d = new Date(date.getTime());
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
    const week1 = new Date(d.getFullYear(), 0, 4);
    return 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
  }

  function formatEntryDate(dateStr: string) {
    const d = new Date(dateStr + 'T00:00:00');
    if (isNaN(d.getTime())) return dateStr || 'No date';
    return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  return (
    <div className="p-4 space-y-4 pb-20 md:pb-4 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-lg font-bold text-[var(--text-heading)]">Withdrawal Journal</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className={cn(
            'px-4 py-2 text-xs font-semibold rounded-lg transition-colors',
            showForm
              ? 'bg-slate-700 text-slate-300'
              : 'bg-[var(--gold)]/20 text-[var(--gold)] hover:bg-[var(--gold)]/30'
          )}
        >
          {showForm ? 'Cancel' : '+ New Withdrawal'}
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <select
          value={account}
          onChange={(e) => setAccount(e.target.value)}
          className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-xs text-[var(--text-body)] font-mono"
        >
          <option value="all">All Accounts</option>
          {accounts.map((a: any) => (
            <option key={a.account_number} value={a.account_number}>
              {a.account_number} – {a.name}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-1">
          {[4, 8, 12].map((w) => (
            <button
              key={w}
              onClick={() => setWeeks(w)}
              className={cn(
                'px-2.5 py-1 text-[11px] font-mono rounded-full transition-colors',
                weeks === w
                  ? 'bg-[var(--gold)]/20 text-[var(--gold)] border border-[var(--gold)]/30'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-body)] border border-[var(--border)]'
              )}
            >
              {w}W
            </button>
          ))}
        </div>
      </div>

      {/* New Entry Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider block mb-1">Account</label>
              <select
                value={formAccount}
                onChange={(e) => setFormAccount(e.target.value)}
                className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs text-[var(--text-body)] font-mono"
              >
                {accounts.map((a: any) => (
                  <option key={a.account_number} value={a.account_number}>
                    {a.account_number} – {a.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider block mb-1">Date</label>
              <input
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs text-[var(--text-body)] font-mono"
              />
            </div>
            <div>
              <label className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider block mb-1">Amount (USD)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formAmount}
                onChange={(e) => setFormAmount(e.target.value)}
                placeholder="0.00"
                className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs text-[var(--text-body)] font-mono"
                required
              />
            </div>
          </div>
          <div>
            <label className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider block mb-1">Note</label>
            <input
              type="text"
              value={formNote}
              onChange={(e) => setFormNote(e.target.value)}
              placeholder="e.g. profit week 9"
              className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs text-[var(--text-body)]"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-xs text-[var(--text-secondary)] hover:text-[var(--text-body)] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !formAmount}
              className="px-5 py-2 text-xs font-semibold bg-[var(--gold)]/20 text-[var(--gold)] rounded-lg hover:bg-[var(--gold)]/30 transition-colors disabled:opacity-50"
            >
              {submitting ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-[var(--bg-card)] rounded-xl h-20 animate-pulse border border-[var(--border)]" />
          ))}
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          {weeksSummary.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-4">
                <div className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider mb-1">
                  Total Withdrawn ({weeks}W)
                </div>
                <div className="font-mono text-lg font-bold text-[var(--text-heading)]">
                  {formatMoney(convert(grandTotal.withdrawal), symbol)}
                </div>
                <div className="text-[10px] text-[var(--text-secondary)] mt-1">
                  {entries.length} transactions
                </div>
              </div>
              <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-4">
                <div className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider mb-1">
                  Weekly Average
                </div>
                <div className="font-mono text-lg font-bold text-[var(--text-heading)]">
                  {formatMoney(convert(weeklyAvg), symbol)}
                </div>
                <div className="text-[10px] text-[var(--text-secondary)] mt-1">
                  per active week
                </div>
              </div>
            </div>
          )}

          {/* Weekly Breakdown */}
          {weeksSummary.length > 0 && (
            <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-4">
              <h2 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">Weekly Breakdown</h2>
              <div className="space-y-2.5">
                {weeksSummary.map((w) => {
                  const pct = (w.withdrawal / maxWeekWithdrawal) * 100;
                  return (
                    <div key={w.week_start}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-[var(--text-secondary)] font-mono text-[11px]">
                          {formatWeekLabel(w.week_start)}
                        </span>
                        <span className="font-mono font-semibold text-[var(--text-body)]">
                          {formatMoney(convert(w.withdrawal), symbol)}
                        </span>
                      </div>
                      <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-slate-500/50 transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Entry Log */}
          <div className="space-y-3">
            <h2 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Transactions</h2>
            {entries.length === 0 ? (
              <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-8 text-center">
                <div className="text-slate-500 text-sm">No withdrawals yet</div>
                <div className="text-slate-600 text-xs mt-1">Click &ldquo;+ New Withdrawal&rdquo; to record</div>
              </div>
            ) : (
              <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] overflow-hidden">
                {entries.map((entry, i) => {
                  const prevDate = i > 0 ? entries[i - 1].entry_date : null;
                  const showDateHeader = entry.entry_date !== prevDate;

                  return (
                    <div key={entry.id}>
                      {showDateHeader && (
                        <div className="px-4 py-2 bg-white/[0.02] border-b border-[var(--border)]">
                          <span className="text-[10px] font-mono text-[var(--text-secondary)] uppercase tracking-wider">
                            {formatEntryDate(entry.entry_date)}
                          </span>
                        </div>
                      )}
                      <div className="px-4 py-3 border-b border-[var(--border)] last:border-b-0 flex items-center justify-between gap-3 group hover:bg-white/[0.02] transition-colors">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="flex-shrink-0 text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-slate-500/10 text-slate-400">
                            WD
                          </span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono text-[var(--text-body)]">
                                #{entry.account_number}
                              </span>
                              {entry.account_name && (
                                <span className="text-[11px] text-[var(--text-secondary)]">
                                  {entry.account_name}
                                </span>
                              )}
                            </div>
                            {entry.note && (
                              <div className="text-[11px] text-[var(--text-secondary)] truncate mt-0.5">
                                {entry.note}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <span className="font-mono text-sm font-bold text-[var(--text-heading)]">
                            {formatMoney(convert(entry.amount), symbol)}
                          </span>
                          <button
                            onClick={() => handleDelete(entry.id)}
                            disabled={deleting === entry.id}
                            className="text-slate-700 hover:text-red-400 transition-colors p-1 opacity-0 group-hover:opacity-100"
                            title="Delete"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
