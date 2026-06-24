'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/user-auth-client';

export default function JoinGroupPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const groupId = params.id;
  const [inviteError, setInviteError] = useState('');

  useEffect(() => {
    if (!groupId) return;

    let active = true;

    async function handleJoin() {
      // Verify the group exists before doing anything
      const { data: group, error: groupLookupError } = await supabase
        .from('groups')
        .select('id')
        .eq('id', groupId)
        .maybeSingle();
      if (!active) return;
      if (groupLookupError || !group) {
        setInviteError('This invite link is invalid or has expired.');
        return;
      }

      const { data, error } = await supabase.auth.getSession();
      if (!active) return;

      const session = error ? null : data.session;
      const user = session?.user && !session.user.is_anonymous ? session.user : null;

      if (user) {
        // User is authenticated — insert membership and go to dashboard
        const { error: upsertError } = await supabase.from('group_memberships').upsert(
          { group_id: groupId, profile_id: user.id, role: 'member' },
          { onConflict: 'group_id,profile_id', ignoreDuplicates: true },
        );
        if (upsertError) {
          console.warn('Could not join group:', upsertError.message);
        }
        router.replace('/dashboard');
      } else {
        // User is not authenticated — stash the group ID and send to login
        localStorage.setItem('pending_group_invite', groupId);
        router.replace('/');
      }
    }

    void handleJoin();

    return () => {
      active = false;
    };
  }, [groupId, supabase, router]);

  if (inviteError) {
    return (
      <div className="w-full">
        <div className="rounded-[1.75rem] border border-white/70 bg-[rgba(255,255,255,0.7)] py-20 text-center text-slate-500 shadow-[0_20px_45px_rgba(15,23,42,0.06)]">
          {inviteError}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="rounded-[1.75rem] border border-white/70 bg-[rgba(255,255,255,0.7)] py-20 text-center text-slate-400 shadow-[0_20px_45px_rgba(15,23,42,0.06)]">
        Processing your invite…
      </div>
    </div>
  );
}
