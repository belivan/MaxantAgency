/**
 * Social Media Analyzer - Uses gpt-5-mini to analyze social media presence
 *
 * Cost: ~$0.006 per analysis
 * Analyzes: profile completeness, branding consistency, activity, integration
 *
 * This is an OPTIONAL analyzer - only run if social profiles exist
 */

import { loadPrompt } from '../shared/prompt-loader.js';
import { callAI, parseJSONResponse } from '../../database-tools/shared/ai-client.js';

/**
 * Analyze social media presence using Grok-4-fast (Multi-page version)
 *
 * @param {array} pages - Array of page objects (optional, for finding more social links)
 * @param {string} pages[].url - Page URL
 * @param {string} pages[].html - HTML content
 * @param {object} socialProfiles - Social profile URLs (aggregated from all pages)
 * @param {object} socialMetadata - Metadata about profiles (followers, posts, etc.)
 * @param {object} context - Additional context
 * @param {string} context.company_name - Company name
 * @param {string} context.industry - Industry type
 * @param {string} context.baseUrl - Base website URL
 * @param {object} context.website_branding - Website branding info
 * @param {object} customPrompt - Custom prompt configuration (optional)
 * @returns {Promise<object>} Social media analysis results
 */
export async function analyzeSocial(pages, socialProfiles, socialMetadata, context = {}, customPrompt = null) {
  try {
    console.log(`[Social Analyzer] Analyzing social media presence across ${pages?.length || 0} pages...`);

    // Merge prospect social data with website-discovered social profiles
    // Prioritize prospect data from Google Maps (often more complete/accurate)
    let mergedSocialProfiles = { ...socialProfiles };
    let mergedSocialMetadata = { ...socialMetadata };

    if (socialMetadata.profilesFromProspect) {
      console.log('[Social Analyzer] Merging social profiles from prospect data (Google Maps)...');
      // Merge prospect profiles (prioritize prospect data if conflicts)
      mergedSocialProfiles = {
        ...mergedSocialProfiles,
        ...socialMetadata.profilesFromProspect
      };
    }

    if (socialMetadata.metadataFromProspect) {
      console.log('[Social Analyzer] Merging social metadata from prospect...');
      // Merge prospect metadata (follower counts, etc.)
      mergedSocialMetadata = {
        ...mergedSocialMetadata,
        ...socialMetadata.metadataFromProspect,
        // Keep the original counts/presence data
        platformCount: socialMetadata.platformCount,
        platformsPresent: socialMetadata.platformsPresent
      };
    }

    // Check if we have social profiles to analyze (after merge)
    if (!mergedSocialProfiles || Object.keys(mergedSocialProfiles).length === 0) {
      return createNoSocialProfilesResponse();
    }

    // Analyze social integration across pages
    const integrationData = pages ? analyzeSocialIntegration(pages) : null;

    // Format social profiles for prompt (use merged data)
    const profilesSummary = formatSocialProfiles(mergedSocialProfiles);
    const metadataSummary = formatSocialMetadata(mergedSocialMetadata);
    const integrationSummary = integrationData ? formatIntegrationData(integrationData) : 'No integration data available';

    // Format website branding
    const brandingSummary = formatWebsiteBranding(context.website_branding);

    // Variables for prompt substitution
    const variables = {
      // Old prompt compatibility (single-page format)
      url: context.baseUrl || pages?.[0]?.fullUrl || 'unknown',
      company_name: context.company_name || 'this business',
      industry: context.industry || 'unknown industry',
      // New multi-page variables
      baseUrl: context.baseUrl || pages?.[0]?.fullUrl || 'unknown',
      pageCount: pages ? String(pages.length) : '1',
      social_profiles: profilesSummary,
      social_metadata: metadataSummary,
      social_integration: integrationSummary,
      website_branding: brandingSummary
    };

    // Use custom prompt if provided, otherwise load default
    let prompt;
    if (customPrompt) {
      console.log('[Social Analyzer] Using custom prompt configuration');
      const { substituteVariables } = await import('../shared/prompt-loader.js');
      prompt = {
        name: customPrompt.name,
        model: customPrompt.model,
        temperature: customPrompt.temperature,
        systemPrompt: customPrompt.systemPrompt,
        userPrompt: await substituteVariables(customPrompt.userPromptTemplate, variables, customPrompt.variables),
        outputFormat: customPrompt.outputFormat
      };
    } else {
      prompt = await loadPrompt('web-design/social-analysis', variables);
    }

    // Call Grok-4-fast API
    const response = await callAI({
      model: prompt.model,
      systemPrompt: prompt.systemPrompt,
      userPrompt: prompt.userPrompt,
      temperature: prompt.temperature,
      jsonMode: true
    });

    // Parse JSON response
    const result = await parseJSONResponse(response.content);

    // Validate response
    validateSocialResponse(result);
    const modelUsed = response.model || prompt.model;

    // Add integration issues if found
    if (integrationData && integrationData.issues.length > 0) {
      result.issues = [...integrationData.issues, ...(result.issues || [])];
    }

    // Add metadata
    return {
      ...result,
      model: modelUsed,
      _meta: {
        analyzer: 'social',
        model: modelUsed,
        cost: response.cost,
        usage: response.usage || null,
        timestamp: new Date().toISOString(),
        profilesAnalyzed: Object.keys(socialProfiles),
        pagesAnalyzed: pages ? pages.length : 1,
        integrationData
      }
    };

  } catch (error) {
    console.error('Social analysis failed:', error);

    // Return graceful degradation
    const fallbackModel = customPrompt?.model || 'gpt-5-mini';
    return {
      model: fallbackModel,
      socialScore: 30,
      platformsPresent: Object.keys(socialProfiles || {}),
      mostActivePlatform: 'unknown',
      issues: [{
        category: 'error',
        platform: 'general',
        title: 'Social media analysis failed',
        description: `Unable to analyze social media: ${error.message}`,
        impact: 'Cannot provide social media recommendations',
        recommendation: 'Manual social media audit recommended',
        priority: 'medium',
      source: 'social-analyzer',
      source_type: 'social'
      }],
      quickWins: [],
      strengths: [],
      _meta: {
        analyzer: 'social',
        model: fallbackModel,
        error: error.message,
        timestamp: new Date().toISOString()
      }
    };
  }
}

/**
 * LEGACY: Analyze single page social (backward compatibility)
 * Use analyzeSocial() with array for new implementations
 */
export async function analyzeSocialSinglePage(url, socialProfiles, socialMetadata, context = {}, customPrompt = null) {
  // No pages array for legacy single-page analysis
  return analyzeSocial(null, socialProfiles, socialMetadata, { ...context, baseUrl: url }, customPrompt);
}

/**
 * Create response for businesses with no social profiles
 */
function createNoSocialProfilesResponse() {
  return {
    socialScore: 30,  // Low score for no social presence
    platformsPresent: [],
    mostActivePlatform: 'none',
    issues: [{
      category: 'missing',
      platform: 'general',
      title: 'No social media presence found',
      description: 'Business has no visible social media profiles on major platforms (Instagram, Facebook, LinkedIn, Twitter). In 2024, social media is critical for brand awareness, customer engagement, and trust building.',
      impact: 'Missing opportunities to reach customers where they spend time, build community, showcase work, and generate word-of-mouth marketing. Competitors with active social media appear more established and trustworthy.',
      recommendation: 'Start with 1-2 platforms relevant to industry. For local businesses: Facebook + Instagram. For B2B: LinkedIn. Create profiles with complete information, post 2-3 times per week, engage with followers.',
      priority: 'high',
      source: 'social-analyzer',
      source_type: 'social'
    }],
    quickWins: [
      'Create Instagram business profile with logo and bio',
      'Create Facebook page with hours and contact info',
      'Link social profiles on website footer',
      'Post first content (behind-scenes, service showcase, or customer testimonial)'
    ],
    strengths: [],
    _meta: {
      analyzer: 'social',
      reason: 'no_profiles_found',
      timestamp: new Date().toISOString()
    }
  };
}

/**
 * Format social profiles for prompt
 */
function formatSocialProfiles(profiles) {
  if (!profiles || Object.keys(profiles).length === 0) {
    return 'No social profiles found';
  }

  return JSON.stringify(profiles, null, 2);
}

/**
 * Format social metadata for prompt
 */
function formatSocialMetadata(metadata) {
  if (!metadata || Object.keys(metadata).length === 0) {
    return 'No metadata available';
  }

  return JSON.stringify(metadata, null, 2);
}

/**
 * Format website branding for prompt
 */
function formatWebsiteBranding(branding) {
  if (!branding) {
    return 'No branding information available';
  }

  return JSON.stringify(branding, null, 2);
}

/**
 * Analyze social media integration across multiple pages
 */
function analyzeSocialIntegration(pages) {
  const issues = [];
  const pagesWithSocialLinks = [];
  const pagesWithoutSocialLinks = [];

  // Check each page for social media links/buttons
  pages.forEach(page => {
    // This is a simplified check - in reality, you'd parse HTML
    // For now, we just check if 'html' exists
    if (page.html) {
      const hasSocialLinks =
        page.html.includes('facebook.com') ||
        page.html.includes('instagram.com') ||
        page.html.includes('linkedin.com') ||
        page.html.includes('twitter.com') ||
        page.html.includes('x.com');

      if (hasSocialLinks) {
        pagesWithSocialLinks.push(page.url);
      } else {
        pagesWithoutSocialLinks.push(page.url);
      }
    }
  });

  // If most pages are missing social links
  if (pagesWithoutSocialLinks.length > pagesWithSocialLinks.length) {
    issues.push({
      category: 'integration',
      platform: 'general',
      title: `Social links missing on ${pagesWithoutSocialLinks.length} of ${pages.length} pages`,
      description: 'Social media links should be consistently present across all pages, typically in header or footer.',
      impact: 'Missed opportunities for visitors to connect on social media',
      recommendation: 'Add social media icons to site-wide footer or header',
      priority: 'medium',
      affectedPages: pagesWithoutSocialLinks
    });
  }

  return {
    issues,
    pagesWithSocialLinks: pagesWithSocialLinks.length,
    pagesWithoutSocialLinks: pagesWithoutSocialLinks.length,
    totalPages: pages.length
  };
}

/**
 * Format integration data for prompt
 */
function formatIntegrationData(integrationData) {
  if (!integrationData) {
    return 'No integration data available';
  }

  return JSON.stringify({
    pagesWithSocialLinks: integrationData.pagesWithSocialLinks,
    pagesWithoutSocialLinks: integrationData.pagesWithoutSocialLinks,
    totalPages: integrationData.totalPages,
    consistencyScore: Math.round((integrationData.pagesWithSocialLinks / integrationData.totalPages) * 100)
  }, null, 2);
}

/**
 * Validate social media analysis response
 */
function validateSocialResponse(result) {
  const required = ['socialScore', 'platformsPresent', 'issues'];

  for (const field of required) {
    if (!(field in result)) {
      throw new Error(`Social response missing required field: ${field}`);
    }
  }

  if (typeof result.socialScore !== 'number' ||
      result.socialScore < 0 ||
      result.socialScore > 100) {
    throw new Error('socialScore must be number between 0-100');
  }

  if (!Array.isArray(result.platformsPresent)) {
    throw new Error('platformsPresent must be an array');
  }

  if (!Array.isArray(result.issues)) {
    throw new Error('issues must be an array');
  }
}

/**
 * Check if business has social media presence
 */
export function hasSocialPresence(socialProfiles) {
  if (!socialProfiles) return false;

  const profiles = Object.values(socialProfiles);
  return profiles.some(profile => profile && profile.length > 0);
}

/**
 * Count platforms with activity issues
 */
export function countInactivePlatforms(socialResults) {
  if (!socialResults || !socialResults.issues) return 0;

  return socialResults.issues.filter(issue =>
    issue.category === 'activity' &&
    issue.title.toLowerCase().includes('abandoned') ||
    issue.title.toLowerCase().includes('inactive')
  ).length;
}

export default {
  analyzeSocial,
  hasSocialPresence,
  countInactivePlatforms
};
