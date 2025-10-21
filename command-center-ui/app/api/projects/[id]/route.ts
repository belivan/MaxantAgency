import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
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
    const projectId = params.id;

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: 'Project ID is required' },
        { status: 400 }
      );
    }

    // Fetch project
    const { data: project, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (error) {
      console.error('Project fetch error:', error);
      return NextResponse.json(
        { success: false, error: error.message || 'Failed to fetch project' },
        { status: error.code === 'PGRST116' ? 404 : 500 }
      );
    }

    if (!project) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: project
    });

  } catch (error: any) {
    console.error('Project API error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch project' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
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
    const projectId = params.id;
    const body = await request.json();

    // ICP BRIEF LOCKING: Check if trying to update ICP brief when prospects exist
    if (body.icp_brief !== undefined) {
      const { data: prospects, error: prospectError } = await supabase
        .from('project_prospects')
        .select('id')
        .eq('project_id', projectId)
        .limit(1);

      if (prospectError) {
        console.error('Error checking prospects:', prospectError);
        return NextResponse.json(
          { success: false, error: 'Failed to validate ICP brief update' },
          { status: 500 }
        );
      }

      if (prospects && prospects.length > 0) {
        return NextResponse.json(
          {
            success: false,
            error: 'Cannot modify ICP brief after prospects have been generated',
            locked: true,
            reason: 'ICP brief is locked because this project has existing prospects. Create a new project to use different ICP criteria.'
          },
          { status: 403 }
        );
      }
    }

    // Build update object
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (body.name !== undefined) updateData.name = body.name.trim();
    if (body.description !== undefined) updateData.description = body.description.trim();
    if (body.status !== undefined) updateData.status = body.status;
    if (body.budget !== undefined) updateData.budget = body.budget;
    if (body.client_name !== undefined) updateData.client_name = body.client_name;
    if (body.icp_brief !== undefined) updateData.icp_brief = body.icp_brief;
    if (body.analysis_config !== undefined) updateData.analysis_config = body.analysis_config;
    if (body.outreach_config !== undefined) updateData.outreach_config = body.outreach_config;

    // Update project
    const { data: project, error } = await supabase
      .from('projects')
      .update(updateData)
      .eq('id', projectId)
      .select()
      .single();

    if (error) {
      console.error('Project update error:', error);
      return NextResponse.json(
        { success: false, error: error.message || 'Failed to update project' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: project,
      message: 'Project updated successfully'
    });

  } catch (error: any) {
    console.error('Project PATCH error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update project' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
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
    const projectId = params.id;

    // Delete project
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId);

    if (error) {
      console.error('Project delete error:', error);
      return NextResponse.json(
        { success: false, error: error.message || 'Failed to delete project' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Project deleted successfully'
    });

  } catch (error: any) {
    console.error('Project DELETE error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete project' },
      { status: 500 }
    );
  }
}
