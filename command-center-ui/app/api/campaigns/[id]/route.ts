import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getCurrentUser } from '@/lib/server/quota';

export const dynamic = 'force-dynamic';

const ORCHESTRATOR_API = process.env.ORCHESTRATOR_API || 'http://localhost:3020';

/**
 * Verify campaign ownership
 */
async function verifyCampaignOwnership(supabase: any, campaignId: string, userId: string) {
  const { data, error } = await supabase
    .from('campaigns')
    .select('id')
    .eq('id', campaignId)
    .eq('user_id', userId)
    .single();

  return !error && data;
}

/**
 * GET /api/campaigns/[id]
 * Get a single campaign by ID
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

    // Fetch campaign with ownership check
    const { data, error } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .eq('user_id', user.id)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { success: false, error: 'Campaign not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      campaign: data
    });
  } catch (error: any) {
    console.error('Campaign GET error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch campaign' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/campaigns/[id]
 * Update a campaign
 */
export async function PATCH(
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
    const body = await request.json();

    // Update campaign with ownership check
    const { data, error } = await supabase
      .from('campaigns')
      .update({
        ...body,
        updated_at: new Date().toISOString()
      })
      .eq('id', campaignId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error || !data) {
      return NextResponse.json(
        { success: false, error: 'Campaign not found or update failed' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      campaign: data,
      message: 'Campaign updated successfully'
    });
  } catch (error: any) {
    console.error('Campaign PATCH error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update campaign' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/campaigns/[id]
 * Delete a campaign
 */
export async function DELETE(
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

    // Delete campaign with ownership check
    const { error } = await supabase
      .from('campaigns')
      .delete()
      .eq('id', campaignId)
      .eq('user_id', user.id);

    if (error) {
      return NextResponse.json(
        { success: false, error: 'Campaign not found or delete failed' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Campaign deleted successfully'
    });
  } catch (error: any) {
    console.error('Campaign DELETE error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete campaign' },
      { status: 500 }
    );
  }
}
