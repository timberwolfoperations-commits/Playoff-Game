'use client';

import Link from 'next/link';

export default function WcDraftPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="rounded-[1.75rem] border border-white/75 bg-[rgba(255,255,255,0.76)] p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)] backdrop-blur-sm">
        <h1 className="font-serif text-3xl tracking-tight text-slate-950">🌍 World Cup 2026 Pool</h1>
        <p className="mt-3 text-slate-600">
          Welcome to the 2026 FIFA World Cup pool! The full site will open when the current playoff game ends.
        </p>
        <div className="mt-6 space-y-3 text-sm text-slate-600">
          <p>
            <strong className="text-slate-800">How it works:</strong> Each participant drafts 8 teams from the 48-team field. Points are earned based on how your teams perform throughout the tournament — from group stage results all the way to the championship.
          </p>
          <p>
            <strong className="text-slate-800">Draft format:</strong> Teams will be assigned before the tournament begins. Check back soon for your team assignments.
          </p>
        </div>
        <div className="mt-8">
          <Link
            href="/worldcup"
            className="inline-block rounded-full bg-slate-900 px-6 py-3 text-sm font-bold text-white shadow-[0_10px_24px_rgba(15,23,42,0.18)] transition-all hover:bg-slate-700"
          >
            View World Cup Leaderboard →
          </Link>
        </div>
      </div>

      <div className="rounded-[1.75rem] border border-white/75 bg-[rgba(255,255,255,0.76)] p-6 shadow-[0_18px_40px_rgba(15,23,42,0.08)] backdrop-blur-sm">
        <h2 className="mb-4 font-serif text-xl font-semibold tracking-tight text-slate-900">Scoring Overview</h2>
        <div className="divide-y divide-[rgba(148,163,184,0.15)]">
          {[
            ['Group stage win', '3 pts'],
            ['Group stage draw', '1 pt'],
            ['Advance from group', '5 pts'],
            ['Round of 32 win', '6 pts'],
            ['Round of 16 win', '10 pts'],
            ['Quarterfinal win', '15 pts'],
            ['Semifinal win', '20 pts'],
            ['Champion 🏆', '35 pts'],
          ].map(([label, pts]) => (
            <div key={label} className="flex items-center justify-between py-2.5">
              <span className="text-sm text-slate-600">{label}</span>
              <span className="font-bold text-[#a45f14]">{pts}</span>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-slate-400">Payouts: 1st 80% · 2nd 20% · Last place $1</p>
      </div>
    </div>
  );
}
