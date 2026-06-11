import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { WcPlayer, WcTeam, WcMatch, WcPlayerScore } from '@/types';
import { WC_SCORING, knockoutStagePoints, KNOCKOUT_STAGES } from '@/lib/wc-scoring';

export async function GET() {
  const supabase = createClient();

  const [playersRes, picksRes, matchesRes] = await Promise.all([
    supabase.from('wc_players').select('*').order('created_at', { ascending: true }),
    supabase.from('wc_picks').select('*, team:wc_teams(*)').order('pick_order', { ascending: true }),
    supabase
      .from('wc_matches')
      .select(
        '*, home_team:wc_teams!wc_matches_home_team_id_fkey(*), away_team:wc_teams!wc_matches_away_team_id_fkey(*), winner_team:wc_teams!wc_matches_winner_team_id_fkey(*)'
      )
      .eq('is_complete', true),
  ]);

  if (playersRes.error) return NextResponse.json({ error: playersRes.error.message }, { status: 500 });
  if (picksRes.error) return NextResponse.json({ error: picksRes.error.message }, { status: 500 });
  if (matchesRes.error) return NextResponse.json({ error: matchesRes.error.message }, { status: 500 });

  // Also fetch all matches (not just complete) to check for group advancement
  const allMatchesRes = await supabase
    .from('wc_matches')
    .select('stage, home_team_id, away_team_id, winner_team_id, is_complete');
  if (allMatchesRes.error) return NextResponse.json({ error: allMatchesRes.error.message }, { status: 500 });

  const players: WcPlayer[] = playersRes.data ?? [];
  const picks = picksRes.data ?? [];
  const completedMatches: WcMatch[] = (matchesRes.data ?? []) as WcMatch[];
  const allMatches = allMatchesRes.data ?? [];

  // Build a set of team ids that appear in any knockout match (advanced from group)
  const teamsInKnockout = new Set<string>();
  for (const m of allMatches) {
    if (m.stage !== 'group') {
      if (m.home_team_id) teamsInKnockout.add(m.home_team_id);
      if (m.away_team_id) teamsInKnockout.add(m.away_team_id);
    }
  }

  const scores: WcPlayerScore[] = players.map((player) => {
    const playerPicks = picks.filter((p) => p.player_id === player.id);
    const playerTeams: WcTeam[] = playerPicks.map((p) => p.team as WcTeam).filter(Boolean);
    const teamIds = new Set(playerTeams.map((t) => t.id));

    let group_win_points = 0;
    let group_draw_points = 0;
    let advance_points = 0;
    let knockout_points = 0;

    // Group stage: count wins and draws for player's teams
    for (const match of completedMatches) {
      if (match.stage !== 'group') continue;
      const homeOwned = match.home_team_id ? teamIds.has(match.home_team_id) : false;
      const awayOwned = match.away_team_id ? teamIds.has(match.away_team_id) : false;

      if (!homeOwned && !awayOwned) continue;

      const isDraw = match.home_score !== null && match.away_score !== null &&
        match.home_score === match.away_score;

      if (isDraw) {
        if (homeOwned) group_draw_points += WC_SCORING.GROUP_DRAW;
        if (awayOwned) group_draw_points += WC_SCORING.GROUP_DRAW;
      } else if (match.winner_team_id) {
        if (homeOwned && match.winner_team_id === match.home_team_id) group_win_points += WC_SCORING.GROUP_WIN;
        if (awayOwned && match.winner_team_id === match.away_team_id) group_win_points += WC_SCORING.GROUP_WIN;
      }
    }

    // Advancement bonus: team appears in a knockout match
    for (const teamId of teamIds) {
      if (teamsInKnockout.has(teamId)) {
        advance_points += WC_SCORING.ADVANCE_FROM_GROUP;
      }
    }

    // Knockout stage: points for each win
    for (const match of completedMatches) {
      if (match.stage === 'group') continue;
      if (!match.winner_team_id) continue;
      if (teamIds.has(match.winner_team_id)) {
        knockout_points += knockoutStagePoints(match.stage);
      }
    }

    const total_points = group_win_points + group_draw_points + advance_points + knockout_points;

    // Max possible: assume all active teams win all remaining matches
    const maxAdditional = calcMaxAdditional(playerTeams, allMatches, teamIds, teamsInKnockout);

    return {
      player,
      teams: playerTeams,
      total_points,
      max_possible_points: total_points + maxAdditional,
      group_win_points,
      group_draw_points,
      advance_points,
      knockout_points,
    };
  });

  scores.sort((a, b) => b.total_points - a.total_points);
  return NextResponse.json(scores);
}

function calcMaxAdditional(
  teams: WcTeam[],
  allMatches: { stage: string; home_team_id: string | null; away_team_id: string | null; winner_team_id: string | null; is_complete: boolean }[],
  teamIds: Set<string>,
  teamsInKnockout: Set<string>,
): number {
  let extra = 0;

  for (const team of teams) {
    // Is the team eliminated? (lost a knockout match)
    const eliminated = allMatches.some(
      (m) =>
        m.stage !== 'group' &&
        m.is_complete &&
        m.winner_team_id !== null &&
        m.winner_team_id !== team.id &&
        (m.home_team_id === team.id || m.away_team_id === team.id)
    );
    if (eliminated) continue;

    // Has team advanced (or might still advance)?
    const alreadyAdvanced = teamsInKnockout.has(team.id);

    if (!alreadyAdvanced) {
      // They might still advance if group stage isn't fully settled
      // Optimistically assume they will advance
      extra += WC_SCORING.ADVANCE_FROM_GROUP;
      // Also optimistically assume group stage matches not yet played
      // Could add group win points estimate here but keep it simple
    }

    // Which is the highest knockout stage they've reached or could reach?
    const highestKnockout = allMatches
      .filter(
        (m) =>
          m.stage !== 'group' &&
          (m.home_team_id === team.id || m.away_team_id === team.id)
      )
      .reduce((max, m) => {
        const order = ['r32', 'r16', 'qf', 'sf', 'final'];
        return Math.max(max, order.indexOf(m.stage));
      }, -1);

    const nextStageIdx = highestKnockout + 1;
    const stageOrder = KNOCKOUT_STAGES;

    // Give max points for all future knockout stages they could win
    for (let i = Math.max(0, nextStageIdx); i < stageOrder.length; i++) {
      extra += knockoutStagePoints(stageOrder[i]);
    }
  }

  return extra;
}
