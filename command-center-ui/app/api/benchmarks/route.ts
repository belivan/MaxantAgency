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
    const industry = searchParams.get('industry');
    const tier = searchParams.get('tier');
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // Build query - fetch from dedicated benchmarks table
    let query = supabase
      .from('benchmarks')
      .select('id, company_name, website_url, industry, overall_score, overall_grade, benchmark_tier, analyzed_at', { count: 'exact' })
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

    // Map benchmarks table fields to UI expected format
    const mappedData = (data || []).map(benchmark => ({
      id: benchmark.id,
      company_name: benchmark.company_name,
      url: benchmark.website_url,
      industry: benchmark.industry,
      overall_score: benchmark.overall_score,
      website_grade: benchmark.overall_grade,
      benchmark_tier: benchmark.benchmark_tier,
      analyzed_at: benchmark.analyzed_at
    }));

    return NextResponse.json({
      success: true,
      data: mappedData,
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
