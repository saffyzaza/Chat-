import { NextRequest, NextResponse } from 'next/server';



const THAIJO_API_URL = process.env.NEXT_PUBLIC_THAIJO_API_URL;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const size = Math.max(1, Number(body.size || 1));
    // ลด timeout ลงให้เหมาะสม: ฐาน 30 วินาที + 10 วินาทีต่อบทความ (สูงสุดไม่เกิน 3 นาที)
    const dynamicTimeout = Math.min(180000, 30000 + (size * 10000)); 
    
    const startTime = Date.now();
    console.log(`📡 [ThaiJO API Start]: term="${body.term}", size=${size} | Timeout: ${dynamicTimeout/1000}s`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), dynamicTimeout);

    try {
      const response = await fetch(`${THAIJO_API_URL}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        cache: 'no-store',
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`✅ [ThaiJO API Success]: Finish in ${duration}s`);

      const text = await response.text();
      let parsed: any = {};
      try {
        parsed = text ? JSON.parse(text) : {};
      } catch {
        parsed = { raw: text };
      }

      // Console log for debugging the real API response
      // console.log('📡 [ThaiJO API Raw Response]:', JSON.stringify(parsed, null, 2));

      return NextResponse.json(parsed, { status: response.status });

    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      console.error('Fetch to ThaiJO failed:', fetchError.message);

      // Return error
      return NextResponse.json(
        { 
          message: fetchError.name === 'AbortError' 
            ? `ThaiJO API connection timeout (${dynamicTimeout/1000}s)` 
            : 'ThaiJO API currently unavailable',
          ok: false 
        },
        { status: 503 } // Service Unavailable
      );
    }
    
  } catch (error: any) {
    return NextResponse.json(
      {
        message: error?.message || 'Thaijo proxy failed',
        ok: false
      },
      { status: 500 }
    );
  }
}