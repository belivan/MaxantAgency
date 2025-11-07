import { NextRequest, NextResponse } from 'next/server'
import { saveInboundLead, type InboundLead } from '@/lib/supabase-client'

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json()
    const { name, email, phone, company, reportId } = body

    // Validate required fields
    if (!name || !email || !reportId) {
      return NextResponse.json(
        { error: 'Missing required fields: name, email, reportId' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Extract IP address and user agent
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    // Extract additional metadata (referrer, utm params, etc.)
    const referer = request.headers.get('referer') || undefined
    const url = new URL(request.url)
    const utmParams = {
      source: url.searchParams.get('utm_source'),
      medium: url.searchParams.get('utm_medium'),
      campaign: url.searchParams.get('utm_campaign'),
      term: url.searchParams.get('utm_term'),
      content: url.searchParams.get('utm_content'),
    }

    // Filter out null utm params
    const filteredUtmParams = Object.fromEntries(
      Object.entries(utmParams).filter(([_, v]) => v !== null)
    )

    // Prepare lead data
    const leadData: Omit<InboundLead, 'id' | 'created_at' | 'updated_at'> = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone?.trim() || undefined,
      company: company?.trim() || undefined,
      report_id: reportId,
      source: 'landing_page',
      download_completed: false,
      ip_address: ip,
      user_agent: userAgent,
      metadata: {
        referer,
        utm: filteredUtmParams,
        timestamp: new Date().toISOString(),
      },
    }

    // Save to database
    const savedLead = await saveInboundLead(leadData)

    // Return success response with lead ID
    return NextResponse.json({
      success: true,
      leadId: savedLead.id,
      message: 'Lead captured successfully',
    })
  } catch (error) {
    console.error('Error in capture-lead API:', error)

    return NextResponse.json(
      {
        error: 'Failed to capture lead',
        message: error instanceof Error ? error.message : 'Unknown error',
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
