import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

interface ActivityFeedItem {
  id: string;
  type: 'prospect_generated' | 'analysis_completed' | 'email_sent' | 'email_replied' | 'social_sent';
  message: string;
  details?: {
    count?: number;
    project_name?: string;
    company_name?: string;
    grade?: string;
    cost?: number;
  };
  timestamp: string;
  color?: 'green' | 'blue' | 'purple' | 'orange' | 'red';
}

export async function GET(request: Request) {
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

    // Parse query params for pagination
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '10', 10)));

    const activities: ActivityFeedItem[] = [];

    // Fetch recent prospects (last 50, then we'll filter top N)
    const { data: prospects, error: prospectsError } = await supabase
      .from('prospects')
      .select('id, company_name, industry, created_at, run_id')
      .order('created_at', { ascending: false })
      .limit(50);

    if (!prospectsError && prospects) {
      // Group by run_id if available, otherwise individual items
      const runGroups = new Map<string, typeof prospects>();

      prospects.forEach(p => {
        if (p.run_id) {
          if (!runGroups.has(p.run_id)) {
            runGroups.set(p.run_id, []);
          }
          runGroups.get(p.run_id)!.push(p);
        } else {
          // Individual prospect
          activities.push({
            id: `prospect-${p.id}`,
            type: 'prospect_generated',
            message: 'Prospect generated',
            details: {
              company_name: p.company_name,
            },
            timestamp: p.created_at,
            color: 'blue'
          });
        }
      });

      // Add grouped prospects
      runGroups.forEach((group, runId) => {
        if (group.length > 0) {
          activities.push({
            id: `prospect-batch-${runId}`,
            type: 'prospect_generated',
            message: `${group.length} prospect${group.length > 1 ? 's' : ''} generated`,
            details: {
              count: group.length,
            },
            timestamp: group[0].created_at,
            color: 'blue'
          });
        }
      });
    }

    // Fetch recent analyzed leads
    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select('id, company_name, website_grade, analyzed_at, analysis_cost')
      .order('analyzed_at', { ascending: false })
      .limit(50);

    if (!leadsError && leads) {
      leads.forEach(lead => {
        activities.push({
          id: `lead-${lead.id}`,
          type: 'analysis_completed',
          message: 'Website analyzed',
          details: {
            company_name: lead.company_name,
            grade: lead.website_grade,
            cost: lead.analysis_cost || undefined
          },
          timestamp: lead.analyzed_at,
          color: lead.website_grade === 'A' || lead.website_grade === 'B' ? 'green' : 'orange'
        });
      });
    }

    // Fetch recent sent emails
    const { data: emails, error: emailsError } = await supabase
      .from('composed_outreach')
      .select('id, company_name, sent_at, status, platform')
      .not('sent_at', 'is', null)
      .order('sent_at', { ascending: false })
      .limit(50);

    if (!emailsError && emails) {
      emails.forEach(email => {
        const isPlatformSocial = email.platform && email.platform !== 'email';
        activities.push({
          id: `email-${email.id}`,
          type: isPlatformSocial ? 'social_sent' : 'email_sent',
          message: isPlatformSocial ? 'Social message sent' : 'Email sent',
          details: {
            company_name: email.company_name,
          },
          timestamp: email.sent_at,
          color: 'purple'
        });
      });
    }

    // Sort all activities by timestamp (most recent first)
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Apply pagination
    const offset = (page - 1) * limit;
    const paginatedActivities = activities.slice(offset, offset + limit);
    const totalActivities = activities.length;
    const totalPages = Math.ceil(totalActivities / limit);
    const hasMore = page < totalPages;

    return NextResponse.json({
      success: true,
      data: paginatedActivities,
      pagination: {
        page,
        limit,
        total: totalActivities,
        total_pages: totalPages,
        has_more: hasMore,
        has_previous: page > 1
      }
    });

  } catch (error: any) {
    console.error('Activity feed error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch activity feed' },
      { status: 500 }
    );
  }
}