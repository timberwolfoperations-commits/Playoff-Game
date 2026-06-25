'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchJson } from '@/lib/fetch';
import { getUserAuthHeaders } from '@/lib/user-auth-client';

const LOCK_CUTOFF = new Date('2026-06-28T00:00:00.000Z');

type MatchSlot = 'home' | 'away';

interface BracketMatch {
  id: string;
  round_name?: string | null;
  round_label?: string | null;
  round_number?: number | null;
  match_identifier?: string | null;
  placeholder_home?: string | null;
  placeholder_away?: string | null;
  actual_home?: string | null;
  actual_away?: string | null;
  winning_team?: string | null;
  next_match_id?: string | null;
  next_match_slot?: MatchSlot | null;
}

function resolveRoundName(match: BracketMatch) {
  if (match.round_label) return match.round_label;
  if (match.round_name) return match.round_name;
  if (typeof match.round_number === 'number') return `Round ${match.round_number}`;
  return 'Round';
}

function resolveTeamLabel(match: BracketMatch, slot: MatchSlot) {
  if (slot === 'home') {
    return match.actual_home ?? match.placeholder_home ?? 'Pick home team';
  }
  return match.actual_away ?? match.placeholder_away ?? 'Pick away team';
}

function applyOptimisticPick(matches: BracketMatch[], matchId: string, slot: MatchSlot): BracketMatch[] {
  const selectedMatch = matches.find((m) => m.id === matchId);
  if (!selectedMatch) return matches;

  const winner = resolveTeamLabel(selectedMatch, slot);

  const updated = matches.map((m) => ({ ...m }));
  const current = updated.find((m) => m.id === matchId);
  if (!current) return matches;
  current.winning_team = winner;

  if (current.next_match_id && current.next_match_slot) {
    const target = updated.find((m) => m.id === current.next_match_id);
    if (target) {
      if (current.next_match_slot === 'home') {
        target.actual_home = winner;
      } else {
        target.actual_away = winner;
      }
    }
  }

  return updated;
}

export default function BracketEngine({ bracketSlug }: { bracketSlug: string }) {
  const [matches, setMatches] = useState<BracketMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingMatchId, setSavingMatchId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [locking, setLocking] = useState(false);

  const isPastCutoff = useMemo(() => new Date() >= LOCK_CUTOFF, []);

  const loadMatches = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const headers = await getUserAuthHeaders();
      const data = await fetchJson<BracketMatch[]>(
        `/api/bracket/${encodeURIComponent(bracketSlug)}/matches`,
        { headers },
      );
      setMatches(Array.isArray(data) ? data : []);
    } catch (fetchError: unknown) {
      setMatches([]);
      setError(fetchError instanceof Error ? fetchError.message : 'Failed to load bracket matches');
    } finally {
      setLoading(false);
    }
  }, [bracketSlug]);

  const loadLockState = useCallback(async () => {
    try {
      const headers = await getUserAuthHeaders();
      if (!headers.Authorization) return;
      const data = await fetchJson<{ is_locked: boolean }>(
        `/api/bracket/${encodeURIComponent(bracketSlug)}/lock`,
        { headers },
      );
      setIsLocked(Boolean(data?.is_locked));
    } catch {
      // Non-fatal; treat as unlocked
    }
  }, [bracketSlug]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional async loaders
    void loadMatches();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional async loaders
    void loadLockState();
  }, [loadMatches, loadLockState]);

  const rounds = useMemo(() => {
    const grouped: Array<{ name: string; matches: BracketMatch[] }> = [];
    const indexByName = new Map<string, number>();

    for (const match of matches) {
      const name = resolveRoundName(match);
      const existingIndex = indexByName.get(name);
      if (existingIndex === undefined) {
        indexByName.set(name, grouped.length);
        grouped.push({ name, matches: [match] });
      } else {
        grouped[existingIndex].matches.push(match);
      }
    }

    return grouped;
  }, [matches]);

  const submitPick = useCallback(
    async (matchId: string, predictedWinner: string) => {
      const headers = await getUserAuthHeaders();
      await fetchJson(`/api/bracket/${encodeURIComponent(bracketSlug)}/matches`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify({ match_id: matchId, predicted_winner: predictedWinner }),
      });
    },
    [bracketSlug],
  );

  const onPick = useCallback(
    (matchId: string, slot: MatchSlot) => {
      const run = async () => {
        const selected = matches.find((m) => m.id === matchId);
        if (!selected) return;

        const predictedWinner = resolveTeamLabel(selected, slot);
        const previous = matches;

        setError(null);
        setSavingMatchId(matchId);
        setMatches((current) => applyOptimisticPick(current, matchId, slot));

        try {
          await submitPick(matchId, predictedWinner);
        } catch (saveError: unknown) {
          setMatches(previous);
          setError(saveError instanceof Error ? saveError.message : 'Failed to save pick');
        } finally {
          setSavingMatchId(null);
        }
      };

      void run();
    },
    [matches, submitPick],
  );

  const handleLockIn = useCallback(async () => {
    setLocking(true);
    try {
      const headers = await getUserAuthHeaders();
      await fetchJson(`/api/bracket/${encodeURIComponent(bracketSlug)}/lock`, {
        method: 'POST',
        headers,
      });
      setIsLocked(true);
    } catch (lockError: unknown) {
      setError(lockError instanceof Error ? lockError.message : 'Failed to lock picks');
    } finally {
      setLocking(false);
    }
  }, [bracketSlug]);

  if (loading) {
    return (
      <div className="w-full rounded-[1.75rem] border border-white/75 bg-[rgba(255,255,255,0.76)] px-6 py-10 text-center text-slate-400 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
        Loading bracket…
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full rounded-[1.75rem] border border-rose-200 bg-rose-50 px-6 py-5 text-sm text-rose-700">
        {error}
      </div>
    );
  }

  const effectiveLocked = isLocked || isPastCutoff;

  if (effectiveLocked) {
    return (
      <section className="w-full space-y-4">
        <div className="rounded-[1.75rem] border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800 shadow-[0_10px_20px_rgba(15,23,42,0.06)]">
          {isPastCutoff
            ? '🔒 The tournament has started — your bracket is locked. Here is your read-out:'
            : '🔒 Your bracket is locked in. Here is your read-out:'}
        </div>

        <div className="overflow-x-auto snap-x snap-mandatory">
          <div className="flex min-w-max gap-4 pb-2">
            {rounds.map((round) => (
              <div
                key={round.name}
                className="w-[280px] shrink-0 snap-start rounded-[1.5rem] border border-white/75 bg-[rgba(255,255,255,0.76)] p-4 shadow-[0_14px_30px_rgba(15,23,42,0.08)]"
              >
                <h2 className="mb-3 text-center text-sm font-semibold tracking-wide text-slate-700">
                  {round.name}
                </h2>
                <div className="space-y-3">
                  {round.matches.map((match) => {
                    const homeLabel = resolveTeamLabel(match, 'home');
                    const awayLabel = resolveTeamLabel(match, 'away');

                    return (
                      <article key={match.id} className="rounded-xl border border-slate-200/80 bg-white/90 p-3">
                        <p className="mb-2 text-xs text-slate-500">
                          {match.match_identifier ?? 'Match'}
                        </p>
                        <div className="space-y-2">
                          <div
                            className={`w-full rounded-lg border px-3 py-2 text-left text-sm ${
                              match.winning_team === homeLabel
                                ? 'border-amber-300 bg-amber-100 font-semibold text-amber-900'
                                : 'border-slate-200 bg-slate-50 text-slate-500'
                            }`}
                          >
                            {homeLabel}
                            {match.winning_team === homeLabel ? ' ✓' : ''}
                          </div>
                          <div
                            className={`w-full rounded-lg border px-3 py-2 text-left text-sm ${
                              match.winning_team === awayLabel
                                ? 'border-amber-300 bg-amber-100 font-semibold text-amber-900'
                                : 'border-slate-200 bg-slate-50 text-slate-500'
                            }`}
                          >
                            {awayLabel}
                            {match.winning_team === awayLabel ? ' ✓' : ''}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="w-full space-y-4">
      <div className="overflow-x-auto snap-x snap-mandatory">
        <div className="flex min-w-max gap-4 pb-2">
          {rounds.map((round) => (
            <div
              key={round.name}
              className="w-[280px] shrink-0 snap-start rounded-[1.5rem] border border-white/75 bg-[rgba(255,255,255,0.76)] p-4 shadow-[0_14px_30px_rgba(15,23,42,0.08)]"
            >
              <h2 className="mb-3 text-center text-sm font-semibold tracking-wide text-slate-700">
                {round.name}
              </h2>
              <div className="space-y-3">
                {round.matches.map((match) => {
                  const homeLabel = resolveTeamLabel(match, 'home');
                  const awayLabel = resolveTeamLabel(match, 'away');
                  const isSaving = savingMatchId === match.id;

                  return (
                    <article key={match.id} className="rounded-xl border border-slate-200/80 bg-white/90 p-3">
                      <p className="mb-2 text-xs text-slate-500">
                        {match.match_identifier ?? 'Match'}
                      </p>
                      <div className="space-y-2">
                        <button
                          type="button"
                          onClick={() => onPick(match.id, 'home')}
                          className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition ${
                            match.winning_team === homeLabel
                              ? 'border-amber-300 bg-amber-100 text-amber-900'
                              : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          {homeLabel}
                        </button>
                        <button
                          type="button"
                          onClick={() => onPick(match.id, 'away')}
                          className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition ${
                            match.winning_team === awayLabel
                              ? 'border-amber-300 bg-amber-100 text-amber-900'
                              : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          {awayLabel}
                        </button>
                      </div>
                      {isSaving ? (
                        <p className="mt-2 text-xs text-slate-400">Saving…</p>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-center pt-2">
        <button
          type="button"
          onClick={() => void handleLockIn()}
          disabled={locking}
          className="rounded-2xl bg-slate-900 px-8 py-3 text-sm font-bold text-white shadow-[0_10px_24px_rgba(15,23,42,0.18)] transition-all hover:bg-slate-700 disabled:opacity-50"
        >
          {locking ? 'Locking…' : '🔒 Lock In Selections'}
        </button>
      </div>
    </section>
  );
}
