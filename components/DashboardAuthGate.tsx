'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import CreateGroupCard from '@/components/CreateGroupCard';
import LeaderboardDashboard from '@/components/LeaderboardDashboard';
import LoginCard from '@/components/LoginCard';
import { getSupabaseBrowserClient } from '@/lib/user-auth-client';
import type { Group, UserProfile } from '@/types';

function hasDashboardSession(session: Session | null) {
  return Boolean(session?.user && !session.user.is_anonymous);
}

export default function DashboardAuthGate() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [userGroups, setUserGroups] = useState<Group[]>([]);

  const refreshGroups = useCallback(
    async (userId: string) => {
      const { data: memberships, error: groupsError } = await supabase
        .from('group_memberships')
        .select('group_id, groups(*)')
        .eq('profile_id', userId);
      if (groupsError) {
        console.warn('Could not load user groups:', groupsError.message);
      }
      const groups: Group[] = (memberships ?? [])
        .map((m: { group_id: string; groups: unknown }) => m.groups)
        .filter((g): g is Group => Boolean(g));
      setUserGroups(groups);
    },
    [supabase],
  );

  useEffect(() => {
    let active = true;

    async function fetchProfile(userId: string) {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, venmo_handle, updated_at')
        .eq('id', userId)
        .maybeSingle();
      if (!active) return;
      if (error) {
        console.warn('Could not load user profile:', error.message);
      }
      setProfile(data ?? null);

      const { data: memberships, error: groupsError } = await supabase
        .from('group_memberships')
        .select('group_id, groups(*)')
        .eq('profile_id', userId);
      if (!active) return;
      if (groupsError) {
        console.warn('Could not load user groups:', groupsError.message);
      }
      const groups: Group[] = (memberships ?? [])
        .map((m: { group_id: string; groups: unknown }) => m.groups)
        .filter((g): g is Group => Boolean(g));
      setUserGroups(groups);
    }

    void supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      const next = error ? null : data.session;
      setSession(next);
      setCheckingSession(false);
      if (next?.user && !next.user.is_anonymous) {
        void fetchProfile(next.user.id);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;
      setSession(nextSession);
      setCheckingSession(false);
      if (nextSession?.user && !nextSession.user.is_anonymous) {
        void fetchProfile(nextSession.user.id);
      } else {
        setProfile(null);
        setUserGroups([]);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  if (checkingSession) {
    return (
      <div className="w-full">
        <div className="rounded-[1.75rem] border border-white/70 bg-[rgba(255,255,255,0.7)] py-20 text-center text-slate-400 shadow-[0_20px_45px_rgba(15,23,42,0.06)]">
          Checking your session…
        </div>
      </div>
    );
  }

  if (!hasDashboardSession(session)) {
    return <LoginCard />;
  }

  const userId = session!.user.id;

  return (
    <div className="w-full space-y-6">
      <LeaderboardDashboard displayName={profile?.display_name ?? null} groups={userGroups} />
      <CreateGroupCard
        supabase={supabase}
        userId={userId}
        onGroupCreated={() => void refreshGroups(userId)}
      />
    </div>
  );
}

