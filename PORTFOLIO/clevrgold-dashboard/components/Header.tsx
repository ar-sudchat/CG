'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useCurrency } from '@/lib/currency';
import { useUser } from '@/lib/useUser';
import NotificationBell from '@/components/NotificationBell';


export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { currency, toggle: toggleCurrency, rate } = useCurrency();
  const { user, isAdmin } = useUser();

  // Hide on auth pages
  if (pathname === '/login' || pathname === '/register') return null;

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-50 bg-[var(--bg-primary)]/95 backdrop-blur-sm border-b border-[var(--border)]">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl font-bold text-[var(--gold)] font-sans tracking-tight">
              ClevrGold
            </span>
            <span className="text-sm text-[var(--text-secondary)] hidden sm:inline">Dashboard</span>
          </Link>
        </div>
        <div className="flex items-center gap-3">
          {/* Currency Toggle */}
          <button
            onClick={toggleCurrency}
            className="flex items-center h-7 rounded-full bg-[var(--bg-card)] border border-[var(--border)] hover:border-[var(--text-dim)] transition-all overflow-hidden"
            title={`1 USD = ${rate} THB`}
          >
            <span className={cn(
              'flex items-center gap-1 px-2 h-full rounded-full text-[11px] font-bold transition-all',
              currency === 'USD' ? 'bg-[var(--gold)]/20 text-[var(--gold)]' : 'text-[var(--text-secondary)]'
            )}>
              <span className="text-xs leading-none">&#127482;&#127480;</span>$
            </span>
            <span className={cn(
              'flex items-center gap-1 px-2 h-full rounded-full text-[11px] font-bold transition-all',
              currency === 'THB' ? 'bg-[var(--gold)]/20 text-[var(--gold)]' : 'text-[var(--text-secondary)]'
            )}>
              <span className="text-xs leading-none">&#127481;&#127469;</span>฿
            </span>
          </button>

          {/* Live indicator */}
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs font-mono text-green-500">LIVE</span>
          </div>

          {/* Notification Bell */}
          <NotificationBell />

          {/* Finance link */}
          <Link
            href="/finance"
            className={cn(
              'flex items-center justify-center w-8 h-8 rounded-lg transition-colors',
              pathname === '/finance'
                ? 'text-[var(--gold)] bg-[var(--gold)]/10'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-heading)] hover:bg-[var(--bg-card)]'
            )}
            title="Finance"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="5" width="20" height="15" rx="3" />
              <path d="M2 10h20" />
              <circle cx="17" cy="14" r="1" fill="currentColor" stroke="none" />
            </svg>
          </Link>

          {/* Admin link */}
          {isAdmin && (
            <Link
              href="/admin"
              className={cn(
                'hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors',
                pathname === '/admin' ? 'bg-[var(--gold)]/20 text-[var(--gold)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-heading)]'
              )}
              title="Admin"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            </Link>
          )}

          {/* User + Logout */}
          {user && (
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline text-xs text-[var(--text-secondary)] font-mono">
                {user.display_name || user.username}
              </span>
              <button
                onClick={handleLogout}
                className="flex items-center justify-center w-8 h-8 rounded-lg text-[var(--text-secondary)] hover:text-red-400 hover:bg-red-400/10 transition-colors"
                title="Logout"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
