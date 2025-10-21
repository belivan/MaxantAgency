/**
 * API Route: GET /api/analysis/prompts
 * Fetches default analysis prompts from the Analysis Engine
 */

import { NextRequest, NextResponse } from 'next/server';

const ANALYSIS_ENGINE_URL = process.env.NEXT_PUBLIC_ANALYSIS_ENGINE_URL || 'http://localhost:3001';

export async function GET(request: NextRequest) {
  try {
    // Fetch default prompts from Analysis Engine
    const response = await fetch(`${ANALYSIS_ENGINE_URL}/api/prompts/default`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Analysis Engine returned ${response.status}`);
    }

    const prompts = await response.json();

    // Analysis Engine already returns { success: true, data: {...} }
    // Just pass it through without double-wrapping
    return NextResponse.json(prompts);

  } catch (error: any) {
    console.error('[API] Error fetching default prompts:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch default prompts'
      },
      { status: 500 }
    );
  }
}
