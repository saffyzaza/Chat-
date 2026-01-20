import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

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

// POST: เพิ่มข้อความใน session
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    const { role, content, images, charts, tables, codeBlocks, planContent } = await request.json();

    if (!role || !content) {
      return NextResponse.json(
        { message: 'กรุณาระบุ role และ content' },
        { status: 400 }
      );
    }

    // ตรวจสอบว่า session มีอยู่จริง
    const sessionCheck = await pool.query(
      'SELECT id, title, message_count FROM chat_sessions WHERE id = $1',
      [sessionId]
    );

    if (sessionCheck.rows.length === 0) {
      return NextResponse.json(
        { message: 'ไม่พบ session' },
        { status: 404 }
      );
    }

    // เพิ่มข้อความ
    const insertQuery = `
      INSERT INTO chat_messages (
        session_id, role, content, images, charts, tables, code_blocks, plan_content
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, role, content, images, charts, tables, code_blocks, plan_content, created_at
    `;

    const insertResult = await pool.query(insertQuery, [
      sessionId,
      role,
      content,
      images || null,
      charts ? JSON.stringify(charts) : null,
      tables ? JSON.stringify(tables) : null,
      codeBlocks ? JSON.stringify(codeBlocks) : null,
      planContent || null
    ]);

    const newMessage = insertResult.rows[0];

    // อัปเดต session (message_count, preview, updated_at)
    const session = sessionCheck.rows[0];
    const newMessageCount = session.message_count + 1;
    
    // สร้าง preview จากข้อความล่าสุด
    const preview = content.length > 100 
      ? content.substring(0, 100) + '...' 
      : content;

    // อัปเดตชื่อถ้ายังเป็นค่าเริ่มต้น
    let updateQuery = `
      UPDATE chat_sessions 
      SET message_count = $1, preview = $2, updated_at = CURRENT_TIMESTAMP
    `;
    let updateParams: any[] = [newMessageCount, preview];

    if (newMessageCount === 1 && role === 'user') {
      const newTitle = content.length > 50 
        ? content.substring(0, 50) + '...' 
        : content;
      updateQuery += `, title = $3`;
      updateParams.push(newTitle);
    }

    updateQuery += ` WHERE id = $${updateParams.length + 1}`;
    updateParams.push(sessionId);

    await pool.query(updateQuery, updateParams);

    return NextResponse.json({
      message: 'เพิ่มข้อความสำเร็จ',
      chatMessage: {
        role: newMessage.role,
        content: newMessage.content,
        images: newMessage.images || [],
        charts: newMessage.charts || [],
        tables: newMessage.tables || [],
        codeBlocks: newMessage.code_blocks || [],
        planContent: newMessage.plan_content,
        timestamp: newMessage.created_at
      }
    }, { status: 201 });
  } catch (error: any) {
    console.error('Add message error:', error);
    return NextResponse.json(
      { message: 'เกิดข้อผิดพลาดในการเพิ่มข้อความ', error: error.message },
      { status: 500 }
    );
  }
}

// GET: ดึง messages ทั้งหมดใน session
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;

    const query = `
      SELECT id, role, content, images, charts, tables, code_blocks, plan_content, created_at
      FROM chat_messages 
      WHERE session_id = $1
      ORDER BY created_at ASC
    `;

    const result = await pool.query(query, [sessionId]);

    return NextResponse.json({
      messages: result.rows.map(msg => ({
        role: msg.role,
        content: msg.content,
        images: msg.images || [],
        charts: msg.charts || [],
        tables: msg.tables || [],
        codeBlocks: msg.code_blocks || [],
        planContent: msg.plan_content,
        timestamp: msg.created_at
      }))
    });
  } catch (error: any) {
    console.error('Get messages error:', error);
    return NextResponse.json(
      { message: 'เกิดข้อผิดพลาดในการดึงข้อความ', error: error.message },
      { status: 500 }
    );
  }
}
