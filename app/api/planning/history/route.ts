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

// POST: บันทึกประวัติการวางแผน (planningResponse)
export async function POST(request: NextRequest) {
  try {
    const {
      sessionId,
      userId,
      selectedTool,
      query,
      files,
      response,
      status = 'completed',
      durationMs,
    } = await request.json();

    if (!query || !response) {
      return NextResponse.json(
        { message: 'ต้องระบุ query และ response' },
        { status: 400 }
      );
    }

    const insertSQL = `
      INSERT INTO planning_history (session_id, user_id, selected_tool, query, files, response, status, duration_ms)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, created_at
    `;

    const params = [
      sessionId || null,
      userId || null,
      selectedTool || null,
      query,
      Array.isArray(files) ? files : null,
      response,
      status,
      typeof durationMs === 'number' ? durationMs : null,
    ];

    const result = await pool.query(insertSQL, params);

    return NextResponse.json(
      {
        message: 'บันทึกประวัติการวางแผนสำเร็จ',
        id: result.rows[0].id,
        createdAt: result.rows[0].created_at,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Save planning history error:', error);
    return NextResponse.json(
      { message: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล', error: error.message },
      { status: 500 }
    );
  }
}
