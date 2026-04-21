import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { requireAdmin } from '@/lib/admin-auth';

// PATCH /api/bets/slates/[id]/picks/[pickId] — admin: update a pick (e.g. set correct_option)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; pickId: string }> }
) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { pickId } = await params;
  const supabase = createClient();
  const body = await req.json();

  const allowed = ['title', 'option_a', 'option_b', 'correct_option', 'display_order'];
  const updates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) updates[key] = body[key];
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No updatable fields provided' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('slate_picks')
    .update(updates)
    .eq('id', pickId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// DELETE /api/bets/slates/[id]/picks/[pickId] — admin: remove a pick
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; pickId: string }> }
) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { pickId } = await params;
  const supabase = createClient();

  const { error } = await supabase.from('slate_picks').delete().eq('id', pickId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
