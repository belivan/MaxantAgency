import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/server/quota';

export const dynamic = 'force-dynamic';

const ANALYSIS_API = process.env.NEXT_PUBLIC_ANALYSIS_API || 'http://localhost:3001';

/**
 * POST /api/analysis/queue
 * Proxy for analysis queue - adds user_id for data isolation
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();

    // Add user_id to the request
    const response = await fetch(`${ANALYSIS_API}/api/analyze-queue`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...body,
        user_id: user.id
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Analysis queue proxy error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to queue analysis' },
      { status: 500 }
    );
  }
}
