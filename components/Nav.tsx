'use client';

import Link from 'next/link';

export default function Nav() {
  return (
    <nav className="sticky top-0 z-30 border-b border-white/60 bg-[rgba(248,244,236,0.78)] text-slate-900 shadow-[0_10px_30px_rgba(15,23,42,0.08)] backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
        <div className="relative flex items-center justify-between">
          {/* Far Left: hamburger */}
          <button
            type="button"
            aria-label="Open menu"
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-600 transition hover:bg-slate-100"
          >
            <svg width="20" height="16" viewBox="0 0 20 16" fill="none" aria-hidden="true">
              <path d="M0 1h20M0 8h20M0 15h20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>

          {/* Center: title */}
          <span className="absolute left-1/2 -translate-x-1/2 font-serif text-xl font-semibold tracking-widest text-slate-950 uppercase">
            The Big Board
          </span>

          {/* Far Right: create group */}
          <Link
            href="/dashboard/create-group"
            aria-label="Create group"
            className="flex h-9 w-9 items-center justify-center rounded-xl text-2xl font-light leading-none text-slate-600 transition hover:bg-slate-100"
          >
            +
          </Link>
        </div>
      </div>
    </nav>
  );
}
