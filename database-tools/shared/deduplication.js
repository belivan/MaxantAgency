/**
 * Contact History Tracking Service
 *
 * PURPOSE: Just show the facts, you make the decisions
 *
 * What it does:
 * - Shows if you've contacted a company before
 * - Shows when and how (email, LinkedIn, etc.)
 * - That's it. No recommendations, no blocking.
 *
 * You decide when to follow up, when to re-analyze, when to skip.
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY
);

/**
 * Check if a company has been contacted before
 *
 * Just returns the facts - you make the decision.
 *
 * @param {object} company - Company info (website, name, google_place_id)
 * @param {string} platform - Platform to check (email, instagram, linkedin, etc.)
 * @returns {Promise<object>} Contact history (just facts, no recommendations)
 */
export async function checkContactHistory(company, platform = 'email') {
  const { website } = company;

  const result = {
    contacted: false,
    contact_count: 0,
    last_contact: null,
    days_since_contact: null,
    all_contacts: []
  };

  if (!website) {
    return result;
  }

  // Get ALL contacts for this company on this platform
  const { data: emails } = await supabase
    .from('composed_emails')
    .select('id, status, sent_at, created_at, company_name, platform, email_strategy, email_subject')
    .eq('url', website)
    .eq('platform', platform)
    .order('created_at', { ascending: false });

  if (!emails || emails.length === 0) {
    // Never contacted
    return result;
  }

  // Found previous contact(s) - just return the facts
  result.contacted = true;
  result.contact_count = emails.length;
  result.all_contacts = emails;
  result.last_contact = emails[0]; // Most recent

  const lastEmail = emails[0];
  const lastDate = lastEmail.sent_at || lastEmail.created_at;
  const daysAgo = Math.floor((Date.now() - new Date(lastDate).getTime()) / (1000 * 60 * 60 * 24));
  result.days_since_contact = daysAgo;

  return result;
}

/**
 * Get the last time a company was contacted
 *
 * Useful for showing "Last contacted 2 weeks ago" in UI
 *
 * @param {string} website - Website URL
 * @returns {Promise<object|null>} Last contact info or null
 */
export async function getLastContact(website) {
  const { data: emails } = await supabase
    .from('composed_emails')
    .select('*')
    .eq('url', website)
    .order('sent_at', { ascending: false, nullsLast: true })
    .limit(1);

  if (emails && emails.length > 0) {
    const email = emails[0];
    return {
      platform: email.platform,
      status: email.status,
      sent_at: email.sent_at,
      days_ago: email.sent_at
        ? Math.floor((Date.now() - new Date(email.sent_at).getTime()) / (1000 * 60 * 60 * 24))
        : null
    };
  }

  return null;
}

/**
 * Check if a website has been analyzed before
 *
 * @param {string} url - Website URL
 * @returns {Promise<object>} Analysis check result
 */
export async function checkWebsiteAnalyzed(url) {
  const { data: lead } = await supabase
    .from('leads')
    .select('*')
    .eq('url', url)
    .maybeSingle();

  if (lead) {
    return {
      analyzed: true,
      lead_id: lead.id,
      grade: lead.website_grade,
      overall_score: lead.overall_score,
      analyzed_at: lead.analyzed_at,
      status: lead.status,
      message: `Already analyzed (Grade: ${lead.website_grade}, Score: ${lead.overall_score})`,
      data: lead
    };
  }

  return {
    analyzed: false,
    message: 'Not analyzed yet - proceed with analysis'
  };
}

/**
 * Check if a lead has been contacted before
 *
 * @param {string} url - Website URL (or lead_id)
 * @param {string} platform - Platform (email, instagram, linkedin, etc.)
 * @returns {Promise<object>} Contact check result
 */
export async function checkLeadContacted(url, platform = 'email') {
  const { data: emails } = await supabase
    .from('composed_emails')
    .select('*')
    .eq('url', url)
    .eq('platform', platform)
    .order('created_at', { ascending: false })
    .limit(1);

  if (emails && emails.length > 0) {
    const email = emails[0];
    return {
      contacted: true,
      email_id: email.id,
      status: email.status,
      sent_at: email.sent_at,
      platform: email.platform,
      message: email.status === 'sent'
        ? `Already contacted via ${platform} on ${new Date(email.sent_at).toLocaleDateString()}`
        : `Email already composed (Status: ${email.status})`,
      data: email
    };
  }

  return {
    contacted: false,
    message: `Not contacted via ${platform} yet - proceed with outreach`
  };
}

/**
 * Get a summary of all places a company appears in the system
 *
 * Useful for debugging or showing user where a company is tracked
 *
 * @param {object} company - Company info
 * @returns {Promise<object>} Summary of where company exists
 */
export async function getCompanyPresence(company) {
  const { website, company_name, google_place_id } = company;

  const presence = {
    in_prospects: false,
    in_leads: false,
    in_outreach: false,
    details: {},
    timeline: []
  };

  // Check prospects
  if (google_place_id || website) {
    let query = supabase.from('prospects').select('*');
    if (google_place_id) {
      query = query.eq('google_place_id', google_place_id);
    } else if (website) {
      query = query.eq('website', website);
    }

    const { data: prospect } = await query.maybeSingle();
    if (prospect) {
      presence.in_prospects = true;
      presence.details.prospect = prospect;
      presence.timeline.push({
        stage: 'Prospecting',
        date: prospect.created_at,
        status: prospect.status
      });
    }
  }

  // Check leads
  if (website) {
    const { data: lead } = await supabase
      .from('leads')
      .select('*')
      .eq('url', website)
      .maybeSingle();

    if (lead) {
      presence.in_leads = true;
      presence.details.lead = lead;
      presence.timeline.push({
        stage: 'Analysis',
        date: lead.analyzed_at,
        status: `Grade ${lead.website_grade}`,
        score: lead.overall_score
      });
    }
  }

  // Check outreach
  if (website) {
    const { data: emails } = await supabase
      .from('composed_emails')
      .select('*')
      .eq('url', website)
      .order('created_at', { ascending: false });

    if (emails && emails.length > 0) {
      presence.in_outreach = true;
      presence.details.outreach = emails;
      emails.forEach(email => {
        presence.timeline.push({
          stage: `Outreach (${email.platform})`,
          date: email.sent_at || email.created_at,
          status: email.status
        });
      });
    }
  }

  // Sort timeline chronologically
  presence.timeline.sort((a, b) => new Date(a.date) - new Date(b.date));

  return presence;
}

/**
 * Batch check multiple companies for duplicates
 *
 * More efficient than checking one by one
 *
 * @param {Array<object>} companies - Array of company objects
 * @returns {Promise<Array<object>>} Array of deduplication results
 */
export async function batchCheckCompanies(companies) {
  const results = await Promise.all(
    companies.map(company => checkCompanyExists(company))
  );

  return results;
}

/**
 * Get deduplication statistics
 *
 * @returns {Promise<object>} Statistics about duplicates in the system
 */
export async function getDeduplicationStats() {
  const stats = {
    total_prospects: 0,
    total_leads: 0,
    total_contacted: 0,
    prospects_with_no_analysis: 0,
    leads_with_no_outreach: 0,
    conversion_rate: {
      prospect_to_lead: 0,
      lead_to_outreach: 0,
      outreach_to_sent: 0
    }
  };

  // Get counts
  const { count: prospectCount } = await supabase
    .from('prospects')
    .select('*', { count: 'exact', head: true });

  const { count: leadCount } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true });

  const { count: emailCount } = await supabase
    .from('composed_emails')
    .select('*', { count: 'exact', head: true });

  const { count: sentCount } = await supabase
    .from('composed_emails')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'sent');

  stats.total_prospects = prospectCount || 0;
  stats.total_leads = leadCount || 0;
  stats.total_contacted = emailCount || 0;

  // Calculate conversion rates
  if (stats.total_prospects > 0) {
    stats.conversion_rate.prospect_to_lead =
      ((stats.total_leads / stats.total_prospects) * 100).toFixed(2);
  }

  if (stats.total_leads > 0) {
    stats.conversion_rate.lead_to_outreach =
      ((stats.total_contacted / stats.total_leads) * 100).toFixed(2);
  }

  if (stats.total_contacted > 0) {
    stats.conversion_rate.outreach_to_sent =
      ((sentCount / stats.total_contacted) * 100).toFixed(2);
  }

  return stats;
}

/**
 * Batch check contact history for multiple companies
 *
 * @param {Array<object>} companies - Array of company objects
 * @param {string} platform - Platform to check
 * @returns {Promise<Array<object>>} Array of contact histories
 */
export async function batchCheckContactHistory(companies, platform = 'email') {
  const results = await Promise.all(
    companies.map(company => checkContactHistory(company, platform))
  );
  return results;
}

export default {
  checkContactHistory,
  checkWebsiteAnalyzed,
  checkLeadContacted,
  getLastContact,
  getCompanyPresence,
  batchCheckContactHistory,
  getDeduplicationStats
};
