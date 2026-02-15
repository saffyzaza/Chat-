import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/app/utils/middleware';
import { Pool } from 'pg';
import { GoogleGenerativeAI } from '@google/generative-ai';

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'chat-aio',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '1234',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

async function ensureAdmin(userId: number) {
  const result = await pool.query('SELECT role FROM users WHERE id = $1', [userId]);
  const role = result.rows?.[0]?.role || 'user';
  if (role !== 'admin') throw new Error('FORBIDDEN');
}

function weatherCodeToText(code: number): string {
  if (code === 0) return 'ท้องฟ้าแจ่มใส';
  if (code <= 3) return 'มีเมฆบางส่วน';
  if (code <= 48) return 'มีหมอก';
  if (code <= 55) return 'ฝนตกเล็กน้อย';
  if (code <= 65) return 'ฝนตก';
  if (code <= 67) return 'ฝนเยือกแข็ง';
  if (code <= 77) return 'หิมะตก';
  if (code <= 82) return 'ฝนตกหนัก';
  if (code <= 99) return 'พายุฝนฟ้าคะนอง';
  return 'ไม่ทราบสภาพอากาศ';
}

function toTableRows(openMeteo: any, days: number) {
  const daily = openMeteo?.daily || {};
  const length = Math.min(days, Array.isArray(daily?.time) ? daily.time.length : 0);
  const rows: Array<{
    date: string;
    maxTemp: number;
    minTemp: number;
    rainChance: number;
    weatherCode: number;
    weatherText: string;
    windSpeed: number;
    humidity: number;
  }> = [];

  for (let index = 0; index < length; index++) {
    const weatherCode = Number(daily?.weathercode?.[index] ?? 0);
    rows.push({
      date: String(daily?.time?.[index] || ''),
      maxTemp: Number(daily?.temperature_2m_max?.[index] ?? 0),
      minTemp: Number(daily?.temperature_2m_min?.[index] ?? 0),
      rainChance: Number(daily?.precipitation_probability_max?.[index] ?? 0),
      weatherCode,
      weatherText: weatherCodeToText(weatherCode),
      windSpeed: Number(daily?.wind_speed_10m_max?.[index] ?? 0),
      humidity: Number(daily?.relative_humidity_2m_max?.[index] ?? 0),
    });
  }

  return rows;
}

function rowsToMarkdown(rows: ReturnType<typeof toTableRows>) {
  const header = '| วันที่ | สภาพอากาศ | สูงสุด(°C) | ต่ำสุด(°C) | โอกาสฝน(%) | ลม(km/h) | ความชื้น(%) |';
  const separator = '|---|---|---:|---:|---:|---:|---:|';
  const body = rows.map((row) =>
    `| ${row.date} | ${row.weatherText} | ${row.maxTemp.toFixed(1)} | ${row.minTemp.toFixed(1)} | ${row.rainChance.toFixed(0)} | ${row.windSpeed.toFixed(1)} | ${row.humidity.toFixed(0)} |`
  );
  return [header, separator, ...body].join('\n');
}

export const POST = withAuth(async (request: NextRequest, user) => {
  try {
    await ensureAdmin(user.id);

    const body = await request.json().catch(() => ({}));
    const lat = Number(body?.lat);
    const lon = Number(body?.lon);
    const daysRaw = Number(body?.days ?? 7);
    const days = Number.isFinite(daysRaw) ? Math.min(14, Math.max(1, Math.floor(daysRaw))) : 7;

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return NextResponse.json({ message: 'กรุณาระบุพิกัด lat และ lon ให้ถูกต้อง' }, { status: 400 });
    }

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weathercode,wind_speed_10m_max,relative_humidity_2m_max&forecast_days=${days}&timezone=Asia/Bangkok`;

    const weatherResponse = await fetch(url, { cache: 'no-store' });
    if (!weatherResponse.ok) {
      return NextResponse.json({ message: `Weather API error: ${weatherResponse.status}` }, { status: weatherResponse.status });
    }

    const weatherData = await weatherResponse.json();
    const rows = toTableRows(weatherData, days);
    const markdownTable = rowsToMarkdown(rows);

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        success: true,
        lat,
        lon,
        days,
        weatherData,
        table: markdownTable,
        summary: 'ไม่พบการตั้งค่า Gemini API key จึงแสดงเฉพาะตารางข้อมูลดิบ',
        reply: `## ตารางพยากรณ์\n${markdownTable}\n\n## สรุป\nไม่พบการตั้งค่า Gemini API key จึงแสดงเฉพาะตารางข้อมูลดิบ`
      });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const modelName = process.env.GEMINI_MODEL || 'gemini-3-flash-preview';
    const model = genAI.getGenerativeModel({ model: modelName });

    const prompt = `คุณคือผู้ช่วยสรุปสภาพอากาศ\n\nข้อมูลที่ต้องใช้เท่านั้น:\nlat=${lat}, lon=${lon}, days=${days}\n\nตารางข้อมูลพยากรณ์ดิบ:\n${markdownTable}\n\nตอบกลับเป็น JSON เท่านั้น และต้อง parse ได้ทันที:\n{\n  "table": "ตาราง markdown (ต้องขึ้นต้นด้วย | วันที่ | ...)",\n  "summary": "สรุปภาษาไทยแบบกระชับ 1-2 ย่อหน้า"\n}\n\nข้อบังคับ:\n- table ต้องเป็น markdown table เท่านั้น\n- summary ต้องสรุปแนวโน้มอุณหภูมิ ฝน ลม และวันเสี่ยงฝนสูง\n- ห้ามมีข้อความอื่นนอก JSON`;

    const geminiResult = await model.generateContent(prompt);
    const raw = String(geminiResult.response?.text?.() || '').trim();

    let parsedTable = markdownTable;
    let parsedSummary = raw;
    try {
      const firstBrace = raw.indexOf('{');
      const lastBrace = raw.lastIndexOf('}');
      const jsonText = firstBrace >= 0 && lastBrace > firstBrace ? raw.slice(firstBrace, lastBrace + 1) : raw;
      const parsed = JSON.parse(jsonText);
      if (typeof parsed?.table === 'string' && parsed.table.trim()) {
        parsedTable = parsed.table.trim();
      }
      if (typeof parsed?.summary === 'string' && parsed.summary.trim()) {
        parsedSummary = parsed.summary.trim();
      }
    } catch {
      parsedSummary = raw || 'ไม่สามารถสรุปผลจาก Gemini ได้ จึงแสดงเฉพาะตารางข้อมูลดิบ';
    }

    const reply = `## ตารางพยากรณ์\n${parsedTable}\n\n## สรุป\n${parsedSummary}`;

    return NextResponse.json({
      success: true,
      lat,
      lon,
      days,
      weatherData,
      table: parsedTable,
      summary: parsedSummary,
      reply,
    });
  } catch (error: any) {
    if (error?.message === 'FORBIDDEN') {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }
    console.error('Chat weather API error:', error);
    return NextResponse.json({ message: error?.message || 'Server error' }, { status: 500 });
  }
});
