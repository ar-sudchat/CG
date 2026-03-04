'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import useSWR from 'swr';
import { cn } from '@/lib/utils';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const inputClass = 'w-full bg-[#0a0e17] border border-[#1e2a3a] rounded-lg px-3 py-2.5 text-sm text-slate-200 font-mono focus:border-[#eab308]/50 focus:outline-none transition-colors';
const labelClass = 'block text-xs text-slate-500 uppercase tracking-wider mb-2';

export default function EditAccountPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data, isLoading } = useSWR(`/api/account/${id}`, fetcher);
  const { data: pairGroupsData } = useSWR('/api/pair-groups', fetcher);

  const [name, setName] = useState('');
  const [owner, setOwner] = useState('');
  const [initialDeposit, setInitialDeposit] = useState('');
  const [broker, setBroker] = useState('');
  const [leverage, setLeverage] = useState('');
  const [accountType, setAccountType] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [description, setDescription] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarText, setAvatarText] = useState('');
  const [eaStrategy, setEaStrategy] = useState('');
  const [pairWith, setPairWith] = useState<string>(''); // account_number to pair with, '' = no pair
  const initialPairWith = useRef<string>(''); // track original value
  const [pairChanged, setPairChanged] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (data?.account) {
      const a = data.account;
      setName(a.name || '');
      setOwner(a.owner || '');
      setInitialDeposit(String(a.initial_deposit || ''));
      setBroker(a.broker || '');
      setLeverage(a.leverage || '');
      setAccountType(a.account_type || '');
      setCurrency(a.currency || 'USD');
      setDescription(a.description || '');
      setAvatarUrl(a.avatar_url || null);
      setAvatarPreview(a.avatar_url || null);
      setAvatarText(a.avatar_text || '');
      setEaStrategy(a.ea_strategy || '');
      setIsActive(a.is_active !== false);
    }
  }, [data]);

  // Set current paired account when data is ready
  useEffect(() => {
    if (data?.account && pairGroupsData?.accounts) {
      const myPairGroup = data.account.pair_group;
      let partnerStr = '';
      if (myPairGroup) {
        const partner = pairGroupsData.accounts.find(
          (a: any) => a.pair_group === myPairGroup && a.account_number !== Number(id)
        );
        if (partner) partnerStr = String(partner.account_number);
      }
      setPairWith(partnerStr);
      initialPairWith.current = partnerStr;
      setPairChanged(false);
    }
  }, [data, pairGroupsData, id]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 500 * 1024) {
      setMessage('Error: Image must be less than 500KB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setAvatarPreview(base64);
      setAvatarUrl(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = () => {
    setAvatarPreview(null);
    setAvatarUrl('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      const res = await fetch(`/api/account/${id}/update`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name || null,
          owner: owner || null,
          initial_deposit: initialDeposit ? parseFloat(initialDeposit) : undefined,
          broker: broker || null,
          leverage: leverage || null,
          account_type: accountType || null,
          currency: currency || null,
          description: description || null,
          avatar_url: avatarUrl !== undefined ? avatarUrl : undefined,
          avatar_text: avatarText || null,
          ea_strategy: eaStrategy || null,
          ...(pairChanged ? { pair_with: pairWith ? parseInt(pairWith) : null } : {}),
          is_active: isActive,
        }),
      });
      if (res.ok) {
        setMessage('Saved successfully');
        setTimeout(() => router.back(), 1000);
      } else {
        const err = await res.json();
        setMessage(`Error: ${err.error}`);
      }
    } catch {
      setMessage('Failed to save');
    }
    setSaving(false);
  };

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="bg-[#111827] rounded-xl border border-[#1e2a3a] p-6 h-60 animate-pulse" />
      </div>
    );
  }

  const server = data?.account?.server || '';

  return (
    <div className="p-4 pb-20 md:pb-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.back()}
          className="flex items-center justify-center w-9 h-9 rounded-lg bg-[#1a2332] hover:bg-[#243044] text-slate-400 hover:text-slate-200 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <div>
          <span className="font-mono text-lg text-slate-200 font-bold">Edit Account</span>
          <div className="text-xs text-slate-500 font-mono">{id} · {server}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-5xl">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Avatar Section */}
          <div className="bg-[#111827] rounded-xl border border-[#1e2a3a] p-6 space-y-5">
            <label className={labelClass}>Profile Avatar</label>
            <div className="flex items-center gap-5">
              <div className="relative">
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt="Avatar"
                    className="w-20 h-20 rounded-full object-cover border-2 border-[#1e2a3a]"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-[#1a2332] border-2 border-[#1e2a3a] flex items-center justify-center">
                    <span className="text-xl font-mono font-bold text-slate-400">
                      {avatarText || String(id).slice(-2)}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#1a2332] hover:bg-[#243044] text-slate-300 border border-[#1e2a3a] transition-colors"
                >
                  Upload Image
                </button>
                {avatarPreview && (
                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    className="px-4 py-2 text-xs font-semibold rounded-lg text-red-400 hover:text-red-300 border border-red-900/30 hover:border-red-800/50 transition-colors"
                  >
                    Remove
                  </button>
                )}
                <span className="text-[10px] text-slate-600">JPG, PNG. Max 500KB.</span>
              </div>
            </div>
            <div>
              <label className={labelClass}>Avatar Text (shown when no image)</label>
              <input
                type="text"
                value={avatarText}
                onChange={(e) => setAvatarText(e.target.value.slice(0, 4))}
                placeholder="e.g. AS, 07, Gold"
                maxLength={4}
                className={cn(inputClass, 'w-40')}
              />
              <span className="text-[10px] text-slate-600 mt-1 block">Max 4 characters.</span>
            </div>
          </div>

          {/* Basic Info */}
          <div className="bg-[#111827] rounded-xl border border-[#1e2a3a] p-6 space-y-5">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Basic Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className={labelClass}>Account Name</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Main Account" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Owner</label>
                <input type="text" value={owner} onChange={(e) => setOwner(e.target.value)} placeholder="e.g. Artit Sudchat" className={inputClass} />
              </div>
            </div>
            <div>
              <label className={labelClass}>Description</label>
              <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Gold scalping account" className={inputClass} />
            </div>
          </div>

        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Account Details */}
          <div className="bg-[#111827] rounded-xl border border-[#1e2a3a] p-6 space-y-5">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Account Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className={labelClass}>Broker</label>
                <input type="text" value={broker} onChange={(e) => setBroker(e.target.value)} placeholder="e.g. Exness, XM" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Account Type</label>
                <input type="text" value={accountType} onChange={(e) => setAccountType(e.target.value)} placeholder="e.g. Standard, ECN" className={inputClass} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className={labelClass}>EA Strategy</label>
                <select value={eaStrategy} onChange={(e) => setEaStrategy(e.target.value)} className={inputClass}>
                  <option value="">— None —</option>
                  <option value="Buy">Buy</option>
                  <option value="Sell">Sell</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>จับคู่กับบัญชี</label>
                <select
                  value={pairWith}
                  onChange={(e) => { setPairWith(e.target.value); setPairChanged(true); }}
                  className={inputClass}
                >
                  <option value="">— ไม่จับคู่ —</option>
                  {(pairGroupsData?.accounts || [])
                    .filter((a: any) => a.account_number !== Number(id) && a.owner === owner)
                    .map((a: any) => (
                      <option key={a.account_number} value={String(a.account_number)}>
                        {a.account_number} — {a.name}{a.ea_strategy ? ` (${a.ea_strategy})` : ''}
                      </option>
                    ))}
                </select>
                <span className="text-[10px] text-slate-600 mt-1 block">เลือกบัญชีที่จะจับคู่แสดงรวมกันบน Dashboard</span>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className={labelClass}>Initial Deposit</label>
                <input type="number" value={initialDeposit} onChange={(e) => setInitialDeposit(e.target.value)} placeholder="e.g. 1000" className={inputClass} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className={labelClass}>Leverage</label>
                <input type="text" value={leverage} onChange={(e) => setLeverage(e.target.value)} placeholder="e.g. 1:2000" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Currency</label>
                <select value={currency} onChange={(e) => setCurrency(e.target.value)} className={inputClass}>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                  <option value="THB">THB</option>
                </select>
              </div>
            </div>
            <div>
              <label className={labelClass}>Server</label>
              <div className="px-3 py-2.5 bg-[#0a0e17] border border-[#1e2a3a] rounded-lg text-sm text-slate-500 font-mono">
                {server || 'N/A'}
              </div>
              <span className="text-[10px] text-slate-600 mt-1 block">Set by MT4 collector</span>
            </div>
          </div>

          {/* Status Toggle */}
          <div className="bg-[#111827] rounded-xl border border-[#1e2a3a] p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Account Status</h3>
                <p className="text-[10px] text-slate-600 mt-1">Inactive accounts won&apos;t appear on the dashboard</p>
              </div>
              <button
                type="button"
                onClick={() => setIsActive(!isActive)}
                className={cn(
                  'relative w-12 h-6 rounded-full transition-colors',
                  isActive ? 'bg-green-600' : 'bg-slate-700'
                )}
              >
                <div className={cn(
                  'absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform',
                  isActive ? 'translate-x-6' : 'translate-x-0.5'
                )} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Actions — full width below grid */}
      <div className="flex items-center gap-3 pt-6 max-w-5xl">
        <button
          onClick={handleSave}
          disabled={saving}
          className={cn(
            'px-6 py-2.5 rounded-lg text-sm font-semibold transition-colors',
            saving
              ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
              : 'bg-[#eab308] hover:bg-[#ca8a04] text-black'
          )}
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
        <button
          onClick={() => router.back()}
          className="px-6 py-2.5 rounded-lg text-sm text-slate-400 hover:text-slate-200 border border-[#1e2a3a] hover:border-[#2a3a4a] transition-colors"
        >
          Cancel
        </button>
        {message && (
          <span className={cn(
            'text-xs font-mono',
            message.startsWith('Error') || message.startsWith('Failed') ? 'text-red-400' : 'text-green-400'
          )}>
            {message}
          </span>
        )}
      </div>
    </div>
  );
}
