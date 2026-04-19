import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';

export async function GET() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('draft_picks')
    .select('*, player:players(*), team:teams(*)')
    .order('pick_number', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const body = await req.json();
  const { player_id, team_id, pick_number } = body;

  if (!player_id || !team_id || pick_number == null) {
    return NextResponse.json(
      { error: 'player_id, team_id, and pick_number are required' },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from('draft_picks')
    .insert({ player_id, team_id, pick_number })
    .select('*, player:players(*), team:teams(*)')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function DELETE() {
  // Reset draft
  const supabase = createClient();
  const { error } = await supabase.from('draft_picks').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
