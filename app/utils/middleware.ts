import { NextRequest, NextResponse } from 'next/server';

// Middleware สำหรับตรวจสอบว่า User Login หรือยัง
export function withAuth(handler: (req: NextRequest, user: any) => Promise<NextResponse>) {
  return async (req: NextRequest) => {
    try {
      const token = req.headers.get('Authorization');

      if (!token) {
        return NextResponse.json(
          { message: 'กรุณาเข้าสู่ระบบก่อน' },
          { status: 401 }
        );
      }

      // ตรวจสอบ Token (ในตัวอย่างนี้เป็น Simple Token)
      // ในการใช้งานจริงควรใช้ JWT และตรวจสอบจาก Database
      const tokenData = Buffer.from(token.replace('Bearer ', ''), 'base64').toString();
      const [userId] = tokenData.split(':');

      if (!userId) {
        return NextResponse.json(
          { message: 'Token ไม่ถูกต้อง' },
          { status: 401 }
        );
      }

      // ดึงข้อมูล User จาก Database (ตัวอย่าง)
      const user = { id: parseInt(userId) };

      // เรียก handler พร้อมข้อมูล user
      return handler(req, user);
    } catch (error: any) {
      console.error('Auth middleware error:', error);
      return NextResponse.json(
        { message: 'เกิดข้อผิดพลาดในการตรวจสอบสิทธิ์' },
        { status: 500 }
      );
    }
  };
}

// ตัวอย่างการใช้งาน:
/*
// app/api/protected-route/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/app/utils/middleware';

export const POST = withAuth(async (req: NextRequest, user) => {
  // ตรงนี้จะถูกเรียกเมื่อ User Login แล้วเท่านั้น
  const body = await req.json();
  
  // สามารถใช้ user.id ได้
  console.log('User ID:', user.id);
  
  return NextResponse.json({
    message: 'Success',
    userId: user.id,
    data: body,
  });
});
*/
