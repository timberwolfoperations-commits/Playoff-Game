import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { requireAdmin } from '@/lib/admin-auth';

// POST /api/bets/slates/[id]/picks — admin: add a pick to a slate
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;
  const supabase = createClient();
  const body = await req.json();
  const { title, option_a, option_b, display_order } = body;

  if (!title?.trim() || !option_a?.trim() || !option_b?.trim()) {
    return NextResponse.json(
      { error: 'title, option_a, and option_b are required' },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from('slate_picks')
    .insert({
      slate_id: id,
      title: title.trim(),
      option_a: option_a.trim(),
      option_b: option_b.trim(),
      display_order: display_order ?? 0,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
