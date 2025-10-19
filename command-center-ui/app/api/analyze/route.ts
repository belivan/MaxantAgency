import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import {
  analyzeWebsitesBridge,
  markProspectStatusBridge
} from '@/lib/orchestrator';

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
  const body = (await request.json()) as AnalyzePayload;
  const { urls, options } = body;

  if (!Array.isArray(urls) || urls.length === 0) {
    return NextResponse.json({ success: false, error: 'No URLs provided' }, { status: 400 });
  }

  const moduleSet = new Set(options?.modules || ['seo']);
  const modules = {
    basic: true,
    seo: moduleSet.has('seo'),
    visual: moduleSet.has('visual'),
    industry: moduleSet.has('industry'),
    competitor: moduleSet.has('competitor')
  };

  const analyzerOptions = {
    textModel: process.env.DEFAULT_TEXT_MODEL || 'gpt-5-mini',
    visionModel: process.env.DEFAULT_VISION_MODEL || 'gpt-4o',
    depthTier: options?.tier || 'tier1',
    modules,
    emailType: options?.emailType || 'local',
    metadata: {
      runId: randomUUID(),
      sourceApp: 'command-center-ui',
      campaignId: options?.metadata?.campaignId || null,
      projectId: options?.metadata?.projectId || null,
      clientName: options?.metadata?.clientName || null
    }
  };

  const logs: any[] = [];

  try {
    await markProspectStatusBridge(urls, 'queued');
    const results = await analyzeWebsitesBridge(urls, analyzerOptions, (payload: any) => {
      logs.push({ type: payload?.type, message: payload?.message, url: payload?.url });
    });
    await markProspectStatusBridge(urls, 'analyzed');

    return NextResponse.json({ success: true, results, logs });
  } catch (error: any) {
    console.error('Analyzer error:', error);
    await markProspectStatusBridge(urls, 'error');
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Analyzer run failed',
        logs
      },
      { status: 500 }
    );
  }
}
