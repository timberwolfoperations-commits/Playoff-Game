'use client';

import { useEffect, useState } from 'react';
import { WcMatch, WcPick } from '@/types';
import { fetchJson } from '@/lib/fetch';

const STAGE_ORDER = ['r32', 'r16', 'qf', 'sf', 'final'] as const;
const STAGE_LABELS: Record<string, string> = {
  r32: 'Round of 32',
  r16: 'Round of 16',
  qf: 'Quarter Finals',
  sf: 'Semi Finals',
  final: 'Final',
};

function MatchSlot({
  match,
  ownedTeamIds,
}: {
  match?: WcMatch;
  ownedTeamIds: Set<string>;
}) {
  const homeName = match?.home_team?.name ?? 'TBD';
  const awayName = match?.away_team?.name ?? 'TBD';
  const homeWon = match?.is_complete && match.winner_team_id === match.home_team_id;
  const awayWon = match?.is_complete && match.winner_team_id === match.away_team_id;
  const homeOwned = match?.home_team_id ? ownedTeamIds.has(match.home_team_id) : false;
  const awayOwned = match?.away_team_id ? ownedTeamIds.has(match.away_team_id) : false;

  return (
    <div className="rounded-xl border border-[rgba(148,163,184,0.25)] bg-[rgba(255,255,255,0.65)] shadow-sm text-xs">
      <div
        className={`flex items-center justify-between gap-2 rounded-t-xl px-3 py-1.5 ${
          homeWon ? 'font-bold text-slate-900' : 'text-slate-500'
        } ${homeOwned ? 'text-[#a45f14]' : ''}`}
      >
        <span className="truncate">{homeName}</span>
        {match?.home_score !== null && match?.home_score !== undefined && (
          <span className="shrink-0 font-bold">{match.home_score}</span>
        )}
      </div>
      <div className="h-px bg-[rgba(148,163,184,0.18)]" />
      <div
        className={`flex items-center justify-between gap-2 rounded-b-xl px-3 py-1.5 ${
          awayWon ? 'font-bold text-slate-900' : 'text-slate-500'
        } ${awayOwned ? 'text-[#a45f14]' : ''}`}
      >
        <span className="truncate">{awayName}</span>
        {match?.away_score !== null && match?.away_score !== undefined && (
          <span className="shrink-0 font-bold">{match.away_score}</span>
        )}
      </div>
    </div>
  );
}

export default function WcBracketPage() {
  const [matches, setMatches] = useState<WcMatch[]>([]);
  const [picks, setPicks] = useState<WcPick[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetchJson<WcMatch[]>('/api/worldcup/matches'),
      fetchJson<WcPick[]>('/api/worldcup/picks'),
    ])
      .then(([m, p]) => {
        setMatches(Array.isArray(m) ? m : []);
        setPicks(Array.isArray(p) ? p : []);
        setLoading(false);
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : 'Failed to load bracket.');
        setLoading(false);
      });
  }, []);

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

  const ownedTeamIds = new Set(picks.map((p) => p.team_id));
  const knockoutMatches = matches.filter((m) => m.stage !== 'group');
  const byStage = new Map<string, WcMatch[]>();
  for (const stage of STAGE_ORDER) {
    byStage.set(
      stage,
      knockoutMatches
        .filter((m) => m.stage === stage)
        .sort((a, b) => (a.match_number ?? 0) - (b.match_number ?? 0))
    );
  }

  // Expected match counts per stage
  const expectedCounts: Record<string, number> = {
    r32: 16, r16: 8, qf: 4, sf: 2, final: 1,
  };

  return (
    <div className="rounded-[1.75rem] border border-white/75 bg-[rgba(255,255,255,0.76)] p-5 shadow-[0_18px_40px_rgba(15,23,42,0.08)] backdrop-blur-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-serif text-xl font-semibold tracking-tight text-slate-900">🎯 Knockout Bracket</h2>
        <p className="text-xs text-slate-400">Teams you drafted shown in orange</p>
      </div>

      {knockoutMatches.length === 0 ? (
        <div className="py-16 text-center text-slate-400">
          <p className="font-semibold">Knockout bracket not yet available.</p>
          <p className="mt-1 text-sm">Check back after the group stage concludes.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div className="flex min-w-[900px] gap-4">
            {STAGE_ORDER.map((stage) => {
              const stageMatches = byStage.get(stage) ?? [];
              const count = expectedCounts[stage];
              // Pad with undefined slots up to expected count
              const slots: (WcMatch | undefined)[] = Array.from(
                { length: Math.max(count, stageMatches.length) },
                (_, i) => stageMatches[i]
              );

              return (
                <div key={stage} className="flex flex-1 flex-col gap-2">
                  <p className="text-center text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1">
                    {STAGE_LABELS[stage]}
                  </p>
                  <div
                    className="flex flex-col justify-around"
                    style={{ gap: `${Math.max(8, 32 / (slots.length || 1))}px` }}
                  >
                    {slots.map((match, i) => (
                      <MatchSlot
                        key={match?.id ?? `${stage}-${i}`}
                        match={match}
                        ownedTeamIds={ownedTeamIds}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
