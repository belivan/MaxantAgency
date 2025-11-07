import { NextRequest, NextResponse } from 'next/server'
import { markCalendlyScheduledServer } from '@/lib/supabase-server'

/**
 * API Route: Update Calendly Status
 *
 * Called when a Calendly meeting is scheduled to update the lead record
 * in the database. Uses server-side Supabase client with service role key.
 *
 * POST /api/update-calendly
 * Body: { leadId: string, eventId: string, scheduledAt?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { leadId, eventId, scheduledAt } = body

    // Validate required fields
    if (!leadId) {
      return NextResponse.json(
        { error: 'leadId is required' },
        { status: 400 }
      )
    }

    if (!eventId) {
      return NextResponse.json(
        { error: 'eventId is required' },
        { status: 400 }
      )
    }

    // Validate leadId is a valid UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(leadId)) {
      return NextResponse.json(
        { error: 'Invalid leadId format. Must be a valid UUID.' },
        { status: 400 }
      )
    }

    console.log('[API] Updating Calendly status:', { leadId, eventId, scheduledAt })

    // Update database using server-side client
    const data = await markCalendlyScheduledServer(leadId, eventId, scheduledAt)

    return NextResponse.json({
      success: true,
      data,
      message: 'Calendly status updated successfully'
    })

  } catch (error) {
    console.error('[API] Error in update-calendly route:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update Calendly status',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
