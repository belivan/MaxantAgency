import dotenv from 'dotenv';
import { loadPrompt } from '../shared/prompt-loader.js';
import { callAI, parseJSONResponse } from '../shared/ai-client.js';
import { logInfo, logError, logDebug } from '../shared/logger.js';
import { costTracker } from '../shared/cost-tracker.js';

dotenv.config();

/**
 * Check how well a prospect matches the ICP (Ideal Customer Profile)
 *
 * Returns a relevance score (0-100) and recommendation
 *
 * @param {object} prospect - Prospect data
 * @param {object} brief - ICP brief
 * @param {object} options - Options object
 * @param {string} options.modelOverride - Optional model to use instead of prompt default
 * @param {object} options.customPrompt - Optional custom prompt configuration
 * @returns {Promise<object>} Relevance score and analysis
 */
export async function checkRelevance(prospect, brief, options = {}) {
  // Support legacy signature: checkRelevance(prospect, brief, modelOverride)
  const opts = typeof options === 'string' ? { modelOverride: options } : options;
  const { modelOverride, customPrompt } = opts;

  try {
    logDebug('Checking ICP relevance with AI', {
      company: prospect.company_name,
      industry: prospect.industry,
      model: modelOverride || (customPrompt?.model) || 'default'
    });

    // Prepare variables for prompt
    const variables = {
      icp_industry: brief.industry || 'business',
      icp_city: brief.city || '',
      icp_target: brief.target || '',
      icp_niches: (brief.icp?.niches || []).join(', ') || brief.industry || '',
      company_name: prospect.company_name || 'Unknown',
      company_industry: prospect.industry || 'Unknown',
      company_city: prospect.city || 'Unknown',
      company_state: prospect.state || 'Unknown',
      company_rating: prospect.google_rating || 'N/A',
      company_reviews: prospect.google_review_count || '0',
      company_description: prospect.description || 'N/A',
      company_services: Array.isArray(prospect.services) ? prospect.services.join(', ') : 'N/A',
      website_status: prospect.website_status || 'unknown',
      social_count: countSocialProfiles(prospect.social_profiles)
    };

    // Use custom prompt if provided, otherwise load default
    let prompt;
    if (customPrompt) {
      logInfo('Using custom prompt for relevance check');
      const { substituteVariables } = await import('../shared/prompt-loader.js');
      prompt = {
        name: customPrompt.name,
        model: customPrompt.model,
        temperature: customPrompt.temperature,
        systemPrompt: customPrompt.systemPrompt,
        userPrompt: substituteVariables(customPrompt.userPromptTemplate, variables, customPrompt.variables)
      };
    } else {
      // Load default prompt from file
      prompt = loadPrompt('07-relevance-check', variables);
    }

    // Use model override if provided, otherwise use prompt model
    const model = modelOverride || prompt.model;

    // Call AI
    const result = await callAI({
      model,
      systemPrompt: prompt.systemPrompt,
      userPrompt: prompt.userPrompt,
      temperature: prompt.temperature,
      maxTokens: 500,
      jsonMode: true
    });

    // Track cost
    if (result.usage) {
      costTracker.trackGrokAi(result.usage);
    }

    // Parse JSON response
    const parsedResult = parseJSONResponse(result.content);

    // Validate result
    if (typeof parsedResult.score !== 'number' || typeof parsedResult.is_relevant !== 'boolean') {
      throw new Error('Invalid response format');
    }

    logInfo('ICP relevance checked', {
      company: prospect.company_name,
      score: parsedResult.score,
      is_relevant: parsedResult.is_relevant,
      model
    });

    return {
      score: parsedResult.score,
      isRelevant: parsedResult.is_relevant,
      reasoning: parsedResult.reasoning || '',
      recommendation: parsedResult.recommendation || '',
      breakdown: {
        industryMatch: parsedResult.industry_match || 0,
        locationMatch: parsedResult.location_match || 0,
        qualityScore: parsedResult.quality_score || 0,
        presenceScore: parsedResult.presence_score || 0,
        dataScore: parsedResult.data_score || 0
      }
    };

  } catch (error) {
    logError('Relevance check failed, using fallback', error, {
      company: prospect.company_name
    });

    // Fallback to rule-based scoring
    return calculateRuleBasedScore(prospect, brief);
  }
}

/**
 * Calculate relevance score using simple rules (fallback when AI is not available)
 *
 * @param {object} prospect - Prospect data
 * @param {object} brief - ICP brief
 * @returns {object} Relevance score
 */
function calculateRuleBasedScore(prospect, brief) {
  let score = 0;
  const breakdown = {
    industryMatch: 0,
    locationMatch: 0,
    qualityScore: 0,
    presenceScore: 0,
    dataScore: 0
  };

  // Industry match (40 points)
  if (prospect.industry) {
    const prospectIndustry = prospect.industry.toLowerCase();
    const targetIndustry = (brief.industry || '').toLowerCase();

    if (prospectIndustry.includes(targetIndustry) || targetIndustry.includes(prospectIndustry)) {
      breakdown.industryMatch = 40;
      score += 40;
    } else if (prospectIndustry && targetIndustry) {
      breakdown.industryMatch = 10;
      score += 10; // Partial match
    }
  }

  // Location match (20 points)
  if (prospect.city && brief.city) {
    const prospectCity = prospect.city.toLowerCase();
    const targetCity = brief.city.toLowerCase();

    if (prospectCity.includes(targetCity) || targetCity.includes(prospectCity)) {
      breakdown.locationMatch = 20;
      score += 20;
    } else if (prospect.state && brief.city && brief.city.includes(prospect.state)) {
      breakdown.locationMatch = 10;
      score += 10; // Same state
    }
  }

  // Quality score (20 points)
  if (prospect.google_rating) {
    const rating = parseFloat(prospect.google_rating);
    if (rating >= 4.5) {
      breakdown.qualityScore = 20;
      score += 20;
    } else if (rating >= 4.0) {
      breakdown.qualityScore = 15;
      score += 15;
    } else if (rating >= 3.5) {
      breakdown.qualityScore = 10;
      score += 10;
    } else {
      breakdown.qualityScore = 5;
      score += 5;
    }
  }

  // Online presence (10 points)
  const hasWebsite = prospect.website_status === 'active';
  const socialCount = countSocialProfiles(prospect.social_profiles);

  if (hasWebsite && socialCount > 0) {
    breakdown.presenceScore = 10;
    score += 10;
  } else if (hasWebsite) {
    breakdown.presenceScore = 7;
    score += 7;
  } else {
    breakdown.presenceScore = 3;
    score += 3;
  }

  // Data completeness (10 points)
  let dataPoints = 0;
  if (prospect.contact_email) dataPoints++;
  if (prospect.contact_phone) dataPoints++;
  if (prospect.description) dataPoints++;
  if (prospect.services && prospect.services.length > 0) dataPoints++;

  breakdown.dataScore = Math.min(10, dataPoints * 2.5);
  score += breakdown.dataScore;

  const isRelevant = score >= 60;

  logDebug('Rule-based relevance score calculated', {
    company: prospect.company_name,
    score,
    is_relevant: isRelevant
  });

  return {
    score: Math.round(score),
    isRelevant,
    reasoning: `Rule-based scoring: Industry (${breakdown.industryMatch}), Location (${breakdown.locationMatch}), Quality (${breakdown.qualityScore}), Presence (${breakdown.presenceScore}), Data (${breakdown.dataScore}). Total: ${Math.round(score)}`,
    recommendation: isRelevant ? 'Relevant prospect' : 'Below relevance threshold',
    breakdown
  };
}

/**
 * Count number of social profiles found
 *
 * @param {object} profiles - Social profiles object
 * @returns {number} Count
 */
function countSocialProfiles(profiles) {
  if (!profiles || typeof profiles !== 'object') return 0;

  return Object.keys(profiles).filter(k => profiles[k]).length;
}

export default { checkRelevance };
