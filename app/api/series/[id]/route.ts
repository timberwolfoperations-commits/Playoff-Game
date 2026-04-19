import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = createClient();
  const { id } = await params;
  const body = await req.json();

  const { data, error } = await supabase
    .from('series')
    .update(body)
    .eq('id', id)
    .select(
      '*, home_team:teams!series_home_team_id_fkey(*), away_team:teams!series_away_team_id_fkey(*), winner_team:teams!series_winner_team_id_fkey(*)'
    )
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = createClient();
  const { id } = await params;
  const { error } = await supabase.from('series').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
