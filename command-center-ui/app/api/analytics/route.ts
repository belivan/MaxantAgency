import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getCurrentUser } from '@/lib/server/quota';

export const dynamic = 'force-dynamic';

export async function GET() {
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

    // Get user's projects first
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('id')
      .eq('user_id', user.id);

    if (projectsError) {
      console.error('Projects fetch error:', projectsError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch projects' },
        { status: 500 }
      );
    }

    const projectIds = projects?.map(p => p.id) || [];

    // If no projects, return empty data
    if (projectIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          stats: {
            total_cost: 0,
            total_prospects: 0,
            total_leads: 0,
            qualified_leads: 0,
            contacted: 0,
            cost_per_lead: 0,
            conversion_rate: 0
          },
          cost_breakdown: [],
          funnel: {
            prospects: 0,
            analyzed: 0,
            leads: 0,
            qualified: 0,
            contacted: 0
          }
        }
      });
    }

    // Fetch data for user's projects in parallel
    const [
      prospectsData,
      leadsData,
      outreachData
    ] = await Promise.all([
      // Count prospects via project_prospects junction table
      supabase
        .from('project_prospects')
        .select('id, project_id')
        .in('project_id', projectIds),

      // Get leads for user's projects
      supabase
        .from('leads')
        .select('id, project_id, website_grade, analysis_cost')
        .in('project_id', projectIds),

      // Get outreach for user's projects
      supabase
        .from('composed_outreach')
        .select('id, project_id, generation_cost')
        .in('project_id', projectIds)
    ]);

    // Calculate totals
    const total_prospects = prospectsData.data?.length || 0;
    const total_leads = leadsData.data?.length || 0;
    const contacted = outreachData.data?.length || 0;

    // Count qualified leads (A or B grade)
    const qualified_leads = leadsData.data?.filter(
      (l: any) => l.website_grade === 'A' || l.website_grade === 'B'
    ).length || 0;

    // Calculate costs
    const analysis_cost = leadsData.data?.reduce(
      (sum: number, l: any) => sum + (parseFloat(l.analysis_cost) || 0),
      0
    ) || 0;

    const outreach_cost = outreachData.data?.reduce(
      (sum: number, o: any) => sum + (parseFloat(o.generation_cost) || 0),
      0
    ) || 0;

    const total_cost = analysis_cost + outreach_cost;

    // Build response
    return NextResponse.json({
      success: true,
      data: {
        stats: {
          total_cost,
          total_prospects,
          total_leads,
          qualified_leads,
          contacted,
          cost_per_lead: total_leads > 0 ? total_cost / total_leads : 0,
          conversion_rate: total_prospects > 0 ? (total_leads / total_prospects) * 100 : 0
        },
        cost_breakdown: [], // Empty for now - can add weekly breakdown later
        funnel: {
          prospects: total_prospects,
          analyzed: total_leads,
          leads: total_leads,
          qualified: qualified_leads,
          contacted
        }
      }
    });

  } catch (error: any) {
    console.error('Analytics API error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}
