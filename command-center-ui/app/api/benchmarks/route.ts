import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/database/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Parse query params
    const searchParams = request.nextUrl.searchParams;
    const industry = searchParams.get('industry');
    const tier = searchParams.get('tier');
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // Build query - fetch leads that are marked as benchmarks
    let query = supabase
      .from('leads')
      .select('id, company_name, url, industry, overall_score, website_grade, benchmark_tier, analyzed_at', { count: 'exact' })
      .not('benchmark_tier', 'is', null)
      .order('overall_score', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (industry) {
      query = query.ilike('industry', `%${industry}%`);
    }

    if (tier) {
      query = query.eq('benchmark_tier', tier);
    }

    const { data, error, count } = await query;

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      data: data || [],
      total: count || 0,
      limit,
      offset
    });
  } catch (error: any) {
    console.error('Benchmarks fetch error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch benchmarks' },
      { status: 500 }
    );
  }
}
