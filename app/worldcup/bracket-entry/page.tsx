'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import WorldCupBracketEntry from '@/components/WorldCupBracketEntry';
import { getSupabaseBrowserClient } from '@/lib/user-auth-client';
import type { Group } from '@/types';

export default function WcBracketEntryPage() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [checking, setChecking] = useState(true);
  const [groups, setGroups] = useState<Group[]>([]);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadGroups(userId: string) {
      const { data, error } = await supabase
        .from('group_memberships')
        .select('group_id, groups(*)')
        .eq('profile_id', userId);
      if (!active) return;
      if (error) {
        console.warn('Could not load groups:', error.message);
        return;
      }
      const loaded: Group[] = (data ?? [])
        .map((m: { group_id: string; groups: unknown }) => m.groups)
        .filter((g): g is Group => Boolean(g));
      setGroups(loaded);
      setActiveGroupId((cur) => {
        if (cur && loaded.some((g) => g.id === cur)) return cur;
        return loaded[0]?.id ?? null;
      });
    }

    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setChecking(false);
      if (data.session?.user && !data.session.user.is_anonymous) {
        void loadGroups(data.session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      if (!active) return;
      setSession(s);
      setChecking(false);
      if (s?.user && !s.user.is_anonymous) {
        void loadGroups(s.user.id);
      } else {
        setGroups([]);
        setActiveGroupId(null);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  if (checking) {
    return (
      <div className="rounded-[1.75rem] border border-white/70 bg-[rgba(255,255,255,0.7)] py-20 text-center text-slate-400">
        Checking session…
      </div>
    );
  }

  if (!session?.user || session.user.is_anonymous) {
    return (
      <div className="rounded-[1.75rem] border border-white/75 bg-[rgba(255,255,255,0.76)] py-20 text-center shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
        <p className="text-lg font-semibold text-slate-700">Sign in to enter your bracket.</p>
        <p className="mt-2 text-sm text-slate-500">
          You need a crew account to save picks.
        </p>
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="rounded-[1.75rem] border border-white/75 bg-[rgba(255,255,255,0.76)] py-20 text-center shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
        <p className="text-lg font-semibold text-slate-700">No crew found.</p>
        <p className="mt-2 text-sm text-slate-500">
          Join or create a crew from your{' '}
          <a href="/dashboard" className="font-semibold text-[#7c5b1f] underline">
            dashboard
          </a>{' '}
          to use the bracket.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      {/* Group selector */}
      {groups.length > 1 && (
        <div className="flex items-center gap-3">
          <label
            htmlFor="bracket-group-select"
            className="flex items-center gap-2 rounded-full border border-[#dbc7a4] bg-white/80 px-3 py-1.5 text-xs font-semibold text-[#7c5b1f] shadow-[0_6px_16px_rgba(15,23,42,0.06)]"
          >
            <span className="uppercase tracking-[0.2em]">Crew</span>
            <select
              id="bracket-group-select"
              value={activeGroupId ?? ''}
              onChange={(e) => setActiveGroupId(e.target.value || null)}
              className="rounded-full border border-[#dbc7a4] bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7c5b1f] focus:outline-none focus:ring-2 focus:ring-[#7c5b1f]/30"
            >
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      {activeGroupId ? (
        <WorldCupBracketEntry
          key={`${session.user.id}-${activeGroupId}`}
          userId={session.user.id}
          groupId={activeGroupId}
        />
      ) : (
        <div className="rounded-[1.75rem] border border-white/70 bg-[rgba(255,255,255,0.7)] py-20 text-center text-slate-400">
          Select a crew above to load your bracket.
        </div>
      )}
    </div>
  );
}
