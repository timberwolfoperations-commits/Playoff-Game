'use client';

import { useEffect, useState } from 'react';
import { fetchJson } from '@/lib/fetch';
import { Player } from '@/types';

const MAX_PLAYERS = 8;

export default function PlayersPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchPlayers = async () => {
    try {
      const data = await fetchJson<Player[]>('/api/players');

        setPlayers(Array.isArray(data) ? data : []);
        setError('');
    } catch (error: unknown) {
      setPlayers([]);
      setError(error instanceof Error ? error.message : 'Failed to load players');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchPlayers();
  }, []);

  const addPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || players.length >= MAX_PLAYERS) return;
    setSaving(true);
    setError('');
    try {
      await fetchJson<Player>('/api/players', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });

      setName('');
      await fetchPlayers();
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'Failed to add player');
    }
    setSaving(false);
  };

  const deletePlayer = async (id: string) => {
    if (!confirm('Delete this player? This will also remove their draft picks.')) return;

    try {
      await fetchJson(`/api/players/${id}`, { method: 'DELETE' });
      await fetchPlayers();
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'Failed to delete player');
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">👤 Players</h1>
        <p className="text-gray-500 mt-1">Manage the 8 players in the game</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-8 max-w-lg">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Add Player</h2>
        <form onSubmit={addPlayer} className="flex gap-3">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Player name"
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            type="submit"
            disabled={saving || !name.trim() || players.length >= MAX_PLAYERS}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Adding…' : 'Add'}
          </button>
        </form>
        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        {players.length >= MAX_PLAYERS && (
          <p className="text-amber-600 text-sm mt-2">
            Player limit reached. Remove someone before adding another player.
          </p>
        )}
      </div>

      {loading ? (
        <div className="text-gray-400">Loading…</div>
      ) : players.length === 0 ? (
        <div className="text-gray-400">No players yet. Add one above.</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-6 py-3 font-medium text-gray-500">#</th>
                <th className="text-left px-6 py-3 font-medium text-gray-500">Name</th>
                <th className="text-right px-6 py-3 font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {players.map((p, idx) => (
                <tr key={p.id} className="border-b border-gray-100 last:border-0">
                  <td className="px-6 py-3 text-gray-400">{idx + 1}</td>
                  <td className="px-6 py-3 font-medium text-gray-900">{p.name}</td>
                  <td className="px-6 py-3 text-right">
                    <button
                      onClick={() => deletePlayer(p.id)}
                      className="text-red-500 hover:text-red-700 text-xs font-medium"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-6 bg-indigo-50 border border-indigo-200 rounded-xl p-4 text-sm text-indigo-700">
        <strong>Note:</strong> This game supports up to 8 players. The snake draft order will be
        determined by the order players are added here.
      </div>
    </div>
  );
}
