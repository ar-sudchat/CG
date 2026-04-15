'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useUser } from '@/lib/useUser';


function IconPortfolio({ active }: { active: boolean }) {
  if (active) {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M3 3v18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M7 16l4-8 4 4 4-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M7 16l4-8 4 4 4-6v14H7z" fill="currentColor" opacity="0.15" />
      </svg>
    );
  }
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 3v18h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7 16l4-8 4 4 4-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconTrades({ active }: { active: boolean }) {
  if (active) {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="3" y="3" width="18" height="18" rx="4" fill="currentColor" opacity="0.12" />
        <path d="M8 16V12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M12 16V8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M16 16V10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M8 16V12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M12 16V8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M16 16V10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <rect x="3" y="3" width="18" height="18" rx="4" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function IconAccounts({ active }: { active: boolean }) {
  if (active) {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="8" r="4" fill="currentColor" opacity="0.2" stroke="currentColor" strokeWidth="2" />
        <path d="M20 21c0-3.3-3.6-6-8-6s-8 2.7-8 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M20 21c0-3.3-3.6-6-8-6s-8 2.7-8 6z" fill="currentColor" opacity="0.1" />
      </svg>
    );
  }
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.5" />
      <path d="M20 21c0-3.3-3.6-6-8-6s-8 2.7-8 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconFinance({ active }: { active: boolean }) {
  if (active) {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="2" y="5" width="20" height="15" rx="3" fill="currentColor" opacity="0.15" stroke="currentColor" strokeWidth="2" />
        <path d="M2 10h20" stroke="currentColor" strokeWidth="2" />
        <circle cx="17" cy="14" r="1.5" fill="currentColor" />
      </svg>
    );
  }
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="5" width="20" height="15" rx="3" stroke="currentColor" strokeWidth="1.5" />
      <path d="M2 10h20" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="17" cy="14" r="1.5" fill="currentColor" />
    </svg>
  );
}

function IconAdmin({ active }: { active: boolean }) {
  if (active) {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill="currentColor" opacity="0.15" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconConverter({ active }: { active: boolean }) {
  if (active) {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="9" fill="currentColor" opacity="0.15" stroke="currentColor" strokeWidth="2" />
        <path d="M8 12h8M12 8v8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <text x="6.5" y="16" fill="currentColor" fontSize="10" fontWeight="bold">$</text>
      </svg>
    );
  }
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
      <text x="8" y="16" fill="currentColor" fontSize="11" fontWeight="bold">$฿</text>
    </svg>
  );
}

function IconAW({ active }: { active: boolean }) {
  if (active) {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2L2 22h20L12 2z" fill="currentColor" opacity="0.15" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        <path d="M12 9v5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="12" cy="17" r="1" fill="currentColor" />
      </svg>
    );
  }
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2L2 22h20L12 2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M12 9v5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="12" cy="17" r="1" fill="currentColor" />
    </svg>
  );
}

const iconMap: Record<string, React.FC<{ active: boolean }>> = {
  portfolio: IconPortfolio,
  trades: IconTrades,
  accounts: IconAccounts,
  converter: IconConverter,
  finance: IconFinance,
  aw: IconAW,
  admin: IconAdmin,
};

export default function BottomNav() {
  const pathname = usePathname();
  const { isAdmin } = useUser();
  if (pathname === '/login' || pathname === '/register') return null;

  const navItems = [
    { href: '/', label: 'Portfolio', iconKey: 'portfolio' },
    { href: '/trades', label: 'Trades', iconKey: 'trades' },
    { href: '/my-accounts', label: 'Accounts', iconKey: 'accounts' },
    { href: '/finance', label: 'Finance', iconKey: 'finance' },
    { href: '/converter', label: '$฿', iconKey: 'converter' },
    { href: '/aw-report', label: 'AW', iconKey: 'aw' },
    ...(isAdmin ? [{ href: '/admin', label: 'Admin', iconKey: 'admin' }] : []),
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[var(--bg-primary)]/95 backdrop-blur-md border-t border-[var(--border)]/80 md:hidden">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const isActive = item.href === '/'
            ? pathname === '/'
            : pathname.startsWith(item.href);

          const Icon = iconMap[item.iconKey];

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'relative flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all duration-200',
                isActive
                  ? 'text-[#eab308]'
                  : 'text-slate-500 active:text-slate-300'
              )}
            >
              {isActive && (
                <div className="absolute inset-0 bg-[#eab308]/8 rounded-xl" />
              )}
              <div className="relative">
                <Icon active={isActive} />
                {isActive && (
                  <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-[#eab308] rounded-full shadow-[0_0_6px_rgba(234,179,8,0.6)]" />
                )}
              </div>
              <span className={cn(
                'text-[10px] font-semibold tracking-wide transition-colors',
                isActive ? 'text-[#eab308]' : 'text-slate-500'
              )}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
