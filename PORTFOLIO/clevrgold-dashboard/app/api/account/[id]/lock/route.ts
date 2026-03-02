import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

export const dynamic = 'force-dynamic';

/** PATCH /api/account/[id]/lock — toggle manual lock */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const accountNumber = parseInt(params.id);
    if (isNaN(accountNumber)) {
      return NextResponse.json({ error: 'Invalid account number' }, { status: 400 });
    }

    const body = await request.json();
    const manualLock = body.manual_lock === true;

    await sql`
      UPDATE accounts SET manual_lock = ${manualLock}
      WHERE account_number = ${accountNumber}
    `;

    return NextResponse.json({ account_number: accountNumber, manual_lock: manualLock });
  } catch (error) {
    console.error('Lock toggle error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
