-- Tracks per-user, per-bracket lock state so users can "lock in" their picks
-- before the tournament starts.  is_locked=true means no further edits are allowed.

CREATE TABLE IF NOT EXISTS public.bracket_pick_locks (
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bracket_slug TEXT       NOT NULL,
  is_locked   BOOLEAN     NOT NULL DEFAULT FALSE,
  locked_at   TIMESTAMP WITH TIME ZONE,
  PRIMARY KEY (user_id, bracket_slug)
);
