import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { requireAdmin } from '@/lib/admin-auth';

// GET /api/bets/slates — list all slates (latest first)
export async function GET() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('daily_slates')
    .select('*, picks:slate_picks(*)')
    .order('date', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST /api/bets/slates — admin: create a new slate
export async function POST(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const supabase = createClient();
  const body = await req.json();
  const { date, title, description } = body;

  if (!date || !title?.trim()) {
    return NextResponse.json({ error: 'date and title are required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('daily_slates')
    .insert({ date, title: title.trim(), description: description?.trim() ?? null })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
