import { NextResponse } from 'next/server';
import { getDefaultBrief } from '@/lib/orchestrator';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

type ProspectPayload = {
  brief?: any;
  count?: number;
  city?: string;
  model?: string;
  verify?: boolean;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ProspectPayload;
    const {
      brief,
      count = 20,
      city,
      model = 'grok-4-fast',
      verify = true
    } = body;

    const briefData = brief ?? (await getDefaultBrief());

    if (!briefData) {
      return NextResponse.json(
        { success: false, error: 'Brief data not available. Provide JSON in request body.' },
        { status: 400 }
      );
    }

    // Call client-orchestrator API server
    const orchestratorUrl = process.env.ORCHESTRATOR_URL || 'http://localhost:3010';
    const response = await fetch(`${orchestratorUrl}/api/prospects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        brief: briefData,
        count,
        city,
        model,
        verify
      })
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.error || 'Prospect generation failed');
    }

    return NextResponse.json({
      success: true,
      companies: result.companies,
      urls: result.urls,
      runId: result.runId
    });
  } catch (error: any) {
    console.error('Prospect generation error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Prospect generation failed' },
      { status: 500 }
    );
  }
}
