/**
 * API Route: GET /api/analysis/stats
 * Returns analysis statistics for the dashboard
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabase } from '@/lib/database/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse query params
    const searchParams = request.nextUrl.searchParams;
    const projectId = searchParams.get('project_id');

    // Build base query
    let query = supabase.from('leads').select('website_grade, overall_score, analysis_cost');

    // Filter by project if specified
    if (projectId) {
      query = query.eq('project_id', projectId);
    }

    const { data: leads, error } = await query;

    if (error) {
      throw error;
    }

    if (!leads || leads.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          total_analyzed: 0,
          average_score: 0,
          average_grade: 'N/A',
          hot_leads: 0,
          warm_leads: 0,
          cold_leads: 0,
          total_cost: 0
        }
      });
    }

    // Calculate statistics
    const total_analyzed = leads.length;
    const average_score = Math.round(
      leads.reduce((sum, lead) => sum + (lead.overall_score || 0), 0) / total_analyzed
    );

    // Calculate grade distribution
    const gradeCounts: Record<string, number> = {};
    let hot_leads = 0;
    let warm_leads = 0;
    let cold_leads = 0;

    leads.forEach((lead) => {
      const grade = lead.website_grade?.toUpperCase();
      if (grade) {
        gradeCounts[grade] = (gradeCounts[grade] || 0) + 1;

        if (grade === 'A' || grade === 'B') {
          hot_leads++;
        } else if (grade === 'C') {
          warm_leads++;
        } else if (grade === 'D' || grade === 'F') {
          cold_leads++;
        }
      }
    });

    // Find most common grade
    const average_grade = Object.entries(gradeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

    // Calculate total cost
    const total_cost = leads.reduce((sum, lead) => sum + (lead.analysis_cost || 0), 0);

    return NextResponse.json({
      success: true,
      data: {
        total_analyzed,
        average_score,
        average_grade,
        hot_leads,
        warm_leads,
        cold_leads,
        total_cost: Number(total_cost.toFixed(4))
      }
    });
  } catch (error: any) {
    console.error('[API] Error fetching analysis stats:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch analysis stats'
      },
      { status: 500 }
    );
  }
}
