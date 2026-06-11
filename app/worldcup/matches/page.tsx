'use client';

import { useEffect, useState } from 'react';
import { WcMatch, WcPick } from '@/types';
import { STAGE_LABELS, STAGE_ORDER } from '@/lib/wc-scoring';
import { fetchJson } from '@/lib/fetch';

function formatMatchTime(playedAt: string | null): string {
  if (!playedAt) return '—';
  const d = new Date(playedAt);
  return d.toLocaleString('en-US', {
    month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
}

export default function WcMatchesPage() {
  const [matches, setMatches] = useState<WcMatch[]>([]);
  const [picks, setPicks] = useState<WcPick[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stageFilter, setStageFilter] = useState<string>('all');

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
        setError(e instanceof Error ? e.message : 'Failed to load matches.');
        setLoading(false);
      });
  }, []);

  const ownedTeamIds = new Set(picks.map((p) => p.team_id));

  const stages = ['all', ...STAGE_ORDER.filter((s) => matches.some((m) => m.stage === s))];
  const filtered = stageFilter === 'all' ? matches : matches.filter((m) => m.stage === stageFilter);

  // Group by stage label
  const grouped = new Map<string, WcMatch[]>();
  for (const match of filtered) {
    const key = match.stage === 'group'
      ? `Group Stage${match.group_letter ? ` · Group ${match.group_letter}` : ''}`
      : STAGE_LABELS[match.stage] ?? match.stage;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(match);
  }

  return (
    <div className="space-y-4">
      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2">
        {stages.map((s) => (
          <button
            key={s}
            onClick={() => setStageFilter(s)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-all ${
              stageFilter === s
                ? 'bg-slate-900 text-white shadow-[0_4px_12px_rgba(15,23,42,0.18)]'
                : 'border border-slate-200 bg-white/80 text-slate-600 hover:bg-[#f4ede1]'
            }`}
          >
            {s === 'all' ? 'All Stages' : STAGE_LABELS[s as keyof typeof STAGE_LABELS] ?? s}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="rounded-[1.75rem] border border-white/70 bg-[rgba(255,255,255,0.7)] py-16 text-center text-slate-400">
          Loading matches…
        </div>
      ) : error ? (
        <div className="rounded-[1.75rem] border border-red-200 bg-white/80 py-12 text-center">
          <p className="font-semibold text-red-600">{error}</p>
        </div>
      ) : matches.length === 0 ? (
        <div className="rounded-[1.75rem] border border-white/75 bg-[rgba(255,255,255,0.76)] py-16 text-center shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
          <p className="font-semibold text-slate-700">No matches entered yet.</p>
          <p className="mt-1 text-sm text-slate-400">Check back once the tournament begins.</p>
        </div>
      ) : (
        Array.from(grouped.entries()).map(([sectionLabel, sectionMatches]) => (
          <div
            key={sectionLabel}
            className="rounded-[1.75rem] border border-white/75 bg-[rgba(255,255,255,0.76)] shadow-[0_18px_40px_rgba(15,23,42,0.08)] backdrop-blur-sm"
          >
            <div className="border-b border-[rgba(148,163,184,0.15)] px-6 py-3">
              <h3 className="font-semibold text-slate-800">{sectionLabel}</h3>
            </div>
            <div className="divide-y divide-[rgba(148,163,184,0.1)]">
              {sectionMatches.map((match) => {
                const homeOwned = match.home_team_id ? ownedTeamIds.has(match.home_team_id) : false;
                const awayOwned = match.away_team_id ? ownedTeamIds.has(match.away_team_id) : false;
                const homeWon = match.is_complete && match.winner_team_id === match.home_team_id;
                const awayWon = match.is_complete && match.winner_team_id === match.away_team_id;

                return (
                  <div key={match.id} className="flex items-center gap-3 px-6 py-3">
                    <div className="min-w-0 flex-1 text-right">
                      <span
                        className={`text-sm font-semibold ${
                          homeOwned ? 'text-[#a45f14]' : homeWon ? 'text-slate-900' : 'text-slate-500'
                        }`}
                      >
                        {match.home_team?.name ?? 'TBD'}
                      </span>
                    </div>
                    <div className="shrink-0 text-center">
                      {match.is_complete ? (
                        <span className="font-bold text-slate-900 tabular-nums">
                          {match.home_score} – {match.away_score}
                        </span>
                      ) : (
                        <div className="text-center">
                          <span className="text-xs font-bold text-slate-400">vs</span>
                          {match.played_at && (
                            <p className="text-[10px] text-slate-400 mt-0.5">{formatMatchTime(match.played_at)}</p>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span
                        className={`text-sm font-semibold ${
                          awayOwned ? 'text-[#a45f14]' : awayWon ? 'text-slate-900' : 'text-slate-500'
                        }`}
                      >
                        {match.away_team?.name ?? 'TBD'}
                      </span>
                    </div>
                    {match.venue && (
                      <div className="hidden shrink-0 text-right sm:block">
                        <span className="text-xs text-slate-400">{match.venue}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
