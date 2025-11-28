import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getCurrentUser } from '@/lib/server/quota';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // Get current user for data isolation
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

    // Parse query params
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    // Build query with user isolation
    let query = supabase
      .from('projects')
      .select('*')
      .eq('user_id', user.id) // User isolation
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

    if (!projects || projects.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        total: 0
      });
    }

    // Get project IDs
    const projectIds = projects.map(p => p.id);

    // Fetch aggregate data in parallel
    const [
      prospectsData,
      leadsData,
      emailsData
    ] = await Promise.all([
      // Count prospects per project
      supabase
        .from('project_prospects')
        .select('project_id')
        .in('project_id', projectIds),

      // Get leads with grades per project
      supabase
        .from('leads')
        .select('project_id, website_grade, analysis_cost')
        .in('project_id', projectIds)
        .not('project_id', 'is', null),

      // Get emails per project
      supabase
        .from('composed_outreach')
        .select('project_id, generation_cost')
        .in('project_id', projectIds)
        .not('project_id', 'is', null)
    ]);

    // Build aggregate maps
    const prospectCounts: Record<string, number> = {};
    const analyzedCounts: Record<string, number> = {};
    const gradeACounts: Record<string, number> = {};
    const gradeBCounts: Record<string, number> = {};
    const emailCounts: Record<string, number> = {};
    const totalCosts: Record<string, number> = {};

    // Initialize all project IDs with 0
    projectIds.forEach(id => {
      prospectCounts[id] = 0;
      analyzedCounts[id] = 0;
      gradeACounts[id] = 0;
      gradeBCounts[id] = 0;
      emailCounts[id] = 0;
      totalCosts[id] = 0;
    });

    // Count prospects
    if (prospectsData.data) {
      prospectsData.data.forEach(row => {
        prospectCounts[row.project_id] = (prospectCounts[row.project_id] || 0) + 1;
      });
    }

    // Count leads and grades
    if (leadsData.data) {
      leadsData.data.forEach(row => {
        analyzedCounts[row.project_id] = (analyzedCounts[row.project_id] || 0) + 1;

        if (row.website_grade === 'A') {
          gradeACounts[row.project_id] = (gradeACounts[row.project_id] || 0) + 1;
        } else if (row.website_grade === 'B') {
          gradeBCounts[row.project_id] = (gradeBCounts[row.project_id] || 0) + 1;
        }

        // Add analysis cost
        if (row.analysis_cost) {
          totalCosts[row.project_id] = (totalCosts[row.project_id] || 0) + parseFloat(row.analysis_cost);
        }
      });
    }

    // Count emails and add generation costs
    if (emailsData.data) {
      emailsData.data.forEach(row => {
        emailCounts[row.project_id] = (emailCounts[row.project_id] || 0) + 1;

        if (row.generation_cost) {
          totalCosts[row.project_id] = (totalCosts[row.project_id] || 0) + parseFloat(row.generation_cost);
        }
      });
    }

    // Merge aggregate data with projects
    const enrichedProjects = projects.map(project => ({
      ...project,
      prospects_count: prospectCounts[project.id] || 0,
      analyzed_count: analyzedCounts[project.id] || 0,
      grade_a_count: gradeACounts[project.id] || 0,
      grade_b_count: gradeBCounts[project.id] || 0,
      emails_sent_count: emailCounts[project.id] || 0,
      social_messages_count: 0, // TODO: implement when social_outreach data is available
      total_cost: totalCosts[project.id] || 0,
      prospecting_cost: 0, // TODO: sum from prospects.discovery_cost
      analysis_cost: 0, // TODO: separate from total_cost
      outreach_cost: 0, // TODO: separate from total_cost
      budget_limit: project.budget || 0,
      budget_alert_threshold: project.budget_alert_threshold || undefined
    }));

    return NextResponse.json({
      success: true,
      data: enrichedProjects,
      total: enrichedProjects.length
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
    // Get current user for data ownership
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

    // Build project data with user ownership
    const projectData: any = {
      name: name.trim(),
      status: 'active',
      user_id: user.id // Set owner
    };

    if (description) {
      projectData.description = description.trim();
    }

    // Map budget_limit to budget column in database
    if (budget_limit !== undefined && budget_limit > 0) {
      projectData.budget = budget_limit;
    }

    // Note: budget_alert_threshold is not in the database schema, so we skip it

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
