import { Client } from 'minio';

const MINIO_BUCKET = process.env.MINIO_BUCKET || 'uploads';

// สร้าง MinIO client ด้วย configuration
const minioClient = new Client({
  endPoint: process.env.MINIO_ENDPOINT || 'localhost',
  port: Number(process.env.MINIO_PORT) || 9000,
  useSSL: (process.env.MINIO_USE_SSL || 'false').toLowerCase() === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
  secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
});

export async function ensureBucket() {
  try {
    const exists = await minioClient.bucketExists(MINIO_BUCKET);
    if (!exists) {
      await minioClient.makeBucket(MINIO_BUCKET, '');
      console.log(`Bucket '${MINIO_BUCKET}' created successfully`);
    }
  } catch (error) {
    console.error('Error ensuring bucket:', error);
    throw error;
  }
}

export function normalizePrefix(folderPath?: string) {
  const safePath = folderPath || '/';
  const trimmed = safePath.replace(/^\/+/, '').replace(/\/+$|^$/g, '');
  if (!trimmed) return '';
  return trimmed.endsWith('/') ? trimmed : `${trimmed}/`;
}

export function buildObjectName(folderPath: string | undefined, name?: string) {
  const prefix = normalizePrefix(folderPath);
  return name ? `${prefix}${name}` : prefix;
}

export { minioClient, MINIO_BUCKET };
