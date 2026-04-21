'use client';

import { useEffect, useState, useCallback } from 'react';
import { fetchJson } from '@/lib/fetch';
import { DailySlate, SlatePick, BetSlip, BetLeaderboardEntry } from '@/types';

const PLAYER_NAME_KEY = 'picks_player_name';

function fmtCents(cents: number): string {
  const neg = cents < 0;
  const abs = Math.abs(cents);
  const dollars = Math.floor(abs / 100);
  const c = abs % 100;
  const str = c === 0 ? `$${dollars}` : `$${dollars}.${String(c).padStart(2, '0')}`;
  return neg ? `-${str}` : str;
}

function fmtDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

export default function DailyBetsPage() {
  // Initialize player name state from localStorage (lazy initializers avoid useEffect setState)
  const [playerName, setPlayerName] = useState<string>(() => {
    if (typeof window !== 'undefined') return localStorage.getItem(PLAYER_NAME_KEY) ?? '';
    return '';
  });
  const [nameInput, setNameInput] = useState<string>(() => {
    if (typeof window !== 'undefined') return localStorage.getItem(PLAYER_NAME_KEY) ?? '';
    return '';
  });
  const [nameConfirmed, setNameConfirmed] = useState<boolean>(() => {
    if (typeof window !== 'undefined') return !!localStorage.getItem(PLAYER_NAME_KEY);
    return false;
  });

  const [slates, setSlates] = useState<DailySlate[]>([]);
  const [activeSlate, setActiveSlate] = useState<DailySlate | null>(null);
  const [choices, setChoices] = useState<Record<string, 'a' | 'b'>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submittedSlip, setSubmittedSlip] = useState<BetSlip | null>(null);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);

  const [leaderboard, setLeaderboard] = useState<BetLeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const [slatesData, lbData] = await Promise.all([
        fetchJson<DailySlate[]>('/api/bets/slates'),
        fetchJson<BetLeaderboardEntry[]>('/api/bets/leaderboard'),
      ]);
      const sl = Array.isArray(slatesData) ? slatesData : [];
      setSlates(sl);
      setLeaderboard(Array.isArray(lbData) ? lbData : []);

      // Find the active slate: prefer open, then most recent unsettled
      const open = sl.find((s) => s.is_open);
      setActiveSlate(open ?? sl[0] ?? null);
    } catch (e: unknown) {
      setLoadError(e instanceof Error ? e.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- Legitimate API data fetch; rule is from Next.js 16 React Compiler lint
  useEffect(() => { void loadData(); }, [loadData]);

  const confirmName = () => {
    const trimmed = nameInput.trim();
    if (!trimmed) return;
    setPlayerName(trimmed);
    setNameConfirmed(true);
    localStorage.setItem(PLAYER_NAME_KEY, trimmed);
  };

  const pickChoice = (pickId: string, option: 'a' | 'b') => {
    setChoices((prev) => ({ ...prev, [pickId]: option }));
  };

  const allPicked =
    activeSlate?.picks &&
    activeSlate.picks.length > 0 &&
    activeSlate.picks.every((p) => choices[p.id]);

  const submitSlip = async () => {
    if (!activeSlate || !allPicked || !playerName) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      const choiceList = Object.entries(choices).map(([slate_pick_id, chosen_option]) => ({
        slate_pick_id,
        chosen_option,
      }));
      const slip = await fetchJson<BetSlip>('/api/bets/slips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slate_id: activeSlate.id,
          player_name: playerName,
          choices: choiceList,
        }),
      });
      setSubmittedSlip(slip);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Submission failed';
      if (msg.includes('already submitted')) {
        setAlreadySubmitted(true);
      } else {
        setSubmitError(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full">
        <div className="rounded-[1.75rem] border border-white/70 bg-[rgba(255,255,255,0.7)] py-20 text-center text-slate-400 shadow-[0_20px_45px_rgba(15,23,42,0.06)]">
          Loading…
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="w-full">
        <div className="rounded-[1.75rem] border border-red-200 bg-[rgba(255,255,255,0.78)] py-20 text-center shadow-[0_20px_45px_rgba(15,23,42,0.06)]">
          <p className="text-lg font-semibold text-red-700">Unable to load picks.</p>
          <p className="mt-2 text-slate-500">{loadError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-serif text-3xl tracking-tight text-slate-950">Daily Bets</h1>
        <p className="mt-1 text-sm text-slate-500">
          Pick winners · $1 per slip · Winner(s) split the pot
        </p>
      </div>

      {/* Player name section */}
      {!nameConfirmed ? (
        <div className="rounded-[1.75rem] border border-white/75 bg-[rgba(255,255,255,0.76)] p-6 shadow-[0_18px_40px_rgba(15,23,42,0.08)] backdrop-blur-sm">
          <p className="mb-3 font-semibold text-slate-800">Enter your name to play</p>
          <div className="flex gap-3">
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && confirmName()}
              placeholder="Your name"
              className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none ring-offset-2 focus:ring-2 focus:ring-[#b7893d]"
            />
            <button
              onClick={confirmName}
              disabled={!nameInput.trim()}
              className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-700 disabled:opacity-40"
            >
              Set Name
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between rounded-[1.5rem] border border-white/75 bg-[rgba(255,255,255,0.76)] px-5 py-3 shadow-[0_10px_24px_rgba(15,23,42,0.06)] backdrop-blur-sm">
          <p className="text-sm font-medium text-slate-700">
            Playing as <span className="font-bold text-slate-900">{playerName}</span>
          </p>
          <button
            onClick={() => {
              setNameConfirmed(false);
              setNameInput(playerName);
            }}
            className="text-xs text-slate-400 underline hover:text-slate-600"
          >
            Change
          </button>
        </div>
      )}

      {/* Active slate */}
      {activeSlate ? (
        <SlateCard
          slate={activeSlate}
          nameConfirmed={nameConfirmed}
          choices={choices}
          onPick={pickChoice}
          onSubmit={submitSlip}
          submitting={submitting}
          submitError={submitError}
          submittedSlip={submittedSlip}
          alreadySubmitted={alreadySubmitted}
          allPicked={!!allPicked}
        />
      ) : (
        <div className="rounded-[1.75rem] border border-white/70 bg-[rgba(255,255,255,0.72)] py-16 text-center shadow-[0_20px_45px_rgba(15,23,42,0.06)]">
          <p className="text-lg font-semibold text-slate-700">No active slate today.</p>
          <p className="mt-2 text-sm text-slate-500">
            Check back soon — the commissioner publishes slates before each day&apos;s games.
          </p>
        </div>
      )}

      {/* Past slates (settled) */}
      {slates.filter((s) => s.is_settled).length > 0 && (
        <div>
          <h2 className="mb-4 font-serif text-2xl tracking-tight text-slate-900">Past Results</h2>
          <div className="space-y-3">
            {slates
              .filter((s) => s.is_settled)
              .map((slate) => (
                <SettledSlateCard key={slate.id} slate={slate} />
              ))}
          </div>
        </div>
      )}

      {/* Leaderboard */}
      <div>
        <h2 className="mb-4 font-serif text-2xl tracking-tight text-slate-900">
          Money Leaderboard
        </h2>
        {leaderboard.length === 0 ? (
          <div className="rounded-[1.75rem] border border-white/70 bg-[rgba(255,255,255,0.72)] py-12 text-center shadow-[0_20px_45px_rgba(15,23,42,0.06)]">
            <p className="text-slate-500">No settled results yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-[1.75rem] border border-white/75 bg-[rgba(255,255,255,0.76)] shadow-[0_18px_40px_rgba(15,23,42,0.08)] backdrop-blur-sm">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-[rgba(148,163,184,0.18)]">
                  <th className="px-4 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">#</th>
                  <th className="px-4 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Player</th>
                  <th className="px-4 py-4 text-right text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Slips</th>
                  <th className="px-4 py-4 text-right text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Spent</th>
                  <th className="px-4 py-4 text-right text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Won</th>
                  <th className="px-4 py-4 text-right text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Net</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((entry, idx) => (
                  <tr
                    key={entry.player_name}
                    className="border-b border-[rgba(148,163,184,0.12)] last:border-0 hover:bg-[rgba(244,237,225,0.45)] transition-colors"
                  >
                    <td className="px-4 py-3 text-slate-500">#{idx + 1}</td>
                    <td className="px-4 py-3 font-bold text-slate-900">{entry.player_name}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{entry.slips_count}</td>
                    <td className="px-4 py-3 text-right text-slate-500">
                      {fmtCents(entry.total_wagered_cents)}
                    </td>
                    <td className="px-4 py-3 text-right text-emerald-700 font-semibold">
                      {fmtCents(entry.total_winnings_cents)}
                    </td>
                    <td
                      className={`px-4 py-3 text-right text-lg font-bold ${
                        entry.net_cents >= 0 ? 'text-emerald-700' : 'text-red-600'
                      }`}
                    >
                      {entry.net_cents >= 0 ? '+' : ''}
                      {fmtCents(entry.net_cents)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

interface SlateCardProps {
  slate: DailySlate;
  nameConfirmed: boolean;
  choices: Record<string, 'a' | 'b'>;
  onPick: (pickId: string, opt: 'a' | 'b') => void;
  onSubmit: () => void;
  submitting: boolean;
  submitError: string;
  submittedSlip: BetSlip | null;
  alreadySubmitted: boolean;
  allPicked: boolean;
}

function SlateCard({
  slate,
  nameConfirmed,
  choices,
  onPick,
  onSubmit,
  submitting,
  submitError,
  submittedSlip,
  alreadySubmitted,
  allPicked,
}: SlateCardProps) {
  const picks = slate.picks ?? [];

  return (
    <div className="rounded-[1.75rem] border border-white/75 bg-[rgba(255,255,255,0.76)] shadow-[0_18px_40px_rgba(15,23,42,0.08)] backdrop-blur-sm overflow-hidden">
      {/* Slate header */}
      <div className="px-6 py-5 border-b border-[rgba(148,163,184,0.15)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-serif text-2xl tracking-tight text-slate-900">{slate.title}</h2>
            <p className="mt-0.5 text-sm text-slate-500">{fmtDate(slate.date)}</p>
            {slate.description && (
              <p className="mt-1 text-sm text-slate-600">{slate.description}</p>
            )}
          </div>
          <StatusBadge slate={slate} />
        </div>
      </div>

      {/* Picks */}
      {picks.length === 0 ? (
        <div className="px-6 py-10 text-center text-slate-500">
          No picks have been added to this slate yet.
        </div>
      ) : (
        <div className="px-6 py-5 space-y-4">
          {submittedSlip || alreadySubmitted ? (
            <div className="rounded-2xl bg-emerald-50 border border-emerald-200 px-5 py-4 text-emerald-800">
              <p className="font-bold">
                {alreadySubmitted ? '✅ Already submitted!' : '✅ Slip submitted!'}
              </p>
              <p className="text-sm mt-1">Your picks are locked in. Good luck!</p>
            </div>
          ) : null}

          {picks.map((pick) => (
            <PickRow
              key={pick.id}
              pick={pick}
              chosen={choices[pick.id] ?? null}
              onPick={onPick}
              disabled={!slate.is_open || !!submittedSlip || alreadySubmitted}
            />
          ))}

          {!submittedSlip && !alreadySubmitted && (
            <>
              {submitError && (
                <p className="text-sm text-red-600 font-medium">{submitError}</p>
              )}
              {slate.is_open ? (
                <button
                  onClick={onSubmit}
                  disabled={!allPicked || !nameConfirmed || submitting}
                  className="w-full rounded-2xl bg-slate-900 py-3.5 text-sm font-bold text-white shadow-[0_10px_24px_rgba(15,23,42,0.18)] transition-all hover:bg-slate-700 disabled:opacity-40"
                >
                  {submitting
                    ? 'Submitting…'
                    : !nameConfirmed
                    ? 'Enter your name above first'
                    : !allPicked
                    ? `Pick all ${picks.length} games to submit`
                    : `Submit Slip — costs $1`}
                </button>
              ) : (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-amber-800 text-sm text-center">
                  {slate.is_settled ? 'This slate has been settled.' : 'Picks are closed.'}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Results overlay for settled slate */}
      {slate.is_settled && picks.length > 0 && (
        <div className="border-t border-[rgba(148,163,184,0.15)] px-6 py-4 bg-[rgba(248,244,236,0.5)]">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
            Results
          </p>
          <div className="space-y-2">
            {picks.map((pick) => (
              <div key={pick.id} className="flex items-center justify-between text-sm">
                <span className="text-slate-700">{pick.title}</span>
                <span className="font-semibold text-slate-900">
                  ✓ {pick.correct_option === 'a' ? pick.option_a : pick.option_b}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PickRow({
  pick,
  chosen,
  onPick,
  disabled,
}: {
  pick: SlatePick;
  chosen: 'a' | 'b' | null;
  onPick: (id: string, opt: 'a' | 'b') => void;
  disabled: boolean;
}) {
  return (
    <div className="rounded-2xl border border-[rgba(148,163,184,0.2)] bg-[rgba(248,244,236,0.4)] p-4">
      <p className="mb-3 text-sm font-semibold text-slate-800">{pick.title}</p>
      <div className="grid grid-cols-2 gap-2">
        {(['a', 'b'] as const).map((opt) => {
          const label = opt === 'a' ? pick.option_a : pick.option_b;
          const isChosen = chosen === opt;
          const isCorrect = pick.correct_option === opt;
          const isWrong = pick.correct_option && pick.correct_option !== opt;
          return (
            <button
              key={opt}
              onClick={() => !disabled && onPick(pick.id, opt)}
              disabled={disabled}
              className={`rounded-xl px-4 py-3 text-sm font-medium text-left transition-all border ${
                isChosen
                  ? pick.correct_option
                    ? isCorrect
                      ? 'border-emerald-400 bg-emerald-100 text-emerald-900'
                      : 'border-red-400 bg-red-100 text-red-900 line-through opacity-70'
                    : 'border-slate-700 bg-slate-900 text-white'
                  : isCorrect
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                  : isWrong
                  ? 'border-slate-200 bg-white text-slate-400 opacity-50'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400 hover:bg-[rgba(244,237,225,0.55)]'
              } disabled:cursor-default`}
            >
              {label}
              {isCorrect && pick.correct_option && <span className="ml-2">✓</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StatusBadge({ slate }: { slate: DailySlate }) {
  if (slate.is_settled) {
    return (
      <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
        Settled
      </span>
    );
  }
  if (slate.is_open) {
    return (
      <span className="shrink-0 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
        Open
      </span>
    );
  }
  return (
    <span className="shrink-0 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
      Closed
    </span>
  );
}

function SettledSlateCard({ slate }: { slate: DailySlate }) {
  const picks = slate.picks ?? [];
  return (
    <div className="rounded-[1.5rem] border border-white/75 bg-[rgba(255,255,255,0.76)] shadow-[0_10px_24px_rgba(15,23,42,0.06)] backdrop-blur-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4">
        <div>
          <p className="font-semibold text-slate-800">{slate.title}</p>
          <p className="text-xs text-slate-500">{fmtDate(slate.date)}</p>
        </div>
        <StatusBadge slate={slate} />
      </div>
      {picks.length > 0 && (
        <div className="border-t border-[rgba(148,163,184,0.15)] px-5 py-3 space-y-1">
          {picks.map((p) => (
            <div key={p.id} className="flex items-center justify-between text-xs text-slate-600">
              <span>{p.title}</span>
              {p.correct_option && (
                <span className="font-semibold text-emerald-700">
                  ✓ {p.correct_option === 'a' ? p.option_a : p.option_b}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
