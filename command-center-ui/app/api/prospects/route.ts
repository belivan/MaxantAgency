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
    const industry = searchParams.get('industry');
    const city = searchParams.get('city');
    const minRating = searchParams.get('min_rating');
    const fields = searchParams.get('fields'); // Support selective field fetching
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // Build query - always query from prospects table
    let query;
    let prospectIdsInProject: string[] | null = null;

    if (projectId) {
      // First, get all prospect IDs in this project
      const { data: projectProspectsData, error: projectProspectsError } = await supabase
        .from('project_prospects')
        .select('prospect_id')
        .eq('project_id', projectId);

      if (projectProspectsError) {
        console.error('Error fetching project prospects:', projectProspectsError);
        throw new Error(`Failed to fetch project prospects: ${projectProspectsError.message}`);
      }

      prospectIdsInProject = projectProspectsData?.map(pp => pp.prospect_id) || [];

      // If no prospects in project, return empty result
      if (prospectIdsInProject.length === 0) {
        return NextResponse.json({
          success: true,
          prospects: [],
          total: 0,
          count: 0
        });
      }

      // Now query prospects table with those IDs
      const selectFields = fields === 'id'
        ? 'id'
        : `*`;

      query = supabase
        .from('prospects')
        .select(selectFields, { count: 'exact' })
        .in('id', prospectIdsInProject);

      // Apply filters directly on prospects columns
      if (status) {
        query = query.eq('status', status);
      }
      if (industry) {
        query = query.ilike('industry', `%${industry}%`);
      }
      if (city) {
        query = query.ilike('city', `%${city}%`);
      }
      if (minRating) {
        query = query.gte('google_rating', parseFloat(minRating));
      }

      // Only add ordering for full record fetches (not for ID-only)
      if (fields !== 'id') {
        query = query.order('created_at', { ascending: false });
      }
    } else {
      // No project filter - query prospects table directly
      const selectFields = fields === 'id'
        ? 'id'
        : `*, project_prospects(project_id, projects(id, name))`;

      query = supabase
        .from('prospects')
        .select(selectFields, { count: 'exact' })
        .order('created_at', { ascending: false });

      // Apply filters
      if (status) {
        query = query.eq('status', status);
      }
      if (industry) {
        query = query.ilike('industry', `%${industry}%`);
      }
      if (city) {
        query = query.ilike('city', `%${city}%`);
      }
      if (minRating) {
        query = query.gte('google_rating', parseFloat(minRating));
      }
    }

    // Only apply pagination if not fetching just IDs
    if (fields !== 'id') {
      query = query.range(offset, offset + limit - 1);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Supabase query error:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      throw new Error(`Database query failed: ${error.message}${error.details ? ` - ${error.details}` : ''}`);
    }

    // Transform data
    let prospects;

    if (fields === 'id') {
      // Just extract IDs
      prospects = data?.map(item => ({ id: item.id })) || [];
    } else if (projectId) {
      // When filtering by project, we don't have project info in the response (we used .in() filter)
      // Add it manually
      prospects = data?.map(prospect => ({
        ...prospect,
        project_id: projectId,
        project_name: null, // We could fetch this separately if needed
        project_prospects: undefined
      })) || [];
    } else {
      // No project filter - flatten project info from join
      prospects = data?.map(prospect => ({
        ...prospect,
        project_id: prospect.project_prospects?.[0]?.project_id || null,
        project_name: prospect.project_prospects?.[0]?.projects?.name || null,
        project_prospects: undefined // Remove the nested structure
      })) || [];
    }

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
