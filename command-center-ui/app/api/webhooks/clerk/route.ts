import { NextRequest, NextResponse } from 'next/server';
import { Webhook } from 'svix';
import { WebhookEvent } from '@clerk/nextjs/server';
import { supabase } from '@/lib/database/supabase-server';

/**
 * Clerk webhook handler for user lifecycle events
 *
 * Events handled:
 * - user.created: Create user in database with trial tier
 * - user.updated: Sync email and tier changes
 * - user.deleted: Delete user (CASCADE deletes all their data)
 *
 * Setup in Clerk Dashboard:
 * 1. Go to Webhooks
 * 2. Add endpoint: https://app.mintydesign.xyz/api/webhooks/clerk
 * 3. Subscribe to: user.created, user.updated, user.deleted
 * 4. Copy signing secret to CLERK_WEBHOOK_SECRET env var
 */
export async function POST(request: NextRequest) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    console.error('[clerk-webhook] Missing CLERK_WEBHOOK_SECRET environment variable');
    return NextResponse.json(
      { error: 'Webhook secret not configured' },
      { status: 500 }
    );
  }

  // Get svix headers for verification
  const svix_id = request.headers.get('svix-id');
  const svix_timestamp = request.headers.get('svix-timestamp');
  const svix_signature = request.headers.get('svix-signature');

  if (!svix_id || !svix_timestamp || !svix_signature) {
    console.error('[clerk-webhook] Missing svix headers');
    return NextResponse.json(
      { error: 'Missing webhook headers' },
      { status: 400 }
    );
  }

  // Get request body
  const body = await request.text();

  // Verify webhook signature
  const wh = new Webhook(WEBHOOK_SECRET);
  let evt: WebhookEvent;

  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error('[clerk-webhook] Invalid signature:', err);
    return NextResponse.json(
      { error: 'Invalid webhook signature' },
      { status: 400 }
    );
  }

  // Handle events
  const eventType = evt.type;
  console.log(`[clerk-webhook] Received event: ${eventType}`);

  try {
    if (eventType === 'user.created') {
      const { id, email_addresses, public_metadata } = evt.data;
      const email = email_addresses?.[0]?.email_address;
      const tier = (public_metadata?.tier as string) || 'trial';

      if (!email) {
        console.error('[clerk-webhook] user.created: No email address');
        return NextResponse.json({ error: 'No email address' }, { status: 400 });
      }

      const { error } = await supabase.from('users').insert({
        clerk_id: id,
        email,
        tier,
        usage_prospects: 0,
        usage_analyses: 0,
        usage_reports: 0,
        usage_outreach: 0,
      });

      if (error) {
        console.error('[clerk-webhook] user.created: Database error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      console.log(`[clerk-webhook] Created user: ${email} (tier: ${tier})`);
    }

    if (eventType === 'user.updated') {
      const { id, email_addresses, public_metadata } = evt.data;
      const email = email_addresses?.[0]?.email_address;
      const tier = public_metadata?.tier as string | undefined;

      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };

      if (email) {
        updateData.email = email;
      }

      if (tier) {
        updateData.tier = tier;
        updateData.tier_updated_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('users')
        .update(updateData)
        .eq('clerk_id', id);

      if (error) {
        console.error('[clerk-webhook] user.updated: Database error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      console.log(`[clerk-webhook] Updated user: ${id} (tier: ${tier || 'unchanged'})`);
    }

    if (eventType === 'user.deleted') {
      const { id } = evt.data;

      if (!id) {
        console.error('[clerk-webhook] user.deleted: No user ID');
        return NextResponse.json({ error: 'No user ID' }, { status: 400 });
      }

      // CASCADE will delete all user's data (projects, leads, etc.)
      const { error } = await supabase.from('users').delete().eq('clerk_id', id);

      if (error) {
        console.error('[clerk-webhook] user.deleted: Database error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      console.log(`[clerk-webhook] Deleted user: ${id}`);
    }

    return NextResponse.json({ received: true, type: eventType });
  } catch (err) {
    console.error('[clerk-webhook] Handler error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
