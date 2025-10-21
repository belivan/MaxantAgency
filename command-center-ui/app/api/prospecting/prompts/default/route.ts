/**
 * GET /api/prospecting/prompts/default
 * Load default prospecting prompts from Prospecting Engine
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const PROSPECTING_API = process.env.NEXT_PUBLIC_PROSPECTING_API || 'http://localhost:3010';

    // Fetch default prompts from Prospecting Engine
    const response = await fetch(`${PROSPECTING_API}/api/prompts/default`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      return NextResponse.json(
        { success: false, error: error.error || 'Failed to load prompts' },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      data: data.data || data
    });

  } catch (error: any) {
    console.error('Failed to load default prospecting prompts:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}