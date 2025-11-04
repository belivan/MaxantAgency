/**
 * Duplicate Flag System
 *
 * Simple utility to flag duplicates in the UI
 * Shows "Already contacted", "Already analyzed", etc.
 * You still make all decisions - this just shows you what's already been done.
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY
);

/**
 * Get all duplicate flags for a company
 *
 * Returns simple flags you can display in the UI:
 * - Already contacted (email, LinkedIn, etc.)
 * - Already analyzed
 * - Multiple contacts found
 *
 * @param {string} website - Website URL
 * @returns {Promise<object>} Flags object
 */
export async function getDuplicateFlags(website) {
  if (!website) {
    return {
      has_duplicates: false,
      flags: []
    };
  }

  const flags = [];

  // Check if already contacted (any platform)
  const { data: emails, count: emailCount } = await supabase
    .from('composed_outreach')
    .select('platform, status, sent_at', { count: 'exact' })
    .eq('url', website)
    .order('sent_at', { ascending: false, nullsLast: true });

  if (emails && emails.length > 0) {
    emails.forEach(email => {
      const daysAgo = email.sent_at
        ? Math.floor((Date.now() - new Date(email.sent_at).getTime()) / (1000 * 60 * 60 * 24))
        : null;

      flags.push({
        type: 'contacted',
        platform: email.platform,
        status: email.status,
        days_ago: daysAgo,
        label: daysAgo !== null
          ? `Contacted via ${email.platform} ${daysAgo}d ago`
          : `${email.platform} draft (${email.status})`
      });
    });
  }

  // Check if already analyzed
  const { data: lead } = await supabase
    .from('leads')
    .select('website_grade, overall_score, analyzed_at')
    .eq('url', website)
    .maybeSingle();

  if (lead) {
    const daysAgo = Math.floor(
      (Date.now() - new Date(lead.analyzed_at).getTime()) / (1000 * 60 * 60 * 24)
    );

    flags.push({
      type: 'analyzed',
      grade: lead.website_grade,
      score: lead.overall_score,
      days_ago: daysAgo,
      label: `Analyzed ${daysAgo}d ago (Grade: ${lead.website_grade})`
    });
  }

  // Check if in prospects table (already discovered)
  const { data: prospect } = await supabase
    .from('prospects')
    .select('created_at, status')
    .eq('website', website)
    .maybeSingle();

  if (prospect) {
    const daysAgo = Math.floor(
      (Date.now() - new Date(prospect.created_at).getTime()) / (1000 * 60 * 60 * 24)
    );

    flags.push({
      type: 'in_database',
      status: prospect.status,
      days_ago: daysAgo,
      label: `In database ${daysAgo}d ago`
    });
  }

  return {
    has_duplicates: flags.length > 0,
    flags: flags,
    contacted_count: emails?.length || 0,
    is_analyzed: !!lead,
    is_in_database: !!prospect
  };
}

/**
 * Batch get duplicate flags for multiple companies
 *
 * More efficient than checking one by one
 *
 * @param {Array<string>} websites - Array of website URLs
 * @returns {Promise<Map>} Map of website -> flags
 */
export async function batchGetDuplicateFlags(websites) {
  if (!websites || websites.length === 0) {
    return new Map();
  }

  // Get all emails for these websites
  const { data: emails } = await supabase
    .from('composed_outreach')
    .select('url, platform, status, sent_at')
    .in('url', websites);

  // Get all leads for these websites
  const { data: leads } = await supabase
    .from('leads')
    .select('url, website_grade, overall_score, analyzed_at')
    .in('url', websites);

  // Get all prospects for these websites
  const { data: prospects } = await supabase
    .from('prospects')
    .select('website, created_at, status')
    .in('website', websites);

  // Build flags map
  const flagsMap = new Map();

  websites.forEach(website => {
    const flags = [];

    // Check emails
    const siteEmails = emails?.filter(e => e.url === website) || [];
    siteEmails.forEach(email => {
      const daysAgo = email.sent_at
        ? Math.floor((Date.now() - new Date(email.sent_at).getTime()) / (1000 * 60 * 60 * 24))
        : null;

      flags.push({
        type: 'contacted',
        platform: email.platform,
        status: email.status,
        days_ago: daysAgo,
        label: daysAgo !== null
          ? `${email.platform} ${daysAgo}d ago`
          : `${email.platform} (${email.status})`
      });
    });

    // Check lead
    const lead = leads?.find(l => l.url === website);
    if (lead) {
      const daysAgo = Math.floor(
        (Date.now() - new Date(lead.analyzed_at).getTime()) / (1000 * 60 * 60 * 24)
      );

      flags.push({
        type: 'analyzed',
        grade: lead.website_grade,
        score: lead.overall_score,
        days_ago: daysAgo,
        label: `Grade ${lead.website_grade} (${daysAgo}d ago)`
      });
    }

    // Check prospect
    const prospect = prospects?.find(p => p.website === website);
    if (prospect) {
      const daysAgo = Math.floor(
        (Date.now() - new Date(prospect.created_at).getTime()) / (1000 * 60 * 60 * 24)
      );

      flags.push({
        type: 'in_database',
        status: prospect.status,
        days_ago: daysAgo,
        label: `In DB ${daysAgo}d ago`
      });
    }

    flagsMap.set(website, {
      has_duplicates: flags.length > 0,
      flags: flags,
      contacted_count: siteEmails.length,
      is_analyzed: !!lead,
      is_in_database: !!prospect
    });
  });

  return flagsMap;
}

/**
 * Simple check: has this website been contacted before?
 *
 * @param {string} website - Website URL
 * @param {string} platform - Optional: check specific platform
 * @returns {Promise<boolean>}
 */
export async function hasBeenContacted(website, platform = null) {
  let query = supabase
    .from('composed_outreach')
    .select('id', { count: 'exact', head: true })
    .eq('url', website);

  if (platform) {
    query = query.eq('platform', platform);
  }

  const { count } = await query;
  return count > 0;
}

/**
 * Simple check: has this website been analyzed before?
 *
 * @param {string} website - Website URL
 * @returns {Promise<boolean>}
 */
export async function hasBeenAnalyzed(website) {
  const { count } = await supabase
    .from('leads')
    .select('id', { count: 'exact', head: true })
    .eq('url', website);

  return count > 0;
}

export default {
  getDuplicateFlags,
  batchGetDuplicateFlags,
  hasBeenContacted,
  hasBeenAnalyzed
};
