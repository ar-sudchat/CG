import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const userId = parseInt(params.id);
    const body = await request.json();
    const { is_approved, role } = body;

    if (is_approved !== undefined) {
      await sql`UPDATE users SET is_approved = ${is_approved}, updated_at = NOW() WHERE id = ${userId}`;
    }
    if (role !== undefined && (role === 'admin' || role === 'user')) {
      await sql`UPDATE users SET role = ${role}, updated_at = NOW() WHERE id = ${userId}`;
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Admin update user error:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const userId = parseInt(params.id);
    await sql`DELETE FROM users WHERE id = ${userId}`;
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Admin delete user error:', error);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}
