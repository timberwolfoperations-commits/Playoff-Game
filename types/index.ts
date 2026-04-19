export type League = 'NBA' | 'NHL';

export type Tier = 1 | 2;

export interface Player {
  id: string;
  name: string;
  tiebreaker_score: number | null;
  created_at: string;
}

export interface Team {
  id: string;
  name: string;
  league: League;
  seed: number;
  conference: string | null;
  is_wildcard: boolean;
  created_at: string;
}

export interface DraftPick {
  id: string;
  player_id: string;
  team_id: string;
  pick_number: number;
  created_at: string;
  player?: Player;
  team?: Team;
}

export type SeriesRound = 1 | 2 | 3 | 4;

export interface Series {
  id: string;
  league: League;
  round: SeriesRound;
  home_team_id: string;
  away_team_id: string;
  winner_team_id: string | null;
  home_wins: number;
  away_wins: number;
  is_complete: boolean;
  created_at: string;
  home_team?: Team;
  away_team?: Team;
  winner_team?: Team;
  games?: Game[];
}

export interface Game {
  id: string;
  series_id: string;
  game_number: number;
  winner_team_id: string | null;
  home_score: number | null;
  away_score: number | null;
  played_at: string | null;
  created_at: string;
  series?: Series;
  winner_team?: Team;
}

export interface PlayerScore {
  player: Player;
  teams: Team[];
  total_points: number;
  breakdown: ScoreBreakdown[];
}

export interface ScoreBreakdown {
  team: Team;
  series: Series;
  series_win_points: number;
  game_win_points: number;
  championship_bonus: number;
  efficiency_bonus: number;
  sweep_bonus: number;
  total: number;
  label: string;
}

export interface TiebreakerEntry {
  player_id: string;
  nba_final_game_score: number | null;
  nhl_final_game_goals: number | null;
  predicted_total: number | null;
  player?: Player;
}
