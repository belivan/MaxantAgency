import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

// Only create client if credentials are provided
let supabase = null;
if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
}

/**
 * Save analysis result to Supabase
 * @param {Object} result - Full analysis result object
 * @returns {Object} - Supabase response
 */
export async function saveLeadToSupabase(result) {
  if (!supabase) {
    console.log('⏭️  Supabase not configured - skipping database save');
    return null;
  }

  try {
    const grokData = result.grokData || {};
    const contact = result.contact || {};
    const grokContact = grokData.contactInfo || {};
    const companyInfo = grokData.companyInfo || {};
    const socialProfiles = grokData.socialProfiles || {};
    const teamInfo = grokData.teamInfo || {};
    const contentInfo = grokData.contentInfo || {};
    const businessIntel = grokData.businessIntel || {};

    // Prepare the data object
    const leadData = {
      // Basic Info
      url: result.url,
      company_name: result.company_name || result.companyName || companyInfo.name,
      industry: result.industry?.specific || result.industry || companyInfo.industry,

      // Grading (Website Quality - Data Completeness)
      website_score: result.websiteScore,
      website_grade: result.websiteGrade,
      // [REMOVED] lead_grade - email quality grading moved to separate app

      // Contact Info
      contact_email: contact.email || grokContact.email,
      contact_email_source: contact.emailSource || 'grok',
      contact_phone: grokContact.phone,
      contact_name: contact.name || teamInfo.founder?.name,
      contact_title: contact.title || teamInfo.founder?.title,
      contact_page: contact.contactPage,
      contact_confidence: contact.confidence,

      // Company Info
      founding_year: companyInfo.foundingYear,
      location: result.location || companyInfo.location,
      company_description: companyInfo.description,
      target_audience: businessIntel.targetAudience,
      value_proposition: businessIntel.valueProposition,

      // Social Profiles (JSONB) - can come from grokData OR directly from result
      social_profiles: result.social_profiles || socialProfiles,

      // Team Info (JSONB)
      team_info: teamInfo,

      // Services (Array)
      services: businessIntel.services || [],

      // Content/Blog Info
      has_active_blog: contentInfo.hasActiveBlog,
      recent_blog_posts: contentInfo.recentPosts || [],
      last_content_update: contentInfo.lastContentUpdate,

      // Tech Stack
      tech_stack: grokData.techStack || null,

      // Priority 3 & 4: Rich Content for Social Media
      achievements: grokData.achievements || null, // JSONB: awards, certifications, years in business
      testimonials: grokData.socialProof?.testimonials || [], // Array of customer testimonials
      community_involvement: grokData.socialProof?.communityInvolvement || [], // Array of community activities
      brand_voice: grokData.socialProof?.brandVoice || null, // String: professional/casual/friendly/etc
      offerings_detail: businessIntel.offeringsDetail || null, // Detailed product/service descriptions

      // Content Insights (NEW - for email/social personalization)
      content_insights: result.contentInsights || null, // JSONB: blog/news analysis for personalization

      // Social Outreach Fallback (NEW - for failed websites with social profiles)
      requires_social_outreach: result.requires_social_outreach || false,
      website_status: result.website_status || 'active',
      website_error: result.website_error || null,

      // Analysis Results (JSONB)
      critiques_basic: result.critiques?.basic || [],
      critiques_industry: result.critiques?.industry || [],
      critiques_seo: result.critiques?.seo || [],
      critiques_visual: result.critiques?.visual || [],
      critiques_competitor: result.critiques?.competitor || [],

      // Module Data
      seo_data: result.seo,
      visual_data: result.visual,
      competitor_data: result.competitor,

      // Summary
      analysis_summary: result.summary,

      // Performance
      load_time: result.loadTime,
      pages_analyzed: result.pagesAnalyzed,
      modules_used: result.modulesUsed || [],

      // Cost & Time Tracking
      analysis_cost: result.cost,
      analysis_time: result.analysisTime,
      cost_breakdown: result.costBreakdown,

      // [REMOVED] Email fields moved to separate app:
      // - email_subject
      // - email_body
      // - qa_review
      // - critique_reasoning

      // Multi-Tenant Tracking
      project_id: result.metadata?.projectId || null,
      campaign_id: result.metadata?.campaignId || null,
      client_name: result.metadata?.clientName || null,
      source_app: result.metadata?.sourceApp || null,
      // NOTE: metadata column doesn't exist yet - would need migration to add it

      // Timestamps
      analyzed_at: result.analyzed_at || result.timestamp || new Date().toISOString(),
    };

    // Insert or update (upsert based on URL)
    const { data, error } = await supabase
      .from('leads')
      .upsert(leadData, {
        onConflict: 'url',  // If URL exists, update it
        ignoreDuplicates: false
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Supabase error:', error);
      throw error;
    }

    console.log(`✅ Lead saved to Supabase: ${data.company_name || data.url}`);
    return data;
  } catch (error) {
    console.error('❌ Failed to save to Supabase:', error.message);
    throw error;
  }
}

/**
 * Query leads by website quality grade
 * @param {string} websiteGrade - 'A', 'B', 'C', 'D', or 'F'
 * @returns {Array} - Array of leads
 */
export async function getLeadsByGrade(websiteGrade) {
  if (!supabase) {
    throw new Error('Supabase not configured');
  }

  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .eq('website_grade', websiteGrade)
    .order('analyzed_at', { ascending: false });

  if (error) throw error;
  return data;
}

/**
 * Get leads ready to contact (Grade A or B websites with email, not contacted yet)
 * @returns {Array} - Array of leads
 */
export async function getLeadsReadyToContact() {
  if (!supabase) {
    throw new Error('Supabase not configured');
  }

  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .in('website_grade', ['A', 'B'])
    .eq('outreach_status', 'not_contacted')
    .not('contact_email', 'is', null)  // Must have email
    .order('website_grade', { ascending: true })  // A first, then B
    .order('analyzed_at', { ascending: false });

  if (error) throw error;
  return data;
}

/**
 * Update outreach status
 * @param {string} url - Lead URL
 * @param {string} status - New outreach status
 * @returns {Object} - Updated lead
 */
export async function updateOutreachStatus(url, status) {
  if (!supabase) {
    throw new Error('Supabase not configured');
  }

  const updateData = {
    outreach_status: status
  };

  // Add timestamp based on status
  if (status === 'email_sent') {
    updateData.outreach_date = new Date().toISOString();
  } else if (status === 'replied') {
    updateData.reply_date = new Date().toISOString();
  } else if (status === 'converted') {
    updateData.conversion_date = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('leads')
    .update(updateData)
    .eq('url', url)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ═══════════════════════════════════════════════════════════════
// PROSPECT MANAGEMENT FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Get prospects ready for analysis
 * @param {Object} options - Query options
 * @param {number} options.limit - Max number of prospects to fetch (default: 10)
 * @param {string} options.status - Filter by status (default: 'pending_analysis')
 * @param {string} options.industry - Filter by industry (optional)
 * @param {string} options.city - Filter by city (optional)
 * @param {string} options.runId - Filter by run_id (optional)
 * @returns {Array} - Array of prospects
 */
export async function getProspectsForAnalysis(options = {}) {
  if (!supabase) {
    throw new Error('Supabase not configured');
  }

  const {
    limit = 10,
    status = 'pending_analysis',
    industry = null,
    city = null,
    runId = null
  } = options;

  let query = supabase
    .from('prospects')
    .select('*')
    .eq('status', status)
    .order('created_at', { ascending: true }) // Process oldest first
    .limit(limit);

  // Apply optional filters
  if (industry) {
    query = query.eq('industry', industry);
  }

  if (city) {
    query = query.eq('city', city);
  }

  if (runId) {
    query = query.eq('run_id', runId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('❌ Failed to fetch prospects:', error);
    throw error;
  }

  console.log(`📥 Fetched ${data.length} prospects for analysis`);
  return data;
}

/**
 * Update prospect status
 * @param {string} prospectId - Prospect ID
 * @param {string} status - New status ('pending_analysis', 'queued', 'analyzed')
 * @returns {Object} - Updated prospect
 */
export async function updateProspectStatus(prospectId, status) {
  if (!supabase) {
    throw new Error('Supabase not configured');
  }

  const { data, error } = await supabase
    .from('prospects')
    .update({
      status,
      last_status_change: new Date().toISOString()
    })
    .eq('id', prospectId)
    .select()
    .single();

  if (error) {
    console.error('❌ Failed to update prospect status:', error);
    throw error;
  }

  return data;
}

/**
 * Link a prospect to its analyzed lead
 * This helps track the prospect → lead relationship
 * @param {string} prospectId - Prospect ID
 * @param {string} leadUrl - Lead URL (from leads table)
 * @returns {Object} - Updated prospect
 */
export async function linkProspectToLead(prospectId, leadUrl) {
  if (!supabase) {
    throw new Error('Supabase not configured');
  }

  const { data, error } = await supabase
    .from('prospects')
    .update({
      status: 'analyzed',
      last_status_change: new Date().toISOString()
    })
    .eq('id', prospectId)
    .select()
    .single();

  if (error) {
    console.error('❌ Failed to link prospect to lead:', error);
    throw error;
  }

  console.log(`🔗 Linked prospect ${prospectId} to lead ${leadUrl}`);
  return data;
}
