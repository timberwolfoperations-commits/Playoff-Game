'use client';

import { useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';

interface Props {
  supabase: SupabaseClient;
  userId: string;
  onGroupCreated: () => void;
}

export default function CreateGroupCard({ supabase, userId, onGroupCreated }: Props) {
  const [groupName, setGroupName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    const name = groupName.trim();
    if (!name) return;
    setCreating(true);
    setError(null);

    try {
      const { data: group, error: insertError } = await supabase
        .from('groups')
        .insert({ name, created_by: userId })
        .select()
        .single();

      if (insertError || !group) {
        throw insertError ?? new Error('Group creation failed. Please try again.');
      }

      const { error: memberError } = await supabase
        .from('group_memberships')
        .insert({ group_id: group.id, profile_id: userId, role: 'admin' });

      if (memberError) throw memberError;

      setGroupName('');
      onGroupCreated();
    } catch (err: unknown) {
      const message = typeof err === 'object' && err !== null && 'message' in err && typeof err.message === 'string' ? err.message : null;
      const details = typeof err === 'object' && err !== null && 'details' in err && typeof err.details === 'string' ? err.details : null;
      setError(details ?? message ?? 'Failed to create group. Please try again.');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="rounded-[1.75rem] border border-white/75 bg-[rgba(255,255,255,0.78)] p-6 shadow-[0_20px_45px_rgba(15,23,42,0.08)] backdrop-blur-sm">
      <h2 className="mb-4 font-serif text-2xl tracking-tight text-slate-900">Create a New Crew</h2>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="text"
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void handleCreate();
          }}
          placeholder="Group name…"
          disabled={creating}
          className="flex-1 rounded-xl border border-[#dbc7a4] bg-white/80 px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#7c5b1f]/30 disabled:opacity-50"
        />
        <button
          onClick={() => void handleCreate()}
          disabled={creating || !groupName.trim()}
          className="rounded-full border border-[#dbc7a4] bg-white/80 px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.24em] text-[#7c5b1f] shadow-[0_10px_20px_rgba(15,23,42,0.06)] transition-colors hover:bg-[#f4ede1] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {creating ? 'Creating…' : 'Create Crew ➕'}
        </button>
      </div>
      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
