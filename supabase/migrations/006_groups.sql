-- Groups allow authenticated users to organise a private sub-pool view of the
-- leaderboard.  The groups and group_memberships tables may already exist in
-- production deployments; all statements use IF NOT EXISTS / ON CONFLICT so
-- this migration is safe to run on both fresh and existing databases.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- A named group created by an authenticated profile.
CREATE TABLE IF NOT EXISTS public.groups (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Authenticated users who belong to a group.
CREATE TABLE IF NOT EXISTS public.group_memberships (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id   UUID NOT NULL REFERENCES public.groups(id)   ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role       TEXT NOT NULL DEFAULT 'member',
  joined_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (group_id, profile_id)
);

-- Pool players that belong to a group.  When a group has rows in this table
-- the leaderboard filters to only show those players for that group view.
-- If no rows exist for a group the leaderboard falls back to showing everyone.
CREATE TABLE IF NOT EXISTS public.group_players (
  group_id  UUID NOT NULL REFERENCES public.groups(id)  ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  PRIMARY KEY (group_id, player_id)
);
