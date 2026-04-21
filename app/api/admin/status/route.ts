import { NextResponse } from 'next/server';
import { isAdminAuthed } from '@/lib/admin-auth';

export async function GET() {
  const isAdmin = await isAdminAuthed();
  return NextResponse.json({ isAdmin });
}
