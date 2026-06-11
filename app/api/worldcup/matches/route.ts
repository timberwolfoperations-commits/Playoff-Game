import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { requireAdmin } from '@/lib/admin-auth';

const TEAM_SELECT = 'home_team:wc_teams!wc_matches_home_team_id_fkey(*), away_team:wc_teams!wc_matches_away_team_id_fkey(*), winner_team:wc_teams!wc_matches_winner_team_id_fkey(*)';

export async function GET() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('wc_matches')
    .select(`*, ${TEAM_SELECT}`)
    .order('played_at', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const authError = await requireAdmin();
  if (authError) return authError;

  const supabase = createClient();
  const body = await req.json();
  const {
    stage,
    group_letter,
    match_number,
    home_team_id,
    away_team_id,
    home_score,
    away_score,
    winner_team_id,
    played_at,
    venue,
    is_complete,
  } = body;

  if (!stage) {
    return NextResponse.json({ error: 'stage is required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('wc_matches')
    .insert({
      stage,
      group_letter: group_letter ?? null,
      match_number: match_number ?? null,
      home_team_id: home_team_id ?? null,
      away_team_id: away_team_id ?? null,
      home_score: home_score ?? null,
      away_score: away_score ?? null,
      winner_team_id: winner_team_id ?? null,
      played_at: played_at ?? null,
      venue: venue ?? null,
      is_complete: is_complete ?? false,
    })
    .select(`*, ${TEAM_SELECT}`)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
