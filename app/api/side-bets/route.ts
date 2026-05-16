import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { hasAdminAccess } from '@/lib/side-bets';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = createClient();

  const { data: market, error: marketError } = await supabase
    .from('side_bet_markets')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (marketError) {
    return NextResponse.json({ error: marketError.message }, { status: 500 });
  }

  if (!market) {
    return NextResponse.json({ market: null, options: [], entries: [] });
  }

  const [optionsRes, entriesRes] = await Promise.all([
    supabase
      .from('side_bet_options')
      .select('*, player:players(*)')
      .eq('market_id', market.id)
      .order('display_order', { ascending: true }),
    supabase
      .from('side_bet_entries')
      .select('*, option:side_bet_options(*, player:players(*))')
      .eq('market_id', market.id)
      .order('created_at', { ascending: true }),
  ]);

  if (optionsRes.error) {
    return NextResponse.json({ error: optionsRes.error.message }, { status: 500 });
  }

  if (entriesRes.error) {
    return NextResponse.json({ error: entriesRes.error.message }, { status: 500 });
  }

  return NextResponse.json({
    market,
    options: optionsRes.data ?? [],
    entries: entriesRes.data ?? [],
  });
}

export async function POST(req: NextRequest) {
  if (!hasAdminAccess(req)) {
    return NextResponse.json(
      { error: 'Admin access required. Supply x-admin-key header.' },
      { status: 401 }
    );
  }

  const body = await req.json();
  const {
    title,
    description,
    lock_at,
    option_player_ids,
  }: {
    title?: string;
    description?: string | null;
    lock_at?: string;
    option_player_ids?: string[];
  } = body;

  if (!title?.trim() || !lock_at || !Array.isArray(option_player_ids) || option_player_ids.length < 2) {
    return NextResponse.json(
      { error: 'title, lock_at, and at least 2 option_player_ids are required' },
      { status: 400 }
    );
  }

  const supabase = createClient();

  const lockDate = new Date(lock_at);
  if (Number.isNaN(lockDate.getTime())) {
    return NextResponse.json({ error: 'lock_at must be a valid datetime string' }, { status: 400 });
  }

  const uniqueOptionPlayerIds = Array.from(new Set(option_player_ids));

  const { data: market, error: marketError } = await supabase
    .from('side_bet_markets')
    .insert({
      title: title.trim(),
      description: description?.trim() || null,
      lock_at: lockDate.toISOString(),
      status: 'open',
      settled_at: null,
      winning_option_id: null,
    })
    .select('*')
    .single();

  if (marketError || !market) {
    return NextResponse.json({ error: marketError?.message ?? 'Failed to create market' }, { status: 500 });
  }

  const optionRows = uniqueOptionPlayerIds.map((playerId, index) => ({
    market_id: market.id,
    player_id: playerId,
    display_order: index,
  }));

  const { data: options, error: optionsError } = await supabase
    .from('side_bet_options')
    .insert(optionRows)
    .select('*, player:players(*)')
    .order('display_order', { ascending: true });

  if (optionsError) {
    await supabase.from('side_bet_markets').delete().eq('id', market.id);
    return NextResponse.json({ error: optionsError.message }, { status: 500 });
  }

  return NextResponse.json({ market, options: options ?? [] }, { status: 201 });
}
