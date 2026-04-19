-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Players in the game
CREATE TABLE IF NOT EXISTS players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  tiebreaker_score NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Teams (NBA and NHL)
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  league TEXT NOT NULL CHECK (league IN ('NBA', 'NHL')),
  seed INTEGER NOT NULL,
  conference TEXT,
  is_wildcard BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Draft picks
CREATE TABLE IF NOT EXISTS draft_picks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  pick_number INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (team_id),
  UNIQUE (pick_number)
);

-- Playoff series
CREATE TABLE IF NOT EXISTS series (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  league TEXT NOT NULL CHECK (league IN ('NBA', 'NHL')),
  round INTEGER NOT NULL CHECK (round IN (1, 2, 3, 4)),
  home_team_id UUID NOT NULL REFERENCES teams(id) ON DELETE RESTRICT,
  away_team_id UUID NOT NULL REFERENCES teams(id) ON DELETE RESTRICT,
  winner_team_id UUID REFERENCES teams(id) ON DELETE RESTRICT,
  home_wins INTEGER NOT NULL DEFAULT 0,
  away_wins INTEGER NOT NULL DEFAULT 0,
  is_complete BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Individual games within a series
CREATE TABLE IF NOT EXISTS games (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  series_id UUID NOT NULL REFERENCES series(id) ON DELETE CASCADE,
  game_number INTEGER NOT NULL,
  winner_team_id UUID REFERENCES teams(id) ON DELETE RESTRICT,
  home_score INTEGER,
  away_score INTEGER,
  played_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (series_id, game_number)
);

-- Tiebreaker predictions per player
CREATE TABLE IF NOT EXISTS tiebreaker_predictions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  predicted_combined_total INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (player_id)
);

-- Actual tiebreaker results (single row)
CREATE TABLE IF NOT EXISTS tiebreaker_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nba_final_game_score INTEGER,
  nhl_final_game_goals INTEGER,
  combined_total INTEGER GENERATED ALWAYS AS (
    COALESCE(nba_final_game_score, 0) + COALESCE(nhl_final_game_goals, 0)
  ) STORED,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
