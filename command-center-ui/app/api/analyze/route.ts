import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 600;

type AnalyzePayload = {
  urls: string[];
  options?: {
    tier?: 'tier1' | 'tier2' | 'tier3';
    emailType?: 'local' | 'national';
    modules?: string[];
    metadata?: {
      campaignId?: string;
      projectId?: string;
      clientName?: string;
    };
  };
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as AnalyzePayload;
    const { urls, options } = body;

    if (!Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No URLs provided' },
        { status: 400 }
      );
    }

    // Call orchestrator API (which can import analyzer successfully)
    const orchestratorUrl = process.env.ORCHESTRATOR_URL || 'http://localhost:3010';
    const response = await fetch(`${orchestratorUrl}/api/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        urls,
        options: {
          tier: options?.tier || 'tier1',
          emailType: options?.emailType || 'local',
          modules: options?.modules || ['seo'],
          metadata: options?.metadata || {}
        }
      })
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.error || 'Analyzer run failed');
    }

    return NextResponse.json({
      success: true,
      results: result.results,
      logs: result.logs
    });
  } catch (error: any) {
    console.error('Analyzer error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Analyzer run failed'
      },
      { status: 500 }
    );
  }
}
