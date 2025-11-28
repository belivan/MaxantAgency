import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/database/supabase-server';
import { getCurrentUser } from '@/lib/server/quota';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Get current user for data isolation
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse query params
    const searchParams = request.nextUrl.searchParams;
    const grade = searchParams.get('grade');
    const industry = searchParams.get('industry');
    const hasEmail = searchParams.get('hasEmail');
    const projectId = searchParams.get('project_id');
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // Parse sorting params (default to updated_at for most recently analyzed)
    const sortBy = searchParams.get('sort') || 'updated_at';
    const sortOrder = searchParams.get('order') === 'asc';

    // Build query with project name and prospect data joins
    // business_intelligence comes from prospects table (source of truth)
    let query = supabase
      .from('leads')
      .select(`
        *,
        projects(name),
        prospects(
          business_intelligence,
          social_profiles,
          contact_email,
          contact_phone,
          google_rating,
          google_review_count,
          services,
          description
        )
      `, { count: 'exact' })
      .eq('user_id', user.id) // User isolation
      .order(sortBy, { ascending: sortOrder })
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

    // Merge prospect data into lead objects
    // Prospect data takes precedence for business_intelligence, social_profiles, contact info
    const mergedLeads = (data || []).map((lead: any) => {
      const prospect = lead.prospects;

      // If no prospect linked, return lead as-is
      if (!prospect) {
        return lead;
      }

      return {
        ...lead,
        // Prospect data takes precedence (source of truth)
        business_intelligence: prospect.business_intelligence || lead.business_intelligence,
        social_profiles: prospect.social_profiles || lead.social_profiles,
        // Only override contact info if lead doesn't have it
        contact_email: lead.contact_email || prospect.contact_email,
        contact_phone: lead.contact_phone || prospect.contact_phone,
        // Add Google data from prospect
        google_rating: prospect.google_rating,
        google_review_count: prospect.google_review_count,
        // Add services and description from prospect
        services: prospect.services,
        prospect_description: prospect.description,
        // Remove nested prospect object from response
        prospects: undefined
      };
    });

    return NextResponse.json({
      success: true,
      data: mergedLeads,
      leads: mergedLeads,  // Keep for backward compatibility
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
