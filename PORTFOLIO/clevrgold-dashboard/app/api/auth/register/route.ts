import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import sql from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { username, password, display_name } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน' }, { status: 400 });
    }

    const trimmed = username.toLowerCase().trim();
    if (trimmed.length < 3 || trimmed.length > 30 || !/^[a-z0-9_]+$/.test(trimmed)) {
      return NextResponse.json({ error: 'ชื่อผู้ใช้ต้อง 3-30 ตัวอักษร (a-z, 0-9, _)' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'รหัสผ่านต้องอย่างน้อย 6 ตัวอักษร' }, { status: 400 });
    }

    const existing = await sql`SELECT id FROM users WHERE username = ${trimmed}`;
    if (existing.length > 0) {
      return NextResponse.json({ error: 'ชื่อผู้ใช้นี้ถูกใช้แล้ว' }, { status: 409 });
    }

    const hash = await bcrypt.hash(password, 10);

    await sql`
      INSERT INTO users (username, password_hash, display_name, role, is_approved)
      VALUES (${trimmed}, ${hash}, ${display_name || trimmed}, 'user', FALSE)
    `;

    return NextResponse.json({
      message: 'สมัครสมาชิกสำเร็จ กรุณารอ Admin อนุมัติ',
    });
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}
