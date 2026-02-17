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
  - "id" (PRIMARY KEY) - รหัสอุบัติเหตุ (ห้ามใส่ใน SELECT โดยอัตโนมัติ)
- ปีที่เกิดเหตุ (INTEGER) - ปีที่เกิดอุบัติเหตุ
- วันที่เกิดเหตุ (VARCHAR) - วันที่เกิดเหตุ
- เวลา (VARCHAR) - เวลาที่เกิดเหตุ
- วันที่รายงาน (VARCHAR) - วันที่รายงาน
- เวลาที่รายงาน (VARCHAR) - เวลาที่รายงาน
- "ACC_CODE" (BIGINT) - รหัสอ้างอิง (ต้องใช้ "ACC_CODE" พร้อม double quotes)
- หน่วยงาน (VARCHAR) - หน่วยงาน (เช่น กรมทางหลวง)
- สายทางหน่วยงาน (VARCHAR) - ประเภทสายทาง (เช่น ทางหลวง)
- รหัสสายทาง (VARCHAR) - รหัสทางหลวง
- สายทาง (TEXT) - ชื่อสายทาง
- "KM" (DOUBLE PRECISION) - กิโลเมตร (ต้องใช้ "KM" พร้อม double quotes)
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
- ถ้าเป็น พ.ศ. ให้แปลงเป็น ค.ศ. เช่น 2568 เป็น 2025
- สำหรับพิกัด ต้องใช้ "LATITUDE" , "LONGITUDE" , "KM" , "ACC_CODE"   พร้อม double quotes เสมอ เช่น: SELECT "LATITUDE", "LONGITUDE" FROM accident 
- ห้ามใช้ LATITUDE หรือ LONGITUDE โดยไม่มี double quotes จะเกิด error
- ประเภทรถส่วนใหญ่เป็น BOOLEAN (true/false) ยกเว้น รถยนต์นั่งส่วนบุคคล และ รถปิคอัพบรรทุก4ล้อ ที่เป็น INTEGER
- ใช้ LIKE สำหรับการค้นหาจังหวัด เช่น: WHERE จังหวัด LIKE '%อุบล%'
- ใช้ ปีที่เกิดเหตุ สำหรับการกรองปี เช่น: WHERE ปีที่เกิดเหตุ = 2025
- สำหรับ BOOLEAN ใช้ = true หรือ = false หรือ IS TRUE/IS FALSE
- ตัวอย่างที่ถูกต้อง: SELECT จังหวัด, "LATITUDE", "LONGITUDE", COUNT(*) FROM accident WHERE รถจักรยานยนต์ = true GROUP BY จังหวัด, "LATITUDE", "LONGITUDE"
- ห้ามใช้คอลัมน์ "id" ใน SELECT/ORDER BY/GROUP BY เว้นแต่ผู้ใช้ระบุชัดเจนว่า "ขอ id"
`;

    const sqlSystem = `คุณเป็นผู้ช่วยด้านฐานข้อมูล PostgreSQL ให้ตอบเป็น SQL เท่านั้นสำหรับตาราง accident

${accidentSchema}

คำแนะนำ:
- ใช้ชื่อคอลัมน์ตามโครงสร้างข้างต้นเท่านั้น
- ถ้าไม่ทราบชื่อคอลัมน์ให้ถามกลับ
- ถ้าต้องกรองวันที่ ให้ใช้ DATE 'YYYY-MM-DD' หรือ TIMESTAMP 'YYYY-MM-DD HH:MI:SS' เพื่อเลี่ยงการเทียบ timestamp กับ text
- หลีกเลี่ยง to_date กับคอลัมน์ประเภท timestamp; หากต้องตัดวันที่ให้ใช้ ::date หรือ DATE(timestamp_column)
- หลีกเลี่ยง SELECT * ยกเว้นผู้ใช้ขอโดยตรง
- ห้ามใส่คอลัมน์ "id" ใน SQL โดยอัตโนมัติ
- ใช้ WHERE, GROUP BY, ORDER BY ตามความเหมาะสม
- หากคำถามเกี่ยวกับ "จุดเสี่ยง/จุดเกิดเหตุ/แผนที่/เส้นทาง/พิกัด" ให้ดึงคอลัมน์เหล่านี้ด้วยเสมอ:
  วันที่เกิดเหตุ, เวลา, จังหวัด, สายทาง, บริเวณที่เกิดเหตุ, "LATITUDE", "LONGITUDE"
- หากคำถามถามลักษณะรถหรือขอประเภทรถ ให้ดึงข้อมูลรถที่มีจริง เช่น รถคันที่1 และคอลัมน์รถที่เกี่ยวข้อง
- ถ้าข้อมูลพิกัดเป็นหัวใจของคำถาม ห้ามละ "LATITUDE" และ "LONGITUDE"`;

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

    const analyzeSystem = `คุณเป็นผู้ช่วยวิเคราะห์ข้อมูลอุบัติเหตุจากผลลัพธ์ฐานข้อมูลเท่านั้น

  กติกาสำคัญ (ห้ามฝ่าฝืน):
  1) ใช้เฉพาะข้อมูลที่อยู่ในผลลัพธ์ SQL ที่ให้มาใน prompt นี้เท่านั้น
  2) ห้ามแต่งชื่อถนน จุดเสี่ยง พื้นที่ สถิติ ช่วงเวลา หรือเหตุผลเพิ่มเติมที่ไม่มีในผลลัพธ์
  3) ถ้าข้อมูลไม่พอ ให้ตอบตรงๆ ว่า "ไม่พบข้อมูลในผลลัพธ์สำหรับประเด็นนี้"
  4) ห้ามอ้างอิงแหล่งข้อมูลภายนอก/ความทรงจำเดิม

  รูปแบบการตอบ:
  - สรุปสั้น 2 ย่อหน้า
  - ตามด้วย bullet ของข้อมูลที่ "พบจริง" จากผลลัพธ์
  - ถ้าผู้ใช้ถามตำแหน่ง/จุดเกิดเหตุ ให้แสดงจากคอลัมน์ที่มีจริงเท่านั้น เช่น จังหวัด,  "LATITUDE", "LONGITUDE", บริเวณที่เกิดเหตุ
  - ถ้ามีพิกัด ให้แสดงพิกัดตามที่ได้จากผลลัพธ์แบบไม่ปัดแต่ง
  - ถ้าผู้ใช้ถามสาเหตุ ให้แสดงจากคอลัมน์ มูลเหตุสันนิษฐาน หรือ ลักษณะการเกิดเหตุ เท่านั้น
  - ถ้ามีข้อมูลรถ ให้ระบุ "ประเภทรถ" ที่พบในแต่ละจุดจากคอลัมน์ที่มีจริงเท่านั้น
  - ถ้ามีข้อมูลวันเวลา ให้ระบุ "วันที่" และ "เวลา" ของจุดที่ยกตัวอย่าง
  - ถ้ามีพิกัดอย่างน้อย 1 จุด ให้แนบ JSON map block ท้ายคำตอบตามรูปแบบนี้เท่านั้น:
    \`\`\`json:map-ai
    {
      "type": "map",
      "title": "จุดเกิดเหตุจากผลลัพธ์ SQL",
      "points": [
        {
          "lat": 15.2447,
          "lon": 104.8472,
          "location": "จุดเกิดเหตุ",
          "road": "สายทาง",
          "area": "บริเวณที่เกิดเหตุ",
          "date": "วันที่เกิดเหตุ",
          "time": "เวลา",
          "vehicleType": "ประเภทรถ"
        }
      ]
    }
    \`\`\`
  - จุดใน JSON ต้องมาจากผลลัพธ์จริงเท่านั้น (แนะนำไม่เกิน 30 จุด)

  ภาษา: ไทย กระชับ ชัดเจน`; 
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
