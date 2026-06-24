-- Isolated World Cup knockout bracket tables and bracket tree seed data.
-- All assets in this migration use the required bracket_ prefix so they do
-- not conflict with the existing World Cup draft feature.

CREATE TABLE IF NOT EXISTS public.bracket_wc_matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  round_name TEXT NOT NULL CHECK (
    round_name IN ('Round_of_32', 'Round_of_16', 'Quarterfinals', 'Semifinals', 'Final')
  ),
  match_identifier TEXT NOT NULL UNIQUE,
  placeholder_home TEXT NOT NULL,
  placeholder_away TEXT NOT NULL,
  actual_home TEXT,
  actual_away TEXT,
  winning_team TEXT,
  next_match_id UUID REFERENCES public.bracket_wc_matches(id) ON DELETE SET NULL,
  next_match_slot TEXT,
  CHECK (
    (next_match_id IS NULL AND next_match_slot IS NULL)
    OR
    (next_match_id IS NOT NULL AND next_match_slot IN ('home', 'away'))
  )
);

CREATE TABLE IF NOT EXISTS public.bracket_user_picks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  match_id UUID NOT NULL REFERENCES public.bracket_wc_matches(id) ON DELETE CASCADE,
  predicted_winner TEXT NOT NULL,
  UNIQUE (user_id, group_id, match_id)
);

INSERT INTO public.bracket_wc_matches (
  id,
  round_name,
  match_identifier,
  placeholder_home,
  placeholder_away,
  actual_home,
  actual_away,
  winning_team,
  next_match_id,
  next_match_slot
)
VALUES
  ('00000000-0000-0000-0000-000000000131', 'Final', 'B31', 'Winner B29', 'Winner B30', NULL, NULL, NULL, NULL, NULL),

  ('00000000-0000-0000-0000-000000000129', 'Semifinals', 'B29', 'Winner B25', 'Winner B26', NULL, NULL, NULL, '00000000-0000-0000-0000-000000000131', 'home'),
  ('00000000-0000-0000-0000-000000000130', 'Semifinals', 'B30', 'Winner B27', 'Winner B28', NULL, NULL, NULL, '00000000-0000-0000-0000-000000000131', 'away'),

  ('00000000-0000-0000-0000-000000000125', 'Quarterfinals', 'B25', 'Winner B17', 'Winner B18', NULL, NULL, NULL, '00000000-0000-0000-0000-000000000129', 'home'),
  ('00000000-0000-0000-0000-000000000126', 'Quarterfinals', 'B26', 'Winner B19', 'Winner B20', NULL, NULL, NULL, '00000000-0000-0000-0000-000000000129', 'away'),
  ('00000000-0000-0000-0000-000000000127', 'Quarterfinals', 'B27', 'Winner B21', 'Winner B22', NULL, NULL, NULL, '00000000-0000-0000-0000-000000000130', 'home'),
  ('00000000-0000-0000-0000-000000000128', 'Quarterfinals', 'B28', 'Winner B23', 'Winner B24', NULL, NULL, NULL, '00000000-0000-0000-0000-000000000130', 'away'),

  ('00000000-0000-0000-0000-000000000117', 'Round_of_16', 'B17', 'Winner B1', 'Winner B2', NULL, NULL, NULL, '00000000-0000-0000-0000-000000000125', 'home'),
  ('00000000-0000-0000-0000-000000000118', 'Round_of_16', 'B18', 'Winner B3', 'Winner B4', NULL, NULL, NULL, '00000000-0000-0000-0000-000000000125', 'away'),
  ('00000000-0000-0000-0000-000000000119', 'Round_of_16', 'B19', 'Winner B5', 'Winner B6', NULL, NULL, NULL, '00000000-0000-0000-0000-000000000126', 'home'),
  ('00000000-0000-0000-0000-000000000120', 'Round_of_16', 'B20', 'Winner B7', 'Winner B8', NULL, NULL, NULL, '00000000-0000-0000-0000-000000000126', 'away'),
  ('00000000-0000-0000-0000-000000000121', 'Round_of_16', 'B21', 'Winner B9', 'Winner B10', NULL, NULL, NULL, '00000000-0000-0000-0000-000000000127', 'home'),
  ('00000000-0000-0000-0000-000000000122', 'Round_of_16', 'B22', 'Winner B11', 'Winner B12', NULL, NULL, NULL, '00000000-0000-0000-0000-000000000127', 'away'),
  ('00000000-0000-0000-0000-000000000123', 'Round_of_16', 'B23', 'Winner B13', 'Winner B14', NULL, NULL, NULL, '00000000-0000-0000-0000-000000000128', 'home'),
  ('00000000-0000-0000-0000-000000000124', 'Round_of_16', 'B24', 'Winner B15', 'Winner B16', NULL, NULL, NULL, '00000000-0000-0000-0000-000000000128', 'away'),

  ('00000000-0000-0000-0000-000000000101', 'Round_of_32', 'B1', 'Winner Group A', 'Runner-up Group B', NULL, NULL, NULL, '00000000-0000-0000-0000-000000000117', 'home'),
  ('00000000-0000-0000-0000-000000000102', 'Round_of_32', 'B2', 'Winner Group C', 'Runner-up Group D', NULL, NULL, NULL, '00000000-0000-0000-0000-000000000117', 'away'),
  ('00000000-0000-0000-0000-000000000103', 'Round_of_32', 'B3', 'Winner Group E', 'Runner-up Group F', NULL, NULL, NULL, '00000000-0000-0000-0000-000000000118', 'home'),
  ('00000000-0000-0000-0000-000000000104', 'Round_of_32', 'B4', 'Winner Group G', 'Runner-up Group H', NULL, NULL, NULL, '00000000-0000-0000-0000-000000000118', 'away'),
  ('00000000-0000-0000-0000-000000000105', 'Round_of_32', 'B5', 'Winner Group I', 'Runner-up Group J', NULL, NULL, NULL, '00000000-0000-0000-0000-000000000119', 'home'),
  ('00000000-0000-0000-0000-000000000106', 'Round_of_32', 'B6', 'Winner Group K', 'Runner-up Group L', NULL, NULL, NULL, '00000000-0000-0000-0000-000000000119', 'away'),
  ('00000000-0000-0000-0000-000000000107', 'Round_of_32', 'B7', 'Winner Group M', 'Runner-up Group N', NULL, NULL, NULL, '00000000-0000-0000-0000-000000000120', 'home'),
  ('00000000-0000-0000-0000-000000000108', 'Round_of_32', 'B8', 'Winner Group O', 'Runner-up Group P', NULL, NULL, NULL, '00000000-0000-0000-0000-000000000120', 'away'),
  ('00000000-0000-0000-0000-000000000109', 'Round_of_32', 'B9', 'Winner Group B', 'Runner-up Group A', NULL, NULL, NULL, '00000000-0000-0000-0000-000000000121', 'home'),
  ('00000000-0000-0000-0000-000000000110', 'Round_of_32', 'B10', 'Winner Group D', 'Runner-up Group C', NULL, NULL, NULL, '00000000-0000-0000-0000-000000000121', 'away'),
  ('00000000-0000-0000-0000-000000000111', 'Round_of_32', 'B11', 'Winner Group F', 'Runner-up Group E', NULL, NULL, NULL, '00000000-0000-0000-0000-000000000122', 'home'),
  ('00000000-0000-0000-0000-000000000112', 'Round_of_32', 'B12', 'Winner Group H', 'Runner-up Group G', NULL, NULL, NULL, '00000000-0000-0000-0000-000000000122', 'away'),
  ('00000000-0000-0000-0000-000000000113', 'Round_of_32', 'B13', 'Winner Group J', 'Runner-up Group I', NULL, NULL, NULL, '00000000-0000-0000-0000-000000000123', 'home'),
  ('00000000-0000-0000-0000-000000000114', 'Round_of_32', 'B14', 'Winner Group L', 'Runner-up Group K', NULL, NULL, NULL, '00000000-0000-0000-0000-000000000123', 'away'),
  ('00000000-0000-0000-0000-000000000115', 'Round_of_32', 'B15', 'Winner Group N', 'Runner-up Group M', NULL, NULL, NULL, '00000000-0000-0000-0000-000000000124', 'home'),
  ('00000000-0000-0000-0000-000000000116', 'Round_of_32', 'B16', 'Winner Group P', 'Runner-up Group O', NULL, NULL, NULL, '00000000-0000-0000-0000-000000000124', 'away')
ON CONFLICT (match_identifier) DO NOTHING;
