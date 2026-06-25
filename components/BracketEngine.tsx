'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchJson } from '@/lib/fetch';
import { getUserAuthHeaders } from '@/lib/user-auth-client';

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

  const loadMatches = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchJson<BracketMatch[]>(`/api/bracket/${encodeURIComponent(bracketSlug)}/matches`);
      setMatches(Array.isArray(data) ? data : []);
    } catch (fetchError: unknown) {
      setMatches([]);
      setError(fetchError instanceof Error ? fetchError.message : 'Failed to load bracket matches');
    } finally {
      setLoading(false);
    }
  }, [bracketSlug]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Legitimate API data fetch for initial bracket load.
    void loadMatches();
  }, [loadMatches]);

  const rounds = useMemo(() => {
    const grouped: Array<{ name: string; matches: BracketMatch[] }> = [];
    const indexByName = new Map<string, number>();

    for (const match of matches) {
      const name = resolveRoundName(match);
      const existingIndex = indexByName.get(name);
      if (existingIndex == null) {
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
    async (matchId: string, slot: MatchSlot) => {
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
    },
    [matches, submitPick],
  );

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
                          onClick={() => void onPick(match.id, 'home')}
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
                          onClick={() => void onPick(match.id, 'away')}
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
    </section>
  );
}
