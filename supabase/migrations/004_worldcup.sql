-- World Cup 2026 Pool Tables

-- Pool participants (separate from playoff players)
CREATE TABLE IF NOT EXISTS wc_players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 48 World Cup teams with group assignment
CREATE TABLE IF NOT EXISTS wc_teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  group_letter CHAR(1) NOT NULL CHECK (group_letter IN ('A','B','C','D','E','F','G','H','I','J','K','L')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Draft picks: which player drafted which team
CREATE TABLE IF NOT EXISTS wc_picks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id UUID NOT NULL REFERENCES wc_players(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES wc_teams(id) ON DELETE CASCADE,
  pick_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (team_id),
  UNIQUE (player_id, pick_order)
);

-- Matches: group stage and knockout rounds
CREATE TABLE IF NOT EXISTS wc_matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stage TEXT NOT NULL CHECK (stage IN ('group', 'r32', 'r16', 'qf', 'sf', 'final')),
  group_letter CHAR(1) CHECK (group_letter IN ('A','B','C','D','E','F','G','H','I','J','K','L')),
  match_number INTEGER,
  home_team_id UUID REFERENCES wc_teams(id) ON DELETE RESTRICT,
  away_team_id UUID REFERENCES wc_teams(id) ON DELETE RESTRICT,
  home_score INTEGER,
  away_score INTEGER,
  winner_team_id UUID REFERENCES wc_teams(id) ON DELETE RESTRICT,
  played_at TIMESTAMP WITH TIME ZONE,
  venue TEXT,
  is_complete BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed all 48 teams (2026 FIFA World Cup groups)
INSERT INTO wc_teams (name, group_letter) VALUES
  -- Group A
  ('Mexico', 'A'),
  ('South Korea', 'A'),
  ('South Africa', 'A'),
  ('Czechia', 'A'),
  -- Group B
  ('Switzerland', 'B'),
  ('Canada', 'B'),
  ('Qatar', 'B'),
  ('Bosnia and Herzegovina', 'B'),
  -- Group C
  ('Brazil', 'C'),
  ('Morocco', 'C'),
  ('Scotland', 'C'),
  ('Haiti', 'C'),
  -- Group D
  ('United States', 'D'),
  ('Turkey', 'D'),
  ('Paraguay', 'D'),
  ('Australia', 'D'),
  -- Group E
  ('Germany', 'E'),
  ('Ecuador', 'E'),
  ('Ivory Coast', 'E'),
  ('Curaçao', 'E'),
  -- Group F
  ('Netherlands', 'F'),
  ('Japan', 'F'),
  ('Sweden', 'F'),
  ('Tunisia', 'F'),
  -- Group G
  ('Belgium', 'G'),
  ('Egypt', 'G'),
  ('Iran', 'G'),
  ('New Zealand', 'G'),
  -- Group H
  ('Spain', 'H'),
  ('Uruguay', 'H'),
  ('Saudi Arabia', 'H'),
  ('Cape Verde', 'H'),
  -- Group I
  ('France', 'I'),
  ('Norway', 'I'),
  ('Senegal', 'I'),
  ('Iraq', 'I'),
  -- Group J
  ('Argentina', 'J'),
  ('Austria', 'J'),
  ('Algeria', 'J'),
  ('Jordan', 'J'),
  -- Group K
  ('Portugal', 'K'),
  ('Colombia', 'K'),
  ('Congo DR', 'K'),
  ('Uzbekistan', 'K'),
  -- Group L
  ('England', 'L'),
  ('Croatia', 'L'),
  ('Ghana', 'L'),
  ('Panama', 'L');
