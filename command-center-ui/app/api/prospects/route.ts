import { NextRequest, NextResponse } from 'next/server';
import { getDefaultBrief } from '@/lib/api/orchestrator';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

type ProspectPayload = {
  brief?: any;
  count?: number;
  city?: string;
  model?: string;
  verify?: boolean;
};

// GET - Fetch prospects from Supabase
export async function GET(request: NextRequest) {
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { success: false, error: 'Supabase credentials not configured' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const projectId = searchParams.get('project_id');
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // Build query - use INNER join when filtering by project, LEFT join otherwise
    const joinType = projectId ? '!inner' : '';
    let query = supabase
      .from('prospects')
      .select(`
        *,
        project_prospects${joinType}(
          project_id,
          projects(
            id,
            name
          )
        )
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }

    if (projectId) {
      query = query.eq('project_prospects.project_id', projectId);
    }

    const { data, error, count } = await query;

    // Transform data to flatten project info
    const prospects = data?.map(prospect => ({
      ...prospect,
      project_name: prospect.project_prospects?.[0]?.projects?.name || null,
      project_id: prospect.project_prospects?.[0]?.project_id || null,
      project_prospects: undefined // Remove the nested structure
    })) || [];

    if (error) throw error;

    return NextResponse.json({
      success: true,
      prospects: prospects,
      total: count || 0,
      count: prospects.length
    });
  } catch (error: any) {
    console.error('Fetch prospects error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch prospects' },
      { status: 500 }
    );
  }
}

// POST - Generate new prospects
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
