'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { Session } from '@supabase/supabase-js';
import LoginCard from '@/components/LoginCard';
import { getSupabaseBrowserClient } from '@/lib/user-auth-client';

const LOCK_CUTOFF = new Date('2026-06-28T00:00:00.000Z');

interface Contest {
  id: string;
  title: string;
  statusLabel: string;
  isLive: boolean;
}

function buildContests(): Contest[] {
  const now = new Date();
  const pastCutoff = now >= LOCK_CUTOFF;
  return [
    {
      id: 'wc-bracket-2026',
      title: 'World Cup 2026 Knockout Pool',
      statusLabel: pastCutoff ? 'Live – View Standings' : 'Open – Closes June 28',
      isLive: pastCutoff,
    },
  ];
}

export default function DashboardPage() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let active = true;

    void supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      setSession(error ? null : data.session);
      setChecking(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, next) => {
      if (!active) return;
      setSession(next);
      setChecking(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const isAuthed = Boolean(session?.user && !session.user.is_anonymous);
  const contests = useMemo(() => buildContests(), []);

  if (checking) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-slate-400">Checking your session…</p>
      </div>
    );
  }

  if (!isAuthed) {
    return <LoginCard />;
  }

  return (
    <div className="w-full">
      {/* Contest list */}
      <div className="mx-auto max-w-2xl">
        <div className="mb-3">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
            Active Pools
          </p>
        </div>
        <ul className="space-y-2">
          {contests.map((contest) => (
            <li key={contest.id}>
              <Link
                href={`/dashboard/contest/${contest.id}`}
                className="flex items-center justify-between rounded-2xl border border-white/75 bg-[rgba(255,255,255,0.80)] px-5 py-4 shadow-[0_4px_16px_rgba(15,23,42,0.06)] transition hover:bg-white hover:shadow-[0_6px_20px_rgba(15,23,42,0.10)] active:scale-[0.99]"
              >
                <div className="space-y-1.5">
                  <p className="text-base font-semibold text-slate-900">{contest.title}</p>
                  <span
                    className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                      contest.isLive
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        : 'border-amber-200 bg-amber-50 text-amber-700'
                    }`}
                  >
                    {contest.statusLabel}
                  </span>
                </div>
                {/* Right-facing chevron */}
                <svg
                  className="ml-4 shrink-0 text-slate-400"
                  width="8"
                  height="14"
                  viewBox="0 0 8 14"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M1 1l6 6-6 6"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
