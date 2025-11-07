import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

/**
 * API Route: Capture Calendly Booking from CTA Section
 *
 * Called when a Calendly meeting is scheduled from the CTA section
 * (bottom of landing page) where the user hasn't filled out the download gate.
 * Creates a new lead record, either anonymous (typical) or with personal data if available.
 *
 * NOTE: Calendly's popup widget does NOT expose invitee name/email in browser events
 * for privacy reasons, so most CTA bookings will be anonymous with only eventId.
 *
 * POST /api/capture-calendly-booking
 * Body: {
 *   eventId: string (required) - Calendly event URI
 *   name?: string (optional) - Usually unavailable from Calendly popup
 *   email?: string (optional) - Usually unavailable from Calendly popup
 *   scheduledAt?: string (optional) - Event start time
 *   source?: string (optional) - Default: 'cta_section' (for analytics)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, eventId, scheduledAt, source = 'cta_section' } = body

    // Validate event ID (always required)
    if (!eventId) {
      return NextResponse.json(
        { error: 'Calendly event ID is required' },
        { status: 400 }
      )
    }

    // Validate email format if provided
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        return NextResponse.json(
          { error: 'Invalid email format' },
          { status: 400 }
        )
      }
    }

    console.log('[API] Capturing Calendly booking from CTA:', {
      name: name || 'anonymous',
      email: email || 'not provided',
      source,
      hasPersonalData: !!(name && email)
    })

    // Check if lead with this email already exists (only if email provided)
    let existingLead = null
    if (email) {
      const { data } = await supabaseServer
        .from('inbound_leads')
        .select('id, calendly_scheduled')
        .eq('email', email)
        .maybeSingle()
      existingLead = data
    }

    // If lead exists, update their Calendly info
    if (existingLead) {
      console.log('[API] Lead exists, updating Calendly info:', existingLead.id)

      const { data: updatedLead, error: updateError } = await supabaseServer
        .from('inbound_leads')
        .update({
          calendly_scheduled: true,
          calendly_event_id: eventId,
          consultation_scheduled_at: scheduledAt || new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', existingLead.id)
        .select()
        .single()

      if (updateError) {
        console.error('[API] Error updating existing lead:', updateError)
        throw updateError
      }

      return NextResponse.json({
        success: true,
        leadId: updatedLead.id,
        message: 'Calendly booking captured (existing lead updated)',
        wasExisting: true
      })
    }

    // Create new lead record (anonymous if no email provided)
    const leadData: any = {
      calendly_scheduled: true,
      calendly_event_id: eventId,
      consultation_scheduled_at: scheduledAt || new Date().toISOString(),
      source, // Clearly labeled: 'cta_section' or 'download_gate'
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    // Add personal data only if available
    if (name) leadData.name = name
    if (email) leadData.email = email

    const { data: newLead, error: insertError } = await supabaseServer
      .from('inbound_leads')
      .insert(leadData)
      .select()
      .single()

    if (insertError) {
      console.error('[API] Error creating lead:', insertError)
      throw insertError
    }

    const isAnonymous = !email
    console.log(`[API] New ${isAnonymous ? 'anonymous' : ''} lead created from CTA booking:`, {
      leadId: newLead.id,
      source: newLead.source,
      hasEmail: !!email
    })

    return NextResponse.json({
      success: true,
      leadId: newLead.id,
      message: isAnonymous
        ? 'Anonymous Calendly booking captured (source labeled as cta_section)'
        : 'Calendly booking captured successfully',
      wasExisting: false,
      isAnonymous
    })

  } catch (error) {
    console.error('[API] Error in capture-calendly-booking route:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to capture Calendly booking',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
