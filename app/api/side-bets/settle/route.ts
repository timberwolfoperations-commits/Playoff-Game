import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { hasAdminAccess } from '@/lib/side-bets';

export async function PUT(req: NextRequest) {
  if (!hasAdminAccess(req)) {
    return NextResponse.json(
      { error: 'Admin access required. Supply x-admin-key header.' },
      { status: 401 }
    );
  }

  const body = await req.json();
  const {
    market_id,
    winning_option_id,
  }: { market_id?: string; winning_option_id?: string } = body;

  if (!market_id || !winning_option_id) {
    return NextResponse.json({ error: 'market_id and winning_option_id are required' }, { status: 400 });
  }

  const supabase = createClient();

  const { data: option, error: optionError } = await supabase
    .from('side_bet_options')
    .select('id, market_id')
    .eq('id', winning_option_id)
    .maybeSingle();

  if (optionError || !option || option.market_id !== market_id) {
    return NextResponse.json({ error: 'Winning option does not belong to this market.' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('side_bet_markets')
    .update({
      status: 'settled',
      winning_option_id,
      settled_at: new Date().toISOString(),
    })
    .eq('id', market_id)
    .select('*')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
