'use client';

import { useEffect, useState, useCallback } from 'react';
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
    const [tRes, sRes] = await Promise.all([
      fetch('/api/teams').then((r) => r.json()),
      fetch('/api/series').then((r) => r.json()),
    ]);
    setTeams(Array.isArray(tRes) ? tRes : []);
    setSeriesList(Array.isArray(sRes) ? sRes : []);
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
    const res = await fetch('/api/series', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newSeries),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? 'Failed to create series');
    } else {
      setNewSeries({ league: 'NBA', round: 1, home_team_id: '', away_team_id: '' });
      fetchAll();
    }
    setSaving(false);
  };

  const deleteSeries = async (id: string) => {
    if (!confirm('Delete this series? All games will be removed.')) return;
    await fetch(`/api/series/${id}`, { method: 'DELETE' });
    fetchAll();
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

    const res = await fetch('/api/games', {
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
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? 'Failed to add game');
      setSaving(false);
      return;
    }

    // Recalculate series wins
    const updatedGames = [...(series.games ?? []), data];
    const homeWins = updatedGames.filter((g) => g.winner_team_id === series.home_team_id).length;
    const awayWins = updatedGames.filter((g) => g.winner_team_id === series.away_team_id).length;
    const isComplete = homeWins >= 4 || awayWins >= 4;
    const winnerId = homeWins >= 4 ? series.home_team_id : awayWins >= 4 ? series.away_team_id : null;

    await fetch(`/api/series/${series.id}`, {
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
    fetchAll();
    setSaving(false);
  };

  const deleteGame = async (gameId: string, series: SeriesWithGames) => {
    if (!confirm('Delete this game result?')) return;
    await fetch(`/api/games/${gameId}`, { method: 'DELETE' });

    // Recalculate wins
    const remaining = (series.games ?? []).filter((g) => g.id !== gameId);
    const homeWins = remaining.filter((g) => g.winner_team_id === series.home_team_id).length;
    const awayWins = remaining.filter((g) => g.winner_team_id === series.away_team_id).length;
    const isComplete = homeWins >= 4 || awayWins >= 4;
    const winnerId = homeWins >= 4 ? series.home_team_id : awayWins >= 4 ? series.away_team_id : null;

    await fetch(`/api/series/${series.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        home_wins: homeWins,
        away_wins: awayWins,
        is_complete: isComplete,
        winner_team_id: winnerId,
      }),
    });
    fetchAll();
  };

  const leagueTeams = (league: League) => teams.filter((t) => t.league === league);

  const filtered =
    activeLeague === 'ALL'
      ? seriesList
      : seriesList.filter((s) => s.league === activeLeague);

  if (loading) return <div className="text-gray-400">Loading…</div>;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">🎮 Series & Games</h1>
        <p className="text-gray-500 mt-1">Track playoff series and enter game results</p>
      </div>

      {/* Create series form */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-8 max-w-2xl">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Add New Series</h2>
        <form onSubmit={createSeries} className="grid grid-cols-2 gap-3">
          <select
            value={newSeries.league}
            onChange={(e) => setNewSeries({ ...newSeries, league: e.target.value as League, home_team_id: '', away_team_id: '' })}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="NBA">🏀 NBA</option>
            <option value="NHL">🏒 NHL</option>
          </select>
          <select
            value={newSeries.round}
            onChange={(e) => setNewSeries({ ...newSeries, round: parseInt(e.target.value) as SeriesRound })}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {ROUND_LABELS.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Home Team</label>
            <select
              value={newSeries.home_team_id}
              onChange={(e) => setNewSeries({ ...newSeries, home_team_id: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Select home team…</option>
              {leagueTeams(newSeries.league).map((t) => (
                <option key={t.id} value={t.id}>#{t.seed} {t.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Away Team</label>
            <select
              value={newSeries.away_team_id}
              onChange={(e) => setNewSeries({ ...newSeries, away_team_id: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Select away team…</option>
              {leagueTeams(newSeries.league)
                .filter((t) => t.id !== newSeries.home_team_id)
                .map((t) => (
                  <option key={t.id} value={t.id}>#{t.seed} {t.name}</option>
                ))}
            </select>
          </div>
          {error && <p className="col-span-2 text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={saving}
            className="col-span-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? 'Creating…' : 'Create Series'}
          </button>
        </form>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6">
        {(['ALL', 'NBA', 'NHL'] as const).map((lg) => (
          <button
            key={lg}
            onClick={() => setActiveLeague(lg)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              activeLeague === lg ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {lg === 'ALL' ? 'All' : lg === 'NBA' ? '🏀 NBA' : '🏒 NHL'} (
            {lg === 'ALL' ? seriesList.length : seriesList.filter((s) => s.league === lg).length})
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-gray-400">No series yet. Add one above.</div>
      ) : (
        <div className="space-y-4">
          {filtered.map((series) => {
            const homeTeam = series.home_team;
            const awayTeam = series.away_team;
            const games = series.games ?? [];
            const isExpanded = expandedSeries === series.id;

            return (
              <div key={series.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <button
                  onClick={() => setExpandedSeries(isExpanded ? null : series.id)}
                  className="w-full flex items-center justify-between p-5 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${series.league === 'NBA' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                      {series.league === 'NBA' ? '🏀' : '🏒'} {series.league}
                    </span>
                    <div className="text-left">
                      <p className="font-semibold text-gray-900">
                        {homeTeam?.name ?? '?'} vs {awayTeam?.name ?? '?'}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {getRoundName(series.round, series.league)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <p className="font-bold text-gray-900 text-lg">
                        {series.home_wins} – {series.away_wins}
                      </p>
                      <p className="text-xs text-gray-400">{games.length} games played</p>
                    </div>
                    {series.is_complete && (
                      <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded-full">
                        ✅ {series.winner_team?.name} wins
                      </span>
                    )}
                    <span className="text-gray-400 text-sm">{isExpanded ? '▲' : '▼'}</span>
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-gray-100 p-5 bg-gray-50">
                    {/* Games list */}
                    {games.length > 0 && (
                      <div className="mb-4">
                        <p className="text-sm font-semibold text-gray-700 mb-2">Game Results</p>
                        <div className="space-y-1">
                          {games.map((game) => (
                            <div key={game.id} className="flex items-center justify-between bg-white rounded-lg px-4 py-2 border border-gray-200">
                              <span className="text-sm text-gray-500">Game {game.game_number}</span>
                              <span className="font-medium text-gray-900 text-sm">
                                {game.winner_team?.name ?? 'Unknown'} wins
                                {game.home_score != null && game.away_score != null && (
                                  <span className="text-gray-400 ml-2 text-xs">({game.home_score}–{game.away_score})</span>
                                )}
                              </span>
                              <button
                                onClick={() => deleteGame(game.id, series)}
                                className="text-red-400 hover:text-red-600 text-xs"
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
                          <div className="bg-white rounded-lg border border-indigo-200 p-4">
                            <p className="text-sm font-semibold text-gray-700 mb-3">
                              Enter Game {games.length + 1} Result
                            </p>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="col-span-2">
                                <label className="block text-xs text-gray-500 mb-1">Winner</label>
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setGameForm({ ...gameForm, winner_team_id: series.home_team_id })}
                                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border transition-colors ${
                                      gameForm.winner_team_id === series.home_team_id
                                        ? 'bg-indigo-600 text-white border-indigo-600'
                                        : 'border-gray-300 text-gray-700 hover:border-indigo-300'
                                    }`}
                                  >
                                    🏠 {homeTeam?.name}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setGameForm({ ...gameForm, winner_team_id: series.away_team_id })}
                                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border transition-colors ${
                                      gameForm.winner_team_id === series.away_team_id
                                        ? 'bg-indigo-600 text-white border-indigo-600'
                                        : 'border-gray-300 text-gray-700 hover:border-indigo-300'
                                    }`}
                                  >
                                    ✈️ {awayTeam?.name}
                                  </button>
                                </div>
                              </div>
                              <div>
                                <label className="block text-xs text-gray-500 mb-1">Home Score (optional)</label>
                                <input
                                  type="number"
                                  value={gameForm.home_score}
                                  onChange={(e) => setGameForm({ ...gameForm, home_score: e.target.value })}
                                  placeholder="Home score"
                                  className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-gray-500 mb-1">Away Score (optional)</label>
                                <input
                                  type="number"
                                  value={gameForm.away_score}
                                  onChange={(e) => setGameForm({ ...gameForm, away_score: e.target.value })}
                                  placeholder="Away score"
                                  className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                              </div>
                            </div>
                            {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
                            <div className="flex gap-2 mt-3">
                              <button
                                onClick={() => addGame(series)}
                                disabled={saving || !gameForm.winner_team_id}
                                className="bg-indigo-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-40 transition-colors"
                              >
                                {saving ? 'Saving…' : 'Save Game Result'}
                              </button>
                              <button
                                onClick={() => { setAddingGame(null); setGameForm({ winner_team_id: '', home_score: '', away_score: '' }); setError(''); }}
                                className="text-gray-500 px-4 py-1.5 rounded-lg text-sm hover:bg-gray-100"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => { setAddingGame(series.id); setError(''); }}
                            className="text-sm bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
                          >
                            + Enter Game {games.length + 1} Result
                          </button>
                        )}
                      </>
                    )}

                    <div className="flex justify-end mt-4">
                      <button
                        onClick={() => deleteSeries(series.id)}
                        className="text-red-400 hover:text-red-600 text-xs font-medium"
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
