'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { fetchJson } from '@/lib/fetch';
import { DailySlate, SlatePick, BetSlip, SlipChoice } from '@/types';

type SlipWithChoices = BetSlip & { choices: SlipChoice[] };

function fmtCents(cents: number): string {
  const dollars = Math.floor(Math.abs(cents) / 100);
  const c = Math.abs(cents) % 100;
  const str = c === 0 ? `$${dollars}` : `$${dollars}.${String(c).padStart(2, '0')}`;
  return cents < 0 ? `-${str}` : str;
}

export default function AdminSlatePage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();

  const [slate, setSlate] = useState<DailySlate | null>(null);
  const [slips, setSlips] = useState<SlipWithChoices[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Add pick form
  const [pickTitle, setPickTitle] = useState('');
  const [optionA, setOptionA] = useState('');
  const [optionB, setOptionB] = useState('');
  const [addingPick, setAddingPick] = useState(false);
  const [pickError, setPickError] = useState('');

  // Settle form: results[pickId] = 'a' | 'b'
  const [results, setResults] = useState<Record<string, 'a' | 'b'>>({});
  const [settling, setSettling] = useState(false);
  const [settleError, setSettleError] = useState('');
  const [settleResult, setSettleResult] = useState<{
    pot_cents: number;
    winners_count: number;
    per_winner_cents: number;
    max_correct: number;
  } | null>(null);

  const checkAuth = useCallback(async () => {
    try {
      const status = await fetchJson<{ isAdmin: boolean }>('/api/admin/status');
      if (!status.isAdmin) router.push('/admin');
    } catch {
      router.push('/admin');
    }
  }, [router]);

  const loadSlate = useCallback(async () => {
    try {
      const [slateData, slipsData] = await Promise.all([
        fetchJson<DailySlate>(`/api/bets/slates/${id}`),
        fetchJson<SlipWithChoices[]>(`/api/bets/slates/${id}/slips`),
      ]);
      setSlate(slateData);
      setSlips(Array.isArray(slipsData) ? slipsData : []);
      setError('');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void checkAuth();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Legitimate API data fetch; rule is from Next.js 16 React Compiler lint
    void loadSlate();
  }, [checkAuth, loadSlate]);

  const addPick = async () => {
    if (!pickTitle.trim() || !optionA.trim() || !optionB.trim()) return;
    setAddingPick(true);
    setPickError('');
    try {
      await fetchJson(`/api/bets/slates/${id}/picks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: pickTitle.trim(),
          option_a: optionA.trim(),
          option_b: optionB.trim(),
          display_order: (slate?.picks?.length ?? 0),
        }),
      });
      setPickTitle('');
      setOptionA('');
      setOptionB('');
      await loadSlate();
    } catch (e: unknown) {
      setPickError(e instanceof Error ? e.message : 'Failed to add pick');
    } finally {
      setAddingPick(false);
    }
  };

  const removePick = async (pickId: string) => {
    if (!confirm('Remove this pick? Any submitted choices for it will also be deleted.')) return;
    try {
      await fetchJson(`/api/bets/slates/${id}/picks/${pickId}`, { method: 'DELETE' });
      await loadSlate();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed to remove pick');
    }
  };

  const toggleOpen = async () => {
    if (!slate) return;
    try {
      await fetchJson(`/api/bets/slates/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_open: !slate.is_open }),
      });
      await loadSlate();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed to update');
    }
  };

  const settleSlate = async () => {
    const picks = slate?.picks ?? [];
    if (picks.some((p) => !results[p.id])) {
      setSettleError('Select a winner for every pick before settling.');
      return;
    }
    if (!confirm('Settle this slate? This action cannot be undone.')) return;
    setSettling(true);
    setSettleError('');
    try {
      const res = await fetchJson<{
        pot_cents: number;
        winners_count: number;
        per_winner_cents: number;
        max_correct: number;
      }>(`/api/bets/slates/${id}/settle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ results }),
      });
      setSettleResult(res);
      await loadSlate();
    } catch (e: unknown) {
      setSettleError(e instanceof Error ? e.message : 'Failed to settle');
    } finally {
      setSettling(false);
    }
  };

  const deleteSlate = async () => {
    if (!confirm('Delete this slate? All slips and picks will be removed.')) return;
    try {
      await fetchJson(`/api/bets/slates/${id}`, { method: 'DELETE' });
      router.push('/admin/dashboard');
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed to delete');
    }
  };

  if (loading) {
    return <div className="text-center text-slate-400 py-20">Loading…</div>;
  }
  if (error || !slate) {
    return (
      <div className="text-center py-20">
        <p className="text-red-600 font-semibold">{error || 'Slate not found'}</p>
        <Link href="/admin/dashboard" className="mt-4 inline-block text-sm text-slate-500 underline">
          Back to dashboard
        </Link>
      </div>
    );
  }

  const picks = slate.picks ?? [];

  return (
    <div className="w-full space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/admin/dashboard" className="text-xs text-slate-400 hover:text-slate-600 mb-1 inline-block">
            ← Dashboard
          </Link>
          <h1 className="font-serif text-2xl tracking-tight text-slate-950">{slate.title}</h1>
          <p className="text-sm text-slate-500">{slate.date}</p>
          {slate.description && <p className="text-sm text-slate-600 mt-0.5">{slate.description}</p>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <StatusBadge slate={slate} />
          {!slate.is_settled && (
            <button
              onClick={toggleOpen}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition-colors ${
                slate.is_open
                  ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                  : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
              }`}
            >
              {slate.is_open ? 'Close Picks' : 'Open Picks'}
            </button>
          )}
          <button
            onClick={deleteSlate}
            className="rounded-xl px-4 py-2 text-xs font-bold bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Picks', value: picks.length },
          { label: 'Slips', value: slips.length },
          { label: 'Pot', value: fmtCents(slips.length * 100) },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-2xl border border-white/75 bg-[rgba(255,255,255,0.76)] p-4 text-center shadow-sm">
            <p className="text-2xl font-bold text-slate-900">{value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Add pick form */}
      {!slate.is_settled && (
        <div className="rounded-[1.75rem] border border-white/75 bg-[rgba(255,255,255,0.76)] p-6 shadow-[0_18px_40px_rgba(15,23,42,0.08)] backdrop-blur-sm">
          <h2 className="mb-4 font-semibold text-slate-800">Add Pick</h2>
          <div className="space-y-3">
            <input
              type="text"
              value={pickTitle}
              onChange={(e) => setPickTitle(e.target.value)}
              placeholder="Game title (e.g. Chiefs vs Raiders)"
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#b7893d]"
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                value={optionA}
                onChange={(e) => setOptionA(e.target.value)}
                placeholder="Option A (e.g. Chiefs -3.5)"
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#b7893d]"
              />
              <input
                type="text"
                value={optionB}
                onChange={(e) => setOptionB(e.target.value)}
                placeholder="Option B (e.g. Raiders +3.5)"
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#b7893d]"
              />
            </div>
          </div>
          {pickError && <p className="mt-2 text-sm text-red-600">{pickError}</p>}
          <button
            onClick={addPick}
            disabled={!pickTitle.trim() || !optionA.trim() || !optionB.trim() || addingPick}
            className="mt-4 rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-bold text-white hover:bg-slate-700 disabled:opacity-40 transition-colors"
          >
            {addingPick ? 'Adding…' : 'Add Pick'}
          </button>
        </div>
      )}

      {/* Picks list */}
      {picks.length > 0 && (
        <div className="rounded-[1.75rem] border border-white/75 bg-[rgba(255,255,255,0.76)] overflow-hidden shadow-[0_18px_40px_rgba(15,23,42,0.08)] backdrop-blur-sm">
          <div className="px-6 py-4 border-b border-[rgba(148,163,184,0.15)]">
            <h2 className="font-semibold text-slate-800">Picks ({picks.length})</h2>
          </div>
          <div className="divide-y divide-[rgba(148,163,184,0.12)]">
            {picks.map((pick) => (
              <PickRow
                key={pick.id}
                pick={pick}
                settled={slate.is_settled}
                result={results[pick.id] ?? null}
                onResult={(v) => setResults((prev) => ({ ...prev, [pick.id]: v }))}
                onRemove={() => removePick(pick.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Settle section */}
      {!slate.is_settled && picks.length > 0 && slips.length > 0 && (
        <div className="rounded-[1.75rem] border border-white/75 bg-[rgba(255,255,255,0.76)] p-6 shadow-[0_18px_40px_rgba(15,23,42,0.08)] backdrop-blur-sm">
          <h2 className="mb-2 font-semibold text-slate-800">Settle Slate</h2>
          <p className="text-sm text-slate-500 mb-4">
            Select the correct option for each pick above, then settle to distribute the pot.
          </p>
          {settleError && <p className="mb-3 text-sm text-red-600">{settleError}</p>}
          {settleResult && (
            <div className="mb-4 rounded-2xl bg-emerald-50 border border-emerald-200 px-5 py-4">
              <p className="font-bold text-emerald-800">Settled!</p>
              <p className="text-sm text-emerald-700 mt-1">
                Pot: {fmtCents(settleResult.pot_cents)} · {settleResult.winners_count} winner
                {settleResult.winners_count !== 1 ? 's' : ''} · {fmtCents(settleResult.per_winner_cents)} each
                · {settleResult.max_correct}/{picks.length} correct
              </p>
            </div>
          )}
          <button
            onClick={settleSlate}
            disabled={settling || picks.some((p) => !results[p.id])}
            className="rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-40 transition-colors"
          >
            {settling ? 'Settling…' : 'Settle & Distribute Pot'}
          </button>
        </div>
      )}

      {/* Slips */}
      {slips.length > 0 && (
        <div className="rounded-[1.75rem] border border-white/75 bg-[rgba(255,255,255,0.76)] overflow-hidden shadow-[0_18px_40px_rgba(15,23,42,0.08)] backdrop-blur-sm">
          <div className="px-6 py-4 border-b border-[rgba(148,163,184,0.15)]">
            <h2 className="font-semibold text-slate-800">Submitted Slips ({slips.length})</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-[rgba(148,163,184,0.15)]">
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Player</th>
                  {picks.map((p) => (
                    <th key={p.id} className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500 min-w-[100px]">
                      {p.title}
                    </th>
                  ))}
                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Result</th>
                </tr>
              </thead>
              <tbody>
                {slips.map((slip) => {
                  const choiceMap = new Map(slip.choices.map((c) => [c.slate_pick_id, c.chosen_option]));
                  const correctCount = picks.filter((p) => p.correct_option && choiceMap.get(p.id) === p.correct_option).length;
                  return (
                    <tr key={slip.id} className="border-b border-[rgba(148,163,184,0.1)] last:border-0 hover:bg-[rgba(244,237,225,0.35)]">
                      <td className="px-5 py-3 font-semibold text-slate-900">{slip.player_name}</td>
                      {picks.map((p) => {
                        const choice = choiceMap.get(p.id);
                        const label = choice === 'a' ? p.option_a : choice === 'b' ? p.option_b : '—';
                        const correct = p.correct_option && choice === p.correct_option;
                        const wrong = p.correct_option && choice && choice !== p.correct_option;
                        return (
                          <td key={p.id} className="px-3 py-3 text-center text-xs">
                            <span className={
                              correct ? 'font-semibold text-emerald-700' :
                              wrong ? 'text-red-500 line-through' :
                              'text-slate-600'
                            }>
                              {label}
                            </span>
                          </td>
                        );
                      })}
                      <td className="px-5 py-3 text-right text-xs font-semibold">
                        {slate.is_settled ? (
                          <span className={slip.winnings_cents && slip.winnings_cents > 0 ? 'text-emerald-700' : 'text-slate-500'}>
                            {slip.winnings_cents != null ? fmtCents(slip.winnings_cents) : '—'}
                            {slate.is_settled && <span className="ml-1 text-slate-400">({correctCount}/{picks.length})</span>}
                          </span>
                        ) : (
                          <span className="text-slate-400">{correctCount}/{picks.filter((p) => p.correct_option).length} known</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function PickRow({
  pick,
  settled,
  result,
  onResult,
  onRemove,
}: {
  pick: SlatePick;
  settled: boolean;
  result: 'a' | 'b' | null;
  onResult: (v: 'a' | 'b') => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-6 py-4">
      <div className="flex-1 min-w-0">
        <p className="font-medium text-slate-800 truncate">{pick.title}</p>
        <p className="text-xs text-slate-500 mt-0.5">
          A: {pick.option_a} · B: {pick.option_b}
        </p>
        {pick.correct_option && (
          <p className="text-xs text-emerald-700 mt-0.5 font-semibold">
            ✓ Correct: {pick.correct_option === 'a' ? pick.option_a : pick.option_b}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {!settled && !pick.correct_option && (
          <div className="flex gap-1">
            {(['a', 'b'] as const).map((opt) => (
              <button
                key={opt}
                onClick={() => onResult(opt)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  result === opt
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {opt === 'a' ? pick.option_a : pick.option_b}
              </button>
            ))}
          </div>
        )}
        {!settled && (
          <button
            onClick={onRemove}
            className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ slate }: { slate: DailySlate }) {
  if (slate.is_settled) {
    return <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">Settled</span>;
  }
  if (slate.is_open) {
    return <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">Open</span>;
  }
  return <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">Draft</span>;
}
