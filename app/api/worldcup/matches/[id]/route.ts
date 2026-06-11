import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { requireAdmin } from '@/lib/admin-auth';

const TEAM_SELECT = 'home_team:wc_teams!wc_matches_home_team_id_fkey(*), away_team:wc_teams!wc_matches_away_team_id_fkey(*), winner_team:wc_teams!wc_matches_winner_team_id_fkey(*)';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAdmin();
  if (authError) return authError;

  const { id } = await params;
  const supabase = createClient();
  const body = await req.json();

  const updates: Record<string, unknown> = {};
  const allowed = [
    'home_team_id', 'away_team_id', 'home_score', 'away_score',
    'winner_team_id', 'played_at', 'venue', 'is_complete',
    'stage', 'group_letter', 'match_number',
  ];
  for (const key of allowed) {
    if (key in body) updates[key] = body[key];
  }

  const { data, error } = await supabase
    .from('wc_matches')
    .update(updates)
    .eq('id', id)
    .select(`*, ${TEAM_SELECT}`)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAdmin();
  if (authError) return authError;

  const { id } = await params;
  const supabase = createClient();
  const { error } = await supabase.from('wc_matches').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
