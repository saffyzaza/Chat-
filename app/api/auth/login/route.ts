import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

// สร้าง PostgreSQL connection pool
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'chat-aio',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '1234',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    // Validation
    if (!email || !password) {
      return NextResponse.json(
        { message: 'กรุณากรอกอีเมลและรหัสผ่าน' },
        { status: 400 }
      );
    }

    // Query user from database
    // ตรวจสอบคอลัมน์ approved/disabled
    const colCheck = await pool.query(`
      SELECT 
        EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='approved') AS has_approved,
        EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='disabled') AS has_disabled
    `);
    const flags = colCheck.rows[0] || { has_approved: false, has_disabled: false };
    const hasApproved = !!flags.has_approved;
    const hasDisabled = !!flags.has_disabled;

    const selectCols = [
      'id', 'name', 'email', 'role', 'created_at',
      hasApproved ? 'approved' : 'FALSE AS approved',
      hasDisabled ? 'disabled' : 'FALSE AS disabled'
    ].join(', ');

    const query = `SELECT ${selectCols} FROM users WHERE email = $1 AND password = $2`;
    const result = await pool.query(query, [email, password]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' },
        { status: 401 }
      );
    }

    const user = result.rows[0];

    // Update last login
    await pool.query(
      'UPDATE users SET last_login = NOW() WHERE id = $1',
      [user.id]
    );

    // Return user data (ในการใช้งานจริงควรใช้ JWT token)
    return NextResponse.json({
      message: 'เข้าสู่ระบบสำเร็จ',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role || 'user',
        approved: !!user.approved,
        disabled: !!user.disabled,
        activationStatus: (!!user.approved && !user.disabled) ? 'Active' : 'Inactive',
      },
      token: `Bearer ${Buffer.from(`${user.id}:${Date.now()}`).toString('base64')}`, // Simple token example
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json(
      { message: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ', error: error.message },
      { status: 500 }
    );
  }
}
