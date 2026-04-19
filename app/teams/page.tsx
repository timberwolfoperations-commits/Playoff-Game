'use client';

import { useEffect, useState } from 'react';
import { Team, League } from '@/types';
import { getTeamTier } from '@/lib/scoring';

const DEFAULT_NBA_TEAMS = [
  { name: 'Boston Celtics', seed: 1, conference: 'East' },
  { name: 'New York Knicks', seed: 2, conference: 'East' },
  { name: 'Cleveland Cavaliers', seed: 3, conference: 'East' },
  { name: 'Indiana Pacers', seed: 4, conference: 'East' },
  { name: 'Milwaukee Bucks', seed: 5, conference: 'East' },
  { name: 'Orlando Magic', seed: 6, conference: 'East' },
  { name: 'Philadelphia 76ers', seed: 7, conference: 'East' },
  { name: 'Miami Heat', seed: 8, conference: 'East' },
  { name: 'Oklahoma City Thunder', seed: 1, conference: 'West' },
  { name: 'Denver Nuggets', seed: 2, conference: 'West' },
  { name: 'Minnesota Timberwolves', seed: 3, conference: 'West' },
  { name: 'LA Clippers', seed: 4, conference: 'West' },
  { name: 'Dallas Mavericks', seed: 5, conference: 'West' },
  { name: 'Phoenix Suns', seed: 6, conference: 'West' },
  { name: 'Los Angeles Lakers', seed: 7, conference: 'West' },
  { name: 'New Orleans Pelicans', seed: 8, conference: 'West' },
];

const DEFAULT_NHL_TEAMS = [
  { name: 'Florida Panthers', seed: 1, conference: 'East' },
  { name: 'Boston Bruins', seed: 2, conference: 'East' },
  { name: 'Toronto Maple Leafs', seed: 3, conference: 'East' },
  { name: 'Tampa Bay Lightning', seed: 4, conference: 'East' },
  { name: 'Carolina Hurricanes', seed: 5, conference: 'East' },
  { name: 'New Jersey Devils', seed: 6, conference: 'East' },
  { name: 'New York Rangers', seed: 7, conference: 'East' },
  { name: 'Washington Capitals', seed: 8, conference: 'East' },
  { name: 'Vancouver Canucks', seed: 1, conference: 'West' },
  { name: 'Winnipeg Jets', seed: 2, conference: 'West' },
  { name: 'Dallas Stars', seed: 3, conference: 'West' },
  { name: 'Nashville Predators', seed: 4, conference: 'West' },
  { name: 'Colorado Avalanche', seed: 5, conference: 'West' },
  { name: 'Los Angeles Kings', seed: 6, conference: 'West' },
  { name: 'Vegas Golden Knights', seed: 7, conference: 'West' },
  { name: 'Edmonton Oilers', seed: 8, conference: 'West' },
];

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [form, setForm] = useState({
    name: '',
    league: 'NBA' as League,
    seed: '',
    conference: '',
    is_wildcard: false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [activeLeague, setActiveLeague] = useState<League | 'ALL'>('ALL');

  const fetchTeams = () => {
    fetch('/api/teams')
      .then((r) => r.json())
      .then((data) => {
        setTeams(Array.isArray(data) ? data : []);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchTeams();
  }, []);

  const addTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    const seed = parseInt(form.seed);
    if (!form.name.trim() || isNaN(seed)) {
      setError('Name and seed are required');
      return;
    }
    setSaving(true);
    setError('');
    const res = await fetch('/api/teams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, seed }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? 'Failed to add team');
    } else {
      setForm({ name: '', league: 'NBA', seed: '', conference: '', is_wildcard: false });
      fetchTeams();
    }
    setSaving(false);
  };

  const deleteTeam = async (id: string) => {
    if (!confirm('Delete this team?')) return;
    await fetch(`/api/teams/${id}`, { method: 'DELETE' });
    fetchTeams();
  };

  const seedDefaultTeams = async (league: 'NBA' | 'NHL') => {
    setSeeding(true);
    const defaults = league === 'NBA' ? DEFAULT_NBA_TEAMS : DEFAULT_NHL_TEAMS;
    for (const t of defaults) {
      await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...t, league }),
      });
    }
    fetchTeams();
    setSeeding(false);
  };

  const filtered =
    activeLeague === 'ALL' ? teams : teams.filter((t) => t.league === activeLeague);

  const nbaTeams = teams.filter((t) => t.league === 'NBA');
  const nhlTeams = teams.filter((t) => t.league === 'NHL');

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">🏀🏒 Teams</h1>
        <p className="text-gray-500 mt-1">Manage playoff teams for the draft</p>
      </div>

      {/* Quick seed buttons */}
      <div className="flex gap-3 mb-6">
        {nbaTeams.length === 0 && (
          <button
            onClick={() => seedDefaultTeams('NBA')}
            disabled={seeding}
            className="bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-700 disabled:opacity-50 transition-colors"
          >
            {seeding ? 'Loading…' : '🏀 Load Default NBA Teams (2025)'}
          </button>
        )}
        {nhlTeams.length === 0 && (
          <button
            onClick={() => seedDefaultTeams('NHL')}
            disabled={seeding}
            className="bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-800 disabled:opacity-50 transition-colors"
          >
            {seeding ? 'Loading…' : '🏒 Load Default NHL Teams (2025)'}
          </button>
        )}
      </div>

      {/* Add team form */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-8 max-w-2xl">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Add Team Manually</h2>
        <form onSubmit={addTeam} className="grid grid-cols-2 gap-3">
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Team name"
            className="col-span-2 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <select
            value={form.league}
            onChange={(e) => setForm({ ...form, league: e.target.value as League })}
            className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="NBA">NBA</option>
            <option value="NHL">NHL</option>
          </select>
          <input
            type="number"
            value={form.seed}
            onChange={(e) => setForm({ ...form, seed: e.target.value })}
            placeholder="Seed (1-8)"
            min={1}
            max={16}
            className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <input
            type="text"
            value={form.conference}
            onChange={(e) => setForm({ ...form, conference: e.target.value })}
            placeholder="Conference (East/West)"
            className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={form.is_wildcard}
              onChange={(e) => setForm({ ...form, is_wildcard: e.target.checked })}
              className="rounded"
            />
            Wildcard team
          </label>
          {error && <p className="col-span-2 text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={saving}
            className="col-span-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Adding…' : 'Add Team'}
          </button>
        </form>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4">
        {(['ALL', 'NBA', 'NHL'] as const).map((lg) => (
          <button
            key={lg}
            onClick={() => setActiveLeague(lg)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              activeLeague === lg
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {lg === 'ALL' ? 'All' : lg === 'NBA' ? '🏀 NBA' : '🏒 NHL'} ({lg === 'ALL' ? teams.length : teams.filter((t) => t.league === lg).length})
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-gray-400">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="text-gray-400">No teams yet.</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-6 py-3 font-medium text-gray-500">League</th>
                <th className="text-left px-6 py-3 font-medium text-gray-500">Team</th>
                <th className="text-left px-6 py-3 font-medium text-gray-500">Conference</th>
                <th className="text-center px-6 py-3 font-medium text-gray-500">Seed</th>
                <th className="text-center px-6 py-3 font-medium text-gray-500">Tier</th>
                <th className="text-center px-6 py-3 font-medium text-gray-500">Wildcard</th>
                <th className="text-right px-6 py-3 font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t.id} className="border-b border-gray-100 last:border-0">
                  <td className="px-6 py-3">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${
                        t.league === 'NBA'
                          ? 'bg-orange-100 text-orange-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {t.league === 'NBA' ? '🏀' : '🏒'} {t.league}
                    </span>
                  </td>
                  <td className="px-6 py-3 font-medium text-gray-900">{t.name}</td>
                  <td className="px-6 py-3 text-gray-500">{t.conference ?? '—'}</td>
                  <td className="px-6 py-3 text-center text-gray-700">#{t.seed}</td>
                  <td className="px-6 py-3 text-center">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-bold ${
                        getTeamTier(t) === 1
                          ? 'bg-indigo-100 text-indigo-700'
                          : 'bg-orange-100 text-orange-700'
                      }`}
                    >
                      Tier {getTeamTier(t)}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-center">{t.is_wildcard ? '✓' : ''}</td>
                  <td className="px-6 py-3 text-right">
                    <button
                      onClick={() => deleteTeam(t.id)}
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
    </div>
  );
}
