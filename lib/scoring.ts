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
 * Calculate the maximum possible points a player could earn given their current teams,
 * assuming all surviving teams win every remaining series in the best possible way (sweep).
 */
export function calcMaxPossiblePoints(
  teams: Team[],
  allSeries: (Series & { games?: Game[] })[],
  currentTotalPoints: number
): number {
  let additionalPoints = 0;

  for (const team of teams) {
    const teamSeries = allSeries.filter(
      (s) => s.home_team_id === team.id || s.away_team_id === team.id
    );

    // Team is eliminated if they lost a completed series
    const isEliminated = teamSeries.some(
      (s) => s.is_complete && s.winner_team_id !== team.id
    );
    if (isEliminated) continue;

    const tier = getTeamTier(team);
    const maxRound = teamSeries.reduce((max, s) => Math.max(max, s.round), 0);
    const inProgressSeries = teamSeries.find((s) => !s.is_complete) ?? null;

    // Additional points from the in-progress series (if any)
    if (inProgressSeries) {
      const games = inProgressSeries.games ?? [];
      const currentWins = games.filter((g) => g.winner_team_id === team.id).length;
      const additionalWins = 4 - currentWins;
      const totalGamesIfWin = games.length + additionalWins;

      additionalPoints += getSeriesWinPoints(tier, inProgressSeries.round as SeriesRound);
      additionalPoints += additionalWins;
      if (totalGamesIfWin <= 6) additionalPoints += 2; // efficiency bonus
      if (totalGamesIfWin === 4) additionalPoints += 3; // sweep bonus
      if (inProgressSeries.round === 4) additionalPoints += 10; // championship bonus
    }

    // Additional points for all future rounds not yet started
    const futureStartRound = inProgressSeries ? inProgressSeries.round + 1 : maxRound + 1;
    for (let round = futureStartRound; round <= 4; round++) {
      additionalPoints += getSeriesWinPoints(tier, round as SeriesRound);
      additionalPoints += 4 + 2 + 3; // max game wins + efficiency + sweep bonus
      if (round === 4) additionalPoints += 10; // championship bonus
    }
  }

  return currentTotalPoints + additionalPoints;
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
