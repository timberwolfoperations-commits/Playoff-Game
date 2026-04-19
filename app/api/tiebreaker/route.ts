import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';

export async function GET() {
  const supabase = createClient();
  const [predsRes, resultsRes] = await Promise.all([
    supabase
      .from('tiebreaker_predictions')
      .select('*, player:players(*)')
      .order('created_at', { ascending: true }),
    supabase.from('tiebreaker_results').select('*').limit(1).maybeSingle(),
  ]);

  if (predsRes.error) return NextResponse.json({ error: predsRes.error.message }, { status: 500 });
  return NextResponse.json({ predictions: predsRes.data, result: resultsRes.data });
}

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const body = await req.json();
  const { player_id, predicted_combined_total } = body;

  if (!player_id || predicted_combined_total == null) {
    return NextResponse.json(
      { error: 'player_id and predicted_combined_total are required' },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from('tiebreaker_predictions')
    .upsert({ player_id, predicted_combined_total }, { onConflict: 'player_id' })
    .select('*, player:players(*)')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function PUT(req: NextRequest) {
  // Update actual tiebreaker results
  const supabase = createClient();
  const body = await req.json();
  const { nba_final_game_score, nhl_final_game_goals } = body;

  // Upsert a single result row
  const { data: existing } = await supabase
    .from('tiebreaker_results')
    .select('id')
    .limit(1)
    .maybeSingle();

  let data, error;
  if (existing) {
    ({ data, error } = await supabase
      .from('tiebreaker_results')
      .update({ nba_final_game_score, nhl_final_game_goals })
      .eq('id', existing.id)
      .select()
      .single());
  } else {
    ({ data, error } = await supabase
      .from('tiebreaker_results')
      .insert({ nba_final_game_score, nhl_final_game_goals })
      .select()
      .single());
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
