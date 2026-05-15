'use client';

import { useState } from 'react';
import { useCurrency } from '@/lib/currency';

export default function ConverterPage() {
  const { rate } = useCurrency();
  const [amount, setAmount] = useState('');
  const [from, setFrom] = useState<'USD' | 'THB'>('USD');

  const numAmount = parseFloat(amount) || 0;
  const result = from === 'USD' ? numAmount * rate : numAmount / rate;
  const toLabel = from === 'USD' ? 'THB' : 'USD';
  const fromSymbol = from === 'USD' ? '$' : '฿';
  const toSymbol = from === 'USD' ? '฿' : '$';

  const swap = () => {
    setFrom((prev) => (prev === 'USD' ? 'THB' : 'USD'));
    if (result > 0) setAmount(result.toFixed(2));
  };

  // Quick amounts
  const quickAmounts = from === 'USD'
    ? [10, 50, 100, 500, 1000, 5000]
    : [300, 1000, 3000, 10000, 30000, 100000];

  return (
    <div className="p-4 pb-20 md:pb-4 max-w-md mx-auto">
      <h1 className="text-lg font-bold text-[var(--gold)] mb-6">Currency Converter</h1>

      {/* Rate display */}
      <div className="text-center mb-6">
        <span className="text-xs text-[var(--text-secondary)]">Live Rate</span>
        <div className="font-mono text-2xl font-bold text-[var(--text-heading)]">
          1 USD = {rate.toFixed(2)} THB
        </div>
      </div>

      {/* From */}
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-4 mb-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-[var(--text-secondary)] uppercase tracking-wider">From</span>
          <button
            onClick={() => setFrom(from === 'USD' ? 'THB' : 'USD')}
            className="px-3 py-1 rounded-lg text-sm font-bold bg-[var(--gold)]/20 text-[var(--gold)] border border-[var(--gold)]/30"
          >
            {from}
          </button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-2xl font-mono text-[var(--text-dim)]">{fromSymbol}</span>
          <input
            type="number"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
            className="flex-1 bg-transparent text-3xl font-mono font-bold text-[var(--text-heading)] outline-none"
            autoFocus
          />
        </div>
      </div>

      {/* Swap button */}
      <div className="flex justify-center -my-1 relative z-10">
        <button
          onClick={swap}
          className="w-10 h-10 rounded-full bg-[var(--bg-card)] border border-[var(--border)] flex items-center justify-center hover:border-[var(--gold)]/50 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--gold)]">
            <path d="M7 16V4m0 12l-3-3m3 3l3-3" />
            <path d="M17 8v12m0-12l3 3m-3-3l-3 3" />
          </svg>
        </button>
      </div>

      {/* To */}
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-4 mt-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-[var(--text-secondary)] uppercase tracking-wider">To</span>
          <span className="px-3 py-1 rounded-lg text-sm font-bold text-[var(--text-secondary)] border border-[var(--border)]">
            {toLabel}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-2xl font-mono text-[var(--text-dim)]">{toSymbol}</span>
          <div className="text-3xl font-mono font-bold text-[var(--text-heading)]">
            {numAmount > 0 ? result.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0'}
          </div>
        </div>
      </div>

      {/* Quick amounts */}
      <div className="mt-6">
        <span className="text-xs text-[var(--text-secondary)] uppercase tracking-wider">Quick</span>
        <div className="grid grid-cols-3 gap-2 mt-2">
          {quickAmounts.map((q) => (
            <button
              key={q}
              onClick={() => setAmount(String(q))}
              className="py-2 rounded-lg text-sm font-mono font-semibold bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-body)] hover:border-[var(--gold)]/30 hover:text-[var(--gold)] transition-colors"
            >
              {fromSymbol}{q.toLocaleString()}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
