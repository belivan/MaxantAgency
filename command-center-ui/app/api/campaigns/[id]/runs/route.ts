import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getCurrentUser } from '@/lib/server/quota';

export const dynamic = 'force-dynamic';

/**
 * GET /api/campaigns/[id]/runs
 * Get campaign run history - verifies ownership
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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
    const { id: campaignId } = await params;

    // Verify campaign ownership
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('id')
      .eq('id', campaignId)
      .eq('user_id', user.id)
      .single();

    if (campaignError || !campaign) {
      return NextResponse.json(
        { success: false, error: 'Campaign not found or access denied' },
        { status: 404 }
      );
    }

    // Get campaign runs
    const { data: runs, error: runsError } = await supabase
      .from('campaign_runs')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('started_at', { ascending: false });

    if (runsError) {
      // Table might not exist yet
      if (runsError.code === '42P01') {
        return NextResponse.json({
          success: true,
          runs: []
        });
      }
      throw runsError;
    }

    return NextResponse.json({
      success: true,
      runs: runs || []
    });
  } catch (error: any) {
    console.error('Campaign runs fetch error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch campaign runs' },
      { status: 500 }
    );
  }
}
