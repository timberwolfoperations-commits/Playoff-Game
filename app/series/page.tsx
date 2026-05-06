'use client';

import { useEffect, useState, useCallback } from 'react';
import { fetchJson } from '@/lib/fetch';
import { Team, Series, Game, League, SeriesRound } from '@/types';
import { getRoundName } from '@/lib/scoring';

const ROUND_LABELS: { value: SeriesRound; label: string }[] = [
  { value: 1, label: 'Round 1' },
  { value: 2, label: 'Round 2' },
  { value: 3, label: 'Conference Finals' },
  { value: 4, label: 'Finals' },
];

type SeriesWithGames = Series & { games: Game[] };

export default function SeriesPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [seriesList, setSeriesList] = useState<SeriesWithGames[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSeries, setExpandedSeries] = useState<string | null>(null);
  const [activeLeague, setActiveLeague] = useState<League | 'ALL'>('ALL');
  const [activeRound, setActiveRound] = useState<SeriesRound | 'ALL'>('ALL');

  // New series form
  const [newSeries, setNewSeries] = useState({
    league: 'NBA' as League,
    round: 1 as SeriesRound,
    home_team_id: '',
    away_team_id: '',
  });
  const [addingGame, setAddingGame] = useState<string | null>(null);
  const [gameForm, setGameForm] = useState({
    winner_team_id: '',
    home_score: '',
    away_score: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchAll = useCallback(async () => {
    try {
      const [tRes, sRes] = await Promise.all([
        fetchJson<Team[]>('/api/teams'),
        fetchJson<SeriesWithGames[]>('/api/series'),
      ]);

      setTeams(Array.isArray(tRes) ? tRes : []);
      setSeriesList(Array.isArray(sRes) ? sRes : []);
      setError('');
    } catch (error: unknown) {
      setTeams([]);
      setSeriesList([]);
      setError(error instanceof Error ? error.message : 'Failed to load series data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Legitimate API data fetch; rule is from Next.js 16 React Compiler lint
    fetchAll();
  }, [fetchAll]);

  const createSeries = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSeries.home_team_id || !newSeries.away_team_id) {
      setError('Both teams are required');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await fetchJson<SeriesWithGames>('/api/series', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSeries),
      });

      setNewSeries({ league: 'NBA', round: 1, home_team_id: '', away_team_id: '' });
      await fetchAll();
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'Failed to create series');
    }
    setSaving(false);
  };

  const deleteSeries = async (id: string) => {
    if (!confirm('Delete this series? All games will be removed.')) return;

    try {
      await fetchJson(`/api/series/${id}`, { method: 'DELETE' });
      await fetchAll();
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'Failed to delete series');
    }
  };

  const addGame = async (series: SeriesWithGames) => {
    if (!gameForm.winner_team_id) {
      setError('Select a winner');
      return;
    }
    setSaving(true);
    setError('');
    const gameNumber = (series.games?.length ?? 0) + 1;
    const homeScore = gameForm.home_score ? parseInt(gameForm.home_score) : null;
    const awayScore = gameForm.away_score ? parseInt(gameForm.away_score) : null;

    try {
      const data = await fetchJson<Game>('/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          series_id: series.id,
          game_number: gameNumber,
          winner_team_id: gameForm.winner_team_id,
          home_score: homeScore,
          away_score: awayScore,
        }),
      });

      // Recalculate series wins
      const updatedGames = [...(series.games ?? []), data];
      const homeWins = updatedGames.filter((g) => g.winner_team_id === series.home_team_id).length;
      const awayWins = updatedGames.filter((g) => g.winner_team_id === series.away_team_id).length;
      const isComplete = homeWins >= 4 || awayWins >= 4;
      const winnerId = homeWins >= 4 ? series.home_team_id : awayWins >= 4 ? series.away_team_id : null;

      await fetchJson(`/api/series/${series.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          home_wins: homeWins,
          away_wins: awayWins,
          is_complete: isComplete,
          winner_team_id: winnerId,
        }),
      });

      setGameForm({ winner_team_id: '', home_score: '', away_score: '' });
      setAddingGame(null);
      await fetchAll();
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'Failed to add game');
      setSaving(false);
      return;
    }
    setSaving(false);
  };

  const deleteGame = async (gameId: string, series: SeriesWithGames) => {
    if (!confirm('Delete this game result?')) return;

    try {
      await fetchJson(`/api/games/${gameId}`, { method: 'DELETE' });

      // Recalculate wins
      const remaining = (series.games ?? []).filter((g) => g.id !== gameId);
      const homeWins = remaining.filter((g) => g.winner_team_id === series.home_team_id).length;
      const awayWins = remaining.filter((g) => g.winner_team_id === series.away_team_id).length;
      const isComplete = homeWins >= 4 || awayWins >= 4;
      const winnerId = homeWins >= 4 ? series.home_team_id : awayWins >= 4 ? series.away_team_id : null;

      await fetchJson(`/api/series/${series.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          home_wins: homeWins,
          away_wins: awayWins,
          is_complete: isComplete,
          winner_team_id: winnerId,
        }),
      });

      await fetchAll();
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'Failed to delete game');
    }
  };

  const leagueTeams = (league: League) => teams.filter((t) => t.league === league);

  const filtered = seriesList
    .filter((s) => activeLeague === 'ALL' || s.league === activeLeague)
    .filter((s) => activeRound === 'ALL' || s.round === activeRound);

  if (loading) return <div className="text-gray-400">Loading…</div>;

  return (
    <div className="w-full">
      <section className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-[linear-gradient(135deg,rgba(38,70,83,0.96)_0%,rgba(15,23,42,0.94)_52%,rgba(183,137,61,0.88)_100%)] px-6 py-8 text-white shadow-[0_24px_70px_rgba(15,23,42,0.18)] sm:px-8 sm:py-10">
        <div className="absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.2),transparent_58%)]" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.38em] text-white/68">
              Bracket Control Room
            </p>
            <h1 className="font-serif text-4xl tracking-tight text-white sm:text-5xl">
              Series tracking without the clutter.
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-6 text-white/78 sm:text-base">
              Create matchups, record game results, and keep the standings engine fed with clean
              playoff data across both leagues.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:w-auto">
            <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/60">
                Total Series
              </p>
              <p className="mt-2 text-3xl font-semibold">{seriesList.length}</p>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/60">
                Completed
              </p>
              <p className="mt-2 text-3xl font-semibold">
                {seriesList.filter((series) => series.is_complete).length}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Create series form */}
      <div className="mt-8 mb-8 max-w-3xl rounded-[1.75rem] border border-white/75 bg-[rgba(255,255,255,0.78)] p-6 shadow-[0_20px_45px_rgba(15,23,42,0.08)] backdrop-blur-sm sm:p-7">
        <h2 className="mb-4 font-serif text-2xl tracking-tight text-slate-900">Add New Series</h2>
        <form onSubmit={createSeries} className="grid grid-cols-2 gap-3">
          <select
            value={newSeries.league}
            onChange={(e) => setNewSeries({ ...newSeries, league: e.target.value as League, home_team_id: '', away_team_id: '' })}
            className="rounded-xl border border-slate-200 bg-white/90 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#264653]"
          >
            <option value="NBA">🏀 NBA</option>
            <option value="NHL">🏒 NHL</option>
          </select>
          <select
            value={newSeries.round}
            onChange={(e) => setNewSeries({ ...newSeries, round: parseInt(e.target.value) as SeriesRound })}
            className="rounded-xl border border-slate-200 bg-white/90 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#264653]"
          >
            {ROUND_LABELS.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Home Team</label>
            <select
              value={newSeries.home_team_id}
              onChange={(e) => setNewSeries({ ...newSeries, home_team_id: e.target.value })}
              className="w-full rounded-xl border border-slate-200 bg-white/90 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#264653]"
            >
              <option value="">Select home team…</option>
              {leagueTeams(newSeries.league).map((t) => (
                <option key={t.id} value={t.id}>#{t.seed} {t.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Away Team</label>
            <select
              value={newSeries.away_team_id}
              onChange={(e) => setNewSeries({ ...newSeries, away_team_id: e.target.value })}
              className="w-full rounded-xl border border-slate-200 bg-white/90 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#264653]"
            >
              <option value="">Select away team…</option>
              {leagueTeams(newSeries.league)
                .filter((t) => t.id !== newSeries.home_team_id)
                .map((t) => (
                  <option key={t.id} value={t.id}>#{t.seed} {t.name}</option>
                ))}
            </select>
          </div>
          {error && <p className="col-span-2 text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={saving}
            className="col-span-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(15,23,42,0.18)] transition-colors hover:bg-[#264653] disabled:opacity-50"
          >
            {saving ? 'Creating…' : 'Create Series'}
          </button>
        </form>
      </div>

      {/* Filter tabs */}
      <div className="mb-3 flex gap-2 rounded-full border border-slate-200 bg-white/80 p-1.5 shadow-[0_10px_24px_rgba(15,23,42,0.08)] w-fit">
        {(['ALL', 'NBA', 'NHL'] as const).map((lg) => (
          <button
            key={lg}
            onClick={() => setActiveLeague(lg)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-all ${
              activeLeague === lg
                ? 'bg-slate-900 text-white shadow-[0_10px_18px_rgba(15,23,42,0.18)]'
                : 'text-slate-600 hover:bg-[#f4ede1] hover:text-slate-900'
            }`}
          >
            {lg === 'ALL' ? 'All' : lg === 'NBA' ? '🏀 NBA' : '🏒 NHL'} (
            {lg === 'ALL' ? seriesList.length : seriesList.filter((s) => s.league === lg).length})
          </button>
        ))}
      </div>

      {/* Round filter tabs */}
      <div className="mb-6 flex flex-wrap gap-2 rounded-full border border-slate-200 bg-white/80 p-1.5 shadow-[0_10px_24px_rgba(15,23,42,0.08)] w-fit">
        <button
          onClick={() => setActiveRound('ALL')}
          className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-all ${
            activeRound === 'ALL'
              ? 'bg-slate-900 text-white shadow-[0_10px_18px_rgba(15,23,42,0.18)]'
              : 'text-slate-600 hover:bg-[#f4ede1] hover:text-slate-900'
          }`}
        >
          All Rounds ({seriesList.filter((s) => activeLeague === 'ALL' || s.league === activeLeague).length})
        </button>
        {ROUND_LABELS.map(({ value, label }) => {
          const count = seriesList.filter((s) => (activeLeague === 'ALL' || s.league === activeLeague) && s.round === value).length;
          if (count === 0) return null;
          return (
            <button
              key={value}
              onClick={() => setActiveRound(value)}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-all ${
                activeRound === value
                  ? 'bg-slate-900 text-white shadow-[0_10px_18px_rgba(15,23,42,0.18)]'
                  : 'text-slate-600 hover:bg-[#f4ede1] hover:text-slate-900'
              }`}
            >
              {label} ({count})
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-[1.75rem] border border-white/75 bg-[rgba(255,255,255,0.72)] py-20 text-center text-slate-400 shadow-[0_20px_45px_rgba(15,23,42,0.06)]">
          {seriesList.length === 0 ? 'No series yet. Add one above.' : 'No series match the selected filters.'}
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((series) => {
            const homeTeam = series.home_team;
            const awayTeam = series.away_team;
            const games = series.games ?? [];
            const isExpanded = expandedSeries === series.id;

            return (
              <div
                key={series.id}
                className="overflow-hidden rounded-[1.6rem] border border-white/75 bg-[rgba(255,255,255,0.78)] shadow-[0_18px_40px_rgba(15,23,42,0.08)] backdrop-blur-sm"
              >
                <button
                  onClick={() => setExpandedSeries(isExpanded ? null : series.id)}
                  className="flex w-full items-center justify-between p-5 transition-colors hover:bg-[rgba(244,237,225,0.55)] sm:p-6"
                >
                  <div className="flex items-center gap-4">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${series.league === 'NBA' ? 'bg-[#fff1de] text-[#a45f14]' : 'bg-[#e5f1fb] text-[#215a86]'}`}>
                      {series.league === 'NBA' ? '🏀' : '🏒'} {series.league}
                    </span>
                    <div className="text-left">
                      <p className="font-semibold text-slate-900">
                        {homeTeam?.name ?? '?'} vs {awayTeam?.name ?? '?'}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-400">
                        {getRoundName(series.round, series.league)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <p className="text-lg font-bold text-slate-900">
                        {series.home_wins} – {series.away_wins}
                      </p>
                      <p className="text-xs text-slate-400">{games.length} games played</p>
                    </div>
                    {series.is_complete && (
                      <span className="rounded-full bg-[#e7f4ec] px-3 py-1 text-xs font-bold text-[#1f7a4c]">
                        ✅ {series.winner_team?.name} wins
                      </span>
                    )}
                    <span className="text-sm text-slate-400">{isExpanded ? '▲' : '▼'}</span>
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-[rgba(148,163,184,0.15)] bg-[rgba(248,244,236,0.58)] p-5 sm:p-6">
                    {/* Games list */}
                    {games.length > 0 && (
                      <div className="mb-4">
                        <p className="mb-3 text-sm font-semibold text-slate-700">Game Results</p>
                        <div className="space-y-1">
                          {games.map((game) => (
                            <div key={game.id} className="flex items-center justify-between rounded-2xl border border-white/80 bg-white/90 px-4 py-3 shadow-[0_10px_20px_rgba(15,23,42,0.05)]">
                              <span className="text-sm text-slate-500">Game {game.game_number}</span>
                              <span className="text-sm font-medium text-slate-900">
                                {game.winner_team?.name ?? 'Unknown'} wins
                                {game.home_score != null && game.away_score != null && (
                                  <span className="ml-2 text-xs text-slate-400">({game.home_score}–{game.away_score})</span>
                                )}
                              </span>
                              <button
                                onClick={() => deleteGame(game.id, series)}
                                className="text-xs text-red-400 hover:text-red-600"
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Add game form */}
                    {!series.is_complete && (
                      <>
                        {addingGame === series.id ? (
                          <div className="rounded-[1.5rem] border border-[#d7c1a0] bg-white/92 p-4 shadow-[0_16px_28px_rgba(15,23,42,0.06)]">
                            <p className="mb-3 text-sm font-semibold text-slate-700">
                              Enter Game {games.length + 1} Result
                            </p>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="col-span-2">
                                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Winner</label>
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setGameForm({ ...gameForm, winner_team_id: series.home_team_id })}
                                    className={`flex-1 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors ${
                                      gameForm.winner_team_id === series.home_team_id
                                        ? 'border-slate-900 bg-slate-900 text-white'
                                        : 'border-slate-200 text-slate-700 hover:border-[#d7c1a0] hover:bg-[#f8f0e1]'
                                    }`}
                                  >
                                    🏠 {homeTeam?.name}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setGameForm({ ...gameForm, winner_team_id: series.away_team_id })}
                                    className={`flex-1 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors ${
                                      gameForm.winner_team_id === series.away_team_id
                                        ? 'border-slate-900 bg-slate-900 text-white'
                                        : 'border-slate-200 text-slate-700 hover:border-[#d7c1a0] hover:bg-[#f8f0e1]'
                                    }`}
                                  >
                                    ✈️ {awayTeam?.name}
                                  </button>
                                </div>
                              </div>
                              <div>
                                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Home Score</label>
                                <input
                                  type="number"
                                  value={gameForm.home_score}
                                  onChange={(e) => setGameForm({ ...gameForm, home_score: e.target.value })}
                                  placeholder="Home score"
                                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#264653]"
                                />
                              </div>
                              <div>
                                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Away Score</label>
                                <input
                                  type="number"
                                  value={gameForm.away_score}
                                  onChange={(e) => setGameForm({ ...gameForm, away_score: e.target.value })}
                                  placeholder="Away score"
                                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#264653]"
                                />
                              </div>
                            </div>
                            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
                            <div className="mt-3 flex gap-2">
                              <button
                                onClick={() => addGame(series)}
                                disabled={saving || !gameForm.winner_team_id}
                                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#264653] disabled:opacity-40"
                              >
                                {saving ? 'Saving…' : 'Save Game Result'}
                              </button>
                              <button
                                onClick={() => { setAddingGame(null); setGameForm({ winner_team_id: '', home_score: '', away_score: '' }); setError(''); }}
                                className="rounded-xl px-4 py-2 text-sm font-medium text-slate-500 hover:bg-[#f4ede1]"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => { setAddingGame(series.id); setError(''); }}
                            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#264653]"
                          >
                            + Enter Game {games.length + 1} Result
                          </button>
                        )}
                      </>
                    )}

                    <div className="mt-4 flex justify-end">
                      <button
                        onClick={() => deleteSeries(series.id)}
                        className="text-xs font-semibold text-red-400 hover:text-red-600"
                      >
                        Delete Series
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
