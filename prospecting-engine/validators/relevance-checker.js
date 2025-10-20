import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import { loadPrompt } from '../shared/prompt-loader.js';
import { logInfo, logError, logDebug } from '../shared/logger.js';
import { costTracker } from '../shared/cost-tracker.js';

// Load env from this package then fall back to website-audit-tool/.env
dotenv.config();
try {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const auditEnv = path.resolve(__dirname, '../../website-audit-tool/.env');
  if (fs.existsSync(auditEnv)) {
    dotenv.config({ path: auditEnv, override: false });
  }
} catch {}

const GROK_API_ENDPOINT = 'https://api.x.ai/v1/chat/completions';

/**
 * Check how well a prospect matches the ICP (Ideal Customer Profile)
 *
 * Returns a relevance score (0-100) and recommendation
 *
 * @param {object} prospect - Prospect data
 * @param {object} brief - ICP brief
 * @returns {Promise<object>} Relevance score and analysis
 */
export async function checkRelevance(prospect, brief) {
  const apiKey = process.env.XAI_API_KEY;

  if (!apiKey) {
    // Fallback to simple rule-based scoring
    logDebug('XAI_API_KEY not set, using rule-based scoring');
    return calculateRuleBasedScore(prospect, brief);
  }

  try {
    logDebug('Checking ICP relevance with AI', {
      company: prospect.company_name,
      industry: prospect.industry
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

    // Load prompt template
    const prompt = loadPrompt('07-relevance-check', variables);

    // Call Grok API
    const response = await fetch(GROK_API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: prompt.model,
        messages: [
          {
            role: 'system',
            content: prompt.systemPrompt
          },
          {
            role: 'user',
            content: prompt.userPrompt
          }
        ],
        temperature: prompt.temperature,
        max_tokens: 500
      })
    });

    if (!response.ok) {
      throw new Error(`Grok API error: ${response.status}`);
    }

    const data = await response.json();

    // Track cost
    if (data.usage) {
      costTracker.trackGrokAi(data.usage);
    }

    // Extract and parse response
    const content = data.choices?.[0]?.message?.content || '{}';

    let result;
    try {
      // Try to parse JSON (Grok might wrap in markdown)
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) ||
                       content.match(/```\n([\s\S]*?)\n```/) ||
                       [null, content];

      result = JSON.parse(jsonMatch[1] || content);

      // Validate result
      if (typeof result.score !== 'number' || typeof result.is_relevant !== 'boolean') {
        throw new Error('Invalid response format');
      }

      logInfo('ICP relevance checked', {
        company: prospect.company_name,
        score: result.score,
        is_relevant: result.is_relevant
      });

      return {
        score: result.score,
        isRelevant: result.is_relevant,
        reasoning: result.reasoning || '',
        recommendation: result.recommendation || '',
        breakdown: {
          industryMatch: result.industry_match || 0,
          locationMatch: result.location_match || 0,
          qualityScore: result.quality_score || 0,
          presenceScore: result.presence_score || 0,
          dataScore: result.data_score || 0
        }
      };

    } catch (parseError) {
      logError('Failed to parse relevance check response', parseError, {
        content: content.slice(0, 200)
      });

      // Fallback to rule-based scoring
      return calculateRuleBasedScore(prospect, brief);
    }

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
