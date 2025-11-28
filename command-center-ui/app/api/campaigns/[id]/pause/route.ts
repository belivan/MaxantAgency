import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getCurrentUser } from '@/lib/server/quota';

export const dynamic = 'force-dynamic';

const ORCHESTRATOR_API = process.env.ORCHESTRATOR_API || 'http://localhost:3020';

/**
 * PUT /api/campaigns/[id]/pause
 * Pause a campaign - verifies ownership then calls orchestrator
 */
export async function PUT(
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

    // Verify campaign ownership and update status
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .update({ status: 'paused', updated_at: new Date().toISOString() })
      .eq('id', campaignId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (campaignError || !campaign) {
      return NextResponse.json(
        { success: false, error: 'Campaign not found or access denied' },
        { status: 404 }
      );
    }

    // Optionally notify orchestrator about the pause
    try {
      await fetch(`${ORCHESTRATOR_API}/api/campaigns/${campaignId}/pause`, {
        method: 'PUT',
      });
    } catch {
      // Orchestrator notification is optional
    }

    return NextResponse.json({
      success: true,
      campaign,
      message: 'Campaign paused successfully'
    });
  } catch (error: any) {
    console.error('Campaign pause error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to pause campaign' },
      { status: 500 }
    );
  }
}
