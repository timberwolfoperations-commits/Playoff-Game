'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/bracket/world-cup-2026', label: 'Explore' },
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/join', label: 'Join Pool' },
  { href: '/admin', label: 'Admin' },
];

export default function Nav() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-30 border-b border-white/60 bg-[rgba(248,244,236,0.78)] text-slate-900 shadow-[0_10px_30px_rgba(15,23,42,0.08)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <Link href="/" className="font-serif text-xl font-semibold tracking-widest text-slate-950">
          The BIG BOARD
        </Link>

        <div className="flex flex-wrap gap-2">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] transition ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-[0_10px_20px_rgba(15,23,42,0.12)]'
                    : 'bg-white/80 text-slate-600 hover:bg-[#f4ede1]'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
