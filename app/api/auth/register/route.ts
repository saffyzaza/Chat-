import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

// สร้าง PostgreSQL connection pool
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'chatdb',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'your_password',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export async function POST(request: NextRequest) {
  try {
    const { name, email, password } = await request.json();

    // Validation
    if (!name || !email || !password) {
      return NextResponse.json(
        { message: 'กรุณากรอกข้อมูลให้ครบถ้วน' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { message: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร' },
        { status: 400 }
      );
    }

    // ตรวจสอบว่าอีเมลซ้ำหรือไม่
    const checkQuery = 'SELECT id FROM users WHERE email = $1';
    const checkResult = await pool.query(checkQuery, [email]);

    if (checkResult.rows.length > 0) {
      return NextResponse.json(
        { message: 'อีเมลนี้ถูกใช้งานแล้ว' },
        { status: 409 }
      );
    }

    // สร้างผู้ใช้ใหม่ (ในการใช้งานจริงควร hash รหัสผ่านด้วย bcrypt)
    const insertQuery = `
      INSERT INTO users (name, email, password, role, created_at) 
      VALUES ($1, $2, $3, 'user', NOW()) 
      RETURNING id, name, email, role, created_at
    `;
    const insertResult = await pool.query(insertQuery, [name, email, password]);

    const newUser = insertResult.rows[0];

    return NextResponse.json({
      message: 'ลงทะเบียนสำเร็จ',
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role || 'user',
      },
      token: `Bearer ${Buffer.from(`${newUser.id}:${Date.now()}`).toString('base64')}`,
    }, { status: 201 });
  } catch (error: any) {
    console.error('Register error:', error);
    return NextResponse.json(
      { message: 'เกิดข้อผิดพลาดในการลงทะเบียน', error: error.message },
      { status: 500 }
    );
  }
}
