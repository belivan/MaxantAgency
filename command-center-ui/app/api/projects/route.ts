import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
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

    // Parse query params
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    // Build query
    let query = supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });

    // Apply status filter if provided
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data: projects, error } = await query;

    if (error) {
      console.error('Projects fetch error:', error);
      return NextResponse.json(
        { success: false, error: error.message || 'Failed to fetch projects' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: projects || [],
      total: projects?.length || 0
    });

  } catch (error: any) {
    console.error('Projects API error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch projects' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
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

    // Parse request body
    const body = await request.json();
    const { name, description, budget_limit, budget_alert_threshold, icp_brief, analysis_config, outreach_config } = body;

    // Validate required fields
    if (!name || name.trim().length < 3) {
      return NextResponse.json(
        { success: false, error: 'Project name must be at least 3 characters' },
        { status: 400 }
      );
    }

    // Build project data
    const projectData: any = {
      name: name.trim(),
      status: 'active'
    };

    if (description) {
      projectData.description = description.trim();
    }

    // Map budget_limit to budget column in database
    if (budget_limit !== undefined && budget_limit > 0) {
      projectData.budget = budget_limit;
    }

    // Include JSONB config fields if provided
    if (icp_brief) {
      projectData.icp_brief = icp_brief;
    }

    if (analysis_config) {
      projectData.analysis_config = analysis_config;
    }

    if (outreach_config) {
      projectData.outreach_config = outreach_config;
    }

    // Insert project into database
    const { data: project, error } = await supabase
      .from('projects')
      .insert(projectData)
      .select()
      .single();

    if (error) {
      console.error('Project creation error:', error);
      return NextResponse.json(
        { success: false, error: error.message || 'Failed to create project' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: project,
      message: 'Project created successfully'
    }, { status: 201 });

  } catch (error: any) {
    console.error('Projects API POST error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create project' },
      { status: 500 }
    );
  }
}
