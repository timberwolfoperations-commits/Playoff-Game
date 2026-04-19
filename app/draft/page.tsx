'use client';

import { useEffect, useState, useMemo } from 'react';
import { Player, Team, DraftPick } from '@/types';
import { getSnakeDraftOrder, getTeamTier } from '@/lib/scoring';

const TOTAL_ROUNDS = 4; // Each player drafts 4 teams (2 NBA + 2 NHL)

export default function DraftPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [picks, setPicks] = useState<DraftPick[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState('');
  const [filterLeague, setFilterLeague] = useState<'ALL' | 'NBA' | 'NHL'>('ALL');
  const [error, setError] = useState('');

  const fetchAll = async () => {
    const [pRes, tRes, dRes] = await Promise.all([
      fetch('/api/players').then((r) => r.json()),
      fetch('/api/teams').then((r) => r.json()),
      fetch('/api/draft').then((r) => r.json()),
    ]);
    setPlayers(Array.isArray(pRes) ? pRes : []);
    setTeams(Array.isArray(tRes) ? tRes : []);
    setPicks(Array.isArray(dRes) ? dRes : []);
    setLoading(false);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchAll();
  }, []);

  // Build snake draft order
  const draftOrder = useMemo(
    () => getSnakeDraftOrder(players.length, TOTAL_ROUNDS),
    [players.length]
  );

  const currentPickNumber = picks.length; // 0-indexed; next pick is at this index
  const isDraftComplete = currentPickNumber >= draftOrder.length || players.length === 0;

  const currentPlayerIndex = !isDraftComplete ? draftOrder[currentPickNumber] : -1;
  const currentPlayer = players[currentPlayerIndex] ?? null;

  // Already-drafted team IDs
  const draftedTeamIds = new Set(picks.map((p) => p.team_id));

  // Available teams by league constraint
  const playerPicksSoFar = picks.filter((p) => p.player_id === currentPlayer?.id);
  const playerNBACount = playerPicksSoFar.filter((p) => p.team?.league === 'NBA').length;
  const playerNHLCount = playerPicksSoFar.filter((p) => p.team?.league === 'NHL').length;

  const availableTeams = teams.filter((t) => {
    if (draftedTeamIds.has(t.id)) return false;
    // Each player needs exactly 2 NBA and 2 NHL
    if (t.league === 'NBA' && playerNBACount >= 2) return false;
    if (t.league === 'NHL' && playerNHLCount >= 2) return false;
    return true;
  });

  const filteredAvailable =
    filterLeague === 'ALL'
      ? availableTeams
      : availableTeams.filter((t) => t.league === filterLeague);

  const makePick = async () => {
    if (!selectedTeam || !currentPlayer) return;
    setSaving(true);
    setError('');
    const res = await fetch('/api/draft', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        player_id: currentPlayer.id,
        team_id: selectedTeam,
        pick_number: currentPickNumber + 1,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? 'Failed to make pick');
    } else {
      setSelectedTeam('');
      fetchAll();
    }
    setSaving(false);
  };

  const resetDraft = async () => {
    if (!confirm('Reset the entire draft? All picks will be removed.')) return;
    await fetch('/api/draft', { method: 'DELETE' });
    fetchAll();
  };

  const undoLastPick = async () => {
    if (picks.length === 0) return;
    const lastPick = picks[picks.length - 1];
    await fetch(`/api/draft/${lastPick.id}`, { method: 'DELETE' });
    fetchAll();
  };

  // Build pick board: playerIndex -> round -> pick
  const pickBoard: Record<string, (DraftPick | null)[]> = {};
  players.forEach((p) => {
    pickBoard[p.id] = Array(TOTAL_ROUNDS).fill(null);
  });
  picks.forEach((pick) => {
    const roundIdx = Math.floor((pick.pick_number - 1) / players.length);
    if (pickBoard[pick.player_id]) {
      pickBoard[pick.player_id][roundIdx] = pick;
    }
  });

  if (loading) return <div className="text-gray-400">Loading…</div>;

  return (
    <div>
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">📋 Snake Draft</h1>
          <p className="text-gray-500 mt-1">
            Each player drafts 2 NBA + 2 NHL teams · Snake order (1→{players.length},&nbsp;
            {players.length}→1, …)
          </p>
        </div>
        {picks.length > 0 && (
          <div className="flex gap-2">
            <button
              onClick={undoLastPick}
              className="text-sm bg-yellow-100 text-yellow-700 px-3 py-1.5 rounded-lg hover:bg-yellow-200 transition-colors"
            >
              ↩ Undo Last Pick
            </button>
            <button
              onClick={resetDraft}
              className="text-sm bg-red-100 text-red-700 px-3 py-1.5 rounded-lg hover:bg-red-200 transition-colors"
            >
              🗑 Reset Draft
            </button>
          </div>
        )}
      </div>

      {players.length < 2 ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-yellow-700">
          <p>You need at least 2 players to run a draft.</p>
          <a href="/players" className="underline font-medium mt-1 inline-block">
            Add players →
          </a>
        </div>
      ) : teams.length === 0 ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-yellow-700">
          <p>No teams available. Load some teams first.</p>
          <a href="/teams" className="underline font-medium mt-1 inline-block">
            Add teams →
          </a>
        </div>
      ) : (
        <>
          {/* Current pick section */}
          {!isDraftComplete ? (
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-6 mb-8">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl">🎯</span>
                <div>
                  <p className="font-bold text-indigo-900 text-lg">
                    Pick #{currentPickNumber + 1} — {currentPlayer?.name}
                  </p>
                  <p className="text-indigo-600 text-sm">
                    Round {Math.floor(currentPickNumber / players.length) + 1} of {TOTAL_ROUNDS} ·
                    Needs: {2 - playerNBACount} more NBA, {2 - playerNHLCount} more NHL
                  </p>
                </div>
              </div>

              <div className="flex gap-2 mb-4">
                {(['ALL', 'NBA', 'NHL'] as const).map((lg) => (
                  <button
                    key={lg}
                    onClick={() => setFilterLeague(lg)}
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      filterLeague === lg
                        ? 'bg-indigo-600 text-white'
                        : 'bg-white text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {lg === 'ALL' ? 'All' : lg === 'NBA' ? '🏀 NBA' : '🏒 NHL'}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-64 overflow-y-auto mb-4">
                {filteredAvailable.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTeam(selectedTeam === t.id ? '' : t.id)}
                    className={`p-2.5 rounded-lg border text-left text-xs transition-colors ${
                      selectedTeam === t.id
                        ? 'border-indigo-500 bg-indigo-100 text-indigo-900 font-semibold'
                        : 'border-gray-200 bg-white hover:border-indigo-300'
                    }`}
                  >
                    <div className="font-medium">{t.name}</div>
                    <div className="text-gray-400 mt-0.5">
                      {t.league === 'NBA' ? '🏀' : '🏒'} #{t.seed}
                      {t.is_wildcard ? ' WC' : ''} · Tier {getTeamTier(t)}
                    </div>
                  </button>
                ))}
                {filteredAvailable.length === 0 && (
                  <p className="text-gray-400 col-span-4 text-sm">
                    No available teams in this category.
                  </p>
                )}
              </div>

              {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

              <button
                onClick={makePick}
                disabled={!selectedTeam || saving}
                className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-40 transition-colors"
              >
                {saving ? 'Selecting…' : selectedTeam ? `Pick ${teams.find((t) => t.id === selectedTeam)?.name}` : 'Select a team above'}
              </button>
            </div>
          ) : (
            <div className="bg-green-50 border border-green-200 rounded-xl p-6 mb-8 text-green-800">
              <p className="font-bold text-lg">✅ Draft Complete!</p>
              <p className="text-sm mt-1">All {picks.length} picks have been made.</p>
            </div>
          )}

          {/* Draft board */}
          <h2 className="text-xl font-bold text-gray-800 mb-4">Draft Board</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="text-left px-4 py-3 font-medium text-gray-600 border border-gray-200">
                    Player
                  </th>
                  {Array.from({ length: TOTAL_ROUNDS }, (_, i) => (
                    <th
                      key={i}
                      className="text-center px-4 py-3 font-medium text-gray-600 border border-gray-200"
                    >
                      Round {i + 1}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {players.map((player) => (
                  <tr key={player.id} className="border border-gray-200">
                    <td className="px-4 py-3 font-medium text-gray-900 bg-gray-50 border border-gray-200">
                      {player.name}
                    </td>
                    {Array.from({ length: TOTAL_ROUNDS }, (_, roundIdx) => {
                      const pick = pickBoard[player.id]?.[roundIdx];
                      return (
                        <td
                          key={roundIdx}
                          className="px-4 py-3 text-center border border-gray-200"
                        >
                          {pick ? (
                            <div>
                              <div className="font-medium text-gray-900">{pick.team?.name}</div>
                              <div className="text-xs text-gray-400 mt-0.5">
                                {pick.team?.league === 'NBA' ? '🏀' : '🏒'} #{pick.team?.seed}
                                {pick.team?.is_wildcard ? ' WC' : ''} ·{' '}
                                {pick.team && `Tier ${getTeamTier(pick.team)}`}
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Draft order legend */}
          <div className="mt-6 bg-gray-50 rounded-xl border border-gray-200 p-4">
            <p className="text-sm font-semibold text-gray-700 mb-2">Snake Draft Order</p>
            <div className="flex flex-wrap gap-1 text-xs text-gray-500">
              {draftOrder.map((playerIdx, pickIdx) => (
                <span
                  key={pickIdx}
                  className={`px-2 py-0.5 rounded ${
                    pickIdx < picks.length
                      ? 'bg-green-100 text-green-700'
                      : pickIdx === picks.length
                      ? 'bg-indigo-600 text-white font-bold'
                      : 'bg-gray-100'
                  }`}
                >
                  #{pickIdx + 1}: {players[playerIdx]?.name ?? `P${playerIdx + 1}`}
                </span>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
