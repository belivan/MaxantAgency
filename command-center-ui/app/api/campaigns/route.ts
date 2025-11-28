import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getCurrentUser } from '@/lib/server/quota';

export const dynamic = 'force-dynamic';

const ORCHESTRATOR_API = process.env.ORCHESTRATOR_API || 'http://localhost:3020';

/**
 * GET /api/campaigns
 * Fetch campaigns for the current user
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authentication and get user
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

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
    const projectId = searchParams.get('project_id');
    const status = searchParams.get('status');

    // Build query with user isolation
    let query = supabase
      .from('campaigns')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (projectId) {
      query = query.eq('project_id', projectId);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Campaigns fetch error:', error);
      throw error;
    }

    return NextResponse.json({
      success: true,
      campaigns: data || [],
      count: data?.length || 0
    });
  } catch (error: any) {
    // If campaigns table doesn't exist or orchestrator is offline
    if (error.code === '42P01' || error.message?.includes('relation')) {
      return NextResponse.json({
        success: true,
        campaigns: [],
        count: 0,
        note: 'Campaigns feature not yet configured'
      });
    }
    console.error('Campaigns API error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch campaigns' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/campaigns
 * Create a new campaign
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication and get user
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { success: false, error: 'Supabase credentials not configured' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const body = await request.json();

    // Verify project ownership if project_id provided
    if (body.project_id) {
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('id')
        .eq('id', body.project_id)
        .eq('user_id', user.id)
        .single();

      if (projectError || !project) {
        return NextResponse.json(
          { success: false, error: 'Project not found or access denied' },
          { status: 404 }
        );
      }
    }

    // Create campaign with user_id
    const { data, error } = await supabase
      .from('campaigns')
      .insert({
        ...body,
        user_id: user.id
      })
      .select()
      .single();

    if (error) {
      console.error('Campaign create error:', error);
      throw error;
    }

    return NextResponse.json({
      success: true,
      campaign: data,
      message: 'Campaign created successfully'
    }, { status: 201 });
  } catch (error: any) {
    console.error('Campaigns API POST error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create campaign' },
      { status: 500 }
    );
  }
}
