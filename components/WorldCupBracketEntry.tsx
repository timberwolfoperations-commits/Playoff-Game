'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { BracketWcMatch, BracketUserPick, BracketRoundName } from '@/types';
import { fetchJson } from '@/lib/fetch';
import { getUserAuthHeaders } from '@/lib/user-auth-client';

// ── Helpers (pure) ────────────────────────────────────────────────────────────

function lockStorageKey(userId: string, groupId: string): string {
  return `bracket_lock_${userId}_${groupId}`;
}

function gridColsClass(round: BracketRoundName): string {
  const map: Record<BracketRoundName, string> = {
    Round_of_32: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
    Round_of_16: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
    Quarterfinals: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-2',
    Semifinals: 'grid-cols-1 sm:grid-cols-2',
    Final: 'grid-cols-1 max-w-sm mx-auto w-full',
  };
  return map[round];
}

function lockButtonLabel(isLocked: boolean, allPicksDone: boolean, remaining: number): string {
  if (isLocked) return '🔒 Bracket Locked In';
  if (allPicksDone) return '🔒 Lock In Bracket';
  return `Complete all ${remaining} remaining picks to lock in`;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const ROUND_ORDER: BracketRoundName[] = [
  'Round_of_32',
  'Round_of_16',
  'Quarterfinals',
  'Semifinals',
  'Final',
];

const ROUND_LABELS: Record<BracketRoundName, string> = {
  Round_of_32: 'Round of 32',
  Round_of_16: 'Round of 16',
  Quarterfinals: 'Quarterfinals',
  Semifinals: 'Semifinals',
  Final: 'Final',
};

const TOTAL_PICKS = 31;

// ── Types ─────────────────────────────────────────────────────────────────────

type PicksMap = Map<string, string>; // matchId -> predicted_winner

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Returns the displayed home/away label for a match slot given current picks. */
function resolveTeamLabel(
  matchId: string,
  slot: 'home' | 'away',
  matches: BracketWcMatch[],
  picks: PicksMap,
): string {
  const match = matches.find((m) => m.id === matchId);
  if (!match) return 'TBD';

  // If the actual team is known, use it
  const actual = slot === 'home' ? match.actual_home : match.actual_away;
  if (actual) return actual;

  // Find the match that feeds this slot
  const feeder = matches.find(
    (m) => m.next_match_id === matchId && m.next_match_slot === slot,
  );
  if (feeder && picks.has(feeder.id)) {
    return picks.get(feeder.id)!;
  }

  return slot === 'home' ? match.placeholder_home : match.placeholder_away;
}

/**
 * Cascade-reset downstream picks that were derived from `oldWinner` in `matchId`.
 * Mutates the provided `draft` map.
 */
function cascadeReset(
  matchId: string,
  oldWinner: string,
  draft: PicksMap,
  matches: BracketWcMatch[],
): void {
  const match = matches.find((m) => m.id === matchId);
  if (!match?.next_match_id) return;

  const nextPick = draft.get(match.next_match_id);
  if (nextPick === oldWinner) {
    draft.delete(match.next_match_id);
    cascadeReset(match.next_match_id, oldWinner, draft, matches);
  }
}

// ── Subcomponents ─────────────────────────────────────────────────────────────

function MatchCard({
  match,
  homeLabel,
  awayLabel,
  pickedWinner,
  isLocked,
  onPick,
}: {
  match: BracketWcMatch;
  homeLabel: string;
  awayLabel: string;
  pickedWinner: string | null;
  isLocked: boolean;
  onPick: (matchId: string, winner: string) => void;
}) {
  const homeSelected = pickedWinner === homeLabel;
  const awaySelected = pickedWinner === awayLabel;

  function slotClasses(selected: boolean): string {
    const base =
      'flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-all text-left disabled:cursor-default';
    if (selected)
      return `${base} bg-slate-900 text-white shadow-[0_4px_12px_rgba(15,23,42,0.18)] ring-2 ring-slate-900`;
    if (isLocked)
      return `${base} cursor-default text-slate-500 bg-[rgba(248,250,252,0.6)]`;
    return `${base} cursor-pointer text-slate-700 bg-[rgba(248,250,252,0.6)] hover:bg-[#f4ede1] hover:text-slate-900 active:scale-[0.98]`;
  }

  return (
    <div className="rounded-2xl border border-[rgba(148,163,184,0.22)] bg-[rgba(255,255,255,0.72)] p-2 shadow-sm backdrop-blur-sm">
      <p className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
        {match.match_identifier}
      </p>
      <div className="flex flex-col gap-1">
        <button
          type="button"
          disabled={isLocked}
          onClick={() => onPick(match.id, homeLabel)}
          className={slotClasses(homeSelected)}
        >
          {homeSelected && <span className="shrink-0 text-xs">✓</span>}
          <span className="truncate">{homeLabel}</span>
        </button>
        <div className="my-0.5 h-px bg-[rgba(148,163,184,0.15)]" />
        <button
          type="button"
          disabled={isLocked}
          onClick={() => onPick(match.id, awayLabel)}
          className={slotClasses(awaySelected)}
        >
          {awaySelected && <span className="shrink-0 text-xs">✓</span>}
          <span className="truncate">{awayLabel}</span>
        </button>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function WorldCupBracketEntry({
  userId,
  groupId,
}: {
  userId: string;
  groupId: string;
}) {
  const [matches, setMatches] = useState<BracketWcMatch[]>([]);
  const [picks, setPicks] = useState<PicksMap>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(lockStorageKey(userId, groupId)) === 'true';
  });
  const [activeRound, setActiveRound] = useState<BracketRoundName>('Round_of_32');

  // Load matches and existing picks
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const headers = await getUserAuthHeaders();
        const [allMatches, userPicks] = await Promise.all([
          fetchJson<BracketWcMatch[]>('/api/bracket/matches'),
          fetchJson<BracketUserPick[]>(
            `/api/bracket/picks?groupId=${encodeURIComponent(groupId)}`,
            { headers },
          ),
        ]);
        if (!active) return;
        setMatches(Array.isArray(allMatches) ? allMatches : []);
        const map: PicksMap = new Map();
        for (const p of Array.isArray(userPicks) ? userPicks : []) {
          map.set(p.match_id, p.predicted_winner);
        }
        setPicks(map);
      } catch (e) {
        if (!active) return;
        setError(e instanceof Error ? e.message : 'Failed to load bracket.');
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, [groupId]);

  const matchesById = useMemo(() => {
    const m = new Map<string, BracketWcMatch>();
    for (const match of matches) m.set(match.id, match);
    return m;
  }, [matches]);

  const matchesByRound = useMemo(() => {
    const map = new Map<BracketRoundName, BracketWcMatch[]>();
    for (const round of ROUND_ORDER) {
      map.set(
        round,
        matches
          .filter((m) => m.round_name === round)
          .sort((a, b) => a.match_identifier.localeCompare(b.match_identifier)),
      );
    }
    return map;
  }, [matches]);

  const totalPicksMade = picks.size;
  const allPicksDone = totalPicksMade >= TOTAL_PICKS;

  const handlePick = useCallback(
    async (matchId: string, winner: string) => {
      if (isLocked || saving) return;

      const match = matchesById.get(matchId);
      if (!match) return;

      setSaveError(null);
      setSaving(true);

      // Build new picks map
      const draft = new Map(picks);
      const oldWinner = draft.get(matchId) ?? null;

      if (oldWinner === winner) {
        // Deselect: remove this pick and cascade
        draft.delete(matchId);
        cascadeReset(matchId, winner, draft, matches);
      } else {
        // Set new pick; cascade-reset downstream derived from old winner
        if (oldWinner) {
          cascadeReset(matchId, oldWinner, draft, matches);
        }
        draft.set(matchId, winner);
        // Also cascade-reset downstream if they depended on the old winner
        // (already handled above via oldWinner cascade)
      }

      // Optimistic update
      setPicks(new Map(draft));

      try {
        const headers = await getUserAuthHeaders();

        if (draft.has(matchId)) {
          // Upsert the pick
          await fetchJson('/api/bracket/picks', {
            method: 'POST',
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              group_id: groupId,
              match_id: matchId,
              predicted_winner: winner,
            }),
          });
        } else {
          // Delete the pick
          await fetchJson('/api/bracket/picks', {
            method: 'DELETE',
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify({ group_id: groupId, match_id: matchId }),
          });
        }

        // Persist cascade-deleted picks
        const deletedIds: string[] = [];
        for (const [mid] of picks) {
          if (mid !== matchId && !draft.has(mid)) deletedIds.push(mid);
        }
        await Promise.all(
          deletedIds.map((mid) =>
            fetchJson('/api/bracket/picks', {
              method: 'DELETE',
              headers: { ...headers, 'Content-Type': 'application/json' },
              body: JSON.stringify({ group_id: groupId, match_id: mid }),
            }),
          ),
        );
      } catch (e) {
        // Revert optimistic update on failure
        setPicks(new Map(picks));
        setSaveError(e instanceof Error ? e.message : 'Failed to save pick.');
      } finally {
        setSaving(false);
      }
    },
    [groupId, isLocked, matches, matchesById, picks, saving],
  );

  const handleLockIn = useCallback(() => {
    if (!allPicksDone || isLocked) return;
    setIsLocked(true);
    localStorage.setItem(lockStorageKey(userId, groupId), 'true');
  }, [allPicksDone, groupId, isLocked, userId]);

  if (loading) {
    return (
      <div className="rounded-[1.75rem] border border-white/70 bg-[rgba(255,255,255,0.7)] py-20 text-center text-slate-400">
        Loading bracket…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-[1.75rem] border border-red-200 bg-[rgba(255,255,255,0.78)] py-16 text-center">
        <p className="font-semibold text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="rounded-[1.75rem] border border-white/75 bg-[rgba(255,255,255,0.76)] p-5 shadow-[0_18px_40px_rgba(15,23,42,0.08)] backdrop-blur-sm">
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-serif text-xl font-semibold tracking-tight text-slate-900">
            ⚽ World Cup Bracket Entry
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Tap a team to advance them. Your picks auto-save.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full border border-[#dbc7a4] bg-white/80 px-3 py-1 text-xs font-semibold text-[#7c5b1f]">
            {totalPicksMade} / {TOTAL_PICKS} picks
          </span>
          {isLocked && (
            <span className="rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              🔒 Locked In
            </span>
          )}
        </div>
      </div>

      {saveError && (
        <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-medium text-red-600">
          {saveError}
        </div>
      )}

      {/* Round tabs */}
      <div className="mb-5 overflow-x-auto">
        <div className="flex min-w-max gap-1 rounded-2xl border border-white/75 bg-[rgba(248,250,252,0.72)] p-1.5 shadow-[0_4px_12px_rgba(15,23,42,0.05)]">
          {ROUND_ORDER.map((round) => {
            const roundMatches = matchesByRound.get(round) ?? [];
            const pickedInRound = roundMatches.filter((m) => picks.has(m.id)).length;
            const isActive = activeRound === round;
            return (
              <button
                key={round}
                type="button"
                onClick={() => setActiveRound(round)}
                className={`flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-[0_4px_12px_rgba(15,23,42,0.15)]'
                    : 'text-slate-600 hover:bg-[#f4ede1] hover:text-slate-900'
                }`}
              >
                {ROUND_LABELS[round]}
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : pickedInRound === roundMatches.length
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {pickedInRound}/{roundMatches.length}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Match cards for active round */}
      <div className={`grid gap-3 ${gridColsClass(activeRound)}`}>
        {(matchesByRound.get(activeRound) ?? []).map((match) => {
          const homeLabel = resolveTeamLabel(match.id, 'home', matches, picks);
          const awayLabel = resolveTeamLabel(match.id, 'away', matches, picks);
          return (
            <MatchCard
              key={match.id}
              match={match}
              homeLabel={homeLabel}
              awayLabel={awayLabel}
              pickedWinner={picks.get(match.id) ?? null}
              isLocked={isLocked}
              onPick={handlePick}
            />
          );
        })}
      </div>

      {/* Round navigation helpers */}
      <div className="mt-4 flex items-center justify-between gap-2">
        <button
          type="button"
          disabled={activeRound === ROUND_ORDER[0]}
          onClick={() => {
            const idx = ROUND_ORDER.indexOf(activeRound);
            if (idx > 0) setActiveRound(ROUND_ORDER[idx - 1]);
          }}
          className="rounded-xl border border-[rgba(148,163,184,0.3)] bg-white/80 px-4 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-[#f4ede1] disabled:cursor-not-allowed disabled:opacity-40"
        >
          ← Previous Round
        </button>
        {activeRound !== 'Final' ? (
          <button
            type="button"
            onClick={() => {
              const idx = ROUND_ORDER.indexOf(activeRound);
              if (idx < ROUND_ORDER.length - 1) setActiveRound(ROUND_ORDER[idx + 1]);
            }}
            className="rounded-xl border border-[rgba(148,163,184,0.3)] bg-white/80 px-4 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-[#f4ede1]"
          >
            Next Round →
          </button>
        ) : (
          <button
            type="button"
            disabled={!allPicksDone || isLocked}
            onClick={handleLockIn}
            className={`rounded-xl px-6 py-2 text-sm font-bold transition-all ${
              allPicksDone && !isLocked
                ? 'bg-slate-900 text-white shadow-[0_6px_16px_rgba(15,23,42,0.18)] hover:bg-slate-800 active:scale-[0.98]'
                : 'cursor-not-allowed border border-[rgba(148,163,184,0.3)] bg-white/60 text-slate-400'
            }`}
          >
            {lockButtonLabel(isLocked, allPicksDone, TOTAL_PICKS - totalPicksMade)}
          </button>
        )}
      </div>

      {/* Lock In button always visible at bottom */}
      {activeRound !== 'Final' && (
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            disabled={!allPicksDone || isLocked}
            onClick={handleLockIn}
            className={`rounded-2xl px-8 py-3 text-sm font-bold transition-all ${
              allPicksDone && !isLocked
                ? 'bg-slate-900 text-white shadow-[0_6px_20px_rgba(15,23,42,0.18)] hover:bg-slate-800 active:scale-[0.98]'
                : 'cursor-not-allowed border border-[rgba(148,163,184,0.3)] bg-white/60 text-slate-400'
            }`}
          >
          {lockButtonLabel(isLocked, allPicksDone, TOTAL_PICKS - totalPicksMade)}
          </button>
        </div>
      )}
    </div>
  );
}
