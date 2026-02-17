import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/app/utils/middleware';
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

async function ensureAdmin(userId: number) {
  const res = await pool.query('SELECT role FROM users WHERE id = $1', [userId]);
  const role = res.rows?.[0]?.role || 'user';
  if (role !== 'admin') throw new Error('FORBIDDEN');
}

export const POST = withAuth(async (req: NextRequest, user) => {
  try {
    await ensureAdmin(user.id);
    const body = await req.json().catch(() => ({}));
    const message = String(body?.message || '').trim();

    if (!message) {
      return NextResponse.json({ message: 'กรุณาระบุข้อความ' }, { status: 400 });
    }

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ message: 'ไม่พบ API Key' }, { status: 500 });
    }

    const modelName = process.env.GEMINI_MODEL || 'gemini-3-pro-preview';
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: modelName });

    const diabetesSchema = `โครงสร้างตาราง diabetes:
- "a_name" (TEXT) - ชื่อพื้นที่/ชื่อหน่วยงาน
- "target" (INTEGER) - เป้าหมาย (จำนวนผู้ป่วยเป้าหมาย)
- "result" (INTEGER) - ผลงานรวม (จำนวนที่ทำได้จริง)
- "F3" (DOUBLE PRECISION) - ร้อยละผลงานเทียบเป้าหมาย (Percentage)
- "result1" (INTEGER) - ผลงานเดือน ต.ค. (ตุลาคม)
- "result2" (INTEGER) - ผลงานเดือน พ.ย. (พฤศจิกายน)
- "result3" (INTEGER) - ผลงานเดือน ธ.ค. (ธันวาคม)
- "result4" (INTEGER) - ผลงานเดือน ม.ค. (มกราคม)
- "result5" (INTEGER) - ผลงานเดือน ก.พ. (กุมภาพันธ์)
- "result6" (INTEGER) - ผลงานเดือน มี.ค. (มีนาคม)
- "result7" (INTEGER) - ผลงานเดือน เม.ย. (เมษายน)
- "result8" (INTEGER) - ผลงานเดือน พ.ค. (พฤษภาคม)
- "result9" (INTEGER) - ผลงานเดือน มิ.ย. (มิถุนายน)
- "result10" (INTEGER) - ผลงานเดือน ก.ค. (กรกฎาคม)
- "result11" (INTEGER) - ผลงานเดือน ส.ค. (สิงหาคม)
- "result12" (INTEGER) - ผลงานเดือน ก.ย. (กันยายน)

คำแนะนำ SQL สำคัญ:
- ใช้ชื่อคอลัมน์ภาษาอังกฤษตามโครงสร้างข้างต้นเท่านั้น
- "a_name" คือชื่อพื้นที่ เช่น อำเภอ, ตำบล หรือหน่วยงาน ให้ใช้ LIKE ในการค้นหา (เช่น WHERE a_name LIKE '%เมือง%')
- "target" คือเป้าหมายรวมทั้งปี
- "result" คือผลงานสะสมรวมทั้งปี
- "result1" ถึง "result12" คือผลงานรายเดือน
- ห้ามใส่คอลัมน์ที่ไม่มีอยู่จริง
- หลีกเลี่ยง SELECT * ยกเว้นผู้ใช้ระบุ
`;

    const sqlSystem = `คุณเป็นผู้ช่วยด้านฐานข้อมูล PostgreSQL ให้ตอบเป็น SQL เท่านั้นสำหรับตาราง diabetes

${diabetesSchema}

คำแนะนำ:
- ใช้ชื่อคอลัมน์ตามโครงสร้างข้างต้นเท่านั้น
- ถ้าไม่ทราบชื่อคอลัมน์ให้ถามกลับ
- หลีกเลี่ยง SELECT * ยกเว้นผู้ใช้ขอโดยตรง
- ใช้ WHERE, GROUP BY, ORDER BY ตามความเหมาะสม
- ตอบกลับด้วย SQL Query ภายใน Code Block \`\`\`sql ... \`\`\` เท่านั้น`;

    const sqlResult = await model.generateContent(`${sqlSystem}\n\nผู้ใช้: ${message}`);
    const sqlReply = (sqlResult.response?.text?.() || '').trim();
    console.log('AI SQL Reply:', sqlReply);
    
    // ตัด SQL จาก response
    const sqlMatch = sqlReply.match(/```sql\s*([\s\S]*?)```/i);
    let sql = '';
    if (sqlMatch) {
      // ถ้ามี ```sql block ให้เอาข้างในทั้งหมด
      sql = sqlMatch[1].trim();
    } else {
      // ไม่มี block ให้หาบรรทัด SELECT และเอาจากตรงนั้นไปจนจบ
      const lines = sqlReply.split('\n');
      const selectIdx = lines.findIndex(line => /^\s*select\b/i.test(line));
      sql = selectIdx >= 0 ? lines.slice(selectIdx).join('\n').trim() : sqlReply.trim();
    }

    console.log('Generated SQL:', sql);

    const forbidden = /(insert|update|delete|drop|alter|create|truncate)\b/i.test(sql);
    const isSelect = /^\s*select\b/i.test(sql);
    const hasDiabetes = /\bfrom\s+"?diabetes"?\b/i.test(sql);
    
    console.log('isSelect:', isSelect, 'forbidden:', forbidden, 'hasDiabetes:', hasDiabetes);
    if (!isSelect || forbidden || !hasDiabetes) {
      return NextResponse.json({ message: 'SQL ที่ได้ไม่ปลอดภัยหรือไม่ใช่ตาราง diabetes', sql: sqlReply }, { status: 400 });
    }

    const queryRes = await pool.query(sql);
    const rows = queryRes.rows || [];
    const preview = rows.slice(0, 200);

    const analyzeSystem = `คุณเป็นผู้ช่วยวิเคราะห์ข้อมูลเบาหวานจากผลลัพธ์ฐานข้อมูลเท่านั้น

  กติกาสำคัญ (ห้ามฝ่าฝืน):
  1) ใช้เฉพาะข้อมูลที่อยู่ในผลลัพธ์ SQL ที่ให้มาใน prompt นี้เท่านั้น
  2) ห้ามแต่งชื่อพื้นที่ สถิติ หรือข้อมูลเพิ่มเติมที่ไม่มีในผลลัพธ์
  3) ถ้าข้อมูลไม่พอ ให้ตอบตรงๆ ว่า "ไม่พบข้อมูลในผลลัพธ์สำหรับประเด็นนี้"
  4) ห้ามอ้างอิงแหล่งข้อมูลภายนอก/ความทรงจำเดิม

  การสร้างกราฟ:
  - ถ้าข้อมูลเหมาะสมกับการทำกราฟ (เช่น มีตัวเลขเปรียบเทียบ หรือแนวโน้ม) ให้สร้าง JSON สำหรับ config Chart.js มาด้วย
  - รองรับ type: 'bar' (เปรียบเทียบ), 'line' (แนวโน้ม), 'pie' (สัดส่วน), 'doughnut'
  - ให้แนบ JSON ไว้ท้ายสุดของคำตอบ โดยคลุมด้วย \`\`\`json ... \`\`\`
  
  Format ของ Chart JSON:
  {
    "type": "bar",
    "title": "ชื่อกราฟ",
    "data": {
      "labels": ["label1", "label2"],
      "datasets": [{
        "label": "ชื่อชุดข้อมูล",
        "data": [10, 20]
      }]
    }
  }

  รูปแบบการตอบ:
  - ส่วนวิเคราะห์: สรุปสั้น 2 ย่อหน้า และ Bullet points (MarkDown)
  - ส่วนกราฟ: JSON Block (ถ้ามีข้อมูลทำกราฟได้)
  - ถ้าผู้ใช้ถามถึงพื้นที่ ให้แสดงชื่อพื้นที่จากคอลัมน์ a_name
  - เน้นเปรียบเทียบ Target (เป้าหมาย) vs Result (ผลงาน)
  - **สำคัญมาก:** หากคำถามระบุเดือน ให้เจาะจงใช้ข้อมูลจาก result ที่ตรงกับเดือนนั้นๆ (result1=ต.ค., result2=พ.ย. ... result12=ก.ย.) ในการตอบและสร้างกราฟ ห้ามใช้ยอดรวม (result) ผสมมั่ว

  ภาษา: ไทย กระชับ ชัดเจน`; 

    const analyzePrompt = `${analyzeSystem}\n\nคำถามผู้ใช้: ${message}\n\nผลลัพธ์จากฐานข้อมูล (ตัวอย่างไม่เกิน 200 แถว):\n${JSON.stringify(preview)}`;
    const analyzeResult = await model.generateContent(analyzePrompt);
    const fullText = analyzeResult.response?.text?.() || '';

    // แยก Text และ Chart JSON
    let analysis = fullText;
    let chartData = null;
    const jsonMatch = fullText.match(/```json\s*([\s\S]*?)```/i);
    
    if (jsonMatch) {
      try {
        chartData = JSON.parse(jsonMatch[1]);
        analysis = fullText.replace(/```json\s*[\s\S]*?```/i, '').trim();
      } catch (e) {
        console.error('Failed to parse chart JSON', e);
      }
    }

    return NextResponse.json({ reply: analysis, chart: chartData, sql, rows: preview, total: rows.length });
  } catch (err: any) {
    if (err?.message === 'FORBIDDEN') return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    console.error('AI chat error:', err);
    return NextResponse.json({ message: err?.message || 'Server error' }, { status: 500 });
  }
});
