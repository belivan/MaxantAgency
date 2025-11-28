import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/database/supabase-server';
import { getCurrentUser } from '@/lib/server/quota';

export const dynamic = 'force-dynamic';

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

    // Parse query params
    const searchParams = request.nextUrl.searchParams;
    const projectId = searchParams.get('project_id');
    const format = searchParams.get('format'); // html, markdown
    const grade = searchParams.get('grade');
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // Parse sorting params
    const sortBy = searchParams.get('sort') || 'generated_at';
    const sortOrder = searchParams.get('order') === 'asc';

    // Build query with lead join - filter by user_id for security
    let query = supabase
      .from('reports')
      .select(`
        *,
        leads(company_name, url, website_grade, overall_score),
        projects(name)
      `, { count: 'exact' })
      .eq('user_id', user.id)  // Filter by user_id for security
      .order(sortBy, { ascending: sortOrder })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (projectId) {
      query = query.eq('project_id', projectId);
    }

    if (format) {
      query = query.eq('format', format);
    }

    if (grade) {
      query = query.eq('website_grade', grade);
    }

    const { data, error, count } = await query;

    if (error) {
      throw error;
    }

    // Transform data to flatten joins
    const reports = (data || []).map((report: any) => ({
      ...report,
      company_name: report.company_name || report.leads?.company_name,
      website_url: report.website_url || report.leads?.url,
      website_grade: report.website_grade || report.leads?.website_grade,
      overall_score: report.overall_score || report.leads?.overall_score,
      project_name: report.projects?.name,
      // Remove nested objects
      leads: undefined,
      projects: undefined
    }));

    return NextResponse.json({
      success: true,
      data: reports,
      reports, // Keep for backward compatibility
      total: count || 0,
      limit,
      offset
    });
  } catch (error: any) {
    console.error('Reports fetch error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch reports' },
      { status: 500 }
    );
  }
}
