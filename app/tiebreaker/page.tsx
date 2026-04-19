'use client';

import { useEffect, useState } from 'react';
import { fetchJson } from '@/lib/fetch';
import { Player } from '@/types';

interface Prediction {
  id: string;
  player_id: string;
  predicted_combined_total: number;
  player?: Player;
}

interface TiebreakerResult {
  id: string;
  nba_final_game_score: number | null;
  nhl_final_game_goals: number | null;
  combined_total: number | null;
}

export default function TiebreakerPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [result, setResult] = useState<TiebreakerResult | null>(null);
  const [loading, setLoading] = useState(true);

  const [selectedPlayer, setSelectedPlayer] = useState('');
  const [predicted, setPredicted] = useState('');
  const [nbaScore, setNbaScore] = useState('');
  const [nhlGoals, setNhlGoals] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchAll = async () => {
    try {
      const [pRes, tRes] = await Promise.all([
        fetchJson<Player[]>('/api/players'),
        fetchJson<{ predictions?: Prediction[]; result?: TiebreakerResult | null }>('/api/tiebreaker'),
      ]);

      setPlayers(Array.isArray(pRes) ? pRes : []);
      setPredictions(tRes.predictions ?? []);
      setResult(tRes.result ?? null);
      setError('');
    } catch (error: unknown) {
      setPlayers([]);
      setPredictions([]);
      setResult(null);
      setError(error instanceof Error ? error.message : 'Failed to load tiebreaker data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Legitimate API data fetch; rule is from Next.js 16 React Compiler lint
    void fetchAll();
  }, []);

  const submitPrediction = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseInt(predicted);
    if (!selectedPlayer || isNaN(val)) {
      setError('Select a player and enter a valid number');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await fetchJson('/api/tiebreaker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player_id: selectedPlayer, predicted_combined_total: val }),
      });

      setSelectedPlayer('');
      setPredicted('');
      await fetchAll();
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'Failed to save prediction');
    }
    setSaving(false);
  };

  const saveResults = async (e: React.FormEvent) => {
    e.preventDefault();
    const nba = parseInt(nbaScore);
    const nhl = parseInt(nhlGoals);
    if (isNaN(nba) || isNaN(nhl)) {
      setError('Enter valid numbers for both scores');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await fetchJson('/api/tiebreaker', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nba_final_game_score: nba, nhl_final_game_goals: nhl }),
      });

      setNbaScore('');
      setNhlGoals('');
      await fetchAll();
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'Failed to save results');
    }
    setSaving(false);
  };

  // Calculate winner if result exists
  const predictionsWithDiff = result?.combined_total != null
    ? predictions.map((p) => ({
        ...p,
        diff: Math.abs(p.predicted_combined_total - (result.combined_total ?? 0)),
      })).sort((a, b) => a.diff - b.diff)
    : [];

  if (loading) return <div className="text-gray-400">Loading…</div>;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">🔢 Tiebreaker</h1>
        <p className="text-gray-500 mt-1">
          Predict the combined total score of the final NBA game + final NHL game
        </p>
        <p className="text-gray-400 text-sm mt-1">
          (Total NBA Points + Total NHL Goals) — closest prediction wins the tiebreaker
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Submit prediction */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Submit / Update Prediction</h2>
          <form onSubmit={submitPrediction} className="space-y-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Player</label>
              <select
                value={selectedPlayer}
                onChange={(e) => setSelectedPlayer(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select player…</option>
                {players.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Predicted Combined Total (NBA pts + NHL goals)
              </label>
              <input
                type="number"
                value={predicted}
                onChange={(e) => setPredicted(e.target.value)}
                placeholder="e.g. 230"
                min={0}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={saving}
              className="w-full bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save Prediction'}
            </button>
          </form>
        </div>

        {/* Enter actual results */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Enter Actual Final Scores</h2>
          {result && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4 text-sm text-green-700">
              <p className="font-bold">Current Actual:</p>
              <p>🏀 NBA Final Game: {result.nba_final_game_score ?? '—'} pts</p>
              <p>🏒 NHL Final Game: {result.nhl_final_game_goals ?? '—'} goals</p>
              <p className="font-bold mt-1">Combined Total: {result.combined_total ?? '—'}</p>
            </div>
          )}
          <form onSubmit={saveResults} className="space-y-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">🏀 NBA Final Game — Total Points Scored</label>
              <input
                type="number"
                value={nbaScore}
                onChange={(e) => setNbaScore(e.target.value)}
                placeholder="e.g. 218"
                min={0}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">🏒 NHL Final Game — Total Goals Scored</label>
              <input
                type="number"
                value={nhlGoals}
                onChange={(e) => setNhlGoals(e.target.value)}
                placeholder="e.g. 7"
                min={0}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={saving}
              className="w-full bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
            >
              {saving ? 'Saving…' : result ? 'Update Results' : 'Enter Results'}
            </button>
          </form>
        </div>
      </div>

      {/* Predictions table */}
      <div className="mt-8 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">All Predictions</h2>
        </div>
        {predictions.length === 0 ? (
          <div className="px-6 py-8 text-gray-400 text-sm">No predictions yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-6 py-3 font-medium text-gray-500">Player</th>
                <th className="text-center px-6 py-3 font-medium text-gray-500">Predicted Total</th>
                {result?.combined_total != null && (
                  <>
                    <th className="text-center px-6 py-3 font-medium text-gray-500">Actual Total</th>
                    <th className="text-center px-6 py-3 font-medium text-gray-500">Difference</th>
                    <th className="text-center px-6 py-3 font-medium text-gray-500">Result</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {(result?.combined_total != null ? predictionsWithDiff : predictions).map((p, idx) => {
                const withDiff = p as Prediction & { diff?: number };
                const isWinner = result?.combined_total != null && idx === 0 && predictionsWithDiff.length > 0;
                return (
                  <tr key={p.id} className={`border-b border-gray-100 last:border-0 ${isWinner ? 'bg-yellow-50' : ''}`}>
                    <td className="px-6 py-3 font-medium text-gray-900">
                      {isWinner && '🏆 '}{p.player?.name ?? 'Unknown'}
                    </td>
                    <td className="px-6 py-3 text-center font-mono text-gray-700">
                      {p.predicted_combined_total}
                    </td>
                    {result?.combined_total != null && (
                      <>
                        <td className="px-6 py-3 text-center font-mono text-gray-500">
                          {result.combined_total}
                        </td>
                        <td className="px-6 py-3 text-center font-mono">
                          <span className={withDiff.diff === 0 ? 'text-green-600 font-bold' : 'text-gray-700'}>
                            {withDiff.diff}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-center">
                          {isWinner ? (
                            <span className="bg-yellow-100 text-yellow-700 text-xs font-bold px-2 py-1 rounded-full">
                              🏆 Wins Tiebreaker!
                            </span>
                          ) : (
                            <span className="text-gray-400 text-xs">#{idx + 1}</span>
                          )}
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
