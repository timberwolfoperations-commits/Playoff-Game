import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { requireAdmin } from '@/lib/admin-auth';
import { BetSlip, SlipChoice, SlatePick } from '@/types';

// POST /api/bets/slates/[id]/settle
// Body: { results: { [pickId]: 'a' | 'b' } }
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;
  const supabase = createClient();
  const body = await req.json();
  const { results } = body as { results: Record<string, 'a' | 'b'> };

  if (!results || typeof results !== 'object') {
    return NextResponse.json({ error: 'results object is required' }, { status: 400 });
  }

  // Fetch the slate
  const { data: slate, error: slateError } = await supabase
    .from('daily_slates')
    .select('id, is_settled, picks:slate_picks(*)')
    .eq('id', id)
    .single();

  if (slateError || !slate) {
    return NextResponse.json({ error: 'Slate not found' }, { status: 404 });
  }
  if (slate.is_settled) {
    return NextResponse.json({ error: 'Slate is already settled' }, { status: 400 });
  }

  const picks = slate.picks as SlatePick[];
  for (const pick of picks) {
    if (!(pick.id in results)) {
      return NextResponse.json(
        { error: `Missing result for pick: ${pick.title}` },
        { status: 400 }
      );
    }
    if (results[pick.id] !== 'a' && results[pick.id] !== 'b') {
      return NextResponse.json(
        { error: `Invalid result for pick ${pick.title}: must be "a" or "b"` },
        { status: 400 }
      );
    }
  }

  // Update correct_option on each pick
  for (const pick of picks) {
    const { error } = await supabase
      .from('slate_picks')
      .update({ correct_option: results[pick.id] })
      .eq('id', pick.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Fetch all slips with their choices
  const { data: slips, error: slipsError } = await supabase
    .from('bet_slips')
    .select('*, choices:slip_choices(*)')
    .eq('slate_id', id);

  if (slipsError) return NextResponse.json({ error: slipsError.message }, { status: 500 });

  const allSlips = (slips ?? []) as (BetSlip & { choices: SlipChoice[] })[];

  // Score each slip
  const pickCorrectMap = new Map(picks.map((p) => [p.id, results[p.id]]));
  const scored = allSlips.map((slip) => {
    const correct = slip.choices.filter(
      (c) => pickCorrectMap.get(c.slate_pick_id) === c.chosen_option
    ).length;
    return { slip, correct };
  });

  // Find max correct count and pot
  const maxCorrect = scored.reduce((m, s) => Math.max(m, s.correct), 0);
  const winners = scored.filter((s) => s.correct === maxCorrect);
  const potCents = allSlips.length * 100; // $1 per slip

  // Distribute pot evenly among winners; remainder (rounding) goes to first winner
  let remainder = potCents;
  const perWinnerBase = winners.length > 0 ? Math.floor(potCents / winners.length) : 0;
  remainder = potCents - perWinnerBase * winners.length;

  // Update winnings for each slip
  for (let i = 0; i < scored.length; i++) {
    const { slip, correct } = scored[i];
    let winnings = 0;
    if (correct === maxCorrect) {
      winnings = perWinnerBase + (i === 0 ? remainder : 0);
    }

    const { error } = await supabase
      .from('bet_slips')
      .update({ winnings_cents: winnings })
      .eq('id', slip.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Mark slate as settled and closed
  const { data: updatedSlate, error: settleError } = await supabase
    .from('daily_slates')
    .update({ is_settled: true, is_open: false })
    .eq('id', id)
    .select()
    .single();

  if (settleError) return NextResponse.json({ error: settleError.message }, { status: 500 });

  return NextResponse.json({
    slate: updatedSlate,
    pot_cents: potCents,
    winners_count: winners.length,
    per_winner_cents: perWinnerBase,
    max_correct: maxCorrect,
  });
}
