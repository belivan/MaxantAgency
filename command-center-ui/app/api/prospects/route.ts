import { NextResponse } from 'next/server';
import {
  getDefaultBrief,
  markProspectStatusBridge,
  runProspectorBridge
} from '@/lib/orchestrator';

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
      model = 'gpt-4o-mini',
      verify = true
    } = body;

    const briefData = brief ?? (await getDefaultBrief());

    if (!briefData) {
      return NextResponse.json(
        { success: false, error: 'Brief data not available. Provide JSON in request body.' },
        { status: 400 }
      );
    }

    const result = await runProspectorBridge({
      briefData,
      count,
      city,
      model,
      verify,
      saveToFile: false,
      saveSupabase: true,
      supabaseStatus: 'pending_analysis',
      source: 'command-center-ui'
    });

    // Ensure Supabase status marks default state
    await markProspectStatusBridge(result.urls, 'pending_analysis');

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
