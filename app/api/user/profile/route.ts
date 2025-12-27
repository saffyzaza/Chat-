import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { withAuth } from '@/app/utils/middleware';

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

// ดึงข้อมูลโปรไฟล์ของ User (ต้อง Login)
export const GET = withAuth(async (req: NextRequest, user) => {
  try {
    const query = 'SELECT id, name, email, created_at, last_login FROM users WHERE id = $1';
    const result = await pool.query(query, [user.id]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { message: 'ไม่พบข้อมูลผู้ใช้' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      user: result.rows[0],
    });
  } catch (error: any) {
    console.error('Get profile error:', error);
    return NextResponse.json(
      { message: 'เกิดข้อผิดพลาดในการดึงข้อมูล' },
      { status: 500 }
    );
  }
});

// แก้ไขข้อมูลโปรไฟล์ (ต้อง Login)
export const PUT = withAuth(async (req: NextRequest, user) => {
  try {
    const { name } = await req.json();

    if (!name) {
      return NextResponse.json(
        { message: 'กรุณากรอกชื่อ' },
        { status: 400 }
      );
    }

    const query = 'UPDATE users SET name = $1, updated_at = NOW() WHERE id = $2 RETURNING id, name, email';
    const result = await pool.query(query, [name, user.id]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { message: 'ไม่สามารถแก้ไขข้อมูลได้' },
        { status: 400 }
      );
    }

    // อัพเดท localStorage
    const updatedUser = result.rows[0];

    return NextResponse.json({
      message: 'แก้ไขข้อมูลสำเร็จ',
      user: updatedUser,
    });
  } catch (error: any) {
    console.error('Update profile error:', error);
    return NextResponse.json(
      { message: 'เกิดข้อผิดพลาดในการแก้ไขข้อมูล' },
      { status: 500 }
    );
  }
});
