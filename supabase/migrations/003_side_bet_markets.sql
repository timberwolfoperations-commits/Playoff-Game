-- Conference finals side-bet markets (no-auth entry by bettor name)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.side_bet_markets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'locked', 'settled')),
  lock_at TIMESTAMP WITH TIME ZONE NOT NULL,
  winning_option_id UUID,
  settled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.side_bet_options (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  market_id UUID NOT NULL REFERENCES public.side_bet_markets(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE RESTRICT,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (market_id, player_id)
);

CREATE TABLE IF NOT EXISTS public.side_bet_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  market_id UUID NOT NULL REFERENCES public.side_bet_markets(id) ON DELETE CASCADE,
  bettor_name TEXT NOT NULL,
  bettor_name_normalized TEXT NOT NULL,
  option_id UUID NOT NULL REFERENCES public.side_bet_options(id) ON DELETE RESTRICT,
  amount_cents INTEGER NOT NULL DEFAULT 500 CHECK (amount_cents >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (market_id, bettor_name_normalized)
);

CREATE INDEX IF NOT EXISTS idx_side_bet_options_market_id ON public.side_bet_options(market_id);
CREATE INDEX IF NOT EXISTS idx_side_bet_entries_market_id ON public.side_bet_entries(market_id);

ALTER TABLE public.side_bet_markets
  DROP CONSTRAINT IF EXISTS side_bet_markets_winning_option_id_fkey;

ALTER TABLE public.side_bet_markets
  ADD CONSTRAINT side_bet_markets_winning_option_id_fkey
  FOREIGN KEY (winning_option_id) REFERENCES public.side_bet_options(id) ON DELETE SET NULL;

NOTIFY pgrst, 'reload schema';
