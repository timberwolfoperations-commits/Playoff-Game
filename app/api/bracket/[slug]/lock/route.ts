import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase';

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

// GET /api/bracket/[slug]/lock — returns current lock state for the authenticated user
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> },
) {
  const result = await getUserFromRequest(request);
  if (result instanceof NextResponse) return result;
  const { userId } = result;

  const { slug } = await context.params;
  const supabase = createClient();

  const { data, error } = await supabase
    .from('bracket_pick_locks')
    .select('is_locked, locked_at')
    .eq('user_id', userId)
    .eq('bracket_slug', slug)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    is_locked: data?.is_locked ?? false,
    locked_at: data?.locked_at ?? null,
  });
}

// POST /api/bracket/[slug]/lock — set is_locked to true for the authenticated user
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> },
) {
  const result = await getUserFromRequest(request);
  if (result instanceof NextResponse) return result;
  const { userId } = result;

  const { slug } = await context.params;
  const supabase = createClient();

  const { data, error } = await supabase
    .from('bracket_pick_locks')
    .upsert(
      {
        user_id: userId,
        bracket_slug: slug,
        is_locked: true,
        locked_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,bracket_slug' },
    )
    .select('is_locked, locked_at')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 200 });
}
