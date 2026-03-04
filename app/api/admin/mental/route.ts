import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { GoogleGenerativeAI } from '@google/generative-ai';

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

function parseToken(req: NextRequest): number {
  const token = req.headers.get('Authorization');
  if (!token) throw new Error('UNAUTHORIZED');
  const tokenData = Buffer.from(token.replace('Bearer ', ''), 'base64').toString();
  const [idStr] = tokenData.split(':');
  const userId = parseInt(idStr);
  if (isNaN(userId)) throw new Error('UNAUTHORIZED');
  return userId;
}

async function ensureAdmin(userId: number) {
  const res = await pool.query('SELECT role FROM users WHERE id = $1', [userId]);
  const role = res.rows?.[0]?.role || 'user';
  if (role !== 'admin') throw new Error('FORBIDDEN');
}

async function getTableSchema(tableName: string): Promise<string> {
  try {
    const res = await pool.query(
      `SELECT column_name, data_type, is_nullable
       FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = $1
       ORDER BY ordinal_position`,
      [tableName]
    );

    if (res.rows.length === 0) {
      return `ไม่พบตาราง "${tableName}" ในฐานข้อมูล`;
    }

    const cols = res.rows
      .map((r: any) => `- "${r.column_name}" (${r.data_type})`)
      .join('\n');

    // Sample data
    const sampleRes = await pool.query(`SELECT * FROM "${tableName}" LIMIT 3`);
    const sample = JSON.stringify(sampleRes.rows, null, 2);

    return `โครงสร้างตาราง ${tableName}:\n${cols}\n\nตัวอย่างข้อมูล 3 แถวแรก:\n${sample}`;
  } catch (e: any) {
    return `ไม่สามารถดึงโครงสร้างตาราง "${tableName}": ${e.message}`;
  }
}

// GET: List tables + schema info
export async function GET(req: NextRequest) {
  try {
    const userId = parseToken(req);
    await ensureAdmin(userId);

    const { searchParams } = req.nextUrl;
    const table = searchParams.get('table') || 'bipola';

    const schema = await getTableSchema(table);

    // Also get row count
    let rowCount = 0;
    try {
      const countRes = await pool.query(`SELECT COUNT(*) FROM "${table}"`);
      rowCount = parseInt(countRes.rows[0].count, 10);
    } catch {}

    // Get list of all tables in public schema
    const tablesRes = await pool.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`
    );
    const tables = tablesRes.rows.map((r: any) => r.table_name);

    return NextResponse.json({ success: true, schema, rowCount, tables });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') return NextResponse.json({ message: 'กรุณาเข้าสู่ระบบก่อน' }, { status: 401 });
    if (error.message === 'FORBIDDEN') return NextResponse.json({ message: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
    return NextResponse.json({ message: error.message || 'Server error' }, { status: 500 });
  }
}

// POST: 3-step AI flow — analyze question → generate SQL → execute → summarize
export async function POST(req: NextRequest) {
  try {
    const userId = parseToken(req);
    await ensureAdmin(userId);

    const body = await req.json().catch(() => ({}));
    const message = String(body?.message || '').trim();
    const tableName = String(body?.tableName || 'bipola');

    if (!message) {
      return NextResponse.json({ message: 'กรุณาระบุข้อความ' }, { status: 400 });
    }

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ message: 'ไม่พบ API Key' }, { status: 500 });
    }

    const modelName = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: modelName });

    // ── STEP 1: Get dynamic schema ──────────────────────────────────────
    const schemaText = await getTableSchema(tableName);

    // ── STEP 2: Gemini generates SQL ────────────────────────────────────
    const sqlPrompt = `คุณเป็นผู้ช่วยสร้าง SQL Query สำหรับฐานข้อมูล PostgreSQL

${schemaText}

กฎสำคัญ:
- สร้างเฉพาะ SELECT query เท่านั้น
- ใช้ชื่อตาราง "${tableName}" เสมอ
- ใช้ชื่อคอลัมน์ตามโครงสร้างข้างต้นเท่านั้น (ใช้ double quotes กับชื่อที่มีภาษาไทยหรือพิเศษ)
- ถ้าไม่แน่ใจชื่อคอลัมน์ให้ใช้ ILIKE สำหรับค้นหาข้อความ
- จำกัด LIMIT 500 เสมอ
- ตอบด้วย SQL ภายใน \`\`\`sql ... \`\`\` เท่านั้น ห้ามมีข้อความอื่น

คำถาม: "${message}"`;

    const sqlResult = await model.generateContent(sqlPrompt);
    const sqlReply = (sqlResult.response?.text?.() || '').trim();

    // Extract SQL from code block
    const sqlMatch = sqlReply.match(/```sql\s*([\s\S]*?)```/i);
    let sql = '';
    if (sqlMatch) {
      sql = sqlMatch[1].trim();
    } else {
      const lines = sqlReply.split('\n');
      const idx = lines.findIndex((l) => /^\s*select\b/i.test(l));
      sql = idx >= 0 ? lines.slice(idx).join('\n').trim() : sqlReply.trim();
    }

    // Safety check
    const isForbidden = /(insert|update|delete|drop|alter|create|truncate)\b/i.test(sql);
    const isSelect = /^\s*select\b/i.test(sql);
    const hasTable = new RegExp(`\\bfrom\\s+"?${tableName}"?`, 'i').test(sql);

    if (!isSelect || isForbidden || !hasTable) {
      return NextResponse.json({
        message: 'ไม่สามารถสร้าง SQL ที่ปลอดภัยได้จากคำถามนี้',
        sql: sqlReply,
        step: 'sql_generation',
      }, { status: 400 });
    }

    // ── STEP 3: Execute SQL ─────────────────────────────────────────────
    let rows: any[] = [];
    let sqlError = '';
    try {
      const queryRes = await pool.query(sql);
      rows = queryRes.rows || [];
    } catch (e: any) {
      sqlError = e.message;
    }

    if (sqlError) {
      return NextResponse.json({
        message: `SQL Error: ${sqlError}`,
        sql,
        step: 'sql_execution',
      }, { status: 400 });
    }

    const preview = rows.slice(0, 200);

    // ── STEP 4: Gemini Summarize ────────────────────────────────────────
    const analyzePrompt = `คุณเป็นผู้ช่วยวิเคราะห์ข้อมูลสุขภาพจิตจากฐานข้อมูล "${tableName}"

กฎสำคัญ:
1) ใช้เฉพาะข้อมูลในผลลัพธ์ SQL ที่ให้มาเท่านั้น
2) ห้ามแต่งชื่อพื้นที่หรือตัวเลขที่ไม่มีในผลลัพธ์
3) ถ้าข้อมูลไม่พอให้ตอบตรงๆ ว่า "ไม่พบข้อมูลสำหรับประเด็นนี้"

การสร้างกราฟ:
- ถ้าข้อมูลเหมาะกับกราฟ (ตัวเลขเปรียบเทียบ/แนวโน้ม) ให้สร้าง Chart.js JSON
- รองรับ type: 'bar', 'line', 'pie', 'doughnut'
- แนบ JSON ท้ายสุดในรูปแบบ: \`\`\`json { "type": "bar", "title": "...", "data": { "labels": [...], "datasets": [{"label": "...", "data": [...]}] } } \`\`\`

รูปแบบคำตอบ:
- สรุปสั้น 2 ย่อหน้า + Bullet points (Markdown)
- เน้นข้อมูลที่ตอบคำถามผู้ใช้โดยตรง
- ภาษาไทย กระชับ ชัดเจน

คำถามผู้ใช้: "${message}"

ผลลัพธ์จากฐานข้อมูล (${rows.length} แถว, แสดง ${preview.length} แถวแรก):
${JSON.stringify(preview, null, 2)}`;

    const analyzeResult = await model.generateContent(analyzePrompt);
    const fullText = analyzeResult.response?.text?.() || '';

    // Extract chart JSON
    let analysis = fullText;
    let chartData = null;
    const jsonMatch = fullText.match(/```json\s*([\s\S]*?)```/i);
    if (jsonMatch) {
      try {
        chartData = JSON.parse(jsonMatch[1]);
        analysis = fullText.replace(/```json\s*[\s\S]*?```/i, '').trim();
      } catch {}
    }

    return NextResponse.json({
      success: true,
      reply: analysis,
      chart: chartData,
      sql,
      rows: preview,
      total: rows.length,
      tableName,
    });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') return NextResponse.json({ message: 'กรุณาเข้าสู่ระบบก่อน' }, { status: 401 });
    if (error.message === 'FORBIDDEN') return NextResponse.json({ message: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
    console.error('Mental health API error:', error);
    return NextResponse.json({ message: error.message || 'Server error' }, { status: 500 });
  }
}
