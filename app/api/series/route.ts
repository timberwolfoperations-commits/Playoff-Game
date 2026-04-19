import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';

export async function GET() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('series')
    .select(
      '*, home_team:teams!series_home_team_id_fkey(*), away_team:teams!series_away_team_id_fkey(*), winner_team:teams!series_winner_team_id_fkey(*), games(*)'
    )
    .order('league', { ascending: true })
    .order('round', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const body = await req.json();
  const { league, round, home_team_id, away_team_id } = body;

  if (!league || !round || !home_team_id || !away_team_id) {
    return NextResponse.json(
      { error: 'league, round, home_team_id, and away_team_id are required' },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from('series')
    .insert({ league, round, home_team_id, away_team_id })
    .select(
      '*, home_team:teams!series_home_team_id_fkey(*), away_team:teams!series_away_team_id_fkey(*), winner_team:teams!series_winner_team_id_fkey(*)'
    )
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
