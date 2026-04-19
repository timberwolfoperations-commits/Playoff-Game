import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';

export async function GET() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('games')
    .select('*, winner_team:teams(*), series:series(*, home_team:teams!series_home_team_id_fkey(*), away_team:teams!series_away_team_id_fkey(*))')
    .order('series_id', { ascending: true })
    .order('game_number', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const body = await req.json();
  const { series_id, game_number, winner_team_id, home_score, away_score, played_at } = body;

  if (!series_id || game_number == null) {
    return NextResponse.json({ error: 'series_id and game_number are required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('games')
    .insert({ series_id, game_number, winner_team_id, home_score, away_score, played_at })
    .select('*, winner_team:teams(*)')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
