import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {

    // Parse query params
    const searchParams = request.nextUrl.searchParams;
    const grade = searchParams.get('grade');
    const industry = searchParams.get('industry');
    const hasEmail = searchParams.get('hasEmail');
    const projectId = searchParams.get('project_id');
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // Build query
    let query = supabase
      .from('leads')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (grade) {
      query = query.eq('website_grade', grade);
    }

    if (industry) {
      query = query.ilike('industry', `%${industry}%`);
    }

    if (hasEmail === 'true') {
      query = query.not('contact_email', 'is', null);
    }

    if (projectId) {
      query = query.eq('project_id', projectId);
    }

    const { data, error, count } = await query;

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      leads: data || [],
      total: count || 0,
      limit,
      offset
    });
  } catch (error: any) {
    console.error('Leads fetch error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch leads' },
      { status: 500 }
    );
  }
}
