import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir, readdir, unlink, rename, stat } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

// กำหนดโฟลเดอร์หลักสำหรับเก็บไฟล์
const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

// สร้างโฟลเดอร์ถ้ายังไม่มี
async function ensureUploadDir() {
  if (!existsSync(UPLOAD_DIR)) {
    await mkdir(UPLOAD_DIR, { recursive: true });
  }
}

// GET - ดึงรายการไฟล์
export async function GET(request: NextRequest) {
  try {
    await ensureUploadDir();
    
    const { searchParams } = new URL(request.url);
    const folderPath = searchParams.get('path') || '/';
    
    const fullPath = path.join(UPLOAD_DIR, folderPath);
    
    if (!existsSync(fullPath)) {
      return NextResponse.json({ files: [] });
    }

    const items = await readdir(fullPath, { withFileTypes: true });
    
    const files = await Promise.all(
      items.map(async (item) => {
        const itemPath = path.join(fullPath, item.name);
        const stats = await stat(itemPath);
        
        return {
          id: `${stats.ino}-${stats.mtimeMs}`,
          name: item.name,
          type: item.isDirectory() ? 'folder' : 'file',
          size: item.isFile() ? stats.size : undefined,
          modifiedDate: stats.mtime,
          path: folderPath,
        };
      })
    );

    return NextResponse.json({ files });
  } catch (error) {
    console.error('Error reading files:', error);
    return NextResponse.json({ error: 'Failed to read files' }, { status: 500 });
  }
}

// POST - อัปโหลดไฟล์
export async function POST(request: NextRequest) {
  try {
    await ensureUploadDir();
    
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const folderPath = formData.get('path') as string || '/';
    const externalApiUrl = formData.get('apiUrl') as string; // URL ของ API ภายนอก (optional)
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // บันทึกไฟล์ลงในเซิร์ฟเวอร์ local
    const targetDir = path.join(UPLOAD_DIR, folderPath);
    if (!existsSync(targetDir)) {
      await mkdir(targetDir, { recursive: true });
    }

    const filePath = path.join(targetDir, file.name);
    await writeFile(filePath, buffer);

    // ส่งไฟล์ไปยัง API ภายนอก (ถ้ามี apiUrl)
    let externalApiResponse = null;
    if (externalApiUrl) {
      try {
        const externalFormData = new FormData();
        externalFormData.append('files', new Blob([buffer]), file.name);
        externalFormData.append('filename', file.name);
        externalFormData.append('path', folderPath);
        externalFormData.append('size', file.size.toString());
        externalFormData.append('type', file.type);

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
        // ไม่ throw error เพื่อให้การบันทึกไฟล์ local ยังคงสำเร็จ
      }
    }

    return NextResponse.json({ 
      success: true, 
      filename: file.name,
      path: folderPath,
      externalApi: externalApiResponse ? {
        success: true,
        data: externalApiResponse
      } : null
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
  }
}

// DELETE - ลบไฟล์หรือโฟลเดอร์
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filePath = searchParams.get('path');
    const fileName = searchParams.get('name');
    
    if (!filePath || !fileName) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const fullPath = path.join(UPLOAD_DIR, filePath, fileName);
    
    if (existsSync(fullPath)) {
      await unlink(fullPath);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  } catch (error) {
    console.error('Error deleting file:', error);
    return NextResponse.json({ error: 'Failed to delete file' }, { status: 500 });
  }
}

// PUT - แก้ไขชื่อไฟล์
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { path: filePath, oldName, newName } = body;
    
    if (!filePath || !oldName || !newName) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const oldPath = path.join(UPLOAD_DIR, filePath, oldName);
    const newPath = path.join(UPLOAD_DIR, filePath, newName);
    
    if (existsSync(oldPath)) {
      await rename(oldPath, newPath);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  } catch (error) {
    console.error('Error renaming file:', error);
    return NextResponse.json({ error: 'Failed to rename file' }, { status: 500 });
  }
}
