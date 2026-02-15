import { NextRequest, NextResponse } from 'next/server';

const THAIJO_API_URL = 'http://72.61.120.205:8505/api/v1/thaijo';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));

    const response = await fetch(THAIJO_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      cache: 'no-store',
    });

    const text = await response.text();
    let parsed: unknown = text;

    try {
      parsed = text ? JSON.parse(text) : {};
    } catch {
      parsed = { raw: text };
    }

    return NextResponse.json(parsed, { status: response.status });
  } catch (error: any) {
    return NextResponse.json(
      {
        message: error?.message || 'Thaijo proxy failed',
      },
      { status: 500 }
    );
  }
}