import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getCurrentUser } from '@/lib/server/quota';

export const dynamic = 'force-dynamic';

/**
 * GET /api/outreach/social
 * Fetch composed social messages for the current user
 * Query params: project_id, limit, offset
 */
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

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { success: false, error: 'Supabase credentials not configured' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const searchParams = request.nextUrl.searchParams;
    const projectId = searchParams.get('project_id');
    const limit = parseInt(searchParams.get('limit') || '500', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // Build query - get composed_outreach with actual social columns
    let query = supabase
      .from('composed_outreach')
      .select(`
        id,
        lead_id,
        project_id,
        company_name,
        url,
        industry,
        contact_email,
        instagram_free_value,
        instagram_portfolio_building,
        instagram_problem_first,
        instagram_profile_url,
        linkedin_free_value,
        linkedin_portfolio_building,
        linkedin_problem_first,
        linkedin_profile_url,
        facebook_free_value,
        facebook_portfolio_building,
        facebook_problem_first,
        facebook_profile_url,
        status,
        created_at,
        updated_at
      `, { count: 'exact' })
      .eq('user_id', user.id)  // Filter by user_id for security
      .order('created_at', { ascending: false });

    if (projectId) {
      query = query.eq('project_id', projectId);
    }

    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('Outreach social fetch error:', error);
      throw error;
    }

    // Transform individual social columns into array format
    const messages: any[] = [];
    const socialStrategies = [
      // Instagram
      { column: 'instagram_free_value', platform: 'instagram', strategy: 'free-value-delivery', profileColumn: 'instagram_profile_url' },
      { column: 'instagram_portfolio_building', platform: 'instagram', strategy: 'portfolio-building', profileColumn: 'instagram_profile_url' },
      { column: 'instagram_problem_first', platform: 'instagram', strategy: 'problem-first-urgent', profileColumn: 'instagram_profile_url' },
      // LinkedIn
      { column: 'linkedin_free_value', platform: 'linkedin', strategy: 'free-value-delivery', profileColumn: 'linkedin_profile_url' },
      { column: 'linkedin_portfolio_building', platform: 'linkedin', strategy: 'portfolio-building', profileColumn: 'linkedin_profile_url' },
      { column: 'linkedin_problem_first', platform: 'linkedin', strategy: 'problem-first-urgent', profileColumn: 'linkedin_profile_url' },
      // Facebook
      { column: 'facebook_free_value', platform: 'facebook', strategy: 'free-value-delivery', profileColumn: 'facebook_profile_url' },
      { column: 'facebook_portfolio_building', platform: 'facebook', strategy: 'portfolio-building', profileColumn: 'facebook_profile_url' },
      { column: 'facebook_problem_first', platform: 'facebook', strategy: 'problem-first-urgent', profileColumn: 'facebook_profile_url' }
    ];

    (data || []).forEach((outreach: any) => {
      socialStrategies.forEach(({ column, platform, strategy, profileColumn }) => {
        const messageBody = outreach[column];
        if (messageBody) {
          messages.push({
            id: `${outreach.id}-${platform}-${strategy}`,
            outreach_id: outreach.id,
            lead_id: outreach.lead_id,
            project_id: outreach.project_id,
            company_name: outreach.company_name || 'Unknown',
            website: outreach.url,
            industry: outreach.industry,
            contact_email: outreach.contact_email,
            platform,
            message_body: messageBody,
            strategy,
            profile_url: outreach[profileColumn],
            character_count: messageBody?.length,
            status: outreach.status,
            created_at: outreach.created_at,
            updated_at: outreach.updated_at
          });
        }
      });
    });

    return NextResponse.json({
      success: true,
      messages,
      total: count || 0,
      count: messages.length
    });
  } catch (error: any) {
    console.error('Outreach social fetch error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch social messages' },
      { status: 500 }
    );
  }
}
