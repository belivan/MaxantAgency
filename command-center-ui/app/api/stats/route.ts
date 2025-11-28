import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getCurrentUser } from '@/lib/server/quota';

export const dynamic = 'force-dynamic';

export async function GET() {
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

    // Fetch prospects stats - filtered by user_id
    const { data: prospectsData, error: prospectsError } = await supabase
      .from('prospects')
      .select('status', { count: 'exact' })
      .eq('user_id', user.id);

    if (prospectsError) throw prospectsError;

    const prospectsByStatus = {
      pending: prospectsData?.filter(p => p.status === 'pending_analysis').length || 0,
      queued: prospectsData?.filter(p => p.status === 'queued').length || 0,
      analyzed: prospectsData?.filter(p => p.status === 'analyzed').length || 0,
      total: prospectsData?.length || 0
    };

    // Fetch leads stats - filtered by user_id
    const { data: leadsData, error: leadsError } = await supabase
      .from('leads')
      .select('website_grade, contact_email', { count: 'exact' })
      .eq('user_id', user.id);

    if (leadsError) throw leadsError;

    const leadsByGrade = {
      A: leadsData?.filter(l => l.website_grade === 'A').length || 0,
      B: leadsData?.filter(l => l.website_grade === 'B').length || 0,
      C: leadsData?.filter(l => l.website_grade === 'C').length || 0,
      D: leadsData?.filter(l => l.website_grade === 'D').length || 0,
      F: leadsData?.filter(l => l.website_grade === 'F').length || 0,
      total: leadsData?.length || 0,
      withEmail: leadsData?.filter(l => l.contact_email).length || 0
    };

    // Fetch composed emails stats - filtered by user_id
    const { data: emailsData, error: emailsError } = await supabase
      .from('composed_outreach')
      .select('status', { count: 'exact' })
      .eq('user_id', user.id);

    if (emailsError) {
      // Table might not exist, that's ok
      console.warn('Composed emails table not found');
    }

    const emailsByStatus = {
      pending: emailsData?.filter(e => e.status === 'pending').length || 0,
      approved: emailsData?.filter(e => e.status === 'approved').length || 0,
      sent: emailsData?.filter(e => e.status === 'sent').length || 0,
      rejected: emailsData?.filter(e => e.status === 'rejected').length || 0,
      total: emailsData?.length || 0
    };

    return NextResponse.json({
      success: true,
      prospects: prospectsByStatus,
      leads: leadsByGrade,
      emails: emailsByStatus
    });
  } catch (error: any) {
    console.error('Stats fetch error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}
