/**
 * Social Media Analyzer - Uses Grok-4-fast to analyze social media presence
 *
 * Cost: ~$0.006 per analysis
 * Analyzes: profile completeness, branding consistency, activity, integration
 *
 * This is an OPTIONAL analyzer - only run if social profiles exist
 */

import { loadPrompt } from '../shared/prompt-loader.js';
import { callAI, parseJSONResponse } from '../shared/ai-client.js';

/**
 * Analyze social media presence using Grok-4-fast
 *
 * @param {string} url - Website URL
 * @param {object} socialProfiles - Social profile URLs
 * @param {object} socialMetadata - Metadata about profiles (followers, posts, etc.)
 * @param {object} context - Additional context
 * @param {string} context.company_name - Company name
 * @param {string} context.industry - Industry type
 * @param {object} context.website_branding - Website branding info
 * @param {object} customPrompt - Custom prompt configuration (optional)
 * @returns {Promise<object>} Social media analysis results
 */
export async function analyzeSocial(url, socialProfiles, socialMetadata, context = {}, customPrompt = null) {
  try {
    // Check if we have social profiles to analyze
    if (!socialProfiles || Object.keys(socialProfiles).length === 0) {
      return createNoSocialProfilesResponse();
    }

    // Format social profiles for prompt
    const profilesSummary = formatSocialProfiles(socialProfiles);
    const metadataSummary = formatSocialMetadata(socialMetadata);

    // Format website branding
    const brandingSummary = formatWebsiteBranding(context.website_branding);

    // Variables for prompt substitution
    const variables = {
      company_name: context.company_name || 'this business',
      industry: context.industry || 'unknown industry',
      url: url,
      social_profiles: profilesSummary,
      social_metadata: metadataSummary,
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
        userPrompt: substituteVariables(customPrompt.userPromptTemplate, variables, customPrompt.variables),
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
    const result = parseJSONResponse(response.content);

    // Validate response
    validateSocialResponse(result);

    // Add metadata
    return {
      ...result,
      _meta: {
        analyzer: 'social',
        model: prompt.model,
        cost: response.cost,
        timestamp: new Date().toISOString(),
        profilesAnalyzed: Object.keys(socialProfiles)
      }
    };

  } catch (error) {
    console.error('Social analysis failed:', error);

    // Return graceful degradation
    return {
      socialScore: 50,
      platformsPresent: Object.keys(socialProfiles || {}),
      mostActivePlatform: 'unknown',
      issues: [{
        category: 'error',
        platform: 'general',
        title: 'Social media analysis failed',
        description: `Unable to analyze social media: ${error.message}`,
        impact: 'Cannot provide social media recommendations',
        recommendation: 'Manual social media audit recommended',
        priority: 'medium'
      }],
      quickWins: [],
      strengths: [],
      _meta: {
        analyzer: 'social',
        error: error.message,
        timestamp: new Date().toISOString()
      }
    };
  }
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
      priority: 'high'
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
