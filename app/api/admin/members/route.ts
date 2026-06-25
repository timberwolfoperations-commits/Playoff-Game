import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { createClient } from '@/lib/supabase';

interface MemberRow {
  id: string;
  group_id: string;
  profile_id: string;
  role: string;
  joined_at: string;
  has_paid: boolean;
  profiles: { display_name: string | null } | null;
  groups: { name: string } | null;
}

// GET /api/admin/members — list all group memberships with payment status
export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  const supabase = createClient();
  const { data, error } = await supabase
    .from('group_memberships')
    .select('id, group_id, profile_id, role, joined_at, has_paid, profiles(display_name), groups(name)')
    .order('joined_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data as unknown as MemberRow[]);
}

// PATCH /api/admin/members — toggle has_paid for a membership
export async function PATCH(request: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const payload = typeof body === 'object' && body !== null ? body as Record<string, unknown> : null;
  const membershipId = typeof payload?.id === 'string' ? payload.id : null;
  const hasPaid = typeof payload?.has_paid === 'boolean' ? payload.has_paid : null;

  if (!membershipId || hasPaid === null) {
    return NextResponse.json({ error: 'id and has_paid are required' }, { status: 400 });
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from('group_memberships')
    .update({ has_paid: hasPaid })
    .eq('id', membershipId)
    .select('id, has_paid')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
