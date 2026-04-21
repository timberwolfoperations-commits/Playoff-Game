'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PlayerScore } from '@/types';
import { fetchJson } from '@/lib/fetch';

export default function HomePage() {
  const [scores, setScores] = useState<PlayerScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

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
      <div className="mt-2 mb-2 flex items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-3xl tracking-tight text-slate-950">Standings</h2>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/players"
            className="hidden rounded-full border border-[#dbc7a4] bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-[#7c5b1f] shadow-[0_10px_20px_rgba(15,23,42,0.06)] hover:bg-[#f4ede1] transition-colors sm:block"
          >
            Full Details →
          </Link>
          <div className="hidden rounded-full border border-[#dbc7a4] bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-[#7c5b1f] shadow-[0_10px_20px_rgba(15,23,42,0.06)] sm:block">
            Private league view
          </div>
        </div>
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
        <div className="overflow-x-auto rounded-[1.75rem] border border-white/75 bg-[rgba(255,255,255,0.76)] shadow-[0_18px_40px_rgba(15,23,42,0.08)] backdrop-blur-sm">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-[rgba(148,163,184,0.18)]">
                <th className="px-3 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 sm:px-5 lg:px-6">#</th>
                <th className="px-3 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 sm:px-5 lg:px-6">Player</th>
                <th className="px-3 py-4 text-right text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 sm:px-5 lg:px-6">Points</th>
                <th className="px-3 py-4 text-right text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 sm:px-5 lg:px-6">Max Possible</th>
              </tr>
            </thead>
            <tbody>
              {scores.map((ps, idx) => (
                <tr
                  key={ps.player.id}
                  className="border-b border-[rgba(148,163,184,0.12)] last:border-0 hover:bg-[rgba(244,237,225,0.45)] transition-colors"
                >
                  <td className="px-3 py-4 sm:px-5 lg:px-6">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-base text-white shadow-[0_6px_16px_rgba(15,23,42,0.15)]">
                      {medals[idx] ?? `#${idx + 1}`}
                    </span>
                  </td>
                  <td className="px-3 py-4 sm:px-5 lg:px-6">
                    <p className="text-base font-bold text-slate-950">{ps.player.name}</p>
                  </td>
                  <td className="px-3 py-4 text-right sm:px-5 lg:px-6">
                    <span className="text-2xl font-bold text-[#264653]">{ps.total_points}</span>
                    <span className="ml-1 text-xs text-slate-400">pts</span>
                  </td>
                  <td className="px-3 py-4 text-right sm:px-5 lg:px-6">
                    <span className="text-lg font-semibold text-slate-500">{ps.max_possible_points}</span>
                    <span className="ml-1 text-xs text-slate-400">max</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-10 rounded-[1.75rem] border border-white/75 bg-[rgba(255,255,255,0.78)] p-6 shadow-[0_20px_45px_rgba(15,23,42,0.08)] backdrop-blur-sm">
        <h2 className="mb-4 font-serif text-2xl tracking-tight text-slate-900">Scoring Reference</h2>
        <div className="grid grid-cols-1 gap-5 text-sm text-slate-600 sm:grid-cols-2">
          <div>
            <p className="mb-2 font-semibold text-slate-700">Series Win Points</p>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-500">
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
                  <tr key={String(r)} className="border-t border-[rgba(148,163,184,0.15)]">
                    <td className="py-1.5">{r}</td>
                    <td className="text-right font-semibold text-[#264653]">+{t1}</td>
                    <td className="text-right font-semibold text-[#a45f14]">+{t2}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="rounded-[1.5rem] bg-[linear-gradient(180deg,#faf5ea_0%,#f7f9fc_100%)] p-5">
            <p className="mb-2 font-semibold text-slate-700">Bonuses</p>
            <ul className="space-y-2 text-xs sm:text-sm">
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
