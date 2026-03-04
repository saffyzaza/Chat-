import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { minioClient, MINIO_BUCKET, buildObjectName } from '@/lib/minio';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Polyfills for pdf-parse in Node.js environment
if (typeof (global as any).DOMMatrix === 'undefined') {
  (global as any).DOMMatrix = class {};
}
if (typeof (global as any).ImageData === 'undefined') {
  (global as any).ImageData = class {};
}
if (typeof (global as any).Path2D === 'undefined') {
  (global as any).Path2D = class {};
}

// ย้าย imports ที่อาจมีปัญหาในบาง environment ไปโหลดแบบ dynamic ภายใน handler
// import * as pdfParse from 'pdf-parse';
// import mammoth from 'mammoth';

// PostgreSQL connection pool (consistent with other routes)
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

const MIN_TEXT_LENGTH_SKIP_VISION = parseInt(process.env.APA_MIN_TEXT_LENGTH_SKIP_VISION || '1200', 10);
const MAX_MODEL_CONTENT_CHARS = parseInt(process.env.APA_MAX_MODEL_CONTENT_CHARS || '12000', 10);
const ENABLE_VISION_FOR_PDF = (process.env.APA_ENABLE_VISION_FOR_PDF || 'false').toLowerCase() === 'true';
const EMPTY_APA_SCHEMA = {
  abstract: null,
  keywords: {
    thai: [],
    english: []
  },
  references: [],
  projectInfo: {
    titleThai: null,
    titleEnglish: null,
    proposalCode: null,
    budgetYear: null,
    university: null,
    projectCode: null,
    totalBudget: null,
    otherInfo: null
  },
  researchers: [],
  documentType: '',
  additionalInfo: null
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fileName = searchParams.get('name');
    const filePath = searchParams.get('path');

    // ถ้าไม่มีพารามิเตอร์ ให้คืนค่าทั้งหมดที่มีในฐานข้อมูล
    if (!fileName && !filePath) {
      const allQuery = `
        SELECT apa_json, file_name, file_path, mime_type, size_bytes, created_at
        FROM file_apa_metadata
        ORDER BY created_at DESC
      `;
      const allResult = await pool.query(allQuery);
      return NextResponse.json({
        success: true,
        count: allResult.rows.length,
        references: allResult.rows.map(row => ({
          apa: row.apa_json,
          meta: {
            file_name: row.file_name,
            file_path: row.file_path,
            mime_type: row.mime_type,
            size_bytes: row.size_bytes,
            created_at: row.created_at,
          }
        }))
      });
    }

    // ถ้าระบุเฉพาะ path ให้คืนรายการ APA ในโฟลเดอร์นั้น (ใช้สำหรับทำ status icon)
    if (!fileName && filePath) {
      const byPathQuery = `
        SELECT apa_json, file_name, file_path, mime_type, size_bytes, created_at
        FROM file_apa_metadata
        WHERE file_path = $1
        ORDER BY created_at DESC
      `;
      const byPathResult = await pool.query(byPathQuery, [filePath]);
      return NextResponse.json({
        success: true,
        count: byPathResult.rows.length,
        references: byPathResult.rows.map(row => ({
          apa: row.apa_json,
          meta: {
            file_name: row.file_name,
            file_path: row.file_path,
            mime_type: row.mime_type,
            size_bytes: row.size_bytes,
            created_at: row.created_at,
          }
        }))
      });
    }

    if (fileName && !filePath) {
      return NextResponse.json({ error: 'Missing parameter: path required when name is provided' }, { status: 400 });
    }

    const query = `
      SELECT apa_json, file_name, file_path, mime_type, size_bytes, created_at
      FROM file_apa_metadata
      WHERE file_name = $1 AND file_path = $2
      ORDER BY created_at DESC
      LIMIT 1
    `;

    const result = await pool.query(query, [fileName, filePath]);
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'APA metadata not found' }, { status: 404 });
    }

    const row = result.rows[0];
    return NextResponse.json({
      success: true,
      apa: row.apa_json,
      meta: {
        file_name: row.file_name,
        file_path: row.file_path,
        mime_type: row.mime_type,
        size_bytes: row.size_bytes,
        created_at: row.created_at,
      },
    });
  } catch (error: any) {
    console.error('Error fetching APA metadata:', error);
    return NextResponse.json({ error: 'Failed to fetch APA metadata' }, { status: 500 });
  }
}

// Generate APA on demand for an existing file
export async function POST(request: NextRequest) {
  console.log('[APA POST] ============ START APA GENERATION REQUEST ============');
  console.log('[APA POST] Request URL:', request.url);
  console.log('[APA POST] Request method:', request.method);
  try {
    console.log('[APA POST] Parsing request body...');
    const body = await request.json();
    console.log('[APA POST] Body received:', body);
    const fileName: string = body?.name;
    const filePath: string = body?.path;
    const forceVision: boolean = body?.forceVision === true;

    console.log(`[APA POST] Received: fileName="${fileName}", filePath="${filePath}"`);

    if (!fileName || !filePath) {
      console.error('[APA POST] Missing parameters');
      return NextResponse.json({ error: 'Missing parameters: name and path required' }, { status: 400 });
    }

    // Fetch file from MinIO
    let buffer: Buffer;
    try {
      console.log(`[APA POST] Fetching from MinIO...`);
      const objectName = buildObjectName(filePath, fileName);
      console.log(`[APA POST] Object name: ${objectName}`);
      const stream = await minioClient.getObject(MINIO_BUCKET, objectName);
      const chunks: Buffer[] = [];
      buffer = await new Promise((resolve, reject) => {
        stream.on('data', (d: Buffer) => chunks.push(d));
        stream.on('end', () => resolve(Buffer.concat(chunks)));
        stream.on('error', (err: any) => reject(new Error(`MinIO error: ${err.message}`)));
      });
      console.log(`[APA POST] ✓ MinIO fetch successful: ${buffer.length} bytes`);
    } catch (minioErr: any) {
      console.error('[APA POST] ✗ MinIO fetch error:', minioErr);
      return NextResponse.json({ error: `Failed to fetch file from storage: ${minioErr.message}` }, { status: 500 });
    }

    // Guess mime based on extension
    const lowerName = fileName.toLowerCase();
    const isPdf = lowerName.endsWith('.pdf');
    const isDocx = lowerName.endsWith('.docx');
    const isTextLike = lowerName.endsWith('.txt') || lowerName.endsWith('.md') || lowerName.endsWith('.json');
    const isImage =
      lowerName.endsWith('.jpg') ||
      lowerName.endsWith('.jpeg') ||
      lowerName.endsWith('.png') ||
      lowerName.endsWith('.gif') ||
      lowerName.endsWith('.webp');

    console.log(`[APA POST] File type detection: isPdf=${isPdf}, isDocx=${isDocx}, isTextLike=${isTextLike}`);

    let textContent: string | null = null;
    let extractionMethod = 'none';
    
    try {
      if (isPdf) {
        try {
          // Dynamic load to avoid DOMMatrix error in Node environment
          const pdfParse = require('pdf-parse');
          const parsed: any = await pdfParse(buffer);
          textContent = parsed?.text || null;
          if (textContent && textContent.trim().length > 0) {
            extractionMethod = 'pdf-parse';
          }
        } catch (pdfErr) {
          // pdf-parse failed or empty
          console.error('[APA POST] pdf-parse error:', pdfErr);
          textContent = null;
        }
      } else if (isDocx) {
        // Dynamic load mammoth
        const mammoth = require('mammoth');
        const result = await mammoth.extractRawText({ buffer });
        textContent = result?.value || null;
        if (textContent) extractionMethod = 'mammoth';
      } else if (isTextLike) {
        textContent = buffer.toString('utf-8');
        if (textContent) extractionMethod = 'buffer-utf8';
      }
    } catch (extractErr: any) {
      textContent = null;
    }

    // Vision policy (เน้นความเร็ว):
    // - รูปภาพ: ใช้ Vision ได้ตามปกติ
    // - PDF: ปิด Vision เป็นค่าเริ่มต้น (เปิดได้ด้วย env หรือ forceVision)
    // - อื่นๆ: ใช้ Vision เมื่อข้อความน้อยเกิน threshold
    const textLength = textContent?.trim().length || 0;
    const hasEnoughText = textLength >= MIN_TEXT_LENGTH_SKIP_VISION;
    const shouldTryVision =
      forceVision ||
      isImage ||
      (!hasEnoughText && (!isPdf || ENABLE_VISION_FOR_PDF || textLength === 0));

    if (!shouldTryVision) {
      console.log(
        `[APA POST] Skipping Vision API: forceVision=${forceVision}, isImage=${isImage}, isPdf=${isPdf}, textLength=${textLength}, enableVisionForPdf=${ENABLE_VISION_FOR_PDF}`
      );
    }
    
    if (shouldTryVision) {
      const genAIKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY || process.env.GOOGLE_API_KEY;
      
      if (!genAIKey) {
        console.error('[APA POST] ❌ Cannot use Vision API - Google API key not found in environment');
        console.error('[APA POST] Please set NEXT_PUBLIC_GOOGLE_API_KEY or GOOGLE_API_KEY');
      } else {
        console.log('[APA POST] 🔑 Google API key found, attempting Vision API...');
        try {
          const base64Data = buffer.toString('base64');
          console.log(`[APA POST] 📦 Base64 encoded: ${base64Data.length} characters`);
          
          const genAI = new GoogleGenerativeAI(genAIKey);
          const visionModel = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });
          console.log('[APA POST] ✓ Vision model created: gemini-3.0-flash');
          
          let mimeType = 'text/plain';
          if (isPdf) mimeType = 'application/pdf';
          else if (lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg')) mimeType = 'image/jpeg';
          else if (lowerName.endsWith('.png')) mimeType = 'image/png';
          else if (lowerName.endsWith('.gif')) mimeType = 'image/gif';
          else if (lowerName.endsWith('.webp')) mimeType = 'image/webp';
          
          console.log(`[APA POST] 📤 Sending to Vision API: mimeType=${mimeType}`);
          
          const visionResponse = await visionModel.generateContent([
            {
              inlineData: {
                mimeType: mimeType,
                data: base64Data,
              },
            },
            {
              text: 'Extract ALL TEXT from this document. Return the complete, full text content exactly as it appears:',
            },
          ]);
          
          console.log('[APA POST] 📥 Vision API response received');
          const visionText = visionResponse.response.text();
          console.log(`[APA POST] 📄 Vision extracted: ${visionText.length} characters`);
          
          if (visionText && visionText.trim().length > 0) {
            textContent = visionText;
            extractionMethod = 'vision-api';
            console.log('[APA POST] ✅ Vision API SUCCESS');
          } else {
            console.warn('[APA POST] ⚠️ Vision API returned empty text');
          }
        } catch (visionErr: any) {
          console.error('[APA POST] ❌ Vision API ERROR:', visionErr.message);
          console.error('[APA POST] Error details:', visionErr);
        }
      }
    }

    // ถ้ายังไม่มีข้อความหลัง extraction + vision ให้ตอบเร็วโดยไม่เรียก LLM ต่อ
    if (!textContent || textContent.trim().length === 0) {
      console.warn(`[APA POST] No extractable text after all methods for ${fileName}, skip LLM generation.`);

      const fallbackApa = {
        ...EMPTY_APA_SCHEMA,
        additionalInfo: 'ไม่สามารถสกัดข้อความจากไฟล์นี้ได้ (อาจเป็นไฟล์สแกนหรือไฟล์ภาพคุณภาพต่ำ)'
      };

      try {
        await pool.query(
          `DELETE FROM file_apa_metadata WHERE file_name = $1 AND file_path = $2`,
          [fileName, filePath]
        );
        await pool.query(
          `INSERT INTO file_apa_metadata (file_name, file_path, mime_type, size_bytes, apa_json, created_at)
           VALUES ($1, $2, $3, $4, $5::jsonb, NOW())`,
          [fileName, filePath, isPdf ? 'application/pdf' : isDocx ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : 'text/plain', buffer.length, JSON.stringify(fallbackApa)]
        );
      } catch (dbErr: any) {
        console.error('Database insert fallback error:', dbErr);
        return NextResponse.json({ error: `Database error: ${dbErr.message}` }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        apa: fallbackApa,
        debugInfo: {
          fileName,
          fileType: isPdf ? 'PDF' : isDocx ? 'DOCX' : isTextLike ? 'TEXT' : 'OTHER',
          textExtractedLength: 0,
          extractionMethod,
          hasContent: false,
          forceVision,
          enableVisionForPdf: ENABLE_VISION_FOR_PDF,
          skippedLlm: true
        }
      });
    }

    console.log(`[APA POST] File: ${fileName}, Type: ${isPdf ? 'PDF' : isDocx ? 'DOCX' : isTextLike ? 'TEXT' : 'OTHER'}, Method: ${extractionMethod}, Length: ${textContent?.length || 0}`);
    if (!textContent || textContent.trim().length === 0) {
      console.warn(`[APA POST] WARNING: No text extracted from ${fileName} by any method.`);
    }

    const genAIKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY || process.env.GOOGLE_API_KEY;
    if (!genAIKey) {
      return NextResponse.json({ error: 'Google API key not configured' }, { status: 500 });
    }

    let apaJson: any = null;
    try {
      const genAI = new GoogleGenerativeAI(genAIKey);
      const modelName = process.env.GEMINI_MODEL || 'gemini-3-flash-preview';
      const model = genAI.getGenerativeModel({ model: modelName });

      const schemaDescription = `SYSTEM ROLE
คุณคือผู้ช่วยประมวลผลเอกสารวิชาการสำหรับระบบฐานข้อมูลงานวิจัยระดับ production

TASK
อ่านข้อความจากเอกสารวิชาการที่ให้มา แล้วแปลงเป็น JSON ตาม schema ที่กำหนด
ใช้เฉพาะข้อมูลที่ปรากฏในเอกสารจริงเท่านั้น

STRICT RULES (สำคัญมาก)
1. บทคัดย่อ (abstract) ต้องเป็นข้อความที่ปรากฏในเอกสารจริงเท่านั้น หากไม่พบบทคัดย่อที่เขียนไว้ชัดเจน ให้คุณสรุปข้อมูลและตัวเลขสำคัญที่พบใน PDF ออกมาเป็นบทสรุปสั้นๆ แทน
2. ห้ามแต่งข้อมูล ห้ามอนุมานข้อมูลที่ไม่มีอยู่จริงในเอกสาร
3. หากพบบทคัดย่อ ให้คัดลอกข้อความเต็ม (รวมคำว่า "บทคัดย่อ")
4. หากไม่พบบทคัดย่อ ห้ามใส่ null แต่ให้ดูข้อมูลใน PDF ว่ามีอะไรบ้างแล้วสรุปตัวเลขสถิติที่สำคัญออกมาแทน
5. ห้ามใช้อ้างอิงจากชื่อไฟล์ หรือการคาดเดาความรู้เดิม
6. ห้ามใช้คำว่า inferred, likely, based on filename, suggests
7. หากข้อมูลส่วนอื่น (ยกเว้น abstract) ไม่ปรากฏชัด ให้ใช้ null หรือ [] เท่านั้น
8. เอาเฉพาะภาษาไทย abstract
9. ภาษาห้ามเขียนผิด

KEYWORDS
- ดึงเฉพาะคำสำคัญที่ปรากฏในเอกสาร
- หากไม่พบ ให้เป็น array ว่าง

RESEARCHERS
- ระบุเฉพาะรายชื่อที่ปรากฏในเอกสาร
- หากไม่พบ ให้เป็น []

OUTPUT FORMAT
- ส่งออกเฉพาะ JSON เท่านั้น
- ต้อง parse ได้ทันที
- ห้ามมีข้อความอธิบายนอก JSON

OUTPUT SCHEMA (ต้องตรงทุก field)
{
  "abstract": null,
  "keywords": {
    "thai": [],
    "english": []
  },
  "references": [],
  "projectInfo": {
    "titleThai": null,
    "titleEnglish": null,
    "proposalCode": null,
    "budgetYear": null,
    "university": null,
    "projectCode": null,
    "totalBudget": null,
    "otherInfo": null
  },
  "researchers": [],
  "documentType": "",
  "additionalInfo": null
} 
  
`;
      const basePrompt = `You are an expert researcher analyzing a document. Your task is to EXTRACT ALL INFORMATION COMPLETELY AND ACCURATELY. ${schemaDescription}`;
      const contentForModel = textContent && textContent.trim().length > 0
        ? `File: ${fileName}\nContent:\n${textContent.substring(0, MAX_MODEL_CONTENT_CHARS)}`
        : `File: ${fileName}\nNo readable text could be extracted. If you can infer the document type from the filename, provide basic metadata. Filename: ${fileName}`;

      const result = await model.generateContent(`${basePrompt}\n\n${contentForModel}`);
      const text = result.response?.text?.() || '';
      console.log('[APA POST] Text extracted length:', textContent?.length || 0);
      console.log('[APA POST] AI response sample:', text.substring(0, 300));
      try {
        const firstBrace = text.indexOf('{');
        const lastBrace = text.lastIndexOf('}');
        const jsonStr = firstBrace >= 0 && lastBrace >= 0 ? text.slice(firstBrace, lastBrace + 1) : text;
        apaJson = JSON.parse(jsonStr);
      } catch {
        apaJson = { title: fileName, raw: text };
      }
    } catch (aiErr: any) {
      console.error('AI generation error:', aiErr);
      return NextResponse.json({ error: `AI generation failed: ${aiErr.message}` }, { status: 500 });
    }

    // Persist APA JSON
    try {
      await pool.query(
        `DELETE FROM file_apa_metadata WHERE file_name = $1 AND file_path = $2`,
        [fileName, filePath]
      );
      await pool.query(
        `INSERT INTO file_apa_metadata (file_name, file_path, mime_type, size_bytes, apa_json, created_at)
         VALUES ($1, $2, $3, $4, $5::jsonb, NOW())`,
        [fileName, filePath, isPdf ? 'application/pdf' : isDocx ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : 'text/plain', buffer.length, JSON.stringify(apaJson)]
      );
    } catch (dbErr: any) {
      console.error('Database insert error:', dbErr);
      return NextResponse.json({ error: `Database error: ${dbErr.message}` }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      apa: apaJson,
      debugInfo: {
        fileName,
        fileType: isPdf ? 'PDF' : isDocx ? 'DOCX' : isTextLike ? 'TEXT' : 'OTHER',
        textExtractedLength: textContent?.length || 0,
        extractionMethod: extractionMethod,
        hasContent: textContent && textContent.trim().length > 0,
        forceVision,
        enableVisionForPdf: ENABLE_VISION_FOR_PDF
      }
    });
  } catch (error: any) {
    console.error('Error generating APA metadata:', error);
    return NextResponse.json({ error: `Unexpected error: ${error.message}` }, { status: 500 });
  }
}
