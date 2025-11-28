import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/server/quota';

export const dynamic = 'force-dynamic';

const PROSPECTING_API = process.env.NEXT_PUBLIC_PROSPECTING_API || 'http://localhost:3010';

/**
 * POST /api/prospecting/queue
 * Proxy for prospecting queue - adds user_id for data isolation
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
    const response = await fetch(`${PROSPECTING_API}/api/prospect-queue`, {
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
    console.error('Prospecting queue proxy error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to queue prospecting' },
      { status: 500 }
    );
  }
}
