import { NextRequest, NextResponse } from 'next/server';
import { mkdir, rmdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

// POST - สร้างโฟลเดอร์ใหม่
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { path: folderPath, name } = body;
    
    if (!name) {
      return NextResponse.json({ error: 'Folder name required' }, { status: 400 });
    }

    const fullPath = path.join(UPLOAD_DIR, folderPath || '/', name);
    
    if (existsSync(fullPath)) {
      return NextResponse.json({ error: 'Folder already exists' }, { status: 409 });
    }

    await mkdir(fullPath, { recursive: true });
    
    return NextResponse.json({ success: true, name });
  } catch (error) {
    console.error('Error creating folder:', error);
    return NextResponse.json({ error: 'Failed to create folder' }, { status: 500 });
  }
}

// DELETE - ลบโฟลเดอร์
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const folderPath = searchParams.get('path');
    const folderName = searchParams.get('name');
    
    if (!folderPath || !folderName) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const fullPath = path.join(UPLOAD_DIR, folderPath, folderName);
    
    if (existsSync(fullPath)) {
      await rmdir(fullPath, { recursive: true });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
  } catch (error) {
    console.error('Error deleting folder:', error);
    return NextResponse.json({ error: 'Failed to delete folder' }, { status: 500 });
  }
}
