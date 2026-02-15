import { NextRequest, NextResponse } from 'next/server';

type BulkBody = {
  path?: string;
  files?: string[];
  forceVision?: boolean;
  concurrency?: number;
};

async function runWithConcurrency<T>(tasks: Array<() => Promise<T>>, concurrency: number): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  let cursor = 0;

  const workers = Array.from({ length: Math.max(1, concurrency) }, async () => {
    while (cursor < tasks.length) {
      const current = cursor;
      cursor += 1;
      results[current] = await tasks[current]();
    }
  });

  await Promise.all(workers);
  return results;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as BulkBody;
    const path = typeof body.path === 'string' && body.path.trim() ? body.path : '/';
    const files = Array.isArray(body.files)
      ? body.files.filter((name): name is string => typeof name === 'string' && name.trim().length > 0)
      : [];
    const forceVision = body.forceVision === true;
    const requestedConcurrency = Number(body.concurrency || 3);
    const concurrency = Number.isFinite(requestedConcurrency)
      ? Math.min(8, Math.max(1, requestedConcurrency))
      : 3;

    if (files.length === 0) {
      return NextResponse.json({ error: 'files is required and must be a non-empty array' }, { status: 400 });
    }

    const endpoint = new URL('/api/files/apa', request.nextUrl.origin).toString();
    const startedAt = Date.now();

    const tasks = files.map((fileName) => async () => {
      const fileStartedAt = Date.now();
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            path,
            name: fileName,
            forceVision,
          }),
          cache: 'no-store',
        });

        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          return {
            fileName,
            success: false,
            status: response.status,
            error: payload?.error || payload?.message || response.statusText || 'Unknown error',
            durationMs: Date.now() - fileStartedAt,
          };
        }

        return {
          fileName,
          success: true,
          status: response.status,
          durationMs: Date.now() - fileStartedAt,
          debugInfo: payload?.debugInfo || null,
        };
      } catch (error: any) {
        return {
          fileName,
          success: false,
          status: 500,
          error: error?.message || 'Request failed',
          durationMs: Date.now() - fileStartedAt,
        };
      }
    });

    const results = await runWithConcurrency(tasks, concurrency);
    const successCount = results.filter((item: any) => item.success).length;
    const failCount = results.length - successCount;

    return NextResponse.json({
      success: true,
      path,
      total: results.length,
      successCount,
      failCount,
      concurrency,
      totalDurationMs: Date.now() - startedAt,
      results,
    });
  } catch (error: any) {
    console.error('Bulk APA generation error:', error);
    return NextResponse.json({ error: error?.message || 'Bulk APA generation failed' }, { status: 500 });
  }
}
