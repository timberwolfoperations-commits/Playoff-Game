import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';

// POST /api/bets/slips — public: submit a bet slip
export async function POST(req: NextRequest) {
  const supabase = createClient();
  const body = await req.json();
  const { slate_id, player_name, choices } = body;

  if (!slate_id || !player_name?.trim()) {
    return NextResponse.json({ error: 'slate_id and player_name are required' }, { status: 400 });
  }

  if (!Array.isArray(choices) || choices.length === 0) {
    return NextResponse.json({ error: 'choices array is required' }, { status: 400 });
  }

  // Verify slate is open
  const { data: slate, error: slateError } = await supabase
    .from('daily_slates')
    .select('id, is_open, is_settled, picks:slate_picks(id)')
    .eq('id', slate_id)
    .single();

  if (slateError || !slate) {
    return NextResponse.json({ error: 'Slate not found' }, { status: 404 });
  }
  if (!slate.is_open) {
    return NextResponse.json({ error: 'This slate is not open for picks' }, { status: 400 });
  }
  if (slate.is_settled) {
    return NextResponse.json({ error: 'This slate is already settled' }, { status: 400 });
  }

  const slatePicks = slate.picks as { id: string }[];
  const pickIds = new Set(slatePicks.map((p) => p.id));

  // Validate choices — must cover all picks, one per pick, option 'a' or 'b'
  const choiceMap = new Map<string, 'a' | 'b'>();
  for (const c of choices) {
    if (!pickIds.has(c.slate_pick_id)) {
      return NextResponse.json(
        { error: `Unknown pick id: ${c.slate_pick_id}` },
        { status: 400 }
      );
    }
    if (c.chosen_option !== 'a' && c.chosen_option !== 'b') {
      return NextResponse.json(
        { error: 'chosen_option must be "a" or "b"' },
        { status: 400 }
      );
    }
    choiceMap.set(c.slate_pick_id, c.chosen_option);
  }

  if (choiceMap.size !== pickIds.size) {
    return NextResponse.json(
      { error: 'You must pick an option for every game on the slate' },
      { status: 400 }
    );
  }

  // Insert the slip (UNIQUE constraint will reject duplicates)
  const { data: slip, error: slipError } = await supabase
    .from('bet_slips')
    .insert({ slate_id, player_name: player_name.trim(), cost_cents: 100 })
    .select()
    .single();

  if (slipError) {
    const isDupe = slipError.code === '23505';
    return NextResponse.json(
      { error: isDupe ? 'You already submitted a slip for this slate' : slipError.message },
      { status: isDupe ? 409 : 500 }
    );
  }

  // Insert choices
  const choiceRows = Array.from(choiceMap.entries()).map(([slate_pick_id, chosen_option]) => ({
    slip_id: slip.id,
    slate_pick_id,
    chosen_option,
  }));

  const { error: choiceError } = await supabase.from('slip_choices').insert(choiceRows);
  if (choiceError) {
    // Rollback the slip
    await supabase.from('bet_slips').delete().eq('id', slip.id);
    return NextResponse.json({ error: choiceError.message }, { status: 500 });
  }

  return NextResponse.json({ ...slip, choices: choiceRows }, { status: 201 });
}
