'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const wcTabs = [
  { href: '/worldcup', label: '🏆 Leaderboard', exact: true },
  { href: '/worldcup/draft', label: '📝 Draft' },
  { href: '/worldcup/groups', label: '🗂️ Groups & Standings' },
  { href: '/worldcup/bracket', label: '🎯 Bracket' },
  { href: '/worldcup/bracket-entry', label: '✏️ Bracket Entry' },
  { href: '/worldcup/matches', label: '📅 Matches' },
];

export default function WorldCupLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="w-full">
      {/* Sub-nav tabs */}
      <div className="mb-6 overflow-x-auto">
        <div className="flex min-w-max gap-1 rounded-2xl border border-white/75 bg-[rgba(255,255,255,0.72)] p-1.5 shadow-[0_8px_24px_rgba(15,23,42,0.07)] backdrop-blur-sm">
          {wcTabs.map((tab) => {
            const isActive = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`whitespace-nowrap rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-[0_6px_16px_rgba(15,23,42,0.18)]'
                    : 'text-slate-600 hover:bg-[#f4ede1] hover:text-slate-900'
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
      </div>
      {children}
    </div>
  );
}
