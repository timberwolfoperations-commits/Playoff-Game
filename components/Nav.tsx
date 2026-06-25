import Link from 'next/link';

export default function Nav() {
  return (
    <nav className="sticky top-0 z-30 border-b border-white/60 bg-[rgba(248,244,236,0.78)] text-slate-900 shadow-[0_10px_30px_rgba(15,23,42,0.08)] backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="whitespace-nowrap font-serif text-2xl tracking-tight text-slate-950">The BIG Board</p>
          <div className="flex items-center gap-2 text-sm">
            <Link
              href="/bracket/world-cup-2026"
              className="rounded-full border border-slate-300 bg-white/80 px-3 py-1.5 font-medium text-slate-700 transition hover:border-slate-400 hover:bg-white"
            >
              World Cup
            </Link>
            <Link
              href="/bracket/nba-playoffs-2026"
              className="rounded-full border border-slate-300 bg-white/80 px-3 py-1.5 font-medium text-slate-700 transition hover:border-slate-400 hover:bg-white"
            >
              NBA Playoffs
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
