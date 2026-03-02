'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function RegisterPage() {
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirm) {
      setError('รหัสผ่านไม่ตรงกัน');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, display_name: displayName || undefined }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'เกิดข้อผิดพลาด');
        return;
      }

      setSuccess(true);
    } catch {
      setError('ไม่สามารถเชื่อมต่อได้');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = 'w-full bg-[#0a0e17] border border-[#1e2a3a] rounded-lg px-3 py-2.5 text-sm text-slate-200 font-mono focus:border-[#eab308]/50 focus:outline-none transition-colors';

  if (success) {
    return (
      <div className="min-h-screen bg-[#0a0e17] flex items-center justify-center p-4">
        <div className="w-full max-w-sm text-center">
          <div className="bg-[#111827] rounded-xl border border-[#1e2a3a] p-6">
            <div className="text-4xl mb-3">&#10003;</div>
            <h2 className="text-lg font-semibold text-green-400 mb-2">สมัครสมาชิกสำเร็จ</h2>
            <p className="text-sm text-slate-400 mb-4">กรุณารอ Admin อนุมัติก่อนเข้าใช้งาน</p>
            <Link href="/login" className="text-sm text-[#eab308] hover:underline">
              กลับหน้า Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0e17] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#eab308] tracking-tight">ClevrGold</h1>
          <p className="text-sm text-slate-500 mt-1">Register</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-[#111827] rounded-xl border border-[#1e2a3a] p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={inputClass}
              placeholder="a-z, 0-9, _ (3-30 chars)"
              autoComplete="username"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Display Name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className={inputClass}
              placeholder="optional"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
              placeholder="min 6 chars"
              autoComplete="new-password"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Confirm Password</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className={inputClass}
              placeholder="confirm password"
              autoComplete="new-password"
            />
          </div>

          {error && (
            <p className="text-xs text-red-400 bg-red-400/10 rounded-lg px-3 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !username || !password || !confirm}
            className="w-full py-2.5 rounded-lg bg-[#eab308] hover:bg-[#ca8a04] text-black font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Registering...' : 'Register'}
          </button>
        </form>

        <p className="text-center text-xs text-slate-500 mt-4">
          <Link href="/login" className="text-[#eab308] hover:underline">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}
