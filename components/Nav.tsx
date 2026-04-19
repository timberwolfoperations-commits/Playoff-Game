'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navLinks = [
  { href: '/', label: 'Leaderboard' },
  { href: '/series', label: 'Series & Games' },
];

export default function Nav() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-30 border-b border-white/60 bg-[rgba(248,244,236,0.78)] text-slate-900 shadow-[0_10px_30px_rgba(15,23,42,0.08)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-xl text-white shadow-[0_12px_30px_rgba(15,23,42,0.22)]">
            🏅
          </div>
          <div>
            <p className="font-serif text-2xl tracking-tight text-slate-950">The BIG Board</p>
            <p className="text-xs font-medium uppercase tracking-[0.28em] text-slate-500">
              Private League Dashboard
            </p>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 p-1.5 shadow-[0_10px_24px_rgba(15,23,42,0.08)]">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                  pathname === link.href
                    ? 'bg-slate-900 text-white shadow-[0_10px_18px_rgba(15,23,42,0.22)]'
                    : 'text-slate-600 hover:bg-[#f4ede1] hover:text-slate-900'
                }`}
              >
                {link.label}
              </Link>
            ))}
        </div>
        <div className="md:hidden flex flex-wrap gap-2 pb-4">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition-all ${
                pathname === link.href
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : 'border-slate-200 bg-white/80 text-slate-600 hover:border-[#d9c7a2] hover:bg-[#f4ede1] hover:text-slate-900'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
