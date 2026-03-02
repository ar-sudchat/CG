'use client';

import { useState } from 'react';
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface MyAccount {
  account_number: number;
  name: string;
  owner: string;
  balance: number;
  equity: number;
  is_active: boolean;
}

export default function MyAccountsPage() {
  const { data, mutate } = useSWR('/api/my-accounts', fetcher);
  const [toggling, setToggling] = useState<number | null>(null);

  const accounts: MyAccount[] = data?.accounts || [];

  const handleToggle = async (accountNumber: number, current: boolean) => {
    setToggling(accountNumber);
    await fetch('/api/my-accounts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ account_number: accountNumber, is_active: !current }),
    });
    mutate();
    setToggling(null);
  };

  return (
    <div className="p-4 space-y-4 pb-20">
      <h1 className="text-lg font-bold text-[#eab308]">My Accounts</h1>
      <p className="text-xs text-slate-500">
        Toggle Active/Inactive to show or hide accounts on your dashboard.
      </p>

      <div className="space-y-3">
        {accounts.map((acc) => (
          <div
            key={acc.account_number}
            className={`bg-[#111827] rounded-xl border p-4 transition-colors ${
              acc.is_active ? 'border-[#1e2a3a]' : 'border-[#1e2a3a]/50 opacity-60'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-200">{acc.name}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                    acc.is_active ? 'bg-green-500/20 text-green-400' : 'bg-slate-500/20 text-slate-500'
                  }`}>
                    {acc.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="text-xs text-slate-500 font-mono mt-0.5">{acc.account_number}</div>
                <div className="flex gap-4 mt-1.5">
                  <div>
                    <span className="text-[10px] text-slate-500">Balance</span>
                    <p className="text-sm font-mono text-slate-300">${acc.balance.toFixed(2)}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500">Equity</span>
                    <p className="text-sm font-mono text-slate-300">${acc.equity.toFixed(2)}</p>
                  </div>
                </div>
              </div>

              {/* Toggle Switch */}
              <button
                onClick={() => handleToggle(acc.account_number, acc.is_active)}
                disabled={toggling === acc.account_number}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  acc.is_active ? 'bg-green-500' : 'bg-slate-600'
                } ${toggling === acc.account_number ? 'opacity-50' : ''}`}
              >
                <div
                  className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                    acc.is_active ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
          </div>
        ))}

        {accounts.length === 0 && (
          <div className="text-center py-8 text-slate-500 text-sm">
            No accounts assigned yet. Please contact admin.
          </div>
        )}
      </div>
    </div>
  );
}
