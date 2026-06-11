'use client';

import { useEffect, useMemo, useState } from 'react';
import { WcPick, WcPlayer, WcTeam } from '@/types';
import { fetchJson } from '@/lib/fetch';

export default function WcDraftPage() {
  const [players, setPlayers] = useState<WcPlayer[]>([]);
  const [teams, setTeams] = useState<WcTeam[]>([]);
  const [picks, setPicks] = useState<WcPick[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [playersData, teamsData, picksData] = await Promise.all([
        fetchJson<WcPlayer[]>('/api/worldcup/players'),
        fetchJson<WcTeam[]>('/api/worldcup/teams'),
        fetchJson<WcPick[]>('/api/worldcup/picks'),
      ]);
      setPlayers(Array.isArray(playersData) ? playersData : []);
      setTeams(Array.isArray(teamsData) ? teamsData : []);
      setPicks(Array.isArray(picksData) ? picksData : []);
      setError(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unable to load draft data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Legitimate API data fetch; same pattern as worldcup admin page
    load();
  }, []);

  const picksByPlayer = useMemo(() => {
    const map = new Map<string, WcPick[]>();
    for (const player of players) map.set(player.id, []);
    for (const pick of picks) {
      const list = map.get(pick.player_id);
      if (list) list.push(pick);
      else map.set(pick.player_id, [pick]);
    }
    return map;
  }, [players, picks]);

  const pickedTeamIds = useMemo(() => new Set(picks.map((pick) => pick.team_id)), [picks]);

  const availableTeams = useMemo(
    () => teams.filter((team) => !pickedTeamIds.has(team.id)),
    [teams, pickedTeamIds]
  );

  const snakeState = useMemo(() => {
    if (players.length === 0) {
      return { currentPlayer: null as WcPlayer | null, round: 0, direction: 'forward' as const, overallPick: 1 };
    }
    const totalPicks = picks.length;
    const playerCount = players.length;
    const roundIndex = Math.floor(totalPicks / playerCount);
    const offset = totalPicks % playerCount;
    const direction: 'forward' | 'reverse' = roundIndex % 2 === 0 ? 'forward' : 'reverse';
    const index = direction === 'forward' ? offset : playerCount - 1 - offset;
    return {
      currentPlayer: players[index] ?? null,
      round: roundIndex + 1,
      direction,
      overallPick: totalPicks + 1,
    };
  }, [players, picks.length]);

  const roundOrder = useMemo(
    () => (snakeState.direction === 'forward' ? players : [...players].reverse()),
    [players, snakeState.direction]
  );

  const handlePick = async () => {
    if (!snakeState.currentPlayer || !selectedTeamId) return;
    setSubmitting(true);
    setError(null);
    try {
      await fetchJson('/api/worldcup/picks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player_id: snakeState.currentPlayer.id, team_id: selectedTeamId }),
      });
      setSelectedTeamId('');
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to submit pick.');
    } finally {
      setSubmitting(false);
    }
  };

  const draftComplete = availableTeams.length === 0 || !snakeState.currentPlayer;

  if (loading) {
    return (
      <div className="rounded-[1.75rem] border border-white/75 bg-[rgba(255,255,255,0.76)] py-20 text-center text-slate-400">
        Loading draft board…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-[1.75rem] border border-white/75 bg-[rgba(255,255,255,0.76)] p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)] backdrop-blur-sm">
        <h1 className="font-serif text-3xl tracking-tight text-slate-950">🌍 World Cup 2026 Pool</h1>
        <p className="mt-3 text-slate-600">Live snake draft board for team selection.</p>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-[#dbc7a4] bg-[#faf5ea] p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">On the clock</p>
            <p className="mt-1 text-lg font-bold text-slate-900">{snakeState.currentPlayer?.name ?? 'Draft Complete'}</p>
          </div>
          <div className="rounded-xl border border-[#dbc7a4] bg-[#faf5ea] p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Pick</p>
            <p className="mt-1 text-lg font-bold text-slate-900">#{snakeState.overallPick}</p>
          </div>
          <div className="rounded-xl border border-[#dbc7a4] bg-[#faf5ea] p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Round</p>
            <p className="mt-1 text-lg font-bold text-slate-900">
              {snakeState.round} · {snakeState.direction === 'forward' ? 'Forward' : 'Reverse'}
            </p>
          </div>
        </div>

        {!draftComplete && (
          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <select
              className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-[#b7893d]"
              value={selectedTeamId}
              onChange={(e) => setSelectedTeamId(e.target.value)}
            >
              <option value="">Select a team...</option>
              {availableTeams.map((team) => (
                <option key={team.id} value={team.id}>
                  Group {team.group_letter} · {team.name}
                </option>
              ))}
            </select>
            <button
              className="rounded-xl bg-slate-900 px-5 py-2 text-sm font-bold text-white transition-all hover:bg-slate-700 disabled:opacity-40"
              onClick={handlePick}
              disabled={!selectedTeamId || submitting}
            >
              {submitting ? 'Submitting…' : `${snakeState.currentPlayer?.name ?? 'Player'} Drafts`}
            </button>
          </div>
        )}
        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
      </div>

      <div className="rounded-[1.75rem] border border-white/75 bg-[rgba(255,255,255,0.76)] p-6 shadow-[0_18px_40px_rgba(15,23,42,0.08)] backdrop-blur-sm">
        <h2 className="font-serif text-xl font-semibold tracking-tight text-slate-900">Current Round Order</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {roundOrder.map((player, index) => (
            <div
              key={player.id}
              className={`rounded-full border px-3 py-1 text-sm ${
                snakeState.currentPlayer?.id === player.id
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : 'border-[#dbc7a4] bg-[#faf5ea] text-[#7c5b1f]'
              }`}
            >
              {index + 1}. {player.name}
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-[1.75rem] border border-white/75 bg-[rgba(255,255,255,0.76)] p-6 shadow-[0_18px_40px_rgba(15,23,42,0.08)] backdrop-blur-sm">
        <h2 className="font-serif text-xl font-semibold tracking-tight text-slate-900">Players &amp; Teams</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {players.map((player) => {
            const playerPicks = picksByPlayer.get(player.id) ?? [];
            return (
              <div key={player.id} className="rounded-xl border border-[rgba(148,163,184,0.2)] p-4">
                <p className="font-semibold text-slate-900">{player.name}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {playerPicks.map((pick) => (
                    <span key={pick.id} className="rounded-full border border-[#dbc7a4] bg-[#faf5ea] px-2 py-0.5 text-xs font-medium text-[#7c5b1f]">
                      {pick.team?.name ?? 'Team'}
                    </span>
                  ))}
                  {playerPicks.length === 0 && (
                    <span className="text-xs italic text-slate-400">No teams yet</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-[1.75rem] border border-white/75 bg-[rgba(255,255,255,0.76)] p-6 shadow-[0_18px_40px_rgba(15,23,42,0.08)] backdrop-blur-sm">
        <h2 className="font-serif text-xl font-semibold tracking-tight text-slate-900">
          Remaining Teams ({availableTeams.length})
        </h2>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {availableTeams.map((team) => (
            <span key={team.id} className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-xs text-slate-600">
              {team.name}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
