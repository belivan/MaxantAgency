/**
 * PERSONALIZATION BUILDER - Extract context from lead data
 *
 * Builds rich personalization context from lead database records
 * Extracts all relevant data for email and social media templates
 * Infers business context, impact statements, and credibility signals
 */

import dotenv from 'dotenv';
dotenv.config();

/**
 * Build complete personalization context from lead
 * @param {object} lead - Lead from database
 * @returns {object} Personalization context for templates
 */
export function buildPersonalizationContext(lead) {
  // Validate input
  if (!lead) {
    throw new Error('Lead data is required for personalization context');
  }
  if (typeof lead !== 'object') {
    throw new Error('Lead must be an object');
  }
  if (!lead.url && !lead.company_name) {
    throw new Error('Lead must have at least url or company_name');
  }

  try {
    return {
    // ============================================
    // BASIC INFO
    // ============================================
    company_name: lead.company_name || extractCompanyFromUrl(lead.url),
    industry: lead.industry || 'Business',
    url: lead.url,
    domain: extractDomain(lead.url),
    location: lead.location || lead.city || '',

    // ============================================
    // CONTACT INFO
    // ============================================
    contact_name: lead.contact_name || 'there',
    contact_title: lead.contact_title || '',
    contact_email: lead.contact_email || '',
    first_name: extractFirstName(lead.contact_name),

    // ============================================
    // WEBSITE QUALITY
    // ============================================
    website_score: lead.website_score || lead.overall_score || 0,
    website_grade: lead.website_grade || lead.lead_grade || 'C',
    grade: lead.lead_grade || lead.website_grade || 'C',
    load_time: formatLoadTime(lead.load_time || lead.page_load_time),

    // ============================================
    // ANALYSIS FINDINGS
    // ============================================
    top_issue: extractTopIssue(lead),
    quick_win: extractQuickWin(lead),
    analysis_summary: lead.analysis_summary || '',

    // ============================================
    // BUSINESS CONTEXT
    // ============================================
    business_context: buildBusinessContext(lead),
    business_impact: extractBusinessImpact(lead),

    // ============================================
    // CREDIBILITY SIGNALS
    // ============================================
    google_rating: lead.google_rating || null,
    review_count: lead.google_review_count || lead.review_count || null,
    years_in_business: inferYearsInBusiness(lead),

    // ============================================
    // TECHNICAL DETAILS (for templates that need them)
    // ============================================
    pages_analyzed: lead.pages_analyzed || 1,
    tech_stack: lead.tech_stack || [],

    // ============================================
    // SOCIAL PROFILES
    // ============================================
    has_social: !!lead.social_profiles,
    social_profiles: lead.social_profiles || {},
    social_platforms: extractSocialPlatforms(lead.social_profiles),

    // ============================================
    // SENDER INFO (from environment)
    // ============================================
    sender_name: process.env.SENDER_NAME || 'Anton Yanovich',
    sender_company: process.env.SENDER_COMPANY || 'Maksant',
    sender_website: process.env.SENDER_WEBSITE || 'https://maksant.com',
    sender_phone: process.env.SENDER_PHONE || '412-315-8398',

    // ============================================
    // META
    // ============================================
    requires_social_outreach: lead.requires_social_outreach || false,
    website_status: lead.website_status || 'accessible'
    };
  } catch (error) {
    throw new Error(`Failed to build personalization context: ${error.message}`);
  }
}

/**
 * Build business context string (credibility signals)
 * @param {object} lead - Lead data
 * @returns {string} Business context (e.g., "15 years in business, 4.6 star rating, 200 reviews")
 */
function buildBusinessContext(lead) {
  if (!lead) throw new Error('Lead is required for business context');

  try {
    const signals = [];

    // Years in business
    const years = inferYearsInBusiness(lead);
    if (years) {
      signals.push(`${years} years in business`);
    }

    // Google rating
    if (lead.google_rating && lead.google_rating >= 4.0) {
      signals.push(`${lead.google_rating} star rating`);
    }

    // Review count
    if (lead.google_review_count && lead.google_review_count > 20) {
      signals.push(`${lead.google_review_count} reviews`);
    } else if (lead.review_count && lead.review_count > 20) {
      signals.push(`${lead.review_count} reviews`);
    }

    // Location prominence
    if (lead.location) {
      signals.push(`serving ${lead.location}`);
    }

    return signals.length > 0 ? signals.join(', ') : 'established business';
  } catch (error) {
    throw new Error(`Failed to build business context: ${error.message}`);
  }
}

/**
 * Extract top issue from analysis
 * @param {object} lead - Lead data
 * @returns {string} Top issue description
 */
function extractTopIssue(lead) {
  if (!lead) throw new Error('Lead is required for extracting top issue');

  try {
    // Check for explicit top_issue field
    if (lead.top_issue) {
      // Handle both string and object formats
      if (typeof lead.top_issue === 'string') {
        return lead.top_issue;
      } else if (typeof lead.top_issue === 'object' && lead.top_issue.issue) {
        return lead.top_issue.issue;
      }
      return String(lead.top_issue);
    }

    // Try to extract from critiques
    const allCritiques = [
      ...(lead.critiques_basic || []),
      ...(lead.critiques_industry || []),
      ...(lead.critiques_seo || []),
      ...(lead.critiques_visual || [])
    ];

    if (allCritiques.length > 0) {
      // Return first critical issue
      return allCritiques[0];
    }

    // Check design_issues
    if (lead.design_issues && lead.design_issues.length > 0) {
      return lead.design_issues[0].issue || lead.design_issues[0].description;
    }

    // Fallback based on grade
    if (lead.website_grade === 'F' || lead.lead_grade === 'F') {
      return 'Site experiencing significant technical issues';
    }

    if (lead.load_time && lead.load_time > 5) {
      return `Slow page load time (${formatLoadTime(lead.load_time)})`;
    }

    return 'Opportunities for website improvement identified';
  } catch (error) {
    throw new Error(`Failed to extract top issue: ${error.message}`);
  }
}

/**
 * Extract quick win from analysis
 * @param {object} lead - Lead data
 * @returns {string} Quick win description
 */
function extractQuickWin(lead) {
  if (!lead) throw new Error('Lead is required for extracting quick win');

  try {
    if (lead.quick_wins && lead.quick_wins.length > 0) {
      return lead.quick_wins[0];
    }

    if (lead.quick_win) {
      return lead.quick_win;
    }

    // Infer based on top issue
    const topIssue = extractTopIssue(lead);
    if (topIssue.toLowerCase().includes('mobile')) {
      return 'Fix mobile responsiveness (2-4 hour fix)';
    }
    if (topIssue.toLowerCase().includes('load') || topIssue.toLowerCase().includes('slow')) {
      return 'Optimize page load speed (4-6 hour fix)';
    }
    if (topIssue.toLowerCase().includes('contact')) {
      return 'Add prominent contact form (1-2 hour fix)';
    }

    return 'Quick fixes available to improve user experience';
  } catch (error) {
    throw new Error(`Failed to extract quick win: ${error.message}`);
  }
}

/**
 * Extract business impact from issues
 * @param {object} lead - Lead data
 * @returns {string} Business impact description
 */
function extractBusinessImpact(lead) {
  if (!lead) throw new Error('Lead is required for extracting business impact');

  try {
    const topIssue = extractTopIssue(lead);

    // Map technical issues to business impact
    if (topIssue.toLowerCase().includes('mobile')) {
      return 'potentially losing 60%+ of mobile visitors';
    }
    if (topIssue.toLowerCase().includes('slow') || topIssue.toLowerCase().includes('load')) {
      return 'visitors likely leaving before page loads (3 second threshold)';
    }
    if (topIssue.toLowerCase().includes('contact')) {
      return 'making it harder for customers to reach you';
    }
    if (topIssue.toLowerCase().includes('seo') || topIssue.toLowerCase().includes('search')) {
      return 'missing potential organic search traffic';
    }
    if (topIssue.toLowerCase().includes('navigation')) {
      return 'visitors struggling to find information';
    }

    return 'impacting user experience and conversion rates';
  } catch (error) {
    throw new Error(`Failed to extract business impact: ${error.message}`);
  }
}

/**
 * Extract domain from URL
 * @param {string} url - Full URL
 * @returns {string} Domain (without www)
 */
function extractDomain(url) {
  try {
    const domain = new URL(url).hostname;
    return domain.replace('www.', '');
  } catch {
    return url.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
  }
}

/**
 * Extract company name from URL if not provided
 * @param {string} url - Website URL
 * @returns {string} Inferred company name
 */
function extractCompanyFromUrl(url) {
  if (!url) throw new Error('URL is required for extracting company name');
  if (typeof url !== 'string') throw new Error('URL must be a string');

  try {
    const domain = extractDomain(url);
    // Remove TLD
    const name = domain.split('.')[0];
    // Capitalize first letter
    return name.charAt(0).toUpperCase() + name.slice(1);
  } catch (error) {
    throw new Error(`Failed to extract company from URL: ${error.message}`);
  }
}

/**
 * Extract first name from full name
 * @param {string} fullName - Full name
 * @returns {string} First name or 'there'
 */
function extractFirstName(fullName) {
  if (!fullName) return 'there';
  return fullName.split(' ')[0];
}

/**
 * Format load time for display
 * @param {number} seconds - Load time in seconds
 * @returns {string} Formatted time
 */
function formatLoadTime(seconds) {
  if (!seconds) return 'unknown';
  if (typeof seconds !== 'number') {
    throw new Error('Load time must be a number');
  }

  try {
    if (seconds < 1) return `${Math.round(seconds * 1000)}ms`;
    return `${seconds.toFixed(1)}s`;
  } catch (error) {
    throw new Error(`Failed to format load time: ${error.message}`);
  }
}

/**
 * Infer years in business from available data
 * @param {object} lead - Lead data
 * @returns {number|null} Estimated years or null
 */
function inferYearsInBusiness(lead) {
  if (!lead || typeof lead !== 'object') {
    throw new Error('Lead must be an object');
  }

  try {
    // Check explicit field
    if (lead.years_in_business) {
      return lead.years_in_business;
    }

    // Check for "since YYYY" in description/bio
    if (lead.description) {
      const match = lead.description.match(/since (\d{4})/i);
      if (match) {
        const foundedYear = parseInt(match[1]);
        const currentYear = new Date().getFullYear();
        return currentYear - foundedYear;
      }
    }

    // Could also check domain age, but we don't have that data yet
    return null;
  } catch (error) {
    throw new Error(`Failed to infer years in business: ${error.message}`);
  }
}

/**
 * Extract social platforms from social_profiles object
 * @param {object} socialProfiles - Social profiles object
 * @returns {string[]} Array of platform names
 */
function extractSocialPlatforms(socialProfiles) {
  if (!socialProfiles || typeof socialProfiles !== 'object') {
    return [];
  }

  try {
    return Object.keys(socialProfiles).filter(key => socialProfiles[key]);
  } catch (error) {
    console.error('Error extracting social platforms:', error.message);
    return [];
  }
}

/**
 * Build context for social media DMs
 * @param {object} lead - Lead data
 * @param {string} platform - Platform (instagram, facebook, linkedin)
 * @returns {object} Social-specific context
 */
export function buildSocialContext(lead, platform) {
  if (!lead) throw new Error('Lead is required for social context');
  if (!platform) throw new Error('Platform is required for social context');

  try {
    const baseContext = buildPersonalizationContext(lead);

    // Add platform-specific data
    const socialData = {
      ...baseContext,
      platform,
      social_username: extractSocialUsername(lead, platform),
      social_bio: lead.social_profiles?.[platform + '_bio'] || '',
      social_profile_url: lead.social_profiles?.[platform] || '',
      follower_count: lead.social_profiles?.[platform + '_followers'] || null
    };

    return socialData;
  } catch (error) {
    throw new Error(`Failed to build social context: ${error.message}`);
  }
}

/**
 * Extract username from social profile URL
 * @param {object} lead - Lead data
 * @param {string} platform - Platform name
 * @returns {string} Username or empty string
 */
function extractSocialUsername(lead, platform) {
  if (!lead) return '';
  if (!platform) return '';

  try {
    const profiles = lead.social_profiles || {};
    const url = profiles[platform];

    if (!url) return '';

    // Extract username from URL
    const match = url.match(/\/([^\/]+)\/?$/);
    return match ? '@' + match[1] : '';
  } catch (error) {
    console.error('Error extracting social username:', error.message);
    return '';
  }
}
