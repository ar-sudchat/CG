'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already installed as PWA
    setIsStandalone(window.matchMedia('(display-mode: standalone)').matches);

    // Detect iOS
    const ua = navigator.userAgent;
    setIsIOS(/iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream);

    // Capture install prompt for Android/Chrome
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (installPrompt) {
      installPrompt.prompt();
      const result = await installPrompt.userChoice;
      if (result.outcome === 'accepted') {
        setInstallPrompt(null);
        setIsStandalone(true);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'เกิดข้อผิดพลาด');
        return;
      }

      router.push('/');
      router.refresh();
    } catch {
      setError('ไม่สามารถเชื่อมต่อได้');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = 'w-full bg-[#0a0e17] border border-[#1e2a3a] rounded-lg px-3 py-2.5 text-sm text-slate-200 font-mono focus:border-[#eab308]/50 focus:outline-none transition-colors';

  return (
    <div className="min-h-screen bg-[#0a0e17] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#eab308] tracking-tight">ClevrGold</h1>
          <p className="text-sm text-slate-500 mt-1">Trading Dashboard</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-[#111827] rounded-xl border border-[#1e2a3a] p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={inputClass}
              placeholder="username"
              autoComplete="username"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
              placeholder="password"
              autoComplete="current-password"
            />
          </div>

          {error && (
            <p className="text-xs text-red-400 bg-red-400/10 rounded-lg px-3 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !username || !password}
            className="w-full py-2.5 rounded-lg bg-[#eab308] hover:bg-[#ca8a04] text-black font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="flex items-center justify-center gap-3 mt-4">
          <Link href="/register" className="text-xs text-[#eab308] hover:underline">
            Register
          </Link>
          {!isStandalone && (installPrompt || isIOS) && (
            <>
              <span className="text-slate-600">|</span>
              {installPrompt ? (
                <button onClick={handleInstall} className="text-xs text-slate-400 hover:text-slate-200 transition-colors">
                  Install App
                </button>
              ) : (
                <span className="text-xs text-slate-500">
                  Share → Add to Home Screen
                </span>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
