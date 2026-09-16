'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import useSession from '@/hooks/useSession';
import WalletButton from '@/components/wallet/WalletButton';
import SoundToggle from './SoundToggle';
import ModeBadge from './ModeBadge';

const NAV = [
  { href: '/rooms', label: 'Arenas' },
  { href: '/collection', label: 'Collection' },
  { href: '/leaderboard', label: 'Leaderboard' },
  { href: '/history', label: 'History' },
  { href: '/rules', label: 'Rules & Fairness' },
];

export default function SiteHeader() {
  const pathname = usePathname();
  const { session, displayName, isSignedIn } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-arena-edge/60 bg-arena-void/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2.5" aria-label="Elemental RPS Arena home">
          <span className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-nebula via-signal to-aurora font-display text-sm font-black text-white shadow-glow">
            ER
          </span>
          <span className="hidden font-display text-base font-black tracking-tight text-white sm:block">
            Elemental <span className="text-aurora">RPS</span> Arena
          </span>
        </Link>

        <nav aria-label="Primary" className="ml-4 hidden flex-1 items-center gap-1 lg:flex">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                  active ? 'bg-nebula/20 text-white' : 'text-slate-300 hover:bg-arena-panel/70 hover:text-white'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <div className="hidden md:block">
            <ModeBadge />
          </div>
          <SoundToggle />
          <WalletButton className="hidden sm:inline-flex" />
          <Link
            href="/profile"
            className="hidden rounded-lg border border-arena-edge bg-arena-panel/60 px-3 py-2 text-sm font-medium text-slate-200 transition hover:text-white sm:block"
          >
            {isSignedIn ? displayName : session?.isGuest ? 'Guest' : 'Sign in'}
          </Link>
          <button
            type="button"
            className="rounded-lg border border-arena-edge bg-arena-panel/60 px-2.5 py-2 text-slate-200 lg:hidden"
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span aria-hidden="true">{menuOpen ? '✕' : '☰'}</span>
            <span className="sr-only">{menuOpen ? 'Close menu' : 'Open menu'}</span>
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav id="mobile-nav" aria-label="Mobile" className="border-t border-arena-edge/60 bg-arena-deep/95 px-4 py-3 lg:hidden">
          <ul className="grid gap-1">
            {[...NAV, { href: '/profile', label: 'Profile' }].map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className="block rounded-lg px-3 py-2.5 text-sm font-medium text-slate-200 hover:bg-arena-panel/70 hover:text-white"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex items-center gap-2 sm:hidden">
            <WalletButton />
            <ModeBadge />
          </div>
        </nav>
      )}
    </header>
  );
}
