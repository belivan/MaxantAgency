import { auth, clerkClient } from '@clerk/nextjs/server';
import { supabase } from '@/lib/database/supabase-server';
import { TRIAL_LIMITS, QuotaType, UserTier } from '@/lib/constants/quotas';

export interface User {
  id: string;
  clerk_id: string;
  email: string;
  tier: UserTier;
  usage_prospects: number;
  usage_analyses: number;
  usage_reports: number;
  usage_outreach: number;
}

export interface QuotaCheckResult {
  allowed: boolean;
  user: User | null;
  remaining: number;
  limit: number;
  current: number;
  error?: string;
}

/**
 * Get the current user from Clerk auth and database.
 * Auto-creates user in database if they exist in Clerk but not in our DB
 * (handles local dev where webhooks don't fire)
 */
export async function getCurrentUser(): Promise<User | null> {
  const { userId: clerkId } = await auth();
  if (!clerkId) return null;

  // Try to find existing user
  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('clerk_id', clerkId)
    .single();

  if (user) {
    return user as User;
  }

  // User not in database - auto-create from Clerk data (handles local dev)
  console.log('[quota] User not in database, auto-creating from Clerk:', clerkId);

  try {
    const client = await clerkClient();
    const clerkUser = await client.users.getUser(clerkId);
    const email = clerkUser.emailAddresses[0]?.emailAddress;

    if (!email) {
      console.error('[quota] Clerk user has no email:', clerkId);
      return null;
    }

    // Check if user exists by email (handles owner account with placeholder clerk_id)
    const { data: existingByEmail } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (existingByEmail) {
      // Update existing user's clerk_id
      const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update({ clerk_id: clerkId, updated_at: new Date().toISOString() })
        .eq('email', email)
        .select()
        .single();

      if (updateError) {
        console.error('[quota] Failed to update clerk_id:', updateError);
        return null;
      }

      console.log('[quota] Updated clerk_id for existing user:', email);
      return updatedUser as User;
    }

    // Create new user with trial tier
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert({
        clerk_id: clerkId,
        email,
        tier: 'trial',
        usage_prospects: 0,
        usage_analyses: 0,
        usage_reports: 0,
        usage_outreach: 0,
      })
      .select()
      .single();

    if (createError) {
      console.error('[quota] Failed to auto-create user:', createError);
      return null;
    }

    console.log('[quota] Auto-created user:', email);
    return newUser as User;
  } catch (err) {
    console.error('[quota] Failed to fetch Clerk user:', err);
    return null;
  }
}

/**
 * Check if user has quota available for an action
 */
export async function checkQuota(
  quotaType: QuotaType,
  count: number = 1
): Promise<QuotaCheckResult> {
  const user = await getCurrentUser();

  if (!user) {
    return {
      allowed: false,
      user: null,
      remaining: 0,
      limit: 0,
      current: 0,
      error: 'User not found. Please sign in.',
    };
  }

  // Full tier has no limits
  if (user.tier === 'full') {
    return {
      allowed: true,
      user,
      remaining: Infinity,
      limit: Infinity,
      current: user[`usage_${quotaType}` as keyof User] as number,
    };
  }

  const currentUsage = user[`usage_${quotaType}` as keyof User] as number || 0;
  const limit = TRIAL_LIMITS[quotaType];
  const remaining = Math.max(0, limit - currentUsage);

  if (currentUsage + count > limit) {
    return {
      allowed: false,
      user,
      remaining,
      limit,
      current: currentUsage,
      error: `Trial limit reached. You have used ${currentUsage}/${limit} ${quotaType}. Upgrade to continue.`,
    };
  }

  return {
    allowed: true,
    user,
    remaining: remaining - count,
    limit,
    current: currentUsage,
  };
}

/**
 * Atomically increment usage using database function
 * This prevents race conditions with concurrent requests
 */
export async function incrementUsage(
  userId: string,
  quotaType: QuotaType,
  count: number = 1
): Promise<{ success: boolean; newUsage?: number; remaining?: number; error?: string }> {
  const { data, error } = await supabase.rpc('increment_usage_atomic', {
    p_user_id: userId,
    p_quota_type: quotaType,
    p_count: count,
  });

  if (error) {
    console.error('[quota] Failed to increment usage:', error);
    return { success: false, error: error.message };
  }

  if (!data?.success) {
    return { success: false, error: data?.error || 'Unknown error' };
  }

  return {
    success: true,
    newUsage: data.new_usage,
    remaining: data.remaining,
  };
}

/**
 * Get user's current usage stats
 */
export async function getUserUsage(userId: string): Promise<{
  prospects: number;
  analyses: number;
  reports: number;
  outreach: number;
} | null> {
  const { data, error } = await supabase
    .from('users')
    .select('usage_prospects, usage_analyses, usage_reports, usage_outreach')
    .eq('id', userId)
    .single();

  if (error || !data) return null;

  return {
    prospects: data.usage_prospects || 0,
    analyses: data.usage_analyses || 0,
    reports: data.usage_reports || 0,
    outreach: data.usage_outreach || 0,
  };
}

/**
 * Create or update user in database (called from webhook)
 */
export async function upsertUser(
  clerkId: string,
  email: string,
  tier: UserTier = 'trial'
): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .upsert(
      {
        clerk_id: clerkId,
        email,
        tier,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'clerk_id',
      }
    )
    .select()
    .single();

  if (error) {
    console.error('[quota] Failed to upsert user:', error);
    return null;
  }

  return data as User;
}

/**
 * Delete user from database (called from webhook)
 */
export async function deleteUser(clerkId: string): Promise<boolean> {
  const { error } = await supabase.from('users').delete().eq('clerk_id', clerkId);

  if (error) {
    console.error('[quota] Failed to delete user:', error);
    return false;
  }

  return true;
}
