'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import CreateGroupCard from '@/components/CreateGroupCard';
import LoginCard from '@/components/LoginCard';
import { getSupabaseBrowserClient } from '@/lib/user-auth-client';
import type { Group } from '@/types';

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

function hasSignedInUser(session: Session | null) {
  return Boolean(session?.user && !session.user.is_anonymous);
}

export default function DashboardPage() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [checking, setChecking] = useState(true);
  const [groups, setGroups] = useState<Group[]>([]);
  const [copiedGroupId, setCopiedGroupId] = useState<string | null>(null);

  const refreshGroups = useCallback(
    async (userId: string) => {
      const { data: memberships, error } = await supabase
        .from('group_memberships')
        .select('group_id, groups(*)')
        .eq('profile_id', userId);

      if (error) {
        console.warn('Could not load user groups:', error.message);
        setGroups([]);
        return;
      }

      const nextGroups: Group[] = (memberships ?? [])
        .map((membership: { group_id: string; groups: unknown }) => membership.groups)
        .filter((group): group is Group => Boolean(group));

      setGroups(nextGroups);
    },
    [supabase],
  );

  useEffect(() => {
    let active = true;

    void supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      const nextSession = error ? null : data.session;
      setSession(nextSession);
      setChecking(false);
      if (nextSession?.user && !nextSession.user.is_anonymous) {
        void refreshGroups(nextSession.user.id);
      } else {
        setGroups([]);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;
      setSession(nextSession);
      setChecking(false);
      if (nextSession?.user && !nextSession.user.is_anonymous) {
        void refreshGroups(nextSession.user.id);
      } else {
        setGroups([]);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [refreshGroups, supabase]);

  const isAuthed = hasSignedInUser(session);
  const contests = useMemo(() => buildContests(), []);

  async function copyInviteLink(groupId: string) {
    const invitePath = `/join/${groupId}`;
    const inviteUrl =
      typeof window === 'undefined' ? invitePath : window.location.origin + invitePath;

    await navigator.clipboard.writeText(inviteUrl);
    setCopiedGroupId(groupId);
    window.setTimeout(() => setCopiedGroupId((current) => (current === groupId ? null : current)), 2000);
  }

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

  const userId = session!.user.id;

  return (
    <div className="w-full space-y-6">
      <section className="rounded-[1.75rem] border border-white/75 bg-[rgba(255,255,255,0.82)] p-6 shadow-[0_20px_45px_rgba(15,23,42,0.08)] backdrop-blur-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#7c5b1f]">
          Your pool dashboard
        </p>
        <h1 className="mt-3 font-serif text-3xl tracking-tight text-slate-950">
          Create or manage your survivor pool
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500">
          Pools are stored as private groups. Create one here, copy its invite link, then head into
          the contest to make picks.
        </p>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.1fr,0.9fr]">
        <CreateGroupCard
          supabase={supabase}
          userId={userId}
          onGroupCreated={() => void refreshGroups(userId)}
        />

        <div className="rounded-[1.75rem] border border-white/75 bg-[rgba(255,255,255,0.82)] p-6 shadow-[0_20px_45px_rgba(15,23,42,0.08)] backdrop-blur-sm">
          <h2 className="font-serif text-2xl tracking-tight text-slate-900">How it works</h2>
          <ol className="mt-4 space-y-3 text-sm text-slate-600">
            {[
              'Create your pool.',
              'Copy the invite link and share it.',
              'Have everyone join from that link.',
              'Open the contest below to make and lock picks.',
            ].map((step, index) => (
              <li key={step} className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
                  {index + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-white/75 bg-[rgba(255,255,255,0.82)] p-6 shadow-[0_20px_45px_rgba(15,23,42,0.08)] backdrop-blur-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-serif text-2xl tracking-tight text-slate-900">Your Pools</h2>
            <p className="text-sm text-slate-500">
              {groups.length === 0
                ? 'Create your first pool above.'
                : 'Share any invite link below to add another player.'}
            </p>
          </div>
          <Link
            href="/bracket/world-cup-2026"
            className="inline-flex rounded-full border border-[#dbc7a4] bg-white/90 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#7c5b1f] transition hover:bg-[#f4ede1]"
          >
            Explore Public Bracket
          </Link>
        </div>

        {groups.length === 0 ? (
          <div className="mt-5 rounded-[1.5rem] border border-dashed border-[#dbc7a4] bg-[#faf5ea] px-5 py-6 text-sm text-slate-500">
            No pool yet. Once you create one, its invite link will appear here.
          </div>
        ) : (
          <div className="mt-5 space-y-3">
            {groups.map((group) => {
              const invitePath = `/join/${group.id}`;
              return (
                <div
                  key={group.id}
                  className="rounded-[1.5rem] border border-white/75 bg-white/90 p-4 shadow-[0_10px_24px_rgba(15,23,42,0.06)]"
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="text-lg font-semibold text-slate-900">{group.name}</p>
                      <p className="mt-1 font-mono text-xs text-slate-500">{invitePath}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void copyInviteLink(group.id)}
                      className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-slate-800"
                    >
                      {copiedGroupId === group.id ? 'Copied' : 'Copy Invite Link'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="w-full">
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
      </section>
    </div>
  );
}
