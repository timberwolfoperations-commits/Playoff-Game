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
  const authRequired = process.env.REQUIRE_PUBLIC_USER_AUTH !== 'false';
  if (!authRequired) {
    // Dev: return a deterministic placeholder so queries still work
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

// GET /api/bracket/picks?groupId=<uuid>
export async function GET(req: NextRequest) {
  const result = await getUserFromRequest(req);
  if (result instanceof NextResponse) return result;
  const { userId } = result;

  const groupId = req.nextUrl.searchParams.get('groupId');
  if (!groupId) {
    return NextResponse.json({ error: 'groupId query param is required' }, { status: 400 });
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from('bracket_user_picks')
    .select('*')
    .eq('user_id', userId)
    .eq('group_id', groupId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST /api/bracket/picks  — upsert a single pick
export async function POST(req: NextRequest) {
  const result = await getUserFromRequest(req);
  if (result instanceof NextResponse) return result;
  const { userId } = result;

  const body = await req.json() as Record<string, unknown>;
  const { group_id, match_id, predicted_winner } = body;

  if (!group_id || !match_id || !predicted_winner) {
    return NextResponse.json(
      { error: 'group_id, match_id, and predicted_winner are required' },
      { status: 400 },
    );
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from('bracket_user_picks')
    .upsert(
      {
        user_id: userId,
        group_id,
        match_id,
        predicted_winner,
      },
      { onConflict: 'user_id,group_id,match_id' },
    )
    .select('*')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

// DELETE /api/bracket/picks  — remove a pick (cascade reset)
export async function DELETE(req: NextRequest) {
  const result = await getUserFromRequest(req);
  if (result instanceof NextResponse) return result;
  const { userId } = result;

  const body = await req.json() as Record<string, unknown>;
  const { group_id, match_id } = body;

  if (!group_id || !match_id) {
    return NextResponse.json({ error: 'group_id and match_id are required' }, { status: 400 });
  }

  const supabase = createClient();
  const { error } = await supabase
    .from('bracket_user_picks')
    .delete()
    .eq('user_id', userId)
    .eq('group_id', group_id)
    .eq('match_id', match_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
