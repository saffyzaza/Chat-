import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

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

// GET: ดึงประวัติการสนทนาทั้งหมด
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const filter = searchParams.get('filter') || 'all'; // all, today, week, month
    const search = searchParams.get('search');

    if (!userId) {
      // ถ้าไม่มี userId ให้ใช้ localStorage แบบเดิม
      return NextResponse.json({ sessions: [] });
    }

    let query = `
      SELECT 
        id, title, preview, message_count, 
        created_at, updated_at
      FROM chat_sessions 
      WHERE user_id = $1
    `;
    const params: any[] = [userId];

    // กรองตามวันที่
    if (filter !== 'all') {
      const now = new Date();
      let filterDate = new Date();
      
      switch (filter) {
        case 'today':
          filterDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          filterDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          filterDate.setDate(now.getDate() - 30);
          break;
      }
      
      query += ` AND updated_at >= $${params.length + 1}`;
      params.push(filterDate.toISOString());
    }

    // ค้นหา
    if (search) {
      query += ` AND (
        title ILIKE $${params.length + 1} OR 
        preview ILIKE $${params.length + 1}
      )`;
      params.push(`%${search}%`);
    }

    query += ` ORDER BY updated_at DESC`;

    const result = await pool.query(query, params);

    return NextResponse.json({
      sessions: result.rows.map(row => ({
        id: row.id,
        title: row.title,
        preview: row.preview || '',
        messageCount: row.message_count,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        messages: [] // จะโหลดตอนเปิด session
      }))
    });
  } catch (error: any) {
    console.error('Get chat sessions error:', error);
    return NextResponse.json(
      { message: 'เกิดข้อผิดพลาดในการดึงข้อมูล', error: error.message },
      { status: 500 }
    );
  }
}

// POST: สร้าง session ใหม่
export async function POST(request: NextRequest) {
  try {
    const { sessionId, userId, title, preview } = await request.json();

    if (!sessionId || !title) {
      return NextResponse.json(
        { message: 'กรุณาระบุ sessionId และ title' },
        { status: 400 }
      );
    }

    const query = `
      INSERT INTO chat_sessions (id, user_id, title, preview, message_count)
      VALUES ($1, $2, $3, $4, 0)
      RETURNING id, title, preview, message_count, created_at, updated_at
    `;

    const result = await pool.query(query, [
      sessionId,
      userId || null,
      title,
      preview || ''
    ]);

    return NextResponse.json({
      message: 'สร้าง session สำเร็จ',
      session: result.rows[0]
    }, { status: 201 });
  } catch (error: any) {
    console.error('Create chat session error:', error);
    return NextResponse.json(
      { message: 'เกิดข้อผิดพลาดในการสร้าง session', error: error.message },
      { status: 500 }
    );
  }
}

// DELETE: ลบ sessions
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionIds = searchParams.get('ids')?.split(',');
    const userId = searchParams.get('userId');

    if (!sessionIds || sessionIds.length === 0) {
      return NextResponse.json(
        { message: 'กรุณาระบุ session ids' },
        { status: 400 }
      );
    }

    let query = 'DELETE FROM chat_sessions WHERE id = ANY($1)';
    const params: any[] = [sessionIds];

    // ถ้ามี userId ให้ตรวจสอบว่าเป็นเจ้าของ session
    if (userId) {
      query += ' AND user_id = $2';
      params.push(userId);
    }

    const result = await pool.query(query, params);

    return NextResponse.json({
      message: `ลบ ${result.rowCount} sessions สำเร็จ`,
      deletedCount: result.rowCount
    });
  } catch (error: any) {
    console.error('Delete chat sessions error:', error);
    return NextResponse.json(
      { message: 'เกิดข้อผิดพลาดในการลบ sessions', error: error.message },
      { status: 500 }
    );
  }
}
