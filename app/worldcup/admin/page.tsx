'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { WcPlayer, WcTeam, WcMatch, WcPick } from '@/types';
import { fetchJson } from '@/lib/fetch';

const GROUPS = ['A','B','C','D','E','F','G','H','I','J','K','L'];
const STAGES = ['group', 'r32', 'r16', 'qf', 'sf', 'final'] as const;
const STAGE_LABELS: Record<string, string> = {
  group: 'Group Stage', r32: 'R32', r16: 'R16', qf: 'QF', sf: 'SF', final: 'Final',
};

export default function WcAdminPage() {
  const router = useRouter();
  const [tab, setTab] = useState<'picks' | 'matches'>('picks');

  // Auth
  const [authed, setAuthed] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  // Data
  const [players, setPlayers] = useState<WcPlayer[]>([]);
  const [teams, setTeams] = useState<WcTeam[]>([]);
  const [picks, setPicks] = useState<WcPick[]>([]);
  const [matches, setMatches] = useState<WcMatch[]>([]);
  const [loading, setLoading] = useState(true);

  // Add player form
  const [newPlayerName, setNewPlayerName] = useState('');
  const [addingPlayer, setAddingPlayer] = useState(false);

  // Add pick form
  const [pickPlayerId, setPickPlayerId] = useState('');
  const [pickTeamId, setPickTeamId] = useState('');
  const [addingPick, setAddingPick] = useState(false);

  // Add match form
  const [matchStage, setMatchStage] = useState<string>('group');
  const [matchGroup, setMatchGroup] = useState('A');
  const [matchHomeId, setMatchHomeId] = useState('');
  const [matchAwayId, setMatchAwayId] = useState('');
  const [matchPlayedAt, setMatchPlayedAt] = useState('');
  const [matchVenue, setMatchVenue] = useState('');
  const [addingMatch, setAddingMatch] = useState(false);

  // Edit match result
  const [editingMatch, setEditingMatch] = useState<string | null>(null);
  const [editHomeScore, setEditHomeScore] = useState('');
  const [editAwayScore, setEditAwayScore] = useState('');
  const [savingResult, setSavingResult] = useState(false);

  const [formError, setFormError] = useState('');

  // Check auth
  const checkAuth = useCallback(async () => {
    try {
      const status = await fetchJson<{ isAdmin: boolean }>('/api/admin/status');
      setAuthed(status.isAdmin);
    } catch {
      setAuthed(false);
    } finally {
      setAuthChecked(true);
    }
  }, []);

  const loadData = useCallback(async () => {
    try {
      const [p, t, pk, m] = await Promise.all([
        fetchJson<WcPlayer[]>('/api/worldcup/players'),
        fetchJson<WcTeam[]>('/api/worldcup/teams'),
        fetchJson<WcPick[]>('/api/worldcup/picks'),
        fetchJson<WcMatch[]>('/api/worldcup/matches'),
      ]);
      setPlayers(Array.isArray(p) ? p : []);
      setTeams(Array.isArray(t) ? t : []);
      setPicks(Array.isArray(pk) ? pk : []);
      setMatches(Array.isArray(m) ? m : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Legitimate API data fetch; same pattern as admin/dashboard
    void checkAuth();
    void loadData();
  }, [checkAuth, loadData]);

  useEffect(() => {
    if (authChecked && !authed) {
      router.push('/admin');
    }
  }, [authChecked, authed, router]);

  const addPlayer = async () => {
    if (!newPlayerName.trim()) return;
    setAddingPlayer(true);
    setFormError('');
    try {
      await fetchJson('/api/worldcup/players', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newPlayerName.trim() }),
      });
      setNewPlayerName('');
      await loadData();
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : 'Failed to add player');
    } finally {
      setAddingPlayer(false);
    }
  };

  const deletePlayer = async (id: string) => {
    if (!confirm('Delete this player and all their picks?')) return;
    try {
      await fetchJson('/api/worldcup/players', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      await loadData();
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : 'Failed to delete player');
    }
  };

  const addPick = async () => {
    if (!pickPlayerId || !pickTeamId) return;
    setAddingPick(true);
    setFormError('');
    const playerPicks = picks.filter((pk) => pk.player_id === pickPlayerId);
    const pickOrder = playerPicks.length;
    try {
      await fetchJson('/api/worldcup/picks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player_id: pickPlayerId, team_id: pickTeamId, pick_order: pickOrder }),
      });
      setPickTeamId('');
      await loadData();
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : 'Failed to add pick');
    } finally {
      setAddingPick(false);
    }
  };

  const deletePick = async (id: string) => {
    try {
      await fetchJson('/api/worldcup/picks', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      await loadData();
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : 'Failed to remove pick');
    }
  };

  const addMatch = async () => {
    if (!matchHomeId || !matchAwayId) return;
    setAddingMatch(true);
    setFormError('');
    try {
      await fetchJson('/api/worldcup/matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stage: matchStage,
          group_letter: matchStage === 'group' ? matchGroup : null,
          home_team_id: matchHomeId,
          away_team_id: matchAwayId,
          played_at: matchPlayedAt || null,
          venue: matchVenue.trim() || null,
        }),
      });
      setMatchHomeId('');
      setMatchAwayId('');
      setMatchPlayedAt('');
      setMatchVenue('');
      await loadData();
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : 'Failed to add match');
    } finally {
      setAddingMatch(false);
    }
  };

  const saveResult = async (matchId: string) => {
    const hs = parseInt(editHomeScore, 10);
    const as_ = parseInt(editAwayScore, 10);
    if (isNaN(hs) || isNaN(as_)) { setFormError('Scores must be numbers'); return; }
    setSavingResult(true);
    setFormError('');

    const match = matches.find((m) => m.id === matchId);
    let winnerId: string | null = null;
    if (hs > as_ && match?.home_team_id) winnerId = match.home_team_id;
    else if (as_ > hs && match?.away_team_id) winnerId = match.away_team_id;

    try {
      await fetchJson(`/api/worldcup/matches/${matchId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          home_score: hs,
          away_score: as_,
          winner_team_id: winnerId,
          is_complete: true,
        }),
      });
      setEditingMatch(null);
      setEditHomeScore('');
      setEditAwayScore('');
      await loadData();
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : 'Failed to save result');
    } finally {
      setSavingResult(false);
    }
  };

  const deleteMatch = async (id: string) => {
    if (!confirm('Delete this match?')) return;
    try {
      await fetchJson(`/api/worldcup/matches/${id}`, { method: 'DELETE' });
      await loadData();
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : 'Failed to delete match');
    }
  };

  if (!authChecked || loading) {
    return (
      <div className="rounded-[1.75rem] border border-white/70 bg-[rgba(255,255,255,0.7)] py-20 text-center text-slate-400">
        Loading…
      </div>
    );
  }

  const inputCls = 'rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-[#b7893d]';
  const btnCls = 'rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white transition-all hover:bg-slate-700 disabled:opacity-40';
  const dangerBtnCls = 'rounded-lg border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-100';

  const availableTeams = teams.filter((t) => !picks.some((pk) => pk.team_id === t.id));

  return (
    <div className="space-y-5">
      <div className="rounded-[1.75rem] border border-white/75 bg-[rgba(255,255,255,0.76)] p-5 shadow-[0_18px_40px_rgba(15,23,42,0.08)] backdrop-blur-sm">
        <h2 className="mb-1 font-serif text-xl font-semibold tracking-tight text-slate-950">🌍 World Cup Admin</h2>
        <p className="text-sm text-slate-500">Manage players, picks, and match results.</p>
      </div>

      {formError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {formError}
        </div>
      )}

      {/* Tab switcher */}
      <div className="flex gap-2">
        {(['picks', 'matches'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-full px-5 py-2 text-sm font-semibold transition-all ${
              tab === t ? 'bg-slate-900 text-white' : 'border border-slate-200 bg-white/80 text-slate-600 hover:bg-[#f4ede1]'
            }`}
          >
            {t === 'picks' ? '👤 Players & Picks' : '⚽ Matches'}
          </button>
        ))}
      </div>

      {tab === 'picks' && (
        <div className="space-y-5">
          {/* Add Player */}
          <div className="rounded-[1.5rem] border border-white/75 bg-[rgba(255,255,255,0.76)] p-5 shadow-[0_12px_30px_rgba(15,23,42,0.07)]">
            <h3 className="mb-3 font-semibold text-slate-800">Add Player</h3>
            <div className="flex gap-2">
              <input
                className={`${inputCls} flex-1`}
                placeholder="Player name"
                value={newPlayerName}
                onChange={(e) => setNewPlayerName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addPlayer()}
              />
              <button onClick={addPlayer} disabled={!newPlayerName.trim() || addingPlayer} className={btnCls}>
                {addingPlayer ? 'Adding…' : 'Add'}
              </button>
            </div>
          </div>

          {/* Players & Picks */}
          <div className="rounded-[1.5rem] border border-white/75 bg-[rgba(255,255,255,0.76)] p-5 shadow-[0_12px_30px_rgba(15,23,42,0.07)]">
            <h3 className="mb-4 font-semibold text-slate-800">Players &amp; Picks</h3>
            {players.length === 0 ? (
              <p className="text-sm text-slate-400 italic">No players yet.</p>
            ) : (
              <div className="space-y-4">
                {players.map((player) => {
                  const playerPicks = picks.filter((pk) => pk.player_id === player.id);
                  return (
                    <div key={player.id} className="rounded-xl border border-[rgba(148,163,184,0.2)] p-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-semibold text-slate-900">{player.name}</p>
                        <button onClick={() => deletePlayer(player.id)} className={dangerBtnCls}>Remove</button>
                      </div>
                      <div className="flex flex-wrap gap-1 mb-3">
                        {playerPicks.map((pk) => (
                          <span key={pk.id} className="flex items-center gap-1 rounded-full border border-[#dbc7a4] bg-[#faf5ea] px-2 py-0.5 text-xs font-medium text-[#7c5b1f]">
                            {pk.team?.name}
                            <button
                              onClick={() => deletePick(pk.id)}
                              className="ml-0.5 text-red-400 hover:text-red-600 font-bold"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                        {playerPicks.length === 0 && (
                          <span className="text-xs text-slate-400 italic">No teams picked</span>
                        )}
                      </div>
                      {/* Quick pick form for this player */}
                      <div className="flex gap-2">
                        <select
                          className={`${inputCls} flex-1`}
                          value={pickPlayerId === player.id ? pickTeamId : ''}
                          onChange={(e) => { setPickPlayerId(player.id); setPickTeamId(e.target.value); }}
                        >
                          <option value="">Add team…</option>
                          {GROUPS.map((g) => (
                            <optgroup key={g} label={`Group ${g}`}>
                              {availableTeams.filter((t) => t.group_letter === g).map((t) => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                              ))}
                            </optgroup>
                          ))}
                        </select>
                        <button
                          onClick={() => { setPickPlayerId(player.id); addPick(); }}
                          disabled={addingPick || !(pickPlayerId === player.id ? pickTeamId : '')}
                          className={btnCls}
                        >
                          Pick
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'matches' && (
        <div className="space-y-5">
          {/* Add Match */}
          <div className="rounded-[1.5rem] border border-white/75 bg-[rgba(255,255,255,0.76)] p-5 shadow-[0_12px_30px_rgba(15,23,42,0.07)]">
            <h3 className="mb-3 font-semibold text-slate-800">Add Match</h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-500 uppercase tracking-wide">Stage</label>
                <select className={`${inputCls} w-full`} value={matchStage} onChange={(e) => setMatchStage(e.target.value)}>
                  {STAGES.map((s) => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
                </select>
              </div>
              {matchStage === 'group' && (
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-500 uppercase tracking-wide">Group</label>
                  <select className={`${inputCls} w-full`} value={matchGroup} onChange={(e) => setMatchGroup(e.target.value)}>
                    {GROUPS.map((g) => <option key={g} value={g}>Group {g}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-500 uppercase tracking-wide">Home Team</label>
                <select className={`${inputCls} w-full`} value={matchHomeId} onChange={(e) => setMatchHomeId(e.target.value)}>
                  <option value="">Select…</option>
                  {GROUPS.map((g) => (
                    <optgroup key={g} label={`Group ${g}`}>
                      {teams.filter((t) => t.group_letter === g).map((t) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-500 uppercase tracking-wide">Away Team</label>
                <select className={`${inputCls} w-full`} value={matchAwayId} onChange={(e) => setMatchAwayId(e.target.value)}>
                  <option value="">Select…</option>
                  {GROUPS.map((g) => (
                    <optgroup key={g} label={`Group ${g}`}>
                      {teams.filter((t) => t.group_letter === g).map((t) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-500 uppercase tracking-wide">Date &amp; Time</label>
                <input type="datetime-local" className={`${inputCls} w-full`} value={matchPlayedAt} onChange={(e) => setMatchPlayedAt(e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-500 uppercase tracking-wide">Venue</label>
                <input type="text" className={`${inputCls} w-full`} placeholder="Stadium name" value={matchVenue} onChange={(e) => setMatchVenue(e.target.value)} />
              </div>
            </div>
            <div className="mt-3">
              <button
                onClick={addMatch}
                disabled={!matchHomeId || !matchAwayId || addingMatch}
                className={btnCls}
              >
                {addingMatch ? 'Adding…' : 'Add Match'}
              </button>
            </div>
          </div>

          {/* Match list with result entry */}
          <div className="rounded-[1.5rem] border border-white/75 bg-[rgba(255,255,255,0.76)] p-5 shadow-[0_12px_30px_rgba(15,23,42,0.07)]">
            <h3 className="mb-4 font-semibold text-slate-800">Matches ({matches.length})</h3>
            {matches.length === 0 ? (
              <p className="text-sm text-slate-400 italic">No matches yet.</p>
            ) : (
              <div className="space-y-2">
                {matches.map((match) => (
                  <div key={match.id} className="rounded-xl border border-[rgba(148,163,184,0.2)] p-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                        {STAGE_LABELS[match.stage]}{match.group_letter ? ` · Group ${match.group_letter}` : ''}
                      </span>
                      <span className="flex-1 text-sm font-medium text-slate-800">
                        {match.home_team?.name ?? 'TBD'} vs {match.away_team?.name ?? 'TBD'}
                      </span>
                      {match.is_complete ? (
                        <span className="font-bold text-[#264653]">
                          {match.home_score} – {match.away_score}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">Pending</span>
                      )}
                      <div className="flex gap-1">
                        <button
                          onClick={() => {
                            setEditingMatch(editingMatch === match.id ? null : match.id);
                            setEditHomeScore(match.home_score?.toString() ?? '');
                            setEditAwayScore(match.away_score?.toString() ?? '');
                          }}
                          className="rounded-lg border border-[#dbc7a4] bg-[#faf5ea] px-3 py-1 text-xs font-semibold text-[#7c5b1f] hover:bg-[#f4ede1]"
                        >
                          {match.is_complete ? 'Edit' : 'Result'}
                        </button>
                        <button onClick={() => deleteMatch(match.id)} className={dangerBtnCls}>Del</button>
                      </div>
                    </div>
                    {editingMatch === match.id && (
                      <div className="mt-3 flex items-center gap-2 flex-wrap">
                        <input
                          type="number"
                          min={0}
                          placeholder="Home"
                          value={editHomeScore}
                          onChange={(e) => setEditHomeScore(e.target.value)}
                          className={`${inputCls} w-20`}
                        />
                        <span className="text-slate-400 font-bold">–</span>
                        <input
                          type="number"
                          min={0}
                          placeholder="Away"
                          value={editAwayScore}
                          onChange={(e) => setEditAwayScore(e.target.value)}
                          className={`${inputCls} w-20`}
                        />
                        <button
                          onClick={() => saveResult(match.id)}
                          disabled={savingResult}
                          className={btnCls}
                        >
                          {savingResult ? 'Saving…' : 'Save'}
                        </button>
                        <button onClick={() => setEditingMatch(null)} className="text-sm text-slate-400 hover:text-slate-600">
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
