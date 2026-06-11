'use client';

import { useEffect, useState } from 'react';
import { WcTeam, WcMatch, WcGroupStanding, WcPick } from '@/types';
import { fetchJson } from '@/lib/fetch';

const GROUPS = ['A','B','C','D','E','F','G','H','I','J','K','L'];

function buildStandings(
  teams: WcTeam[],
  matches: WcMatch[],
  picks: WcPick[],
): Map<string, WcGroupStanding[]> {
  const groupMap = new Map<string, WcGroupStanding[]>();

  for (const group of GROUPS) {
    const groupTeams = teams.filter((t) => t.group_letter === group);
    const standings: WcGroupStanding[] = groupTeams.map((team) => {
      const pick = picks.find((p) => p.team_id === team.id);
      return {
        team,
        owner: pick?.player ?? null,
        played: 0, won: 0, drawn: 0, lost: 0,
        goals_for: 0, goals_against: 0, goal_diff: 0, points: 0,
      };
    });

    const groupMatches = matches.filter(
      (m) => m.stage === 'group' && m.group_letter === group && m.is_complete
    );

    for (const match of groupMatches) {
      if (match.home_score === null || match.away_score === null) continue;
      const home = standings.find((s) => s.team.id === match.home_team_id);
      const away = standings.find((s) => s.team.id === match.away_team_id);
      if (!home || !away) continue;

      home.played++;
      away.played++;
      home.goals_for += match.home_score;
      home.goals_against += match.away_score;
      away.goals_for += match.away_score;
      away.goals_against += match.home_score;

      if (match.home_score > match.away_score) {
        home.won++; away.lost++;
        home.points += 3;
      } else if (match.home_score < match.away_score) {
        away.won++; home.lost++;
        away.points += 3;
      } else {
        home.drawn++; away.drawn++;
        home.points++; away.points++;
      }
    }

    for (const s of standings) {
      s.goal_diff = s.goals_for - s.goals_against;
    }

    standings.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.goal_diff !== a.goal_diff) return b.goal_diff - a.goal_diff;
      return b.goals_for - a.goals_for;
    });

    groupMap.set(group, standings);
  }

  return groupMap;
}

export default function WcGroupsPage() {
  const [teams, setTeams] = useState<WcTeam[]>([]);
  const [matches, setMatches] = useState<WcMatch[]>([]);
  const [picks, setPicks] = useState<WcPick[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetchJson<WcTeam[]>('/api/worldcup/teams'),
      fetchJson<WcMatch[]>('/api/worldcup/matches'),
      fetchJson<WcPick[]>('/api/worldcup/picks'),
    ])
      .then(([t, m, p]) => {
        setTeams(Array.isArray(t) ? t : []);
        setMatches(Array.isArray(m) ? m : []);
        setPicks(Array.isArray(p) ? p : []);
        setLoading(false);
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : 'Failed to load data.');
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="rounded-[1.75rem] border border-white/70 bg-[rgba(255,255,255,0.7)] py-20 text-center text-slate-400 shadow-[0_20px_45px_rgba(15,23,42,0.06)]">
        Loading groups…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-[1.75rem] border border-red-200 bg-[rgba(255,255,255,0.78)] py-16 text-center shadow-[0_20px_45px_rgba(15,23,42,0.06)]">
        <p className="font-semibold text-red-600">{error}</p>
      </div>
    );
  }

  const groupStandings = buildStandings(teams, matches, picks);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {GROUPS.map((group) => {
          const standings = groupStandings.get(group) ?? [];
          return (
            <div
              key={group}
              className="rounded-[1.5rem] border border-white/75 bg-[rgba(255,255,255,0.76)] p-4 shadow-[0_12px_30px_rgba(15,23,42,0.07)] backdrop-blur-sm"
            >
              <h3 className="mb-3 font-serif text-base font-bold text-slate-900">Group {group}</h3>
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-slate-400 uppercase tracking-wide">
                    <th className="pb-2 text-left font-semibold">Team</th>
                    <th className="pb-2 text-center font-semibold">P</th>
                    <th className="pb-2 text-center font-semibold">W</th>
                    <th className="pb-2 text-center font-semibold">D</th>
                    <th className="pb-2 text-center font-semibold">L</th>
                    <th className="pb-2 text-center font-semibold">GD</th>
                    <th className="pb-2 text-right font-semibold text-[#a45f14]">PTS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[rgba(148,163,184,0.12)]">
                  {standings.map((s) => (
                    <tr key={s.team.id} className="text-slate-700">
                      <td className="py-1.5 pr-1">
                        <span className="font-medium">{s.team.name}</span>
                        {s.owner && (
                          <span className="ml-1 text-[10px] font-semibold text-[#a45f14]">
                            {s.owner.name}
                          </span>
                        )}
                      </td>
                      <td className="py-1.5 text-center">{s.played}</td>
                      <td className="py-1.5 text-center">{s.won}</td>
                      <td className="py-1.5 text-center">{s.drawn}</td>
                      <td className="py-1.5 text-center">{s.lost}</td>
                      <td className="py-1.5 text-center">
                        {s.goal_diff > 0 ? `+${s.goal_diff}` : s.goal_diff}
                      </td>
                      <td className="py-1.5 text-right font-bold text-[#264653]">{s.points}</td>
                    </tr>
                  ))}
                  {standings.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-3 text-center text-slate-400 italic">No teams</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>
    </div>
  );
}
