import { NextRequest, NextResponse } from 'next/server';
import { computeAdminToken, makeAdminCookie } from '@/lib/admin-auth';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { passcode } = body;

  if (!passcode) {
    return NextResponse.json({ error: 'Passcode required' }, { status: 400 });
  }

  const expectedPasscode = process.env.ADMIN_PASSCODE;
  if (!expectedPasscode) {
    return NextResponse.json({ error: 'Admin not configured' }, { status: 500 });
  }

  if (passcode !== expectedPasscode) {
    return NextResponse.json({ error: 'Invalid passcode' }, { status: 401 });
  }

  const token = computeAdminToken();
  const response = NextResponse.json({ ok: true });
  response.headers.set('Set-Cookie', makeAdminCookie(token));
  return response;
}
