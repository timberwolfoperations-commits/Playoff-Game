'use client';

import { useEffect, useState } from 'react';
import { PlayerScore } from '@/types';
import { fetchJson } from '@/lib/fetch';
import { getTeamTier, getRoundName } from '@/lib/scoring';

export default function HomePage() {
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
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">🏆 Leaderboard</h1>
        <p className="text-gray-500 mt-1">Live standings for the Playoff Game</p>
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-400">Loading scores…</div>
      ) : loadError ? (
        <div className="text-center py-20">
          <p className="text-red-600 text-lg font-semibold">Scores are unavailable.</p>
          <p className="text-gray-500 mt-2">{loadError}</p>
        </div>
      ) : scores.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-gray-400 text-lg">No scores yet.</p>
          <p className="text-gray-400 mt-2">
            Start by adding{' '}
            <a href="/players" className="text-indigo-600 underline">players</a>,{' '}
            <a href="/teams" className="text-indigo-600 underline">teams</a>, and running the{' '}
            <a href="/draft" className="text-indigo-600 underline">draft</a>.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {scores.map((ps, idx) => (
            <div
              key={ps.player.id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
            >
              <button
                onClick={() =>
                  setExpandedPlayer(expandedPlayer === ps.player.id ? null : ps.player.id)
                }
                className="w-full flex items-center justify-between p-5 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <span className="text-2xl">{medals[idx] ?? `#${idx + 1}`}</span>
                  <div className="text-left">
                    <p className="font-bold text-gray-900 text-lg">{ps.player.name}</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {ps.teams.map((t) => (
                        <span
                          key={t.id}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                            t.league === 'NBA'
                              ? 'bg-orange-100 text-orange-700'
                              : 'bg-blue-100 text-blue-700'
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
                  <span className="text-3xl font-bold text-indigo-600">
                    {ps.total_points}
                  </span>
                  <span className="text-gray-400 text-sm ml-1">pts</span>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {expandedPlayer === ps.player.id ? '▲ hide' : '▼ details'}
                  </p>
                </div>
              </button>

              {expandedPlayer === ps.player.id && (
                <div className="border-t border-gray-100 px-5 py-4 bg-gray-50">
                  {ps.breakdown.length === 0 ? (
                    <p className="text-gray-400 text-sm">No scoring activity yet.</p>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-gray-500 text-xs uppercase">
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
                          <tr key={i} className="border-t border-gray-200">
                            <td className="py-1.5 text-gray-700">
                              {b.label}
                              <span className="ml-2 text-xs text-gray-400">
                                ({b.series.league} {getRoundName(b.series.round, b.series.league)})
                              </span>
                            </td>
                            <td className="text-right text-gray-700">{b.series_win_points}</td>
                            <td className="text-right text-gray-700">{b.game_win_points}</td>
                            <td className="text-right text-gray-700">{b.championship_bonus || '-'}</td>
                            <td className="text-right text-gray-700">{b.efficiency_bonus || '-'}</td>
                            <td className="text-right text-gray-700">{b.sweep_bonus || '-'}</td>
                            <td className="text-right font-bold text-indigo-600">{b.total}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-gray-300">
                          <td colSpan={6} className="py-1.5 font-bold text-gray-700">Total</td>
                          <td className="text-right font-bold text-indigo-600">{ps.total_points}</td>
                        </tr>
                      </tfoot>
                    </table>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="mt-10 bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h2 className="text-lg font-bold text-gray-800 mb-3">📖 Scoring Reference</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-gray-600">
          <div>
            <p className="font-semibold text-gray-700 mb-1">Series Win Points</p>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-gray-500">
                  <th className="text-left">Round</th>
                  <th className="text-right">Tier 1 (Seeds 1-4)</th>
                  <th className="text-right">Tier 2 (Seeds 5-8/WC)</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Round 1', 2, 5],
                  ['Round 2', 4, 8],
                  ['Conf Finals', 8, 15],
                  ['Finals', 15, 25],
                ].map(([r, t1, t2]) => (
                  <tr key={String(r)} className="border-t border-gray-100">
                    <td className="py-1">{r}</td>
                    <td className="text-right text-indigo-600 font-medium">+{t1}</td>
                    <td className="text-right text-orange-600 font-medium">+{t2}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div>
            <p className="font-semibold text-gray-700 mb-1">Bonuses</p>
            <ul className="space-y-1 text-xs">
              <li>🎯 <strong>Every game win:</strong> +1 pt</li>
              <li>🏆 <strong>Championship bonus:</strong> +10 pts</li>
              <li>⚡ <strong>Efficiency (≤6 games):</strong> +2 pts</li>
              <li>🧹 <strong>Sweep (4-0):</strong> +3 pts (stacks → +5 total bonus)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
