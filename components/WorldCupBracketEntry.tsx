'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BracketWcMatch,
  BracketUserPick,
  BracketRoundName,
} from '@/types';
import { fetchJson } from '@/lib/fetch';
import { getUserAuthHeaders } from '@/lib/user-auth-client';

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
const SEEDED_MATCH_IDS = new Set(
  Array.from({ length: TOTAL_PICKS }, (_unused, index) =>
    `00000000-0000-0000-0000-${String(index + 1).padStart(12, '0')}`,
  ),
);
const BRACKET_GROUP_ID = process.env.NEXT_PUBLIC_BRACKET_GROUP_ID ?? '';

type PicksMap = Map<string, string>;

function lockStorageKey(groupId: string): string {
  return `bracket_lock_${groupId}`;
}

function lockButtonLabel(isLocked: boolean, allPicksDone: boolean, remaining: number): string {
  if (isLocked) return '🔒 Bracket Locked In';
  if (allPicksDone) return '🔒 Lock In Bracket';
  return `Complete all ${remaining} remaining picks to lock in`;
}

function matchSortKey(match: BracketWcMatch): number {
  const number = Number.parseInt(match.match_identifier.replace('B', ''), 10);
  return Number.isFinite(number) ? number : Number.MAX_SAFE_INTEGER;
}

function resolveTeamLabel(
  matchId: string,
  slot: 'home' | 'away',
  matches: BracketWcMatch[],
  picks: PicksMap,
): string {
  const match = matches.find((item) => item.id === matchId);
  if (!match) return 'TBD';

  const actual = slot === 'home' ? match.actual_home : match.actual_away;
  if (actual) return actual;

  const feeder = matches.find(
    (item) => item.next_match_id === matchId && item.next_match_slot === slot,
  );
  if (feeder && picks.has(feeder.id)) {
    return picks.get(feeder.id)!;
  }

  return slot === 'home' ? match.placeholder_home : match.placeholder_away;
}

function cascadeReset(
  matchId: string,
  previousWinner: string,
  nextPicks: PicksMap,
  matches: BracketWcMatch[],
): void {
  const match = matches.find((item) => item.id === matchId);
  if (!match?.next_match_id) return;

  const downstreamWinner = nextPicks.get(match.next_match_id);
  if (downstreamWinner === previousWinner) {
    nextPicks.delete(match.next_match_id);
    cascadeReset(match.next_match_id, previousWinner, nextPicks, matches);
  }
}

function MatchCard({
  match,
  homeLabel,
  awayLabel,
  pickedWinner,
  isLocked,
  disabled,
  onPick,
}: {
  match: BracketWcMatch;
  homeLabel: string;
  awayLabel: string;
  pickedWinner: string | null;
  isLocked: boolean;
  disabled: boolean;
  onPick: (matchId: string, winner: string) => void;
}) {
  const homeSelected = pickedWinner === homeLabel;
  const awaySelected = pickedWinner === awayLabel;

  function slotClasses(selected: boolean): string {
    const base =
      'flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-all text-left';
    if (selected) {
      return `${base} bg-slate-900 text-white shadow-[0_4px_12px_rgba(15,23,42,0.18)] ring-2 ring-slate-900`;
    }
    if (disabled || isLocked) {
      return `${base} cursor-default text-slate-500 bg-[rgba(248,250,252,0.6)]`;
    }
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
          disabled={disabled || isLocked}
          onClick={() => onPick(match.id, homeLabel)}
          className={slotClasses(homeSelected)}
        >
          {homeSelected && <span className="shrink-0 text-xs">✓</span>}
          <span className="truncate">{homeLabel}</span>
        </button>
        <div className="my-0.5 h-px bg-[rgba(148,163,184,0.15)]" />
        <button
          type="button"
          disabled={disabled || isLocked}
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

export default function WorldCupBracketEntry({
  groupId = BRACKET_GROUP_ID,
}: {
  groupId?: string;
}) {
  const [matches, setMatches] = useState<BracketWcMatch[]>([]);
  const [picks, setPicks] = useState<PicksMap>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState<boolean>(() => {
    if (typeof window === 'undefined' || !groupId) return false;
    return localStorage.getItem(lockStorageKey(groupId)) === 'true';
  });
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const allMatches = await fetchJson<BracketWcMatch[]>('/api/bracket/matches');
        if (!active) return;

        const filteredMatches = (Array.isArray(allMatches) ? allMatches : [])
          .filter((match) =>
            SEEDED_MATCH_IDS.has(match.id)
            && /^B([1-9]|[12][0-9]|3[01])$/.test(match.match_identifier),
          )
          .sort((left, right) => matchSortKey(left) - matchSortKey(right));

        setMatches(filteredMatches);

        if (!groupId) {
          setPicks(new Map());
          return;
        }

        const headers = await getUserAuthHeaders();
        const userPicks = await fetchJson<BracketUserPick[]>(
          `/api/bracket/picks?groupId=${encodeURIComponent(groupId)}`,
          { headers },
        );

        if (!active) return;

        const nextMap: PicksMap = new Map();
        for (const pick of Array.isArray(userPicks) ? userPicks : []) {
          nextMap.set(pick.match_id, pick.predicted_winner);
        }
        setPicks(nextMap);
      } catch (cause) {
        if (!active) return;
        setError(cause instanceof Error ? cause.message : 'Failed to load bracket.');
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [groupId]);

  const matchesById = useMemo(() => {
    const map = new Map<string, BracketWcMatch>();
    for (const match of matches) map.set(match.id, match);
    return map;
  }, [matches]);

  const matchesByRound = useMemo(() => {
    const map = new Map<BracketRoundName, BracketWcMatch[]>();
    for (const round of ROUND_ORDER) {
      map.set(
        round,
        matches
          .filter((match) => match.round_name === round)
          .sort((left, right) => matchSortKey(left) - matchSortKey(right)),
      );
    }
    return map;
  }, [matches]);

  const totalPicksMade = picks.size;
  const allPicksDone = totalPicksMade >= TOTAL_PICKS;
  const picksDisabled = !groupId;

  const handlePick = useCallback(
    async (matchId: string, winner: string) => {
      if (isLocked || saving || !groupId) {
        if (!groupId) setSaveError('Set NEXT_PUBLIC_BRACKET_GROUP_ID to save picks.');
        return;
      }

      const match = matchesById.get(matchId);
      if (!match) return;

      setSaveError(null);
      setSaving(true);

      const nextPicks = new Map(picks);
      const previousWinner = nextPicks.get(matchId) ?? null;

      if (previousWinner === winner) {
        nextPicks.delete(matchId);
        cascadeReset(matchId, winner, nextPicks, matches);
      } else {
        if (previousWinner) {
          cascadeReset(matchId, previousWinner, nextPicks, matches);
        }
        nextPicks.set(matchId, winner);
      }

      setPicks(new Map(nextPicks));

      try {
        const headers = await getUserAuthHeaders();

        if (nextPicks.has(matchId)) {
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
          await fetchJson('/api/bracket/picks', {
            method: 'DELETE',
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify({ group_id: groupId, match_id: matchId }),
          });
        }

        const deletedIds: string[] = [];
        for (const [existingMatchId] of picks) {
          if (existingMatchId !== matchId && !nextPicks.has(existingMatchId)) {
            deletedIds.push(existingMatchId);
          }
        }

        await Promise.all(
          deletedIds.map((deletedMatchId) =>
            fetchJson('/api/bracket/picks', {
              method: 'DELETE',
              headers: { ...headers, 'Content-Type': 'application/json' },
              body: JSON.stringify({ group_id: groupId, match_id: deletedMatchId }),
            }),
          ),
        );
      } catch (cause) {
        setPicks(new Map(picks));
        setSaveError(cause instanceof Error ? cause.message : 'Failed to save pick.');
      } finally {
        setSaving(false);
      }
    },
    [groupId, isLocked, matches, matchesById, picks, saving],
  );

  const handleLockIn = useCallback(() => {
    if (!allPicksDone || isLocked || !groupId) return;
    setIsLocked(true);
    localStorage.setItem(lockStorageKey(groupId), 'true');
  }, [allPicksDone, groupId, isLocked]);

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
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-serif text-xl font-semibold tracking-tight text-slate-900">
            ⚽ World Cup Knockout Bracket
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Side-scrolling 31-match knockout view sourced from bracket_wc_matches.
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

      {!groupId && (
        <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-medium text-amber-700">
          Read-only mode: set NEXT_PUBLIC_BRACKET_GROUP_ID to persist picks in bracket_user_picks.
        </div>
      )}

      {saveError && (
        <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-medium text-red-600">
          {saveError}
        </div>
      )}

      <div
        ref={scrollRef}
        tabIndex={0}
        role="region"
        aria-label="Bracket rounds — use arrow keys or swipe to navigate"
        onKeyDown={(event) => {
          const element = scrollRef.current;
          if (!element) return;
          const colWidth = element.firstElementChild?.clientWidth ?? 320;
          if (event.key === 'ArrowRight') {
            event.preventDefault();
            element.scrollBy({ left: colWidth, behavior: 'smooth' });
          } else if (event.key === 'ArrowLeft') {
            event.preventDefault();
            element.scrollBy({ left: -colWidth, behavior: 'smooth' });
          }
        }}
        className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide gap-6 px-4 py-6 outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 rounded-2xl"
      >
        {ROUND_ORDER.map((round) => {
          const roundMatches = matchesByRound.get(round) ?? [];
          const pickedInRound = roundMatches.filter((match) => picks.has(match.id)).length;
          return (
            <div
              key={round}
              className="min-w-[85vw] sm:min-w-[320px] snap-center flex flex-col gap-3 shrink-0"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-700">{ROUND_LABELS[round]}</h3>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    pickedInRound === roundMatches.length && roundMatches.length > 0
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {pickedInRound}/{roundMatches.length}
                </span>
              </div>

              {roundMatches.map((match) => {
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
                    disabled={picksDisabled}
                    onPick={handlePick}
                  />
                );
              })}
            </div>
          );
        })}
      </div>

      <div className="mt-2 flex justify-center">
        <button
          type="button"
          disabled={!allPicksDone || isLocked || picksDisabled}
          onClick={handleLockIn}
          className={`rounded-2xl px-8 py-3 text-sm font-bold transition-all ${
            allPicksDone && !isLocked && !picksDisabled
              ? 'bg-slate-900 text-white shadow-[0_6px_20px_rgba(15,23,42,0.18)] hover:bg-slate-800 active:scale-[0.98]'
              : 'cursor-not-allowed border border-[rgba(148,163,184,0.3)] bg-white/60 text-slate-400'
          }`}
        >
          {lockButtonLabel(isLocked, allPicksDone, TOTAL_PICKS - totalPicksMade)}
        </button>
      </div>
    </div>
  );
}
