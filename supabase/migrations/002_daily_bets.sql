-- Daily pick slates published by the commissioner
CREATE TABLE IF NOT EXISTS daily_slates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  is_open BOOLEAN NOT NULL DEFAULT false,
  is_settled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Individual binary pick options within a slate (e.g., "Chiefs -3.5 vs Raiders +3.5")
CREATE TABLE IF NOT EXISTS slate_picks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slate_id UUID NOT NULL REFERENCES daily_slates(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  correct_option TEXT CHECK (correct_option IN ('a', 'b')),
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- One bet slip per player per slate ($1 each)
CREATE TABLE IF NOT EXISTS bet_slips (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slate_id UUID NOT NULL REFERENCES daily_slates(id) ON DELETE CASCADE,
  player_name TEXT NOT NULL,
  cost_cents INTEGER NOT NULL DEFAULT 100,
  winnings_cents INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (slate_id, player_name)
);

-- A player's pick selection for each game in the slip
CREATE TABLE IF NOT EXISTS slip_choices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slip_id UUID NOT NULL REFERENCES bet_slips(id) ON DELETE CASCADE,
  slate_pick_id UUID NOT NULL REFERENCES slate_picks(id) ON DELETE CASCADE,
  chosen_option TEXT NOT NULL CHECK (chosen_option IN ('a', 'b')),
  UNIQUE (slip_id, slate_pick_id)
);
