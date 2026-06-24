export type League = 'NBA' | 'NHL';

export interface UserProfile {
  id: string;
  display_name: string;
  venmo_handle: string | null;
  updated_at: string;
}

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
  max_possible_points: number;
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

export interface DailySlate {
  id: string;
  date: string;
  title: string;
  description: string | null;
  is_open: boolean;
  is_settled: boolean;
  created_at: string;
  picks?: SlatePick[];
}

export interface SlatePick {
  id: string;
  slate_id: string;
  title: string;
  option_a: string;
  option_b: string;
  correct_option: 'a' | 'b' | null;
  display_order: number;
  created_at: string;
}

export interface BetSlip {
  id: string;
  slate_id: string;
  player_name: string;
  cost_cents: number;
  winnings_cents: number | null;
  created_at: string;
  choices?: SlipChoice[];
}

export interface SlipChoice {
  id: string;
  slip_id: string;
  slate_pick_id: string;
  chosen_option: 'a' | 'b';
}

export interface BetLeaderboardEntry {
  player_name: string;
  total_wagered_cents: number;
  total_winnings_cents: number;
  net_cents: number;
  slips_count: number;
}

export type SideBetMarketStatus = 'open' | 'locked' | 'settled';

export interface SideBetMarket {
  id: string;
  title: string;
  description: string | null;
  status: SideBetMarketStatus;
  lock_at: string;
  winning_option_id: string | null;
  settled_at: string | null;
  created_at: string;
}

export interface SideBetOption {
  id: string;
  market_id: string;
  player_id: string;
  display_order: number;
  created_at: string;
  player?: Player;
}

export interface SideBetEntry {
  id: string;
  market_id: string;
  bettor_name: string;
  bettor_name_normalized: string;
  option_id: string;
  amount_cents: number;
  created_at: string;
  updated_at: string;
  option?: SideBetOption;
}

// ── Groups ────────────────────────────────────────────────────────────────────

export interface Group {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
}

export interface GroupMembership {
  id: string;
  group_id: string;
  profile_id: string;
  role: string;
  joined_at: string;
}

// ── World Cup Pool ────────────────────────────────────────────────────────────

export interface WcPlayer {
  id: string;
  name: string;
  created_at: string;
}

export interface WcTeam {
  id: string;
  name: string;
  group_letter: string;
  created_at: string;
}

export interface WcPick {
  id: string;
  player_id: string;
  team_id: string;
  pick_order: number;
  created_at: string;
  player?: WcPlayer;
  team?: WcTeam;
}

export type WcMatchStage = 'group' | 'r32' | 'r16' | 'qf' | 'sf' | 'final';

export interface WcMatch {
  id: string;
  stage: WcMatchStage;
  group_letter: string | null;
  match_number: number | null;
  home_team_id: string | null;
  away_team_id: string | null;
  home_score: number | null;
  away_score: number | null;
  winner_team_id: string | null;
  played_at: string | null;
  venue: string | null;
  is_complete: boolean;
  created_at: string;
  home_team?: WcTeam | null;
  away_team?: WcTeam | null;
  winner_team?: WcTeam | null;
}

export interface WcPlayerScore {
  player: WcPlayer;
  teams: WcTeam[];
  total_points: number;
  max_possible_points: number;
  group_win_points: number;
  group_draw_points: number;
  advance_points: number;
  knockout_points: number;
}

export interface WcGroupStanding {
  team: WcTeam;
  owner: WcPlayer | null;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goals_for: number;
  goals_against: number;
  goal_diff: number;
  points: number;
}
