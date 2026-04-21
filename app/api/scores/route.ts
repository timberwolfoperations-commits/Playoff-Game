import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { calcSeriesScore, calcMaxPossiblePoints } from '@/lib/scoring';
import { Series, Game, Team, Player, PlayerScore, ScoreBreakdown } from '@/types';

export async function GET() {
  const supabase = createClient();

  const [playersRes, picksRes, seriesRes] = await Promise.all([
    supabase.from('players').select('*').order('created_at', { ascending: true }),
    supabase.from('draft_picks').select('*, team:teams(*)').order('pick_number', { ascending: true }),
    supabase
      .from('series')
      .select(
        '*, home_team:teams!series_home_team_id_fkey(*), away_team:teams!series_away_team_id_fkey(*), winner_team:teams!series_winner_team_id_fkey(*), games(*)'
      )
      .order('round', { ascending: true }),
  ]);

  if (playersRes.error) return NextResponse.json({ error: playersRes.error.message }, { status: 500 });
  if (picksRes.error) return NextResponse.json({ error: picksRes.error.message }, { status: 500 });
  if (seriesRes.error) return NextResponse.json({ error: seriesRes.error.message }, { status: 500 });

  const players: Player[] = playersRes.data ?? [];
  const picks = picksRes.data ?? [];
  const allSeries: (Series & { games: Game[] })[] = (seriesRes.data ?? []) as (Series & { games: Game[] })[];

  const playerScores: PlayerScore[] = players.map((player) => {
    // Find all teams this player drafted
    const playerPicks = picks.filter((p) => p.player_id === player.id);
    const playerTeams: Team[] = playerPicks.map((p) => p.team as Team).filter(Boolean);

    const breakdowns: ScoreBreakdown[] = [];

    for (const team of playerTeams) {
      // Find all series this team participated in
      const teamSeries = allSeries.filter(
        (s) => s.home_team_id === team.id || s.away_team_id === team.id
      );

      for (const series of teamSeries) {
        const games = series.games ?? [];
        const breakdown = calcSeriesScore(team, series, games);
        // Only include if there is at least some game played
        if (games.length > 0 || series.is_complete) {
          breakdowns.push(breakdown);
        }
      }
    }

    const total_points = breakdowns.reduce((sum, b) => sum + b.total, 0);
    const max_possible_points = calcMaxPossiblePoints(playerTeams, allSeries, total_points);

    return {
      player,
      teams: playerTeams,
      total_points,
      max_possible_points,
      breakdown: breakdowns,
    };
  });

  // Sort by total points descending
  playerScores.sort((a, b) => b.total_points - a.total_points);

  return NextResponse.json(playerScores);
}
