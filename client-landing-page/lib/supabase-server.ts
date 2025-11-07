import { createClient } from '@supabase/supabase-js'

/**
 * Server-side Supabase client with service role key
 *
 * IMPORTANT: This client has full database access and bypasses Row Level Security (RLS).
 * Only use this in:
 * - API routes (server-side only)
 * - Server Components
 * - Server Actions
 *
 * NEVER expose this client to the browser!
 */

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY

if (!supabaseUrl) {
  throw new Error('Missing SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL environment variable')
}

if (!supabaseServiceKey) {
  throw new Error(
    'Missing SUPABASE_SERVICE_KEY environment variable. ' +
    'This is required for server-side database operations. ' +
    'Get your service role key from: https://supabase.com/dashboard/project/_/settings/api'
  )
}

// Create server-side Supabase client with service role key
export const supabaseServer = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

/**
 * Update lead record with Calendly scheduling information
 * Server-side version with service role key (bypasses RLS)
 */
export async function markCalendlyScheduledServer(
  leadId: string,
  eventId: string,
  scheduledAt?: string
) {
  console.log('[Server] Updating Calendly status for lead:', leadId)

  const { data, error } = await supabaseServer
    .from('inbound_leads')
    .update({
      calendly_scheduled: true,
      calendly_event_id: eventId,
      consultation_scheduled_at: scheduledAt || new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', leadId)
    .select()
    .single()

  if (error) {
    console.error('[Server] Error updating Calendly status:', {
      error,
      errorMessage: error.message,
      errorDetails: error.details,
      errorHint: error.hint,
      errorCode: error.code,
      leadId,
      eventId,
      scheduledAt,
      timestamp: new Date().toISOString()
    })
    throw error
  }

  console.log('[Server] Successfully updated Calendly status:', data.id)
  return data
}
