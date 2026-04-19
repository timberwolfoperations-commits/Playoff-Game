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
  // Reset draft - delete all picks (Supabase requires a filter for safety, so we use a condition that matches all valid UUIDs)
  const supabase = createClient();
  const { error } = await supabase
    .from('draft_picks')
    .delete()
    .not('id', 'is', null); // Matches all rows (id is a NOT NULL primary key)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
