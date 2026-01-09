import { NextRequest, NextResponse } from 'next/server';
import { minioClient, MINIO_BUCKET, buildObjectName } from '@/lib/minio';

// POST - สร้างโฟลเดอร์ใหม่ (ใน MinIO ต้องสร้างไฟล์ marker)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { path: folderPath, name } = body;
    
    if (!name) {
      return NextResponse.json({ error: 'Folder name required' }, { status: 400 });
    }

    // ใน MinIO โฟลเดอร์จะถูกสร้างเมื่อมีไฟล์ในโฟลเดอร์นั้น
    // เราจะสร้าง marker file เปล่าๆ เพื่อให้โฟลเดอร์ปรากฏ
    const folderMarker = buildObjectName(folderPath || '/', name) + '.folder';
    
    await minioClient.putObject(
      MINIO_BUCKET,
      folderMarker,
      Buffer.from(''),
      0,
      {
        'Content-Type': 'application/x-directory',
      }
    );
    
    return NextResponse.json({ success: true, name });
  } catch (error) {
    console.error('Error creating folder in MinIO:', error);
    return NextResponse.json({ error: 'Failed to create folder' }, { status: 500 });
  }
}

// DELETE - ลบโฟลเดอร์และไฟล์ทั้งหมดภายใน
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const folderPath = searchParams.get('path');
    const folderName = searchParams.get('name');
    
    if (!folderPath || !folderName) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const prefix = buildObjectName(folderPath, folderName);
    
    // ลบไฟล์ทั้งหมดในโฟลเดอร์
    const objectsStream = minioClient.listObjects(MINIO_BUCKET, prefix, true);
    const objectsList: string[] = [];
    
    for await (const obj of objectsStream) {
      objectsList.push(obj.name);
    }
    
    if (objectsList.length > 0) {
      await minioClient.removeObjects(MINIO_BUCKET, objectsList);
    }
    
    // ลบ folder marker ถ้ามี
    try {
      await minioClient.removeObject(MINIO_BUCKET, prefix + '.folder');
    } catch {}
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting folder from MinIO:', error);
    return NextResponse.json({ error: 'Failed to delete folder' }, { status: 500 });
  }
}
