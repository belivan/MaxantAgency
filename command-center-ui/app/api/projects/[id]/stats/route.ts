import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
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
    const { id: projectId } = await params;

    // Count prospects for this project
    const { count: prospectsCount } = await supabase
      .from('project_prospects')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', projectId);

    // Count leads for this project
    const { count: leadsCount } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', projectId);

    // Count emails for this project
    const { count: emailsCount } = await supabase
      .from('composed_outreach')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', projectId);

    // Get grade distribution for leads
    const { data: gradeData } = await supabase
      .from('leads')
      .select('grade')
      .eq('project_id', projectId);

    const gradeDistribution = {
      A: gradeData?.filter(l => l.grade === 'A').length || 0,
      B: gradeData?.filter(l => l.grade === 'B').length || 0,
      C: gradeData?.filter(l => l.grade === 'C').length || 0,
      D: gradeData?.filter(l => l.grade === 'D').length || 0,
      F: gradeData?.filter(l => l.grade === 'F').length || 0
    };

    // Get campaigns for this project
    const { count: campaignsCount } = await supabase
      .from('campaigns')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', projectId);

    return NextResponse.json({
      success: true,
      data: {
        prospects_count: prospectsCount || 0,
        leads_count: leadsCount || 0,
        emails_count: emailsCount || 0,
        campaigns_count: campaignsCount || 0,
        grade_distribution: gradeDistribution
      }
    });

  } catch (error: any) {
    console.error('Project stats API error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch project stats' },
      { status: 500 }
    );
  }
}
