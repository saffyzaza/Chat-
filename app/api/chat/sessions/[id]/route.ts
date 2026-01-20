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

// GET: ดึงข้อมูล session พร้อม messages
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;

    // ดึงข้อมูล session
    const sessionQuery = `
      SELECT id, user_id, title, preview, message_count, created_at, updated_at
      FROM chat_sessions 
      WHERE id = $1
    `;
    const sessionResult = await pool.query(sessionQuery, [sessionId]);

    if (sessionResult.rows.length === 0) {
      return NextResponse.json(
        { message: 'ไม่พบ session' },
        { status: 404 }
      );
    }

    const session = sessionResult.rows[0];

    // ดึง messages
    const messagesQuery = `
      SELECT id, role, content, images, charts, tables, code_blocks, plan_content, created_at
      FROM chat_messages 
      WHERE session_id = $1
      ORDER BY created_at ASC
    `;
    const messagesResult = await pool.query(messagesQuery, [sessionId]);

    return NextResponse.json({
      session: {
        id: session.id,
        userId: session.user_id,
        title: session.title,
        preview: session.preview || '',
        messageCount: session.message_count,
        createdAt: session.created_at,
        updatedAt: session.updated_at,
        messages: messagesResult.rows.map(msg => ({
          role: msg.role,
          content: msg.content,
          images: msg.images || [],
          charts: msg.charts || [],
          tables: msg.tables || [],
          codeBlocks: msg.code_blocks || [],
          planContent: msg.plan_content,
          timestamp: msg.created_at
        }))
      }
    });
  } catch (error: any) {
    console.error('Get chat session error:', error);
    return NextResponse.json(
      { message: 'เกิดข้อผิดพลาดในการดึงข้อมูล', error: error.message },
      { status: 500 }
    );
  }
}

// PUT: อัปเดต session (เช่น title)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    const { title, preview } = await request.json();

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (title !== undefined) {
      updates.push(`title = $${paramIndex++}`);
      values.push(title);
    }

    if (preview !== undefined) {
      updates.push(`preview = $${paramIndex++}`);
      values.push(preview);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { message: 'ไม่มีข้อมูลที่จะอัปเดต' },
        { status: 400 }
      );
    }

    values.push(sessionId);

    const query = `
      UPDATE chat_sessions 
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, title, preview, updated_at
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { message: 'ไม่พบ session' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'อัปเดต session สำเร็จ',
      session: result.rows[0]
    });
  } catch (error: any) {
    console.error('Update chat session error:', error);
    return NextResponse.json(
      { message: 'เกิดข้อผิดพลาดในการอัปเดต', error: error.message },
      { status: 500 }
    );
  }
}

// DELETE: ลบ session
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    let query = 'DELETE FROM chat_sessions WHERE id = $1';
    const queryParams: any[] = [sessionId];

    // ถ้ามี userId ให้ตรวจสอบว่าเป็นเจ้าของ
    if (userId) {
      query += ' AND user_id = $2';
      queryParams.push(userId);
    }

    const result = await pool.query(query, queryParams);

    if (result.rowCount === 0) {
      return NextResponse.json(
        { message: 'ไม่พบ session หรือไม่มีสิทธิ์ลบ' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'ลบ session สำเร็จ'
    });
  } catch (error: any) {
    console.error('Delete chat session error:', error);
    return NextResponse.json(
      { message: 'เกิดข้อผิดพลาดในการลบ session', error: error.message },
      { status: 500 }
    );
  }
}
