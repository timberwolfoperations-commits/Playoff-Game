import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { normalizeBettorName } from '@/lib/side-bets';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    market_id,
    bettor_name,
    option_id,
    amount_cents,
  }: {
    market_id?: string;
    bettor_name?: string;
    option_id?: string;
    amount_cents?: number;
  } = body;

  if (!market_id || !bettor_name?.trim() || !option_id) {
    return NextResponse.json(
      { error: 'market_id, bettor_name, and option_id are required' },
      { status: 400 }
    );
  }

  const parsedAmount = Number.isFinite(amount_cents) ? Number(amount_cents) : 500;
  if (parsedAmount < 0) {
    return NextResponse.json({ error: 'amount_cents must be >= 0' }, { status: 400 });
  }

  const supabase = createClient();

  const { data: market, error: marketError } = await supabase
    .from('side_bet_markets')
    .select('*')
    .eq('id', market_id)
    .maybeSingle();

  if (marketError || !market) {
    return NextResponse.json({ error: marketError?.message ?? 'Market not found' }, { status: 404 });
  }

  if (market.status !== 'open') {
    return NextResponse.json({ error: 'This market is no longer open.' }, { status: 400 });
  }

  const now = Date.now();
  const lockAt = new Date(market.lock_at).getTime();
  if (Number.isFinite(lockAt) && now >= lockAt) {
    return NextResponse.json({ error: 'Betting is locked for this market.' }, { status: 400 });
  }

  const { data: option, error: optionError } = await supabase
    .from('side_bet_options')
    .select('id, market_id')
    .eq('id', option_id)
    .maybeSingle();

  if (optionError || !option || option.market_id !== market_id) {
    return NextResponse.json({ error: 'Selected option is invalid for this market.' }, { status: 400 });
  }

  const normalizedName = normalizeBettorName(bettor_name);

  const { data, error } = await supabase
    .from('side_bet_entries')
    .upsert(
      {
        market_id,
        bettor_name: bettor_name.trim(),
        bettor_name_normalized: normalizedName,
        option_id,
        amount_cents: parsedAmount,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'market_id,bettor_name_normalized' }
    )
    .select('*, option:side_bet_options(*, player:players(*))')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
