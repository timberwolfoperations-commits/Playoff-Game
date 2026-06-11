import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { requireAdmin } from '@/lib/admin-auth';

export async function GET() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('wc_picks')
    .select('*, player:wc_players(*), team:wc_teams(*)')
    .order('player_id', { ascending: true })
    .order('pick_order', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const authError = await requireAdmin();
  if (authError) return authError;

  const supabase = createClient();
  const body = await req.json();
  const { player_id, team_id, pick_order } = body;

  if (!player_id || !team_id) {
    return NextResponse.json({ error: 'player_id and team_id are required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('wc_picks')
    .upsert(
      { player_id, team_id, pick_order: pick_order ?? 0 },
      { onConflict: 'team_id' }
    )
    .select('*, player:wc_players(*), team:wc_teams(*)')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const authError = await requireAdmin();
  if (authError) return authError;

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const supabase = createClient();
  const { error } = await supabase.from('wc_picks').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
