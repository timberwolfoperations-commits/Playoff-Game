import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';

const MAX_PLAYERS = 8;

export async function GET() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const body = await req.json();
  const { name } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }

  const { count, error: countError } = await supabase
    .from('players')
    .select('*', { count: 'exact', head: true });

  if (countError) return NextResponse.json({ error: countError.message }, { status: 500 });
  if ((count ?? 0) >= MAX_PLAYERS) {
    return NextResponse.json(
      { error: `This game supports up to ${MAX_PLAYERS} players.` },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from('players')
    .insert({ name: name.trim() })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
