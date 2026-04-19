import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';

export async function GET() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('teams')
    .select('*')
    .order('league', { ascending: true })
    .order('seed', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const body = await req.json();
  const { name, league, seed, conference, is_wildcard } = body;

  if (!name?.trim() || !league || seed == null) {
    return NextResponse.json(
      { error: 'name, league, and seed are required' },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from('teams')
    .insert({ name: name.trim(), league, seed, conference, is_wildcard: !!is_wildcard })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
