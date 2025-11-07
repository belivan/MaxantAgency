import { createClient } from '@supabase/supabase-js'

// Use server-side variables if available (API routes), otherwise use client-side variables
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseKey)

// Type for inbound leads
export interface InboundLead {
  id?: string
  name: string
  email: string
  phone?: string
  company?: string
  report_id: string
  source?: string
  download_completed?: boolean
  calendly_scheduled?: boolean
  calendly_event_id?: string
  consultation_scheduled_at?: string
  ip_address?: string
  user_agent?: string
  metadata?: Record<string, any>
  created_at?: string
  updated_at?: string
}

// Save inbound lead to database
export async function saveInboundLead(lead: Omit<InboundLead, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('inbound_leads')
    .insert({
      ...lead,
      source: lead.source || 'landing_page',
      download_completed: false,
    })
    .select()
    .single()

  if (error) {
    console.error('Error saving inbound lead:', error)
    throw error
  }

  return data
}

// Update download status
export async function markDownloadComplete(leadId: string) {
  const { data, error } = await supabase
    .from('inbound_leads')
    .update({ download_completed: true, updated_at: new Date().toISOString() })
    .eq('id', leadId)
    .select()
    .single()

  if (error) {
    console.error('Error updating download status:', error)
    throw error
  }

  return data
}

// Update Calendly scheduling status
export async function markCalendlyScheduled(
  leadId: string,
  eventId?: string,
  scheduledAt?: string
) {
  const { data, error } = await supabase
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
    console.error('Error updating Calendly status:', error)
    throw error
  }

  return data
}

// ============================================================================
// REPORT LOOKUP FUNCTIONS
// ============================================================================

/**
 * Get report by ID with LEFT JOIN to leads table for complete data
 * Used by report lookup and download flows
 */
export async function getReportWithLead(reportId: string) {
  const { data, error } = await supabase
    .from('reports')
    .select(`
      id,
      company_name,
      website_url,
      website_grade,
      overall_score,
      synthesis_data,
      generated_at,
      lead:lead_id (
        design_score,
        seo_score,
        content_score,
        social_score,
        top_issues,
        quick_wins,
        analysis_summary,
        top_issue
      )
    `)
    .eq('id', reportId)
    .eq('status', 'completed')
    .single()

  if (error) {
    console.error('Error fetching report:', error)
    throw error
  }

  return data
}

/**
 * Find report by company name (case-insensitive search)
 * Returns the most recent matching report
 */
export async function findReportByCompanyName(companyName: string) {
  const { data, error } = await supabase
    .from('reports')
    .select(`
      id,
      company_name,
      website_url,
      website_grade,
      overall_score,
      synthesis_data,
      generated_at,
      lead:lead_id (
        design_score,
        seo_score,
        content_score,
        social_score,
        top_issues,
        quick_wins,
        analysis_summary,
        top_issue
      )
    `)
    .ilike('company_name', `%${companyName}%`)
    .eq('status', 'completed')
    .order('generated_at', { ascending: false })
    .limit(1)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      // No rows returned - this is expected when no match found
      return null
    }
    console.error('Error searching reports by company name:', error)
    throw error
  }

  return data
}

/**
 * Find report by email address via inbound_leads lookup
 * First finds the lead by email, then fetches their associated report
 */
export async function findReportByEmail(email: string) {
  // Step 1: Find the most recent inbound_lead with this email
  const { data: leadData, error: leadError } = await supabase
    .from('inbound_leads')
    .select('report_id')
    .eq('email', email.toLowerCase())
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (leadError) {
    if (leadError.code === 'PGRST116') {
      // No lead found with this email
      return null
    }
    console.error('Error searching inbound_leads by email:', leadError)
    throw leadError
  }

  if (!leadData?.report_id) {
    return null
  }

  // Step 2: Fetch the report with full details
  return getReportWithLead(leadData.report_id)
}
