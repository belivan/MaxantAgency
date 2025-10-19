/**
 * Social Media Outreach Generator
 *
 * Generates personalized social media messages for leads with broken websites.
 * When a prospect's website is down/has errors, we reach out via Instagram/Facebook/LinkedIn
 * with: "Hey, noticed your website is down - we can fix it!"
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Get message hook based on website error type
 */
function getWebsiteIssueMessage(lead) {
  const { website_status, company_name, url, industry } = lead;

  switch(website_status) {
    case 'ssl_error':
      return {
        hook: `SSL Certificate Issue Detected`,
        issue: 'SSL certificate issue',
        urgency: 'high',
        message: `I noticed your website (${url}) has an SSL certificate issue. Potential customers are seeing "Not Secure" warnings, which can hurt trust and conversions. I can help fix this quickly - usually takes less than an hour.`
      };

    case 'timeout':
    case 'dns_error':
      return {
        hook: `Website Appears Down`,
        issue: 'website appears to be down',
        urgency: 'critical',
        message: `I tried visiting your website (${url}) but it appears to be down. This means you're likely losing customers right now. I specialize in fixing website issues fast - can usually get you back online within a few hours.`
      };

    case 'failed':
    default:
      return {
        hook: `Website Issue Detected`,
        issue: 'some issues with your website',
        urgency: 'medium',
        message: `I noticed some issues with your website (${url}). I help ${industry || 'small'} businesses fix their websites and improve their online presence.`
      };
  }
}

/**
 * Select best social platform for outreach
 * Priority: Instagram > Facebook > LinkedIn
 */
function selectBestPlatform(social_profiles) {
  if (!social_profiles) return null;

  // Helper to extract URL (handles both string and object formats)
  const getUrl = (profile) => {
    if (!profile) return null;
    if (typeof profile === 'string') return profile;
    return profile.url || null;
  };

  const getName = (profile) => {
    if (!profile || typeof profile === 'string') return null;
    return profile.name || null;
  };

  const getUsername = (profile) => {
    if (!profile || typeof profile === 'string') {
      // Extract username from URL if it's a string
      const url = typeof profile === 'string' ? profile : null;
      if (url) {
        const match = url.match(/instagram\.com\/([^\/\?]+)/);
        return match ? match[1] : null;
      }
      return null;
    }
    return profile.username || null;
  };

  // Instagram - best for casual, visual businesses
  const instagramUrl = getUrl(social_profiles.instagram);
  if (instagramUrl) {
    return {
      platform: 'instagram',
      url: instagramUrl,
      username: getUsername(social_profiles.instagram),
      method: 'DM',
      priority: 1
    };
  }

  // Facebook - good for local businesses
  const facebookUrl = getUrl(social_profiles.facebook);
  if (facebookUrl) {
    return {
      platform: 'facebook',
      url: facebookUrl,
      name: getName(social_profiles.facebook),
      method: 'Messenger',
      priority: 2
    };
  }

  // LinkedIn - best for B2B, professional services
  const linkedinUrl = getUrl(social_profiles.linkedin_person);
  if (linkedinUrl) {
    return {
      platform: 'linkedin',
      url: linkedinUrl,
      name: getName(social_profiles.linkedin_person),
      title: social_profiles.linkedin_person?.title || null,
      method: 'InMail or Connection Request',
      priority: 3
    };
  }

  return null;
}

/**
 * Generate platform-specific message
 */
export function generateSocialMessage(lead) {
  const issueInfo = getWebsiteIssueMessage(lead);
  const platform = selectBestPlatform(lead.social_profiles);

  if (!platform) {
    return null; // No viable platform
  }

  const { company_name } = lead;

  // Platform-specific configuration
  const configs = {
    instagram: {
      greeting: `Hey!`,
      style: 'casual',
      maxLength: 1000,
      emoji: true,
      cta: `Let me know if you want me to send over what I found 👍`
    },
    facebook: {
      greeting: `Hi there!`,
      style: 'friendly',
      maxLength: 5000,
      emoji: false,
      cta: `Would love to help - can I share the details?`
    },
    linkedin: {
      greeting: `Hi ${platform.name?.split(' ')[0] || 'there'},`,
      style: 'professional',
      maxLength: 1900,
      emoji: false,
      cta: `Happy to share what I found if you're interested.`
    }
  };

  const config = configs[platform.platform];

  // Build the message
  const message = `${config.greeting}

${issueInfo.message}

${config.cta}`;

  return {
    platform: platform.platform,
    platform_url: platform.url,
    platform_username: platform.username,
    platform_name: platform.name,
    method: platform.method,

    subject: issueInfo.hook, // For LinkedIn
    message: message.trim(),

    issue_type: issueInfo.issue,
    urgency: issueInfo.urgency,

    max_length: config.maxLength,
    style: config.style,
    uses_emoji: config.emoji,

    company_name: company_name,
    website_url: lead.url,
    industry: lead.industry,
    location: lead.location
  };
}

/**
 * Fetch social outreach leads from database
 */
export async function getSocialOutreachLeads(options = {}) {
  const {
    limit = 10,
    platform = null,
    website_status = null,
    industry = null
  } = options;

  let query = supabase
    .from('leads')
    .select('*')
    .eq('requires_social_outreach', true)
    .not('social_profiles', 'is', null)
    .order('analyzed_at', { ascending: false })
    .limit(limit);

  // Optional filters
  if (website_status) {
    query = query.eq('website_status', website_status);
  }

  if (industry) {
    query = query.eq('industry', industry);
  }

  const { data: leads, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch social outreach leads: ${error.message}`);
  }

  // If platform filter specified, only return leads with that platform
  if (platform) {
    return leads.filter(lead => {
      const platformChoice = selectBestPlatform(lead.social_profiles);
      return platformChoice?.platform === platform;
    });
  }

  return leads;
}

/**
 * Generate social outreach messages for leads
 */
export async function generateSocialOutreach(options = {}) {
  const leads = await getSocialOutreachLeads(options);

  const messages = [];

  for (const lead of leads) {
    const message = generateSocialMessage(lead);

    if (!message) continue; // Skip if no viable platform

    messages.push({
      lead_id: lead.id,
      lead_url: lead.url,
      ...message,
      analyzed_at: lead.analyzed_at
    });
  }

  return messages;
}

/**
 * Get statistics about social outreach opportunities
 */
export async function getSocialOutreachStats() {
  const { data: leads, error } = await supabase
    .from('leads')
    .select('social_profiles, website_status')
    .eq('requires_social_outreach', true)
    .not('social_profiles', 'is', null);

  if (error) {
    throw new Error(`Failed to fetch stats: ${error.message}`);
  }

  const stats = {
    total: leads.length,
    by_error_type: {},
    by_platform: {
      instagram: 0,
      facebook: 0,
      linkedin: 0
    }
  };

  for (const lead of leads) {
    // Count by error type
    const status = lead.website_status || 'unknown';
    stats.by_error_type[status] = (stats.by_error_type[status] || 0) + 1;

    // Count by available platforms
    if (lead.social_profiles?.instagram) stats.by_platform.instagram++;
    if (lead.social_profiles?.facebook) stats.by_platform.facebook++;
    if (lead.social_profiles?.linkedin_person || lead.social_profiles?.linkedin_company) {
      stats.by_platform.linkedin++;
    }
  }

  return stats;
}

/**
 * Example Usage:
 *
 * // Get all Instagram outreach messages
 * const instagramMessages = await generateSocialOutreach({ platform: 'instagram', limit: 20 });
 *
 * // Get SSL error leads only
 * const sslLeads = await generateSocialOutreach({ website_status: 'ssl_error' });
 *
 * // Get stats
 * const stats = await getSocialOutreachStats();
 * console.log(`${stats.total} leads ready for social outreach`);
 * console.log(`Instagram: ${stats.by_platform.instagram}, Facebook: ${stats.by_platform.facebook}`);
 */
