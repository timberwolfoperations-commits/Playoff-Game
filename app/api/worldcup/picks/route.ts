import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { requireAdmin } from '@/lib/admin-auth';

export async function GET() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('wc_picks')
    .select('*, player:wc_players(*), team:wc_teams(*)')
    .order('created_at', { ascending: true })
    .order('id', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const body = await req.json();
  const { player_id, team_id } = body;

  if (!player_id || !team_id) {
    return NextResponse.json({ error: 'player_id and team_id are required' }, { status: 400 });
  }

  const playersRes = await supabase
    .from('wc_players')
    .select('id, name')
    .order('created_at', { ascending: true })
    .order('id', { ascending: true });
  if (playersRes.error) return NextResponse.json({ error: playersRes.error.message }, { status: 500 });

  const players = playersRes.data ?? [];
  if (players.length === 0) {
    return NextResponse.json({ error: 'Add at least one player before drafting.' }, { status: 400 });
  }

  const picksRes = await supabase
    .from('wc_picks')
    .select('id, player_id')
    .order('created_at', { ascending: true })
    .order('id', { ascending: true });
  if (picksRes.error) return NextResponse.json({ error: picksRes.error.message }, { status: 500 });

  const picks = picksRes.data ?? [];
  const playerCount = players.length;
  const totalPicks = picks.length;
  const currentRound = Math.floor(totalPicks / playerCount);
  const roundOffset = totalPicks % playerCount;
  const isForwardRound = currentRound % 2 === 0;
  const expectedIndex = isForwardRound ? roundOffset : playerCount - 1 - roundOffset;
  const expectedPlayer = players[expectedIndex];

  if (!expectedPlayer) {
    return NextResponse.json({ error: 'Unable to determine the next snake-draft turn.' }, { status: 500 });
  }

  if (player_id !== expectedPlayer.id) {
    return NextResponse.json(
      { error: `It is ${expectedPlayer.name}'s turn to pick.` },
      { status: 409 }
    );
  }

  const playerPickOrder = picks.filter((pick) => pick.player_id === player_id).length;

  const { data, error } = await supabase
    .from('wc_picks')
    .insert({ player_id, team_id, pick_order: playerPickOrder })
    .select('*, player:wc_players(*), team:wc_teams(*)')
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'That team has already been drafted.' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
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
