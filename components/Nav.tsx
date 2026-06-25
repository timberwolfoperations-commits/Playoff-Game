'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { Session } from '@supabase/supabase-js';
import { getSupabaseBrowserClient } from '@/lib/user-auth-client';

export default function Nav() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    let active = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (active) setSession(data.session);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, next) => {
      if (active) setSession(next);
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const isLoggedIn = Boolean(session?.user && !session.user.is_anonymous);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      // Sign-out failures are non-critical; session will expire naturally
    }
  };

  return (
    <nav className="sticky top-0 z-30 border-b border-white/60 bg-[rgba(248,244,236,0.78)] text-slate-900 shadow-[0_10px_30px_rgba(15,23,42,0.08)] backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/bracket/world-cup-2026"
            className="whitespace-nowrap font-serif text-2xl tracking-tight text-slate-950 hover:opacity-80 transition-opacity"
          >
            The BIG Board
          </Link>
          <div className="flex items-center gap-2 text-sm">
            {isLoggedIn ? (
              <>
                <Link
                  href="/dashboard"
                  className="rounded-full border border-slate-300 bg-white/80 px-3 py-1.5 font-medium text-slate-700 transition hover:border-slate-400 hover:bg-white"
                >
                  Dashboard
                </Link>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="rounded-full border border-slate-300 bg-white/80 px-3 py-1.5 font-medium text-slate-700 transition hover:border-slate-400 hover:bg-white"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <Link
                href="/dashboard"
                className="rounded-full border border-slate-300 bg-white/80 px-3 py-1.5 font-medium text-slate-700 transition hover:border-slate-400 hover:bg-white"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
