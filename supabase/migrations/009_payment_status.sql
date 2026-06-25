-- Add payment tracking to group memberships.
-- Default FALSE so existing members start as unpaid until marked otherwise.

ALTER TABLE public.group_memberships
  ADD COLUMN IF NOT EXISTS has_paid BOOLEAN NOT NULL DEFAULT FALSE;
