import { Team, Series, Game, ScoreBreakdown, Tier, SeriesRound } from '@/types';

/**
 * Determines if a team is Tier 1 (seeds 1-4) or Tier 2 (seeds 5-8 / wildcards).
 */
export function getTeamTier(team: Team): Tier {
  if (team.is_wildcard) return 2;
  return team.seed <= 4 ? 1 : 2;
}

/**
 * Points awarded for winning a series based on tier and round.
 */
export function getSeriesWinPoints(tier: Tier, round: SeriesRound): number {
  const table: Record<SeriesRound, [number, number]> = {
    1: [2, 5],
    2: [4, 8],
    3: [8, 15],
    4: [15, 25],
  };
  return table[round][tier - 1];
}

/**
 * Round name for display.
 */
export function getRoundName(round: SeriesRound, league: string): string {
  if (round === 1) return 'First Round';
  if (round === 2) return 'Second Round';
  if (round === 3) return 'Conference Finals';
  if (round === 4) return league === 'NBA' ? 'NBA Finals' : 'Stanley Cup Finals';
  return 'Unknown';
}

/**
 * Calculate the score breakdown for a single player team in a completed series.
 */
export function calcSeriesScore(
  playerTeam: Team,
  series: Series,
  games: Game[]
): ScoreBreakdown {
  const wonSeries = series.winner_team_id === playerTeam.id;
  const tier = getTeamTier(playerTeam);

  // Count wins for this team in the series
  const teamGames = games.filter(
    (g) => g.winner_team_id === playerTeam.id
  );
  const gameWins = teamGames.length;
  const totalGames = games.length;

  let series_win_points = 0;
  let championship_bonus = 0;
  let efficiency_bonus = 0;
  let sweep_bonus = 0;

  if (wonSeries) {
    series_win_points = getSeriesWinPoints(tier, series.round);

    // Championship bonus (Finals only)
    if (series.round === 4) {
      championship_bonus = 10;
    }

    // Efficiency bonus: won in 6 games or fewer
    if (totalGames <= 6) {
      efficiency_bonus = 2;
    }

    // Sweep bonus: 4-0
    if (totalGames === 4) {
      sweep_bonus = 3;
    }
  }

  const game_win_points = gameWins; // +1 per game won

  const total =
    series_win_points +
    game_win_points +
    championship_bonus +
    efficiency_bonus +
    sweep_bonus;

  const label = buildLabel(wonSeries, series, playerTeam, tier, totalGames);

  return {
    team: playerTeam,
    series,
    series_win_points,
    game_win_points,
    championship_bonus,
    efficiency_bonus,
    sweep_bonus,
    total,
    label,
  };
}

function buildLabel(
  won: boolean,
  series: Series,
  team: Team,
  tier: Tier,
  totalGames: number
): string {
  const round = getRoundName(series.round, series.league);
  const opponent =
    series.home_team_id === team.id ? series.away_team : series.home_team;
  const opponentName = opponent?.name ?? 'Unknown';
  if (!won) return `${round} loss vs ${opponentName}`;
  const sweepStr = totalGames === 4 ? ' (Sweep!)' : '';
  return `${round} win vs ${opponentName} [Tier ${tier}]${sweepStr}`;
}

/**
 * Calculate total score for a player across all series.
 */
export function calcPlayerTotal(breakdowns: ScoreBreakdown[]): number {
  return breakdowns.reduce((sum, b) => sum + b.total, 0);
}

/**
 * Determine the draft order for a snake draft with `numPlayers` participants
 * and `totalPicks` picks (e.g., 4 rounds × 8 players = 32 picks).
 * Returns an array of player indices (0-based) for each pick position.
 */
export function getSnakeDraftOrder(numPlayers: number, totalRounds: number): number[] {
  const order: number[] = [];
  for (let round = 0; round < totalRounds; round++) {
    const forwardRound = round % 2 === 0;
    if (forwardRound) {
      for (let p = 0; p < numPlayers; p++) order.push(p);
    } else {
      for (let p = numPlayers - 1; p >= 0; p--) order.push(p);
    }
  }
  return order;
}
