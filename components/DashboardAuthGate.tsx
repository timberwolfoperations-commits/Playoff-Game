'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import LeaderboardDashboard from '@/components/LeaderboardDashboard';
import LoginCard from '@/components/LoginCard';
import { getSupabaseBrowserClient } from '@/lib/user-auth-client';
import type { UserProfile } from '@/types';

function hasDashboardSession(session: Session | null) {
  return Boolean(session?.user && !session.user.is_anonymous);
}

export default function DashboardAuthGate() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    let active = true;

    async function fetchProfile(userId: string) {
      const { data } = await supabase
        .from('profiles')
        .select('id, display_name, venmo_handle, updated_at')
        .eq('id', userId)
        .maybeSingle();
      if (active) setProfile(data ?? null);
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

  return hasDashboardSession(session) ? (
    <LeaderboardDashboard displayName={profile?.display_name ?? null} />
  ) : (
    <LoginCard />
  );
}
