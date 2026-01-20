import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  console.log('[TEST APA] POST request received');
  
  try {
    const body = await request.json();
    console.log('[TEST APA] Body:', body);
    
    return NextResponse.json({
      success: true,
      message: 'Test APA POST works!',
      receivedBody: body,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('[TEST APA] Error:', error);
    return NextResponse.json({
      error: error.message
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  console.log('[TEST APA] GET request received');
  return NextResponse.json({
    message: 'Test APA GET works!'
  });
}
