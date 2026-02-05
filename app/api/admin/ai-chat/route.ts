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

    const accidentSchema = `โครงสร้างตาราง accident:
- id (PRIMARY KEY)
- ปีที่เกิดเหตุ (INTEGER) - ปีที่เกิดอุบัติเหตุ
- วันที่เกิดเหตุ (VARCHAR) - วันที่เกิดเหตุ
- เวลา (VARCHAR) - เวลาที่เกิดเหตุ
- วันที่รายงาน (VARCHAR) - วันที่รายงาน
- เวลาที่รายงาน (VARCHAR) - เวลาที่รายงาน
- ACC_CODE (BIGINT) - รหัสอ้างอิง
- หน่วยงาน (VARCHAR) - หน่วยงาน (เช่น กรมทางหลวง)
- สายทางหน่วยงาน (VARCHAR) - ประเภทสายทาง (เช่น ทางหลวง)
- รหัสสายทาง (VARCHAR) - รหัสทางหลวง
- สายทาง (TEXT) - ชื่อสายทาง
- KM (DOUBLE PRECISION) - กิโลเมตร
- จังหวัด (TEXT) - จังหวัด
- รถคันที่1 (TEXT) - ประเภทรถคันที่ 1
- บริเวณที่เกิดเหตุ (TEXT) - ลักษณะบริเวณ
- มูลเหตุสันนิษฐาน (TEXT) - สาเหตุ
- ลักษณะการเกิดเหตุ (TEXT) - ลักษณะการชน
- สภาพอากาศ (TEXT) - สภาพอากาศ
- "LATITUDE" (DOUBLE PRECISION) - พิกัดละติจูด (ต้องใช้ "LATITUDE" พร้อม double quotes)
- "LONGITUDE" (DOUBLE PRECISION) - พิกัดลองจิจูด (ต้องใช้ "LONGITUDE" พร้อม double quotes)
- รถที่เกิดเหตุ (INTEGER) - จำนวนรถที่เกิดเหตุ
- รถและคนที่เกิดเหตุ (INTEGER) - จำนวนรวม
- รถจักรยานยนต์ (BOOLEAN) - มี/ไม่มี รถจักรยานยนต์
- รถสามล้อเครื่อง (BOOLEAN) - มี/ไม่มี รถสามล้อเครื่อง
- รถยนต์นั่งส่วนบุคคล (INTEGER) - จำนวนรถยนต์นั่งส่วนบุคคล
- รถตู้ (BOOLEAN) - มี/ไม่มี รถตู้
- รถปิคอัพโดยสาร (BOOLEAN) - มี/ไม่มี รถปิคอัพโดยสาร
- รถโดยสารมากกว่า4ล้อ (BOOLEAN) - มี/ไม่มี รถโดยสารมากกว่า4ล้อ
- รถปิคอัพบรรทุก4ล้อ (INTEGER) - จำนวนรถปิคอัพบรรทุก4ล้อ
- รถบรรทุก6ล้อ (BOOLEAN) - มี/ไม่มี รถบรรทุก6ล้อ
- รถบรรทุกไม่เกิน10ล้อ (BOOLEAN) - มี/ไม่มี รถบรรทุกไม่เกิน10ล้อ
- รถบรรทุกมากกว่า10ล้อ (BOOLEAN) - มี/ไม่มี รถบรรทุกมากกว่า10ล้อ
- รถอีแต๋น (BOOLEAN) - มี/ไม่มี รถอีแต๋น
- รถอื่นๆ (BOOLEAN) - มี/ไม่มี รถอื่นๆ
- คนเดินเท้า (BOOLEAN) - มี/ไม่มี คนเดินเท้า
- ผู้เสียชีวิต (INTEGER) - จำนวนผู้เสียชีวิต
- ผู้บาดเจ็บสาหัส (INTEGER) - จำนวนผู้บาดเจ็บสาหัส
- ผู้บาดเจ็บเล็กน้อย (INTEGER) - จำนวนผู้บาดเจ็บเล็กน้อย
- รวมจำนวนผู้บาดเจ็บ (INTEGER) - จำนวนผู้บาดเจ็บรวม

คำแนะนำ SQL สำคัญ:
- ใช้ชื่อคอลัมน์ภาษาไทยตามโครงสร้างข้างต้นเท่านั้น
- สำหรับพิกัด ต้องใช้ "LATITUDE" และ "LONGITUDE" พร้อม double quotes เสมอ เช่น: SELECT "LATITUDE", "LONGITUDE" FROM accident
- ห้ามใช้ LATITUDE หรือ LONGITUDE โดยไม่มี double quotes จะเกิด error
- ประเภทรถส่วนใหญ่เป็น BOOLEAN (true/false) ยกเว้น รถยนต์นั่งส่วนบุคคล และ รถปิคอัพบรรทุก4ล้อ ที่เป็น INTEGER
- ใช้ LIKE สำหรับการค้นหาจังหวัด เช่น: WHERE จังหวัด LIKE '%อุบล%'
- ใช้ ปีที่เกิดเหตุ สำหรับการกรองปี เช่น: WHERE ปีที่เกิดเหตุ = 2025
- สำหรับ BOOLEAN ใช้ = true หรือ = false หรือ IS TRUE/IS FALSE
- ตัวอย่างที่ถูกต้อง: SELECT จังหวัด, "LATITUDE", "LONGITUDE", COUNT(*) FROM accident WHERE รถจักรยานยนต์ = true GROUP BY จังหวัด, "LATITUDE", "LONGITUDE"`;

    const sqlSystem = `คุณเป็นผู้ช่วยด้านฐานข้อมูล PostgreSQL ให้ตอบเป็น SQL เท่านั้นสำหรับตาราง accident

${accidentSchema}

คำแนะนำ:
- ใช้ชื่อคอลัมน์ตามโครงสร้างข้างต้นเท่านั้น
- ถ้าไม่ทราบชื่อคอลัมน์ให้ถามกลับ
- กรองวันที่แบบ YYYY-MM-DD (เช่น accident_date >= '2023-01-01')
- หลีกเลี่ยง SELECT * ยกเว้นผู้ใช้ขอโดยตรง
- ใช้ WHERE, GROUP BY, ORDER BY ตามความเหมาะสม`;

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
    const hasAccident = /\bfrom\s+"?accident"?\b/i.test(sql);
    
    console.log('isSelect:', isSelect, 'forbidden:', forbidden, 'hasAccident:', hasAccident);
    if (!isSelect || forbidden || !hasAccident) {
      return NextResponse.json({ message: 'SQL ที่ได้ไม่ปลอดภัยหรือไม่ใช่ตาราง accident', sql: sqlReply }, { status: 400 });
    }



    const queryRes = await pool.query(sql);
    const rows = queryRes.rows || [];
    const preview = rows.slice(0, 200);

    const analyzeSystem = 'คุณเป็นผู้ช่วยวิเคราะห์ข้อมูลอุบัติเหตุ ให้สรุปผลตามคำถามอย่างกระชับ ชี้ประเด็นสำคัญ และตอบเป็นภาษาไทย';
    const analyzePrompt = `${analyzeSystem}\n\nคำถามผู้ใช้: ${message}\n\nผลลัพธ์จากฐานข้อมูล (ตัวอย่างไม่เกิน 200 แถว):\n${JSON.stringify(preview)}`;
    const analyzeResult = await model.generateContent(analyzePrompt);
    const analysis = analyzeResult.response?.text?.() || '';

    return NextResponse.json({ reply: analysis, sql, rows: preview, total: rows.length });
  } catch (err: any) {
    if (err?.message === 'FORBIDDEN') return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    console.error('AI chat error:', err);
    return NextResponse.json({ message: err?.message || 'Server error' }, { status: 500 });
  }
});
