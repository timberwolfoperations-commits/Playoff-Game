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
  winning_team?: string | null;
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
  if (process.env.REQUIRE_PUBLIC_USER_AUTH === 'false') {
    const headerUserId = req.headers.get('x-user-id')?.trim() ?? '';
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      .test(headerUserId);
    if (!isUuid) {
      return NextResponse.json(
        { error: 'x-user-id header (UUID) is required when public auth is disabled' },
        { status: 400 },
      );
    }
    return { userId: headerUserId };
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
  request: NextRequest,
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

  // If the request includes a bearer token, merge the user's saved picks so
  // the bracket shows their previous selections on reload / in the locked view.
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (token) {
    try {
      const authSupa = createAuthClient();
      const { data: userData } = await authSupa.auth.getUser(token);
      if (userData.user) {
        const userId = userData.user.id;
        const { data: picks } = await supabase
          .from('bracket_user_picks')
          .select('match_id, predicted_winner')
          .eq('user_id', userId)
          .eq('bracket_id', bracketResult.data.id);

        if (Array.isArray(picks) && picks.length > 0) {
          const pickMap = new Map(
            (picks as Array<{ match_id: string; predicted_winner: string }>).map(
              (p) => [p.match_id, p.predicted_winner],
            ),
          );
          return NextResponse.json(
            sorted.map((m) => ({
              ...m,
              winning_team: pickMap.get(m.id) ?? m.winning_team ?? null,
            })),
          );
        }
      }
    } catch {
      // Non-fatal: fall through to return matches without merged picks
    }
  }

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
  } catch (error) {
    console.warn('Invalid bracket picks payload:', error);
    return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
  }
  const payload = isRecord(body) ? body : null;
  const matchId = payload && typeof payload.match_id === 'string' ? payload.match_id : null;
  const predictedWinner = payload && typeof payload.predicted_winner === 'string'
    ? payload.predicted_winner.trim()
    : null;
  const requestGroupId = payload && typeof payload.group_id === 'string' ? payload.group_id : null;

  if (!matchId || !predictedWinner) {
    return NextResponse.json(
      { error: 'match_id and predicted_winner are required' },
      { status: 400 },
    );
  }

  const supabase = createClient();

  // Resolve group_id: prefer an explicit value from the request body, otherwise
  // fall back to the caller's first group membership so that the upsert uses the
  // correct unique constraint (user_id, group_id, match_id) on bracket_user_picks.
  let groupId = requestGroupId;
  if (!groupId) {
    const { data: membership } = await supabase
      .from('group_memberships')
      .select('group_id')
      .eq('profile_id', userId)
      .limit(1)
      .maybeSingle();
    groupId = (membership as { group_id: string } | null)?.group_id ?? null;
  }

  if (!groupId) {
    return NextResponse.json(
      { error: 'No group membership found. Please join a group before submitting picks.' },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from('bracket_user_picks')
    .upsert(
      {
        user_id: userId,
        group_id: groupId,
        match_id: matchId,
        predicted_winner: predictedWinner,
      },
      { onConflict: 'user_id,group_id,match_id' },
    )
    .select('*')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
