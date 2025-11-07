import { NextRequest, NextResponse } from 'next/server'
import { markReportRequested } from '@/lib/supabase-client'

/**
 * POST /api/mark-report-requested
 *
 * Marks a lead as having requested the full report (for email delivery)
 *
 * Request body: { leadId: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { leadId } = body

    if (!leadId || typeof leadId !== 'string') {
      return NextResponse.json(
        { error: 'Valid lead ID is required' },
        { status: 400 }
      )
    }

    console.log('[Mark Report Requested] Updating lead:', leadId)

    // Mark report as requested in database
    await markReportRequested(leadId)

    console.log('[Mark Report Requested] ✅ Successfully marked report as requested')

    return NextResponse.json({
      success: true,
      message: 'Report marked as requested'
    })
  } catch (error) {
    console.error('[Mark Report Requested] Error:', error)

    return NextResponse.json(
      {
        error: 'Failed to mark report as requested',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
