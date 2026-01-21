import { NextRequest, NextResponse } from 'next/server';
import { minioClient, MINIO_BUCKET, ensureBucket, normalizePrefix, buildObjectName } from '@/lib/minio';
import { Pool } from 'pg';
import { GoogleGenerativeAI } from '@google/generative-ai';
import mammoth from 'mammoth';

// รองรับทั้ง local filesystem (สำหรับ external API) และ MinIO
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

const TEMP_DIR = path.join(process.cwd(), 'temp');

// PostgreSQL connection (keep consistent with other API routes)
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

// Google Generative AI client (Gemini)
const genAIKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY || process.env.GOOGLE_API_KEY;
const genAI = genAIKey ? new GoogleGenerativeAI(genAIKey) : null;

async function generateApaJson(params: {
  fileName: string;
  mimeType: string;
  textContent?: string | null;
}): Promise<any | null> {
  try {
    // If there's no API key, skip APA generation gracefully
    if (!genAI) {
      return null;
    }

    const schemaDescription = `CRITICAL INSTRUCTIONS:
1. READ THE ENTIRE DOCUMENT CAREFULLY
2. EXTRACT EVERY SINGLE PIECE OF INFORMATION
3. Fill in ALL available fields - do NOT skip any data found in the document
4. For references: list EVERY reference with complete details
5. For researchers: list EVERY person mentioned with their role and affiliation
6. For keywords: extract EVERY keyword mentioned

Return as JSON:
{
  "documentType": "research_proposal|thesis|journal_article|report|other",
  "projectInfo": {
    "projectCode": "extract if exists",
    "proposalCode": "extract if exists",
    "titleThai": "EXTRACT COMPLETE THAI TITLE",
    "titleEnglish": "EXTRACT COMPLETE ENGLISH TITLE",
    "university": "EXTRACT ALL UNIVERSITIES MENTIONED",
    "budgetYear": "extract year",
    "totalBudget": 0,
    "otherInfo": "any other project details"
  },
  "references": [
    {
      "type": "journal_article|book|thesis|thai_journal|thai_dissertation|website|report",
      "authors": [{"firstName": "", "lastName": "", "firstNameThai": "", "lastNameThai": "", "middleInitial": ""}],
      "year": 2024,
      "title": "COMPLETE TITLE",
      "journal": "journal name",
      "volume": "12",
      "issue": "3",
      "pages": "45-60",
      "doi": "10.xxx",
      "publisher": "publisher",
      "institution": "institution",
      "degreeType": "Master|PhD"
    }
  ],
  "researchers": [
    {
      "role": "หัวหน้าโครงการ|ผู้ร่วมวิจัย|อื่นๆ",
      "titleThai": "title",
      "firstNameThai": "EXTRACT",
      "lastNameThai": "EXTRACT",
      "firstNameEnglish": "extract if available",
      "lastNameEnglish": "extract if available",
      "affiliation": "EXTRACT COMPLETE AFFILIATION",
      "contribution": 0.0,
      "newResearcher": true|false
    }
  ],
  "keywords": {
    "thai": ["EXTRACT EVERY THAI KEYWORD"],
    "english": ["EXTRACT EVERY ENGLISH KEYWORD"]
  },
  "abstract": "EXTRACT COMPLETE ABSTRACT",
  "additionalInfo": "capture any other important data"
}

MANDATORY: Extract EVERYTHING visible in the document. Return ONLY valid JSON.`;

    const basePrompt = `You are an expert researcher analyzing a document. Your task is to EXTRACT ALL INFORMATION COMPLETELY AND ACCURATELY. ${schemaDescription}`;

    const contentForModel = params.textContent && params.textContent.trim().length > 0
      ? `File: ${params.fileName}\nContent:\n${params.textContent.substring(0, 20000)}`
      : `File: ${params.fileName}\nNo readable text could be extracted. If you can infer the document type from the filename, provide basic metadata. Filename: ${params.fileName}`;

    const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-pro';
    const model = genAI.getGenerativeModel({ model: modelName });
    const result = await model.generateContent(`${basePrompt}\n\n${contentForModel}`);
    const text = result.response?.text?.() || '';
    console.log('[APA] Content length:', params.textContent?.length || 0);
    console.log('[APA] AI response sample:', text.substring(0, 200));
    // Try to parse JSON from the response
    try {
      const firstBrace = text.indexOf('{');
      const lastBrace = text.lastIndexOf('}');
      const jsonStr = firstBrace >= 0 && lastBrace >= 0 ? text.slice(firstBrace, lastBrace + 1) : text;
      const parsed = JSON.parse(jsonStr);
      return parsed;
    } catch {
      // Fallback: wrap raw text
      return { title: params.fileName, raw: text };
    }
  } catch (err) {
    console.error('APA generation error:', err);
    return null;
  }
}

// สร้างโฟลเดอร์ชั่วคราวสำหรับ external API
async function ensureTempDir() {
  if (!existsSync(TEMP_DIR)) {
    await mkdir(TEMP_DIR, { recursive: true });
  }
}

// GET - ดึงรายการไฟล์จาก MinIO
export async function GET(request: NextRequest) {
  try {
    await ensureBucket();
    
    const { searchParams } = new URL(request.url);
    const folderPath = searchParams.get('path') || '/';
    const recursive = (searchParams.get('recursive') || 'false').toLowerCase() === 'true';
    const prefix = normalizePrefix(folderPath);

    const objectsStream = minioClient.listObjects(MINIO_BUCKET, prefix, recursive);
    const files: any[] = [];
    const folders = new Set<string>();

    for await (const obj of objectsStream as any) {
      const objectName: unknown = obj?.name;
      if (typeof objectName !== 'string') {
        continue;
      }

      const relativeName = objectName.slice(prefix.length);

      if (!relativeName) continue;

      // โฟลเดอร์ใน MinIO ถูกสร้างด้วยไฟล์ marker ที่ลงท้ายด้วย .folder
      // ถ้าเรียกแบบ recursive อาจอยู่ลึกหลายชั้น ให้ดึงชื่อโฟลเดอร์จาก segment สุดท้าย
      if (relativeName.endsWith('.folder')) {
        const noExt = relativeName.slice(0, -'.folder'.length);
        const lastSlash = noExt.lastIndexOf('/');
        const folderName = lastSlash >= 0 ? noExt.slice(lastSlash + 1) : noExt;
        const dir = lastSlash >= 0 ? noExt.slice(0, lastSlash + 1) : '';

        if (folderName) {
          if (recursive) {
            const pathForFolder = (folderPath === '/' ? '/' : folderPath) + (dir || '');
            files.unshift({
              id: `folder-${objectName}`,
              name: folderName,
              type: 'folder',
              modifiedDate: new Date(),
              path: pathForFolder.startsWith('/') ? pathForFolder : `/${pathForFolder}`,
            });
          } else {
            folders.add(folderName);
          }
        }
        continue;
      }

      if (recursive) {
        // เมื่อ recursive=true ให้คืนไฟล์ทุกระดับ โดยคำนวณ path ของไฟล์จาก directory ของ object
        const lastSlash = relativeName.lastIndexOf('/');
        const name = lastSlash >= 0 ? relativeName.slice(lastSlash + 1) : relativeName;
        const dir = lastSlash >= 0 ? relativeName.slice(0, lastSlash + 1) : '';
        if (!name) continue;

        const pathForFile = (folderPath === '/' ? '/' : folderPath) + (dir || '');
        files.push({
          id: obj.etag || objectName,
          name,
          type: 'file',
          size: obj.size,
          modifiedDate: obj.lastModified,
          path: pathForFile.startsWith('/') ? pathForFile : `/${pathForFile}`,
        });
        continue;
      }

      // ถ้าเป็นโฟลเดอร์ (มี / ต่อท้าย)
      if (relativeName.includes('/')) {
        const folderName = relativeName.split('/')[0];
        folders.add(folderName);
      } else if (relativeName) {
        // ถ้าเป็นไฟล์
        files.push({
          id: obj.etag || obj.name,
          name: relativeName,
          type: 'file',
          size: obj.size,
          modifiedDate: obj.lastModified,
          path: folderPath,
        });
      }
    }

    // เพิ่มโฟลเดอร์เข้าไป (เฉพาะโหมดไม่ recursive ที่ใช้ set)
    if (!recursive) {
      folders.forEach(folderName => {
        files.unshift({
          id: `folder-${folderName}`,
          name: folderName,
          type: 'folder',
          modifiedDate: new Date(),
          path: folderPath,
        });
      });
    }

    return NextResponse.json({ files });
  } catch (error) {
    console.error('Error reading files from MinIO:', error);

    // ให้ error ชัดเจนขึ้นตอน dev เพื่อ debug MinIO ได้เร็ว (ไม่เปิดเผยรายละเอียดใน production)
    const isProd = process.env.NODE_ENV === 'production';
    const anyErr = error as any;
    const code = typeof anyErr?.code === 'string' ? anyErr.code : undefined;
    const message = typeof anyErr?.message === 'string' ? anyErr.message : undefined;

    // ส่วนใหญ่จะเป็นปัญหาเชื่อมต่อ MinIO/สิทธิ์ หรือ bucket
    const status = code === 'ECONNREFUSED' || code === 'ENOTFOUND' ? 503 : 500;

    return NextResponse.json(
      {
        error: status === 503 ? 'MinIO unavailable' : 'Failed to read files',
        ...(isProd ? {} : { details: { code, message, endpoint: process.env.MINIO_ENDPOINT, port: process.env.MINIO_PORT, bucket: process.env.MINIO_BUCKET } })
      },
      { status }
    );
  }
}

// POST - อัปโหลดไฟล์ไปยัง MinIO
export async function POST(request: NextRequest) {
  try {
    await ensureBucket();
    
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const folderPath = (formData.get('path') as string) || '/';
    const externalApiUrl = formData.get('apiUrl') as string | null; // URL ของ API ภายนอก (optional)
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // อัปโหลดไฟล์ไปยัง MinIO
    const objectName = buildObjectName(folderPath, file.name);
    const relativePath = `/${objectName}`; // path inside bucket from root
    
    await minioClient.putObject(
      MINIO_BUCKET,
      objectName,
      buffer,
      buffer.length,
      {
        'Content-Type': file.type || 'application/octet-stream',
      }
    );

    // Extract text content for AI when feasible (basic types only)
    let textContent: string | null = null;
    const lowerName = file.name.toLowerCase();
    const isTextLike = (file.type?.startsWith('text/') || lowerName.endsWith('.txt') || lowerName.endsWith('.md') || lowerName.endsWith('.json'));
    const isPdf = file.type === 'application/pdf' || lowerName.endsWith('.pdf');
    const isDocx = file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || lowerName.endsWith('.docx');

    try {
      if (isTextLike) {
        textContent = buffer.toString('utf-8');
      } else if (isPdf) {
        // ใช้ dynamic require เพื่อหลีกเลี่ยง error ตอนเริ่มต้น
        const pdf = require('pdf-parse/lib/pdf-parse.js'); 
        const parsed = await pdf(buffer);
        textContent = parsed?.text || null;
      } else if (isDocx) {
        const result = await mammoth.extractRawText({ buffer });
        textContent = result?.value || null;
      }
    } catch (extractErr) {
      console.error('Text extraction error:', extractErr);
      textContent = null;
    }

    // Generate APA JSON via AI
    const apaJson = await generateApaJson({
      fileName: file.name,
      mimeType: file.type || 'application/octet-stream',
      textContent,
    });

    // Persist file + APA metadata in Postgres
    try {
      await pool.query(
        `INSERT INTO file_apa_metadata (file_name, file_path, mime_type, size_bytes, apa_json, created_at)
         VALUES ($1, $2, $3, $4, $5::jsonb, NOW())`,
        [file.name, folderPath, file.type || 'application/octet-stream', file.size, apaJson ? JSON.stringify(apaJson) : null]
      );
    } catch (dbErr: any) {
      console.error('DB insert error (file_apa_metadata):', dbErr?.message || dbErr);
    }

    // ส่งไฟล์ไปยัง API ภายนอก (เฉพาะไฟล์ PDF เท่านั้น)
    let externalApiResponse: any = null;
    if (externalApiUrl) {
      const isPDF = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      
      if (isPDF) {
        try {
          await ensureTempDir();
          
          // บันทึกไฟล์ชั่วคราวสำหรับส่งไปยัง external API (เผื่อ API ต้องอ่านจากไฟล์จริง)
          const tempFilePath = path.join(TEMP_DIR, file.name);
          await writeFile(tempFilePath, buffer);

          const externalFormData = new FormData();
          externalFormData.append('files', new Blob([buffer]), file.name);
          externalFormData.append('filename', file.name);
          externalFormData.append('path', folderPath);
          externalFormData.append('size', String(file.size));
          externalFormData.append('type', file.type);

          // แนบ relative path ไปกับไฟล์เพื่อบอกตำแหน่งภายในระบบ
          externalFormData.append('relativePath', relativePath);

          const response = await fetch(externalApiUrl, {
            method: 'POST',
            body: externalFormData,
          });

          if (response.ok) {
            externalApiResponse = await response.json();
          } else {
            console.error('External API error:', await response.text());
          }
        } catch (apiError) {
          console.error('Error sending to external API:', apiError);
        }
      } else {
        console.log('Skipping external API - not a PDF file:', file.name);
      }
    }

    return NextResponse.json({ 
      success: true, 
      filename: file.name,
      path: folderPath,
      relativePath,
      apa: apaJson,
      externalApi: externalApiResponse ? {
        success: true,
        data: externalApiResponse
      } : null
    });
  } catch (error) {
    console.error('Error uploading file to MinIO:', error);
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
  }
}

// DELETE - ลบไฟล์จาก MinIO
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filePath = searchParams.get('path');
    const fileName = searchParams.get('name');
    
    if (!filePath || !fileName) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const objectName = buildObjectName(filePath, fileName);
    
    await minioClient.removeObject(MINIO_BUCKET, objectName);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting file from MinIO:', error);
    return NextResponse.json({ error: 'Failed to delete file' }, { status: 500 });
  }
}

// PUT - แก้ไขชื่อไฟล์ใน MinIO (copy + delete)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { path: filePath, oldName, newName } = body as { path: string; oldName: string; newName: string };
    
    if (!filePath || !oldName || !newName) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const oldObjectName = buildObjectName(filePath, oldName);
    const newObjectName = buildObjectName(filePath, newName);
    
    // Copy object to new name
    await minioClient.copyObject(
      MINIO_BUCKET,
      newObjectName,
      `/${MINIO_BUCKET}/${oldObjectName}`
    );
    
    // Delete old object
    await minioClient.removeObject(MINIO_BUCKET, oldObjectName);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error renaming file in MinIO:', error);
    return NextResponse.json({ error: 'Failed to rename file' }, { status: 500 });
  }
}
