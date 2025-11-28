import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getCurrentUser } from '@/lib/server/quota';

export const dynamic = 'force-dynamic';

const ORCHESTRATOR_API = process.env.ORCHESTRATOR_API || 'http://localhost:3020';

/**
 * POST /api/campaigns/[id]/run
 * Run a campaign immediately - verifies ownership then calls orchestrator
 */
export async function POST(
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

    // Call orchestrator to run campaign
    const response = await fetch(`${ORCHESTRATOR_API}/api/campaigns/${campaignId}/run`, {
      method: 'POST',
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to run campaign' }));
      throw new Error(error.error || error.message || 'Failed to run campaign');
    }

    const data = await response.json();
    return NextResponse.json({
      success: true,
      runId: data.runId || data.run_id || data.id,
      message: data.message || 'Campaign started successfully'
    });
  } catch (error: any) {
    console.error('Campaign run error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to run campaign' },
      { status: 500 }
    );
  }
}
