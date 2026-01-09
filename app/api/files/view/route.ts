import { NextRequest, NextResponse } from 'next/server';
import { minioClient, MINIO_BUCKET, buildObjectName } from '@/lib/minio';
import mime from 'mime-types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filePath = searchParams.get('path');
    const fileName = searchParams.get('name');
    
    if (!filePath || !fileName) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const objectName = buildObjectName(filePath, fileName);
    
    // ดึงไฟล์จาก MinIO
    const dataStream = await minioClient.getObject(MINIO_BUCKET, objectName);
    
    // แปลง stream เป็น buffer
    const chunks: Buffer[] = [];
    for await (const chunk of dataStream) {
      chunks.push(chunk);
    }
    const fileBuffer = Buffer.concat(chunks);
    
    const mimeType = (mime.lookup(fileName) || 'application/octet-stream') as string;

    // สร้าง Content-Disposition แบบ inline รองรับ UTF-8 ตาม RFC 5987/6266
    const asciiFallback = fileName.replace(/[^\x20-\x7E]/g, '_');
    const encodedUTF8 = encodeRFC5987(fileName);
    const contentDisposition = `inline; filename="${asciiFallback}"; filename*=UTF-8''${encodedUTF8}`;

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': contentDisposition,
        'Cache-Control': 'public, max-age=31536000',
        'Content-Length': String(fileBuffer.length),
      },
    });
  } catch (error) {
    console.error('Error viewing file from MinIO:', error);
    return NextResponse.json({ error: 'Failed to view file' }, { status: 500 });
  }
}

// เข้ารหัสค่าให้เป็นไปตาม RFC 5987 (ใช้กับ filename*)
function encodeRFC5987(value: string) {
  return encodeURIComponent(value)
    .replace(/['()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)
    .replace(/%(7C|60|5E)/g, (match, hex) => `%${hex}`);
}
