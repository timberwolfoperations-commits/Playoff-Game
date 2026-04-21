import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { BetLeaderboardEntry } from '@/types';

// GET /api/bets/leaderboard — aggregate net dollars per player
export async function GET() {
  const supabase = createClient();

  // Fetch all settled slips (non-null winnings_cents)
  const { data, error } = await supabase
    .from('bet_slips')
    .select('player_name, cost_cents, winnings_cents')
    .not('winnings_cents', 'is', null)
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = data ?? [];
  const aggregated = new Map<string, BetLeaderboardEntry>();

  for (const row of rows) {
    const name = row.player_name as string;
    const entry = aggregated.get(name) ?? {
      player_name: name,
      total_wagered_cents: 0,
      total_winnings_cents: 0,
      net_cents: 0,
      slips_count: 0,
    };
    entry.total_wagered_cents += row.cost_cents as number;
    entry.total_winnings_cents += (row.winnings_cents ?? 0) as number;
    entry.slips_count += 1;
    aggregated.set(name, entry);
  }

  const leaderboard: BetLeaderboardEntry[] = Array.from(aggregated.values())
    .map((e) => ({ ...e, net_cents: e.total_winnings_cents - e.total_wagered_cents }))
    .sort((a, b) => b.net_cents - a.net_cents);

  return NextResponse.json(leaderboard);
}
