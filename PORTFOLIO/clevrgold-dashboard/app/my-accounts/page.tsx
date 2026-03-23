'use client';

import { useState, useEffect } from 'react';
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

const ALERT_TYPES = [
  { key: 'notify_server', label: 'Server Down', desc: 'VPS/MT4 offline + มี order', color: 'red' },
  { key: 'notify_aw', label: 'AW Recovery', desc: 'เข้า/ออก AW Recovery', color: 'orange' },
  { key: 'notify_mg', label: 'Martingale', desc: 'เปิด MG order', color: 'yellow' },
  { key: 'notify_tp', label: 'Take Profit', desc: 'ปิดกำไร (TP)', color: 'green' },
] as const;

export default function MyAccountsPage() {
  const { data, mutate } = useSWR('/api/my-accounts', fetcher);
  const [toggling, setToggling] = useState<number | null>(null);

  // Notification settings
  const [notifyToken, setNotifyToken] = useState('');
  const [notifyEnabled, setNotifyEnabled] = useState(true);
  const [alertTypes, setAlertTypes] = useState<Record<string, boolean>>({
    notify_server: true, notify_tp: false, notify_aw: true, notify_mg: true,
  });
  const [notifyAccounts, setNotifyAccounts] = useState<number[]>([]);
  const [allAccounts, setAllAccounts] = useState<{ account_number: number; name: string }[]>([]);
  const [notifyLoaded, setNotifyLoaded] = useState(false);
  const [notifySaving, setNotifySaving] = useState(false);
  const [notifyTesting, setNotifyTesting] = useState(false);
  const [notifyStatus, setNotifyStatus] = useState('');

  useEffect(() => {
    fetch('/api/notify-settings').then(r => r.json()).then(d => {
      if (d.notify_token !== undefined) {
        setNotifyToken(d.notify_token);
        setNotifyEnabled(d.notify_enabled);
        setAlertTypes({
          notify_server: d.notify_server,
          notify_tp: d.notify_tp,
          notify_aw: d.notify_aw,
          notify_mg: d.notify_mg,
        });
        setNotifyAccounts(d.notify_accounts || []);
        setAllAccounts(d.accounts || []);
        setNotifyLoaded(true);
      }
    }).catch(() => {});
  }, []);

  const saveNotify = async () => {
    setNotifySaving(true);
    setNotifyStatus('');
    await fetch('/api/notify-settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        notify_token: notifyToken,
        notify_enabled: notifyEnabled,
        ...alertTypes,
        notify_accounts: notifyAccounts,
      }),
    });
    setNotifySaving(false);
    setNotifyStatus('Saved!');
    setTimeout(() => setNotifyStatus(''), 2000);
  };

  const testNotify = async () => {
    setNotifyTesting(true);
    setNotifyStatus('');
    await fetch('/api/notify-settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        notify_token: notifyToken,
        notify_enabled: notifyEnabled,
        ...alertTypes,
        notify_accounts: notifyAccounts,
      }),
    });
    const res = await fetch('/api/notify-settings', { method: 'POST' });
    const d = await res.json();
    setNotifyTesting(false);
    setNotifyStatus(res.ok ? 'Sent! Check LINE' : d.error || 'Failed');
    setTimeout(() => setNotifyStatus(''), 5000);
  };

  const toggleAlertAccount = (accNum: number) => {
    setNotifyAccounts(prev =>
      prev.includes(accNum) ? prev.filter(n => n !== accNum) : [...prev, accNum]
    );
  };

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

  const colorMap: Record<string, string> = {
    red: 'bg-red-500/20 text-red-400 border-red-500/30',
    orange: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    yellow: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    green: 'bg-green-500/20 text-green-400 border-green-500/30',
  };
  const colorMapOff = 'bg-slate-500/10 text-slate-500 border-slate-500/20';

  return (
    <div className="p-4 space-y-4 pb-20">
      <h1 className="text-lg font-bold text-[#eab308]">My Accounts</h1>
      <p className="text-xs text-slate-500">
        Toggle Active/Inactive to show or hide accounts on your dashboard.
      </p>

      {/* LINE Notification Settings */}
      {notifyLoaded && (
        <div className="bg-[#111827] rounded-xl border border-[#1e2a3a] p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-300">LINE Notification</h2>
            <button
              onClick={() => setNotifyEnabled(!notifyEnabled)}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                notifyEnabled ? 'bg-green-500' : 'bg-slate-600'
              }`}
            >
              <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                notifyEnabled ? 'translate-x-6' : 'translate-x-0.5'
              }`} />
            </button>
          </div>

          {/* Token */}
          <div>
            <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Token (akara01.com)</label>
            <input
              type="text"
              value={notifyToken}
              onChange={(e) => setNotifyToken(e.target.value)}
              placeholder="Paste token from akara01.com"
              className="w-full bg-[#0a0e17] border border-[#2a3a4a] rounded-lg px-3 py-2 text-xs text-slate-200 font-mono"
            />
          </div>

          {/* Alert Types */}
          <div>
            <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-2">Alert Types</label>
            <div className="flex flex-wrap gap-2">
              {ALERT_TYPES.map(({ key, label, desc, color }) => {
                const on = alertTypes[key];
                return (
                  <button
                    key={key}
                    onClick={() => setAlertTypes(prev => ({ ...prev, [key]: !prev[key] }))}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-colors ${
                      on ? colorMap[color] : colorMapOff
                    }`}
                    title={desc}
                  >
                    {label}
                    <span className="ml-1.5 text-[9px] opacity-70">{on ? 'ON' : 'OFF'}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Account Filter */}
          <div>
            <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-2">
              Accounts ({notifyAccounts.length === 0 ? 'All' : `${notifyAccounts.length} selected`})
            </label>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setNotifyAccounts([])}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-mono border transition-colors ${
                  notifyAccounts.length === 0
                    ? 'bg-[#eab308]/20 text-[#eab308] border-[#eab308]/30'
                    : 'bg-slate-500/10 text-slate-500 border-slate-500/20'
                }`}
              >
                All
              </button>
              {allAccounts.map((a) => {
                const on = notifyAccounts.includes(a.account_number);
                return (
                  <button
                    key={a.account_number}
                    onClick={() => toggleAlertAccount(a.account_number)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-mono border transition-colors ${
                      on
                        ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                        : 'bg-slate-500/10 text-slate-500 border-slate-500/20'
                    }`}
                  >
                    {a.account_number}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Save / Test */}
          <div className="flex items-center gap-2">
            <button
              onClick={saveNotify}
              disabled={notifySaving}
              className="px-4 py-1.5 rounded-lg bg-[#eab308]/20 text-[#eab308] text-xs font-semibold hover:bg-[#eab308]/30 transition-colors disabled:opacity-50"
            >
              {notifySaving ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={testNotify}
              disabled={notifyTesting || !notifyToken}
              className="px-4 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 text-xs font-semibold hover:bg-emerald-500/30 transition-colors disabled:opacity-50"
            >
              {notifyTesting ? 'Sending...' : 'Test'}
            </button>
            {notifyStatus && (
              <span className={`text-xs font-mono ${notifyStatus.includes('Sent') || notifyStatus.includes('Saved') ? 'text-green-400' : 'text-red-400'}`}>
                {notifyStatus}
              </span>
            )}
          </div>
        </div>
      )}

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
