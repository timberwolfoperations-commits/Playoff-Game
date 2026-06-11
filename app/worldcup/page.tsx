'use client';

import { useEffect, useState } from 'react';
import { WcPlayerScore } from '@/types';
import { WC_SCORING } from '@/lib/wc-scoring';
import { fetchJson } from '@/lib/fetch';

const medals = ['🥇', '🥈', '🥉'];

export default function WcLeaderboardPage() {
  const [scores, setScores] = useState<WcPlayerScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedPlayer, setExpandedPlayer] = useState<string | null>(null);

  const load = () => {
    fetchJson<WcPlayerScore[]>('/api/worldcup/scores')
      .then((data) => {
        setScores(Array.isArray(data) ? data : []);
        setError(null);
        setLoading(false);
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : 'Unable to load scores.');
        setLoading(false);
      });
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-6">
      {/* Leaderboard card */}
      <div className="rounded-[1.75rem] border border-white/75 bg-[rgba(255,255,255,0.76)] shadow-[0_18px_40px_rgba(15,23,42,0.08)] backdrop-blur-sm">
        <div className="flex items-center justify-between border-b border-[rgba(148,163,184,0.15)] px-6 py-4">
          <h2 className="font-serif text-xl font-semibold tracking-tight text-slate-950">
            🏅 World Cup Leaderboard
          </h2>
          <button
            onClick={() => { setLoading(true); load(); }}
            className="rounded-full border border-[#dbc7a4] bg-white/80 px-3 py-1.5 text-xs font-semibold text-[#7c5b1f] hover:bg-[#f4ede1] transition-colors"
          >
            ↺ Refresh
          </button>
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-400">Loading…</div>
        ) : error ? (
          <div className="py-16 text-center">
            <p className="font-semibold text-red-600">Scores unavailable</p>
            <p className="mt-1 text-sm text-slate-500">{error}</p>
          </div>
        ) : scores.length === 0 ? (
          <div className="py-16 text-center">
            <p className="font-semibold text-slate-700">No scores yet.</p>
            <p className="mt-1 text-sm text-slate-500">Scores will appear once picks are entered and matches are played.</p>
          </div>
        ) : (
          <div>
            {scores.map((ps, idx) => (
              <div key={ps.player.id}>
                <button
                  className="w-full text-left border-b border-[rgba(148,163,184,0.12)] last:border-0 px-6 py-4 hover:bg-[rgba(244,237,225,0.4)] transition-colors"
                  onClick={() => setExpandedPlayer(expandedPlayer === ps.player.id ? null : ps.player.id)}
                >
                  <div className="flex items-center gap-4">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-base text-white shadow-[0_6px_16px_rgba(15,23,42,0.15)]">
                      {medals[idx] ?? `#${idx + 1}`}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-base font-bold text-slate-950">{ps.player.name}</p>
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {ps.teams.map((t) => (
                          <span
                            key={t.id}
                            className="rounded-full border border-[#dbc7a4] bg-[#faf5ea] px-2 py-0.5 text-xs font-medium text-[#7c5b1f]"
                          >
                            {t.name}
                          </span>
                        ))}
                        {ps.teams.length === 0 && (
                          <span className="text-xs text-slate-400 italic">No teams yet</span>
                        )}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <span className="text-2xl font-bold text-[#264653]">{ps.total_points}</span>
                      <span className="ml-1 text-xs text-slate-400">pts</span>
                      <p className="text-xs text-slate-400">{ps.max_possible_points} max</p>
                    </div>
                  </div>
                </button>
                {expandedPlayer === ps.player.id && (
                  <div className="border-b border-[rgba(148,163,184,0.12)] bg-[rgba(244,237,225,0.25)] px-6 py-3">
                    <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
                      <span className="text-slate-600">Group wins: <strong className="text-slate-900">{ps.group_win_points} pts</strong></span>
                      <span className="text-slate-600">Group draws: <strong className="text-slate-900">{ps.group_draw_points} pts</strong></span>
                      <span className="text-slate-600">Advanced: <strong className="text-slate-900">{ps.advance_points} pts</strong></span>
                      <span className="text-slate-600">Knockout: <strong className="text-slate-900">{ps.knockout_points} pts</strong></span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom panels */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Scoring Rules */}
        <div className="rounded-[1.75rem] border border-white/75 bg-[rgba(255,255,255,0.78)] p-6 shadow-[0_20px_45px_rgba(15,23,42,0.08)] backdrop-blur-sm">
          <h3 className="mb-4 font-serif text-xl font-semibold tracking-tight text-slate-900">📋 Scoring Rules</h3>
          <div className="divide-y divide-[rgba(148,163,184,0.15)]">
            {[
              ['Group stage win', WC_SCORING.GROUP_WIN],
              ['Group stage draw', WC_SCORING.GROUP_DRAW],
              ['Advance from group', WC_SCORING.ADVANCE_FROM_GROUP],
              ['Round of 32 win', WC_SCORING.R32_WIN],
              ['Round of 16 win', WC_SCORING.R16_WIN],
              ['Quarterfinal win', WC_SCORING.QF_WIN],
              ['Semifinal win', WC_SCORING.SF_WIN],
              ['Champion 🏆', WC_SCORING.CHAMPION],
            ].map(([label, pts]) => (
              <div key={String(label)} className="flex items-center justify-between py-2.5">
                <span className="text-sm text-slate-600">{label}</span>
                <span className="font-bold text-[#a45f14]">{pts} {pts === 1 ? 'pt' : 'pts'}</span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-slate-400">Payouts: 1st 80% · 2nd 20% · Last place $1</p>
        </div>

        {/* About */}
        <div className="rounded-[1.75rem] border border-white/75 bg-[rgba(255,255,255,0.78)] p-6 shadow-[0_20px_45px_rgba(15,23,42,0.08)] backdrop-blur-sm">
          <h3 className="mb-4 font-serif text-xl font-semibold tracking-tight text-slate-900">🌍 World Cup 2026</h3>
          <div className="space-y-3 text-sm text-slate-600">
            <p>Welcome to the 2026 FIFA World Cup pool! Each participant drafts 8 teams and earns points based on how those teams perform throughout the tournament.</p>
            <p>Points accumulate through group stage wins, advancing to the knockout rounds, and winning knockout matches all the way to the championship.</p>
            <p className="font-semibold text-slate-700">Click any row in the leaderboard to see a breakdown of that player&apos;s points.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
