import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getCurrentUser } from '@/lib/server/quota';

export const dynamic = 'force-dynamic';

/**
 * GET /api/outreach/emails
 * Fetch composed emails for the current user
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

    // Build query - get composed_outreach with actual email columns
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
        email_free_value,
        email_portfolio_building,
        email_problem_first,
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
      console.error('Outreach emails fetch error:', error);
      throw error;
    }

    // Transform individual email columns into array format
    const emails: any[] = [];
    const emailStrategies = [
      { column: 'email_free_value', strategy: 'free-value-delivery' },
      { column: 'email_portfolio_building', strategy: 'portfolio-building' },
      { column: 'email_problem_first', strategy: 'problem-first-urgent' }
    ];

    (data || []).forEach((outreach: any) => {
      emailStrategies.forEach(({ column, strategy }) => {
        const emailData = outreach[column];
        if (emailData) {
          emails.push({
            id: `${outreach.id}-${strategy}`,
            outreach_id: outreach.id,
            lead_id: outreach.lead_id,
            project_id: outreach.project_id,
            company_name: outreach.company_name || 'Unknown',
            website: outreach.url,
            industry: outreach.industry,
            contact_email: outreach.contact_email,
            email_subject: emailData.subject,
            email_body: emailData.body,
            email_strategy: strategy,
            status: outreach.status,
            created_at: outreach.created_at,
            updated_at: outreach.updated_at
          });
        }
      });
    });

    return NextResponse.json({
      success: true,
      emails,
      total: count || 0,
      count: emails.length
    });
  } catch (error: any) {
    console.error('Outreach emails fetch error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch emails' },
      { status: 500 }
    );
  }
}
