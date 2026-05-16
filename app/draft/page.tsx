'use client';

import { useEffect, useState } from 'react';
import { fetchJson } from '@/lib/fetch';
import { Player, PlayerScore, SideBetEntry, SideBetMarket, SideBetOption } from '@/types';

interface SideBetPayload {
  market: SideBetMarket | null;
  options: SideBetOption[];
  entries: SideBetEntry[];
}

const NAME_STORAGE_KEY = 'side-bet-bettor-name';

export default function DraftPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [market, setMarket] = useState<SideBetMarket | null>(null);
  const [options, setOptions] = useState<SideBetOption[]>([]);
  const [entries, setEntries] = useState<SideBetEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const [bettorName, setBettorName] = useState('');
  const [selectedOptionId, setSelectedOptionId] = useState('');
  const [amount, setAmount] = useState('500');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [currentTimeMs, setCurrentTimeMs] = useState(() => Date.now());

  const [adminMode, setAdminMode] = useState(false);
  const [adminKey, setAdminKey] = useState('');
  const [adminSaving, setAdminSaving] = useState(false);
  const [adminError, setAdminError] = useState('');
  const [adminMessage, setAdminMessage] = useState('');

  const [marketTitle, setMarketTitle] = useState('Conference Finals Winner Bet');
  const [marketDescription, setMarketDescription] = useState(
    'Pick the pool player you think will win the board after conference finals.'
  );
  const [marketLockAt, setMarketLockAt] = useState('');
  const [selectedAdminPlayerIds, setSelectedAdminPlayerIds] = useState<string[]>([]);
  const [selectedWinningOptionId, setSelectedWinningOptionId] = useState('');

  const fetchPlayers = async () => {
    try {
      const data = await fetchJson<Player[]>('/api/players');
      setPlayers(Array.isArray(data) ? data : []);
    } catch {
      setPlayers([]);
    }
  };

  const fetchBoard = async () => {
    try {
      const data = await fetchJson<SideBetPayload>('/api/side-bets');
      setMarket(data.market ?? null);
      setOptions(Array.isArray(data.options) ? data.options : []);
      setEntries(Array.isArray(data.entries) ? data.entries : []);
      setError('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load side-bet market.');
      setMarket(null);
      setOptions([]);
      setEntries([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Legitimate API data fetch; rule is from Next.js 16 React Compiler lint
    void fetchBoard();
    void fetchPlayers();

    const persistedName = window.localStorage.getItem(NAME_STORAGE_KEY);
    if (persistedName) {
      setBettorName(persistedName);
    }

    const timer = window.setInterval(() => {
      setCurrentTimeMs(Date.now());
    }, 30000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  const lockTime = market ? new Date(market.lock_at) : null;
  const isPastLock = lockTime ? currentTimeMs >= lockTime.getTime() : true;
  const isOpenForEntries = Boolean(market && market.status === 'open' && !isPastLock);

  const winningOption = market?.winning_option_id
    ? options.find((option) => option.id === market.winning_option_id) ?? null
    : null;

  const totalPotCents = entries.reduce((sum, entry) => sum + entry.amount_cents, 0);

  const winningEntries = market?.winning_option_id
    ? entries.filter((entry) => entry.option_id === market.winning_option_id)
    : [];

  const payoutPerWinnerCents =
    winningEntries.length > 0 ? Math.floor(totalPotCents / winningEntries.length) : 0;

  const submitEntry = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!market) {
      setError('No active market found. Ask commissioner to create one.');
      return;
    }

    if (!isOpenForEntries) {
      setError('This market is no longer open.');
      return;
    }

    const trimmedName = bettorName.trim();
    const parsedAmount = Number(amount);

    if (!trimmedName || !selectedOptionId) {
      setError('Enter your name and pick a player.');
      return;
    }

    if (!Number.isFinite(parsedAmount) || parsedAmount < 0) {
      setError('Amount must be a valid number of cents (0 or more).');
      return;
    }

    setSaving(true);
    setError('');

    try {
      await fetchJson('/api/side-bets/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          market_id: market.id,
          bettor_name: trimmedName,
          option_id: selectedOptionId,
          amount_cents: parsedAmount,
        }),
      });

      window.localStorage.setItem(NAME_STORAGE_KEY, trimmedName);
      setBettorName(trimmedName);
      await fetchBoard();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to submit your bet.');
    }

    setSaving(false);
  };

  const toggleAdminPlayer = (playerId: string) => {
    setSelectedAdminPlayerIds((current) =>
      current.includes(playerId)
        ? current.filter((id) => id !== playerId)
        : [...current, playerId]
    );
  };

  const selectTopLeaderboardPlayers = async () => {
    setAdminError('');
    setAdminMessage('');

    try {
      const scores = await fetchJson<PlayerScore[]>('/api/scores');
      const sorted = Array.isArray(scores)
        ? [...scores].sort((a, b) => b.total_points - a.total_points)
        : [];

      const topIds = sorted
        .map((row) => row.player?.id)
        .filter((id): id is string => Boolean(id))
        .slice(0, 4);

      if (topIds.length < 2) {
        setAdminError('Not enough leaderboard data to auto-select players.');
        return;
      }

      setSelectedAdminPlayerIds(topIds);
      setAdminMessage(`Selected top ${topIds.length} leaderboard players.`);
    } catch (err: unknown) {
      setAdminError(err instanceof Error ? err.message : 'Failed to load leaderboard for preset.');
    }
  };

  const createMarket = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!adminKey.trim()) {
      setAdminError('Enter admin key to create a market.');
      return;
    }

    if (!marketTitle.trim()) {
      setAdminError('Market title is required.');
      return;
    }

    if (!marketLockAt) {
      setAdminError('Lock time is required.');
      return;
    }

    if (selectedAdminPlayerIds.length < 2) {
      setAdminError('Select at least two players for this market.');
      return;
    }

    setAdminSaving(true);
    setAdminError('');
    setAdminMessage('');

    try {
      await fetchJson('/api/side-bets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminKey.trim(),
        },
        body: JSON.stringify({
          title: marketTitle.trim(),
          description: marketDescription.trim(),
          lock_at: new Date(marketLockAt).toISOString(),
          option_player_ids: selectedAdminPlayerIds,
        }),
      });

      setAdminMessage('Market created successfully.');
      setSelectedWinningOptionId('');
      await fetchBoard();
    } catch (err: unknown) {
      setAdminError(err instanceof Error ? err.message : 'Failed to create market.');
    }

    setAdminSaving(false);
  };

  const settleMarket = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!market) {
      setAdminError('No market to settle.');
      return;
    }

    if (!adminKey.trim()) {
      setAdminError('Enter admin key to settle market.');
      return;
    }

    if (!selectedWinningOptionId) {
      setAdminError('Select the winning player option first.');
      return;
    }

    setAdminSaving(true);
    setAdminError('');
    setAdminMessage('');

    try {
      await fetchJson('/api/side-bets/settle', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminKey.trim(),
        },
        body: JSON.stringify({
          market_id: market.id,
          winning_option_id: selectedWinningOptionId,
        }),
      });

      setAdminMessage('Market settled successfully.');
      await fetchBoard();
    } catch (err: unknown) {
      setAdminError(err instanceof Error ? err.message : 'Failed to settle market.');
    }

    setAdminSaving(false);
  };

  if (loading) {
    return <div className="text-slate-400">Loading side-bet market…</div>;
  }

  return (
    <div className="w-full">
      <section className="rounded-[1.75rem] border border-white/70 bg-[rgba(255,255,255,0.8)] p-6 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
        <h1 className="font-serif text-3xl tracking-tight text-slate-950">Make a Bet!</h1>
        <p className="mt-1 text-sm text-slate-500">
          Conference-finals side bet: pick which pool player you think wins the board.
        </p>

        {!market ? (
          <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
            No active side-bet market yet. Use the admin API to create one.
          </div>
        ) : (
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Market</p>
              <p className="mt-2 text-lg font-bold text-slate-900">{market.title}</p>
              {market.description ? (
                <p className="mt-1 text-sm text-slate-600">{market.description}</p>
              ) : null}
              <p className="mt-3 text-sm text-slate-500">
                Lock time: <span className="font-semibold text-slate-700">{lockTime?.toLocaleString() ?? '—'}</span>
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Status:{' '}
                <span className="font-semibold text-slate-700">
                  {market.status === 'settled'
                    ? 'Settled'
                    : isOpenForEntries
                      ? 'Open'
                      : 'Locked'}
                </span>
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Pot</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">
                ${(totalPotCents / 100).toFixed(2)}
              </p>
              <p className="mt-1 text-sm text-slate-500">Entries: {entries.length}</p>
              {market.status === 'settled' && winningOption ? (
                <>
                  <p className="mt-3 text-sm text-slate-600">
                    Winner: <span className="font-semibold text-slate-800">{winningOption.player?.name ?? 'Unknown'}</span>
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    Payout per winning ticket: <span className="font-semibold text-emerald-700">${(payoutPerWinnerCents / 100).toFixed(2)}</span>
                  </p>
                </>
              ) : null}
            </div>
          </div>
        )}
      </section>

      {market ? (
        <section className="mt-6 rounded-[1.75rem] border border-white/70 bg-[rgba(255,255,255,0.78)] p-6 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
          <h2 className="text-xl font-semibold text-slate-900">Place or update your bet</h2>
          <p className="mt-1 text-sm text-slate-500">
            One bet per name for this market. Submitting again updates your pick.
          </p>

          <form onSubmit={submitEntry} className="mt-4 grid gap-3 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs text-slate-500">Your Name</label>
              <input
                value={bettorName}
                onChange={(event) => setBettorName(event.target.value)}
                placeholder="Type your name"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                disabled={!isOpenForEntries || saving}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">Pick a Pool Player</label>
              <select
                value={selectedOptionId}
                onChange={(event) => setSelectedOptionId(event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                disabled={!isOpenForEntries || saving}
              >
                <option value="">Choose player…</option>
                {options.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.player?.name ?? 'Unknown'}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">Amount (cents)</label>
              <input
                type="number"
                min={0}
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                disabled={!isOpenForEntries || saving}
              />
            </div>
            <div className="md:col-span-3">
              <button
                type="submit"
                disabled={!isOpenForEntries || saving}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Submit Bet'}
              </button>
            </div>
          </form>

          {!isOpenForEntries ? (
            <p className="mt-3 text-sm text-amber-700">Betting is locked for this market.</p>
          ) : null}
          {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
        </section>
      ) : null}

      <section className="mt-6 rounded-[1.75rem] border border-white/70 bg-[rgba(255,255,255,0.78)] p-6 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
        <h2 className="text-xl font-semibold text-slate-900">Current bets</h2>
        {entries.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">No bets submitted yet.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[620px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2 text-left">Bettor</th>
                  <th className="py-2 text-left">Pick</th>
                  <th className="py-2 text-right">Amount</th>
                  <th className="py-2 text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => {
                  const isWinner =
                    market?.status === 'settled' &&
                    Boolean(market.winning_option_id) &&
                    entry.option_id === market.winning_option_id;

                  return (
                    <tr key={entry.id} className="border-b border-slate-100 last:border-0">
                      <td className="py-2 font-medium text-slate-900">{entry.bettor_name}</td>
                      <td className="py-2 text-slate-700">{entry.option?.player?.name ?? 'Unknown'}</td>
                      <td className="py-2 text-right text-slate-700">${(entry.amount_cents / 100).toFixed(2)}</td>
                      <td className="py-2 text-right">
                        {market?.status === 'settled' ? (
                          isWinner ? (
                            <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">Wins</span>
                          ) : (
                            <span className="text-xs text-slate-400">Lost</span>
                          )
                        ) : (
                          <span className="text-xs text-slate-400">Pending</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mt-6 rounded-[1.75rem] border border-white/70 bg-[rgba(255,255,255,0.78)] p-6 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Commissioner Panel</h2>
            <p className="mt-1 text-sm text-slate-500">Create and settle markets from the UI.</p>
          </div>
          <button
            type="button"
            onClick={() => setAdminMode((current) => !current)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100"
          >
            {adminMode ? 'Hide' : 'Show'} Panel
          </button>
        </div>

        {adminMode ? (
          <div className="mt-4 space-y-6">
            <div>
              <label className="mb-1 block text-xs text-slate-500">Admin Key</label>
              <input
                type="password"
                value={adminKey}
                onChange={(event) => setAdminKey(event.target.value)}
                placeholder="Enter SIDE_BET_ADMIN_KEY"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
              />
            </div>

            <form onSubmit={createMarket} className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="text-lg font-semibold text-slate-900">Create Market</h3>
              <div>
                <label className="mb-1 block text-xs text-slate-500">Title</label>
                <input
                  value={marketTitle}
                  onChange={(event) => setMarketTitle(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-500">Description</label>
                <textarea
                  value={marketDescription}
                  onChange={(event) => setMarketDescription(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                  rows={2}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-500">Lock Time</label>
                <input
                  type="datetime-local"
                  value={marketLockAt}
                  onChange={(event) => setMarketLockAt(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                />
              </div>
              <div>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="block text-xs text-slate-500">Eligible Players</p>
                  <button
                    type="button"
                    onClick={() => void selectTopLeaderboardPlayers()}
                    className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100"
                  >
                    Use Top 4 Leaderboard
                  </button>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {players.map((player) => (
                    <label
                      key={player.id}
                      className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700"
                    >
                      <input
                        type="checkbox"
                        checked={selectedAdminPlayerIds.includes(player.id)}
                        onChange={() => toggleAdminPlayer(player.id)}
                      />
                      {player.name}
                    </label>
                  ))}
                </div>
              </div>
              <button
                type="submit"
                disabled={adminSaving}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {adminSaving ? 'Saving…' : 'Create Market'}
              </button>
            </form>

            {market ? (
              <form onSubmit={settleMarket} className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
                <h3 className="text-lg font-semibold text-slate-900">Settle Current Market</h3>
                <div>
                  <label className="mb-1 block text-xs text-slate-500">Winning Player</label>
                  <select
                    value={selectedWinningOptionId}
                    onChange={(event) => setSelectedWinningOptionId(event.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                  >
                    <option value="">Select winning player…</option>
                    {options.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.player?.name ?? 'Unknown'}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={adminSaving || market.status === 'settled'}
                  className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {adminSaving ? 'Saving…' : market.status === 'settled' ? 'Already Settled' : 'Settle Market'}
                </button>
              </form>
            ) : null}

            {adminError ? <p className="text-sm text-red-600">{adminError}</p> : null}
            {adminMessage ? <p className="text-sm text-emerald-700">{adminMessage}</p> : null}
          </div>
        ) : null}
      </section>
    </div>
  );
}
