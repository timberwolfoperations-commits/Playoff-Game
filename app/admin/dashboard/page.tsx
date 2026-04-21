'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { fetchJson } from '@/lib/fetch';
import { DailySlate } from '@/types';

function fmtDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [slates, setSlates] = useState<DailySlate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Create new slate state
  const [newDate, setNewDate] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const checkAuth = useCallback(async () => {
    try {
      const status = await fetchJson<{ isAdmin: boolean }>('/api/admin/status');
      if (!status.isAdmin) router.push('/admin');
    } catch {
      router.push('/admin');
    }
  }, [router]);

  const loadSlates = useCallback(async () => {
    try {
      const data = await fetchJson<DailySlate[]>('/api/bets/slates');
      setSlates(Array.isArray(data) ? data : []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load slates');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void checkAuth();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Legitimate API data fetch; rule is from Next.js 16 React Compiler lint
    void loadSlates();
  }, [checkAuth, loadSlates]);

  const createSlate = async () => {
    if (!newDate || !newTitle.trim()) return;
    setCreating(true);
    setCreateError('');
    try {
      await fetchJson('/api/bets/slates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: newDate, title: newTitle.trim(), description: newDesc.trim() || null }),
      });
      setNewDate('');
      setNewTitle('');
      setNewDesc('');
      await loadSlates();
    } catch (e: unknown) {
      setCreateError(e instanceof Error ? e.message : 'Failed to create slate');
    } finally {
      setCreating(false);
    }
  };

  const logout = async () => {
    await fetchJson('/api/admin/logout', { method: 'POST' });
    router.push('/admin');
  };

  return (
    <div className="w-full space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl tracking-tight text-slate-950">Admin Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">Manage daily pick slates.</p>
        </div>
        <button
          onClick={logout}
          className="rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-xs font-semibold text-slate-600 shadow-sm hover:bg-slate-50 transition-colors"
        >
          Sign Out
        </button>
      </div>

      {/* Create new slate */}
      <div className="rounded-[1.75rem] border border-white/75 bg-[rgba(255,255,255,0.76)] p-6 shadow-[0_18px_40px_rgba(15,23,42,0.08)] backdrop-blur-sm">
        <h2 className="mb-4 font-semibold text-slate-800">Create New Slate</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <input
            type="date"
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-[#b7893d]"
          />
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Slate title (e.g. Monday Night Picks)"
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-[#b7893d]"
          />
          <input
            type="text"
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            placeholder="Description (optional)"
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-[#b7893d] sm:col-span-2"
          />
        </div>
        {createError && <p className="mt-2 text-sm text-red-600">{createError}</p>}
        <button
          onClick={createSlate}
          disabled={!newDate || !newTitle.trim() || creating}
          className="mt-4 rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-bold text-white hover:bg-slate-700 disabled:opacity-40 transition-colors"
        >
          {creating ? 'Creating…' : 'Create Slate'}
        </button>
      </div>

      {/* Slate list */}
      {loading ? (
        <div className="text-center text-slate-400 py-12">Loading…</div>
      ) : error ? (
        <div className="text-center text-red-600 py-12">{error}</div>
      ) : slates.length === 0 ? (
        <div className="rounded-[1.75rem] border border-white/70 bg-[rgba(255,255,255,0.72)] py-14 text-center shadow-[0_20px_45px_rgba(15,23,42,0.06)]">
          <p className="text-slate-500">No slates yet. Create one above.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {slates.map((slate) => (
            <div
              key={slate.id}
              className="flex items-center justify-between rounded-[1.5rem] border border-white/75 bg-[rgba(255,255,255,0.76)] px-5 py-4 shadow-[0_10px_24px_rgba(15,23,42,0.06)] backdrop-blur-sm"
            >
              <div>
                <p className="font-semibold text-slate-900">{slate.title}</p>
                <p className="text-xs text-slate-500">
                  {fmtDate(slate.date)} ·{' '}
                  {(slate.picks?.length ?? 0)} pick{(slate.picks?.length ?? 0) !== 1 ? 's' : ''}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <SlateStatusBadge slate={slate} />
                <Link
                  href={`/admin/slates/${slate.id}`}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
                >
                  Manage →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SlateStatusBadge({ slate }: { slate: DailySlate }) {
  if (slate.is_settled) {
    return <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">Settled</span>;
  }
  if (slate.is_open) {
    return <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">Open</span>;
  }
  return <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">Draft</span>;
}
