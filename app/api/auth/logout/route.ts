import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // ในการใช้งานจริงอาจต้องลบ token จาก database หรือ blacklist
    return NextResponse.json({
      message: 'ออกจากระบบสำเร็จ',
    });
  } catch (error: any) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { message: 'เกิดข้อผิดพลาดในการออกจากระบบ' },
      { status: 500 }
    );
  }
}
