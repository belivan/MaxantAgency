import { NextRequest, NextResponse } from 'next/server'
import { submitComparisonRequest, type ComparisonRequestData } from '@/lib/supabase-client'

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json()
    const {
      website_url,
      company_name,
      email,
      industry,
      business_type,
      benchmark_preference,
      competitor_url,
      phone_number,
      additional_notes,
    } = body

    // Validate required fields
    if (!website_url || !company_name || !email || !benchmark_preference) {
      return NextResponse.json(
        {
          error: 'Missing required fields',
          required: ['website_url', 'company_name', 'email', 'benchmark_preference'],
        },
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

    // Validate URL format
    const urlRegex = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/
    if (!urlRegex.test(website_url)) {
      return NextResponse.json(
        { error: 'Invalid website URL format' },
        { status: 400 }
      )
    }

    // Validate benchmark preference
    if (!['auto', 'manual'].includes(benchmark_preference)) {
      return NextResponse.json(
        { error: 'Invalid benchmark_preference. Must be "auto" or "manual"' },
        { status: 400 }
      )
    }

    // If manual benchmark, competitor_url is required
    if (benchmark_preference === 'manual' && !competitor_url) {
      return NextResponse.json(
        { error: 'competitor_url is required when benchmark_preference is "manual"' },
        { status: 400 }
      )
    }

    // Validate competitor URL if provided
    if (competitor_url && !urlRegex.test(competitor_url)) {
      return NextResponse.json(
        { error: 'Invalid competitor URL format' },
        { status: 400 }
      )
    }

    // Normalize URLs (add https:// if missing)
    const normalizeUrl = (url: string) => {
      const trimmed = url.trim()
      if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
        return `https://${trimmed}`
      }
      return trimmed
    }

    // Prepare comparison request data
    const requestData: ComparisonRequestData = {
      website_url: normalizeUrl(website_url),
      company_name: company_name.trim(),
      email: email.trim().toLowerCase(),
      industry: industry?.trim() || undefined,
      benchmark_preference: benchmark_preference as 'auto' | 'manual',
      competitor_url: competitor_url ? normalizeUrl(competitor_url) : undefined,
      phone_number: phone_number?.trim() || undefined,
      additional_notes: additional_notes?.trim() || undefined,
    }

    // Save to database
    const savedRequest = await submitComparisonRequest(requestData)

    // Return success response with request ID
    return NextResponse.json({
      success: true,
      request_id: savedRequest.id,
      message: 'Comparison request submitted successfully. We will email you within 24 hours with your results.',
    })
  } catch (error) {
    console.error('Error in request-comparison API:', error)

    return NextResponse.json(
      {
        error: 'Failed to submit comparison request',
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
