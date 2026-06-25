import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase';

interface BracketRecord {
  id: string;
  slug: string;
}

interface MatchRecord {
  id: string;
  bracket_id?: string;
  round_order?: number | null;
  round_number?: number | null;
  round_index?: number | null;
  match_order?: number | null;
  match_number?: number | null;
  match_index?: number | null;
  match_identifier?: string | null;
}

function createAuthClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) throw new Error('Missing Supabase env vars.');
  return createSupabaseClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function getUserFromRequest(
  req: NextRequest,
): Promise<{ userId: string } | NextResponse> {
  const authRequired = process.env.REQUIRE_PUBLIC_USER_AUTH !== 'false';
  if (!authRequired) {
    return { userId: '00000000-0000-0000-0000-000000000000' };
  }

  const header = req.headers.get('authorization');
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const auth = createAuthClient();
  const { data, error } = await auth.auth.getUser(token);
  if (error || !data.user) {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
  }
  return { userId: data.user.id };
}

function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function compareMatches(a: MatchRecord, b: MatchRecord): number {
  const roundA = asNumber(a.round_order) ?? asNumber(a.round_number) ?? asNumber(a.round_index) ?? 0;
  const roundB = asNumber(b.round_order) ?? asNumber(b.round_number) ?? asNumber(b.round_index) ?? 0;
  if (roundA !== roundB) return roundA - roundB;

  const matchA = asNumber(a.match_order) ?? asNumber(a.match_number) ?? asNumber(a.match_index) ?? 0;
  const matchB = asNumber(b.match_order) ?? asNumber(b.match_number) ?? asNumber(b.match_index) ?? 0;
  if (matchA !== matchB) return matchA - matchB;

  return (a.match_identifier ?? '').localeCompare(b.match_identifier ?? '');
}

async function getBracketBySlug(slug: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('brackets')
    .select('id, slug')
    .eq('slug', slug)
    .maybeSingle();

  if (error) return { error };
  if (!data) return { data: null as BracketRecord | null };
  return { data: data as BracketRecord };
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const bracketResult = await getBracketBySlug(slug);
  if ('error' in bracketResult && bracketResult.error) {
    return NextResponse.json({ error: bracketResult.error.message }, { status: 500 });
  }
  if (!bracketResult.data) {
    return NextResponse.json({ error: 'Bracket not found' }, { status: 404 });
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from('bracket_matches')
    .select('*')
    .eq('bracket_id', bracketResult.data.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const sorted = ((data ?? []) as MatchRecord[]).sort(compareMatches);
  return NextResponse.json(sorted);
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> },
) {
  const result = await getUserFromRequest(request);
  if (result instanceof NextResponse) return result;
  const { userId } = result;

  const { slug } = await context.params;
  const bracketResult = await getBracketBySlug(slug);
  if ('error' in bracketResult && bracketResult.error) {
    return NextResponse.json({ error: bracketResult.error.message }, { status: 500 });
  }
  if (!bracketResult.data) {
    return NextResponse.json({ error: 'Bracket not found' }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
  }
  const payload = isRecord(body) ? body : null;
  const matchId = payload && typeof payload.match_id === 'string' ? payload.match_id : null;
  const predictedWinner = payload && typeof payload.predicted_winner === 'string'
    ? payload.predicted_winner.trim()
    : null;

  if (!matchId || !predictedWinner) {
    return NextResponse.json(
      { error: 'match_id and predicted_winner are required' },
      { status: 400 },
    );
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from('bracket_user_picks')
    .upsert(
      {
        user_id: userId,
        bracket_id: bracketResult.data.id,
        match_id: matchId,
        predicted_winner: predictedWinner,
      },
      { onConflict: 'user_id,bracket_id,match_id' },
    )
    .select('*')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
