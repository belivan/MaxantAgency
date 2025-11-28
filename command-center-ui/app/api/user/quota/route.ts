import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/server/quota';
import { TRIAL_LIMITS, getQuotaLimits } from '@/lib/constants/quotas';

/**
 * GET /api/user/quota
 * Returns current user's tier, usage, and limits
 */
export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'User not found. Please sign in.' },
        { status: 401 }
      );
    }

    const limits = getQuotaLimits(user.tier);
    const usage = {
      prospects: user.usage_prospects || 0,
      analyses: user.usage_analyses || 0,
      reports: user.usage_reports || 0,
      outreach: user.usage_outreach || 0,
    };

    const remaining = {
      prospects: user.tier === 'full' ? Infinity : Math.max(0, TRIAL_LIMITS.prospects - usage.prospects),
      analyses: user.tier === 'full' ? Infinity : Math.max(0, TRIAL_LIMITS.analyses - usage.analyses),
      reports: user.tier === 'full' ? Infinity : Math.max(0, TRIAL_LIMITS.reports - usage.reports),
      outreach: user.tier === 'full' ? Infinity : Math.max(0, TRIAL_LIMITS.outreach - usage.outreach),
    };

    return NextResponse.json({
      tier: user.tier,
      usage,
      limits: {
        prospects: user.tier === 'full' ? null : limits.prospects,
        analyses: user.tier === 'full' ? null : limits.analyses,
        reports: user.tier === 'full' ? null : limits.reports,
        outreach: user.tier === 'full' ? null : limits.outreach,
      },
      remaining,
    });
  } catch (error) {
    console.error('[api/user/quota] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch quota' },
      { status: 500 }
    );
  }
}
