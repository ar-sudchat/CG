'use client';

import { useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface User {
  id: number;
  username: string;
  display_name: string;
  role: string;
  is_approved: boolean;
  account_count: number;
  created_at: string;
}

interface Account {
  account_number: number;
  name: string;
  owner: string;
  is_active: boolean;
}

interface UserAccount {
  account_number: number;
  can_edit: boolean;
  is_active: boolean;
}

export default function AdminPage() {
  const { data, mutate } = useSWR('/api/admin/users', fetcher);
  const [expandedUser, setExpandedUser] = useState<number | null>(null);
  const [userAccounts, setUserAccounts] = useState<UserAccount[]>([]);
  const [saving, setSaving] = useState(false);

  const users: User[] = data?.users || [];
  const accounts: Account[] = data?.accounts || [];
  const pending = users.filter((u) => !u.is_approved);

  const loadUserAccounts = async (userId: number) => {
    if (expandedUser === userId) {
      setExpandedUser(null);
      return;
    }
    const res = await fetch(`/api/admin/users/${userId}/accounts`);
    const d = await res.json();
    setUserAccounts(d.accounts || []);
    setExpandedUser(userId);
  };

  const handleApprove = async (userId: number, approve: boolean) => {
    await fetch(`/api/admin/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_approved: approve }),
    });
    mutate();
  };

  const handleDelete = async (userId: number) => {
    if (!confirm('Delete this user?')) return;
    await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
    mutate();
    if (expandedUser === userId) setExpandedUser(null);
  };

  const handleRoleChange = async (userId: number, role: string) => {
    await fetch(`/api/admin/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    });
    mutate();
  };

  const toggleAccount = (accountNumber: number) => {
    setUserAccounts((prev) => {
      const exists = prev.find((a) => a.account_number === accountNumber);
      if (exists) {
        return prev.filter((a) => a.account_number !== accountNumber);
      }
      return [...prev, { account_number: accountNumber, can_edit: false, is_active: true }];
    });
  };

  const toggleCanEdit = (accountNumber: number) => {
    setUserAccounts((prev) =>
      prev.map((a) =>
        a.account_number === accountNumber ? { ...a, can_edit: !a.can_edit } : a
      )
    );
  };

  const saveAccounts = async () => {
    if (!expandedUser) return;
    setSaving(true);
    await fetch(`/api/admin/users/${expandedUser}/accounts`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accounts: userAccounts.map((a) => ({
          account_number: a.account_number,
          can_edit: a.can_edit,
        })),
      }),
    });
    setSaving(false);
    mutate();
  };

  const [togglingAccount, setTogglingAccount] = useState<number | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newAcc, setNewAcc] = useState({ account_number: '', name: '', owner: '', pair_group: 'XAUUSD' });
  const [addingAccount, setAddingAccount] = useState(false);

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAcc.account_number || !newAcc.name) return;
    setAddingAccount(true);
    try {
      const res = await fetch('/api/admin/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_number: parseInt(newAcc.account_number),
          name: newAcc.name,
          owner: newAcc.owner || newAcc.name,
          pair_group: newAcc.pair_group,
        }),
      });
      if (res.ok) {
        setNewAcc({ account_number: '', name: '', owner: '', pair_group: 'XAUUSD' });
        setShowAddForm(false);
        mutate();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to add account');
      }
    } catch {
      alert('Network error');
    }
    setAddingAccount(false);
  };

  const handleToggleActive = async (accountNumber: number, currentActive: boolean) => {
    setTogglingAccount(accountNumber);
    await fetch(`/api/account/${accountNumber}/update`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !currentActive }),
    });
    mutate();
    setTogglingAccount(null);
  };

  const cardClass = 'bg-[#111827] rounded-xl border border-[#1e2a3a] p-4';

  return (
    <div className="p-4 space-y-4 pb-20">
      <h1 className="text-lg font-bold text-[#eab308]">Admin Panel</h1>

      {/* Pending Approvals */}
      {pending.length > 0 && (
        <div className={cardClass}>
          <h2 className="text-sm font-semibold text-amber-400 mb-3">
            Pending Approvals ({pending.length})
          </h2>
          <div className="space-y-2">
            {pending.map((u) => (
              <div key={u.id} className="flex items-center justify-between bg-[#0a0e17] rounded-lg px-3 py-2">
                <div>
                  <span className="text-sm font-mono text-slate-200">{u.username}</span>
                  <span className="text-xs text-slate-500 ml-2">{u.display_name}</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleApprove(u.id, true)}
                    className="px-3 py-1 rounded text-xs font-medium bg-green-500/20 text-green-400 hover:bg-green-500/30"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleDelete(u.id)}
                    className="px-3 py-1 rounded text-xs font-medium bg-red-500/20 text-red-400 hover:bg-red-500/30"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Users */}
      <div className={cardClass}>
        <h2 className="text-sm font-semibold text-slate-300 mb-3">All Users ({users.length})</h2>
        <div className="space-y-2">
          {users.map((u) => (
            <div key={u.id}>
              <div
                className="flex items-center justify-between bg-[#0a0e17] rounded-lg px-3 py-2.5 cursor-pointer hover:bg-[#0d1420]"
                onClick={() => loadUserAccounts(u.id)}
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-mono text-slate-200">{u.username}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                    u.role === 'admin' ? 'bg-[#eab308]/20 text-[#eab308]' : 'bg-blue-500/20 text-blue-400'
                  }`}>
                    {u.role}
                  </span>
                  {!u.is_approved && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400">
                      pending
                    </span>
                  )}
                  <span className="text-xs text-slate-500">{u.account_count} accounts</span>
                </div>
                <div className="flex items-center gap-2">
                  {u.role !== 'admin' && (
                    <>
                      <select
                        value={u.role}
                        onChange={(e) => { e.stopPropagation(); handleRoleChange(u.id, e.target.value); }}
                        onClick={(e) => e.stopPropagation()}
                        className="bg-[#1a2332] border border-[#2a3a4a] rounded px-2 py-0.5 text-xs text-slate-300"
                      >
                        <option value="user">user</option>
                        <option value="admin">admin</option>
                      </select>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(u.id); }}
                        className="text-xs text-red-400/60 hover:text-red-400"
                      >
                        Delete
                      </button>
                    </>
                  )}
                  <span className="text-slate-500 text-xs">{expandedUser === u.id ? '▲' : '▼'}</span>
                </div>
              </div>

              {/* Expanded: Assign Accounts */}
              {expandedUser === u.id && (
                <div className="mt-1 ml-4 mr-2 p-3 bg-[#0d1420] rounded-lg border border-[#1e2a3a]">
                  <p className="text-xs text-slate-400 mb-2">Assign Accounts:</p>
                  <div className="space-y-1.5">
                    {accounts.map((acc) => {
                      const assigned = userAccounts.find((ua) => ua.account_number === Number(acc.account_number));
                      return (
                        <div key={acc.account_number} className="flex items-center justify-between">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={!!assigned}
                              onChange={() => toggleAccount(Number(acc.account_number))}
                              className="accent-[#eab308]"
                            />
                            <span className="text-xs text-slate-300 font-mono">{acc.account_number}</span>
                            <span className="text-xs text-slate-500">{acc.name}</span>
                          </label>
                          {assigned && (
                            <label className="flex items-center gap-1 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={assigned.can_edit}
                                onChange={() => toggleCanEdit(Number(acc.account_number))}
                                className="accent-[#eab308]"
                              />
                              <span className="text-[10px] text-slate-500">can edit</span>
                            </label>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <button
                    onClick={saveAccounts}
                    disabled={saving}
                    className="mt-3 px-4 py-1.5 rounded-lg bg-[#eab308] hover:bg-[#ca8a04] text-black text-xs font-semibold disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      {/* Accounts Management */}
      <div className={cardClass}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-300">
            Accounts ({accounts.length})
          </h2>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              showAddForm
                ? 'bg-slate-500/20 text-slate-400'
                : 'bg-[#eab308]/20 text-[#eab308] hover:bg-[#eab308]/30'
            }`}
          >
            {showAddForm ? 'Cancel' : '+ Add Account'}
          </button>
        </div>

        {showAddForm && (
          <form onSubmit={handleAddAccount} className="mb-3 p-3 bg-[#0d1420] rounded-lg border border-[#1e2a3a] space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-slate-500 uppercase block mb-0.5">Account Number</label>
                <input
                  type="number"
                  value={newAcc.account_number}
                  onChange={(e) => setNewAcc({ ...newAcc, account_number: e.target.value })}
                  placeholder="1700144037"
                  className="w-full bg-[#1a2332] border border-[#2a3a4a] rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono"
                  required
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 uppercase block mb-0.5">Name</label>
                <input
                  type="text"
                  value={newAcc.name}
                  onChange={(e) => setNewAcc({ ...newAcc, name: e.target.value })}
                  placeholder="Account holder name"
                  className="w-full bg-[#1a2332] border border-[#2a3a4a] rounded-lg px-3 py-1.5 text-xs text-slate-200"
                  required
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 uppercase block mb-0.5">Owner</label>
                <input
                  type="text"
                  value={newAcc.owner}
                  onChange={(e) => setNewAcc({ ...newAcc, owner: e.target.value })}
                  placeholder="Same as name if empty"
                  className="w-full bg-[#1a2332] border border-[#2a3a4a] rounded-lg px-3 py-1.5 text-xs text-slate-200"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 uppercase block mb-0.5">Pair Group</label>
                <input
                  type="text"
                  value={newAcc.pair_group}
                  onChange={(e) => setNewAcc({ ...newAcc, pair_group: e.target.value })}
                  className="w-full bg-[#1a2332] border border-[#2a3a4a] rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={addingAccount}
                className="px-4 py-1.5 rounded-lg bg-[#eab308] hover:bg-[#ca8a04] text-black text-xs font-semibold disabled:opacity-50"
              >
                {addingAccount ? 'Adding...' : 'Add Account'}
              </button>
            </div>
          </form>
        )}
        <div className="space-y-1.5">
          {accounts.map((acc) => (
            <div key={acc.account_number} className="flex items-center justify-between bg-[#0a0e17] rounded-lg px-3 py-2">
              <div className="flex items-center gap-3">
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                  acc.is_active ? 'bg-green-500/20 text-green-400' : 'bg-slate-500/20 text-slate-500'
                }`}>
                  {acc.is_active ? 'Active' : 'Hidden'}
                </span>
                <span className="text-sm font-mono text-slate-200">{acc.account_number}</span>
                <span className="text-xs text-slate-500">{acc.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleToggleActive(Number(acc.account_number), acc.is_active)}
                  disabled={togglingAccount === Number(acc.account_number)}
                  className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                    acc.is_active
                      ? 'bg-slate-500/20 text-slate-400 hover:bg-slate-500/30'
                      : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                  } disabled:opacity-50`}
                >
                  {togglingAccount === Number(acc.account_number) ? '...' : acc.is_active ? 'Hide' : 'Show'}
                </button>
                <Link
                  href={`/account/${acc.account_number}/edit`}
                  className="px-3 py-1 rounded text-xs font-medium bg-[#eab308]/20 text-[#eab308] hover:bg-[#eab308]/30"
                >
                  Edit
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
