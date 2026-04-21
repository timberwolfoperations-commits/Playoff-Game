'use client';

import { useEffect, useState } from 'react';
import { PlayerScore } from '@/types';
import { fetchJson } from '@/lib/fetch';
import { getTeamTier, getRoundName } from '@/lib/scoring';

export default function PlayersPage() {
  const [scores, setScores] = useState<PlayerScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [expandedPlayer, setExpandedPlayer] = useState<string | null>(null);

  useEffect(() => {
    fetchJson<PlayerScore[]>('/api/scores')
      .then((data) => {
        setScores(Array.isArray(data) ? data : []);
        setLoadError(null);
        setLoading(false);
      })
      .catch((error: unknown) => {
        setLoadError(error instanceof Error ? error.message : 'Unable to load scores.');
        setLoading(false);
      });
  }, []);

  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div className="w-full">
      <div className="mb-8">
        <h1 className="font-serif text-3xl tracking-tight text-slate-950">Players</h1>
        <p className="mt-1 text-sm text-slate-500">Full scoring breakdown for each player.</p>
      </div>

      {loading ? (
        <div className="rounded-[1.75rem] border border-white/70 bg-[rgba(255,255,255,0.7)] py-20 text-center text-slate-400 shadow-[0_20px_45px_rgba(15,23,42,0.06)]">
          Loading scores…
        </div>
      ) : loadError ? (
        <div className="rounded-[1.75rem] border border-red-200 bg-[rgba(255,255,255,0.78)] py-20 text-center shadow-[0_20px_45px_rgba(15,23,42,0.06)]">
          <p className="text-lg font-semibold text-red-700">Scores are unavailable.</p>
          <p className="mt-2 text-slate-500">{loadError}</p>
        </div>
      ) : scores.length === 0 ? (
        <div className="rounded-[1.75rem] border border-white/70 bg-[rgba(255,255,255,0.72)] py-20 text-center shadow-[0_20px_45px_rgba(15,23,42,0.06)]">
          <p className="text-lg font-semibold text-slate-700">No scores yet.</p>
          <p className="mt-2 text-slate-500">
            Results will appear here once the first series and game outcomes are entered.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {scores.map((ps, idx) => (
            <div
              key={ps.player.id}
              className="overflow-hidden rounded-[1.6rem] border border-white/75 bg-[rgba(255,255,255,0.76)] shadow-[0_18px_40px_rgba(15,23,42,0.08)] backdrop-blur-sm"
            >
              <button
                onClick={() =>
                  setExpandedPlayer(expandedPlayer === ps.player.id ? null : ps.player.id)
                }
                className="flex w-full items-center justify-between p-5 transition-colors hover:bg-[rgba(244,237,225,0.55)] sm:p-6"
              >
                <div className="flex items-center gap-4 sm:gap-5">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-xl text-white shadow-[0_10px_24px_rgba(15,23,42,0.18)]">
                    {medals[idx] ?? `#${idx + 1}`}
                  </span>
                  <div className="text-left">
                    <p className="text-lg font-bold text-slate-950">{ps.player.name}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {ps.teams.map((t) => (
                        <span
                          key={t.id}
                          className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold shadow-[inset_0_0_0_1px_rgba(255,255,255,0.4)] ${
                            t.league === 'NBA'
                              ? 'bg-[#fff1de] text-[#a45f14]'
                              : 'bg-[#e5f1fb] text-[#215a86]'
                          }`}
                        >
                          {t.league === 'NBA' ? '🏀' : '🏒'} {t.name}
                          <span className="opacity-60">
                            (#{t.seed}
                            {t.is_wildcard ? ' WC' : ''} Tier {getTeamTier(t)})
                          </span>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-3xl font-bold text-[#264653]">
                    {ps.total_points}
                  </span>
                  <span className="ml-1 text-sm text-slate-400">pts</span>
                  <p className="mt-0.5 text-xs text-slate-500">
                    max <span className="font-semibold">{ps.max_possible_points}</span>
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {expandedPlayer === ps.player.id ? '▲ hide' : '▼ details'}
                  </p>
                </div>
              </button>

              {expandedPlayer === ps.player.id && (
                <div className="border-t border-[rgba(148,163,184,0.15)] bg-[rgba(248,244,236,0.58)] px-5 py-4 sm:px-6">
                  {ps.breakdown.length === 0 ? (
                    <p className="text-sm text-slate-400">No scoring activity yet.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[760px] text-sm">
                        <thead>
                          <tr className="text-xs uppercase text-slate-500">
                            <th className="text-left py-1">Series</th>
                            <th className="text-right py-1">Series Win</th>
                            <th className="text-right py-1">Game Wins</th>
                            <th className="text-right py-1">Champ Bonus</th>
                            <th className="text-right py-1">Efficiency</th>
                            <th className="text-right py-1">Sweep</th>
                            <th className="text-right py-1 font-bold text-gray-700">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ps.breakdown.map((b, i) => (
                            <tr key={i} className="border-t border-[rgba(148,163,184,0.18)]">
                              <td className="py-2 text-slate-700">
                                {b.label}
                                <span className="ml-2 text-xs text-slate-400">
                                  ({b.series.league} {getRoundName(b.series.round, b.series.league)})
                                </span>
                              </td>
                              <td className="text-right text-slate-700">{b.series_win_points}</td>
                              <td className="text-right text-slate-700">{b.game_win_points}</td>
                              <td className="text-right text-slate-700">{b.championship_bonus || '-'}</td>
                              <td className="text-right text-slate-700">{b.efficiency_bonus || '-'}</td>
                              <td className="text-right text-slate-700">{b.sweep_bonus || '-'}</td>
                              <td className="text-right font-bold text-[#264653]">{b.total}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="border-t-2 border-[rgba(148,163,184,0.32)]">
                            <td colSpan={6} className="py-2 font-bold text-slate-700">Total</td>
                            <td className="text-right font-bold text-[#264653]">{ps.total_points}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
