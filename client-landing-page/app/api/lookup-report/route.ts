import { NextRequest, NextResponse } from 'next/server'
import { findReportByCompanyName, findReportByEmail } from '@/lib/supabase-client'
import { transformDatabaseReport, isValidDatabaseReport } from '@/lib/report-transformer'

/**
 * POST /api/lookup-report
 *
 * Search for a report by company name or email address
 *
 * Request body: { query: string }
 *
 * Response:
 * - 200: { success: true, data: MockReport }
 * - 404: { success: false, error: "No report found..." }
 * - 400: { success: false, error: "Invalid request" }
 * - 500: { success: false, error: "Server error", details: string }
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json()
    const { query } = body

    // Validate query parameter
    if (!query || typeof query !== 'string' || !query.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: 'Please enter your company name or email address'
        },
        { status: 400 }
      )
    }

    const trimmedQuery = query.trim()

    console.log('[Report Lookup] Searching for:', trimmedQuery)

    // Detect if query is an email (simple regex check)
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedQuery)

    let reportData = null

    if (isEmail) {
      // Search by email via inbound_leads table
      console.log('[Report Lookup] Searching by email...')
      reportData = await findReportByEmail(trimmedQuery)
    } else {
      // Search by company name
      console.log('[Report Lookup] Searching by company name...')
      reportData = await findReportByCompanyName(trimmedQuery)
    }

    // Report not found
    if (!reportData) {
      console.log('[Report Lookup] No report found for query:', trimmedQuery)
      return NextResponse.json(
        {
          success: false,
          error: 'No report found. Please check your company name or email address, or contact us for assistance.'
        },
        { status: 404 }
      )
    }

    // Validate report data structure
    if (!isValidDatabaseReport(reportData)) {
      console.error('[Report Lookup] Invalid report data structure:', reportData)
      return NextResponse.json(
        {
          success: false,
          error: 'Report data is incomplete. Please contact support.',
          details: 'Invalid report structure'
        },
        { status: 500 }
      )
    }

    console.log('[Report Lookup] Found report:', reportData.company_name, '(ID:', reportData.id, ')')

    // Transform database report to MockReport format
    const transformedReport = transformDatabaseReport(reportData)

    // Return successful response
    return NextResponse.json({
      success: true,
      data: transformedReport
    })

  } catch (error) {
    console.error('[Report Lookup] Error:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'An error occurred while searching for your report. Please try again.',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Handle OPTIONS for CORS preflight
export async function OPTIONS() {
  return NextResponse.json(
    {},
    {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    }
  )
}
