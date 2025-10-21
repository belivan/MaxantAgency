/**
 * Lead Priority Scorer - Uses AI to evaluate lead quality
 *
 * Cost: ~$0.012 per lead evaluation
 * Evaluates: quality gap, budget likelihood, urgency, industry fit, company size, engagement
 */

import { loadPrompt } from '../shared/prompt-loader.js';
import { callAI, parseJSONResponse } from '../shared/ai-client.js';

/**
 * Score lead priority using AI evaluation
 *
 * @param {object} leadData - Complete lead analysis data
 * @param {string} leadData.company_name - Company name
 * @param {string} leadData.industry - Industry type
 * @param {string} leadData.url - Website URL
 * @param {string} leadData.location - Business location
 * @param {string} leadData.website_grade - Overall grade (A-F)
 * @param {number} leadData.overall_score - Overall score (0-100)
 * @param {number} leadData.design_score - Design score
 * @param {number} leadData.seo_score - SEO score
 * @param {number} leadData.content_score - Content score
 * @param {number} leadData.social_score - Social score
 * @param {string} leadData.tech_stack - Detected tech stack
 * @param {number} leadData.page_load_time - Load time in ms
 * @param {boolean} leadData.is_mobile_friendly - Mobile optimization
 * @param {boolean} leadData.has_https - HTTPS enabled
 * @param {array} leadData.design_issues - Design issues found
 * @param {array} leadData.quick_wins - Quick win opportunities
 * @param {object} leadData.top_issue - Most critical issue
 * @param {string} leadData.one_liner - One-line summary
 * @param {string} leadData.social_presence - Social media presence
 * @param {boolean} leadData.has_email - Has contact email
 * @returns {Promise<object>} Lead priority scoring results
 */
export async function scoreLeadPriority(leadData) {
  try {
    // Format data for prompt
    const city = leadData.city || '';
    const state = leadData.state || '';
    const location = city && state ? `${city}, ${state}` : city || state || 'Unknown';

    const designIssuesText = Array.isArray(leadData.design_issues) && leadData.design_issues.length > 0
      ? leadData.design_issues.map((issue, i) => `${i + 1}. ${issue.title || issue}: ${issue.description || ''}`).join('\n')
      : 'No major design issues identified';

    const quickWinsText = Array.isArray(leadData.quick_wins) && leadData.quick_wins.length > 0
      ? leadData.quick_wins.map((win, i) => `${i + 1}. ${win.title || win}`).join('\n')
      : 'No quick wins identified';

    const topIssueText = leadData.top_issue
      ? `${leadData.top_issue.title || 'Issue'}: ${leadData.top_issue.description || leadData.top_issue.impact || ''}`
      : 'No critical issues';

    const socialPresenceText = leadData.social_platforms_present && leadData.social_platforms_present.length > 0
      ? leadData.social_platforms_present.join(', ')
      : 'No social media detected';

    // Format business intelligence data
    const pricingRangeText = leadData.pricing_range && leadData.pricing_range.min && leadData.pricing_range.max
      ? `$${leadData.pricing_range.min} - $${leadData.pricing_range.max}`
      : 'Not available';

    const premiumFeaturesText = Array.isArray(leadData.premium_features) && leadData.premium_features.length > 0
      ? leadData.premium_features.join(', ')
      : 'None detected';

    // Load lead priority scoring prompt
    const prompt = await loadPrompt('lead-qualification/lead-priority-scorer', {
      company_name: leadData.company_name || 'Unknown Company',
      industry: leadData.industry || 'Unknown',
      url: leadData.url || '',
      city: leadData.city || 'Unknown',
      state: leadData.state || 'Unknown',

      // Website Quality
      website_grade: leadData.website_grade || 'N/A',
      overall_score: String(leadData.overall_score || 0),
      design_score: String(leadData.design_score || 0),
      seo_score: String(leadData.seo_score || 0),
      content_score: String(leadData.content_score || 0),
      social_score: String(leadData.social_score || 0),
      is_mobile_friendly: leadData.is_mobile_friendly ? 'Yes' : 'No',
      has_https: leadData.has_https ? 'Yes' : 'No',
      page_load_time: String(leadData.page_load_time || 0),
      tech_stack: leadData.tech_stack || 'Unknown',

      // Issues & Opportunities
      top_issue: topIssueText,
      quick_wins_count: String(Array.isArray(leadData.quick_wins) ? leadData.quick_wins.length : 0),
      design_issues_count: String(Array.isArray(leadData.design_issues) ? leadData.design_issues.length : 0),

      // Business Intelligence
      years_in_business: leadData.years_in_business ? String(leadData.years_in_business) : 'Unknown',
      founded_year: leadData.founded_year ? String(leadData.founded_year) : 'Unknown',
      employee_count: leadData.employee_count ? String(leadData.employee_count) : 'Unknown',
      location_count: leadData.location_count ? String(leadData.location_count) : 'Unknown',
      pricing_visible: leadData.pricing_visible ? 'Yes' : 'No',
      pricing_range: pricingRangeText,
      blog_active: leadData.blog_active ? 'Yes' : 'No',
      content_last_update: leadData.content_last_update || 'Unknown',
      decision_maker_email: leadData.decision_maker_email ? 'Yes' : 'No',
      decision_maker_phone: leadData.decision_maker_phone ? 'Yes' : 'No',
      owner_name: leadData.owner_name || 'Unknown',
      premium_features: premiumFeaturesText,
      budget_indicator: leadData.budget_indicator || 'Unknown',
      pages_crawled: String(leadData.pages_crawled || 1),

      // Contact Info
      contact_email: leadData.contact_email || 'Not found',
      social_platforms_present: socialPresenceText
    });

    // Call AI API
    const response = await callAI({
      model: prompt.model,
      systemPrompt: prompt.systemPrompt,
      userPrompt: prompt.userPrompt,
      temperature: prompt.temperature,
      jsonMode: true
    });

    // Parse JSON response (extract content from response object)
    const result = parseJSONResponse(response.content);

    // Validate and normalize result
    const normalizedResult = {
      lead_priority: Math.max(0, Math.min(100, Math.round(result.lead_priority || 0))),
      priority_tier: validatePriorityTier(result.priority_tier),
      budget_likelihood: validateBudgetLikelihood(result.budget_likelihood),
      fit_score: Math.max(0, Math.min(100, Math.round(result.fit_score || 0))),

      // Dimension breakdown
      quality_gap_score: Math.max(0, Math.min(25, Math.round(result.quality_gap_score || 0))),
      budget_score: Math.max(0, Math.min(25, Math.round(result.budget_score || 0))),
      urgency_score: Math.max(0, Math.min(20, Math.round(result.urgency_score || 0))),
      industry_fit_score: Math.max(0, Math.min(15, Math.round(result.industry_fit_score || 0))),
      company_size_score: Math.max(0, Math.min(10, Math.round(result.company_size_score || 0))),
      engagement_score: Math.max(0, Math.min(5, Math.round(result.engagement_score || 0))),

      // Reasoning
      reasoning: result.reasoning || 'No reasoning provided'
    };

    // Build comprehensive reasoning text
    const reasoningText = buildReasoningText(normalizedResult);

    return {
      ...normalizedResult,
      lead_priority_reasoning: reasoningText,
      _metadata: {
        analyzer: 'lead-scorer',
        version: '2.0',
        model: prompt.model,
        timestamp: new Date().toISOString()
      }
    };

  } catch (error) {
    console.error('Lead scoring failed:', error);

    // Return default low priority on error
    return {
      lead_priority: 25,
      priority_tier: 'cold',
      budget_likelihood: 'low',
      fit_score: 25,
      quality_gap_score: 5,
      budget_score: 5,
      urgency_score: 5,
      industry_fit_score: 5,
      company_size_score: 3,
      engagement_score: 2,
      reasoning: `Lead scoring failed: ${error.message}. Defaulting to low priority.`,
      lead_priority_reasoning: `Lead Priority: 25/100 (COLD)\nFit Score: 25/100\nBudget Likelihood: LOW\n\nDIMENSION SCORES:\n- Quality Gap: 5/25\n- Budget: 5/25\n- Urgency: 5/20\n- Industry Fit: 5/15\n- Company Size: 3/10\n- Engagement: 2/5\n\nAI ASSESSMENT:\nLead scoring failed: ${error.message}. Defaulting to low priority.`,
      _metadata: {
        analyzer: 'lead-scorer',
        version: '2.0',
        error: error.message,
        timestamp: new Date().toISOString()
      }
    };
  }
}

/**
 * Validate priority tier value
 */
function validatePriorityTier(tier) {
  const validTiers = ['hot', 'warm', 'cold'];
  return validTiers.includes(tier) ? tier : 'cold';
}

/**
 * Validate budget likelihood value
 */
function validateBudgetLikelihood(likelihood) {
  const validLikelihoods = ['high', 'medium', 'low'];
  return validLikelihoods.includes(likelihood) ? likelihood : 'low';
}

/**
 * Build comprehensive reasoning text from AI response
 */
function buildReasoningText(result) {
  const sections = [];

  // Priority summary
  sections.push(`Lead Priority: ${result.lead_priority}/100 (${result.priority_tier.toUpperCase()})`);
  sections.push(`Fit Score: ${result.fit_score}/100`);
  sections.push(`Budget Likelihood: ${result.budget_likelihood.toUpperCase()}`);

  // Dimension breakdown
  sections.push('\nDIMENSION SCORES:');
  sections.push(`- Quality Gap: ${result.quality_gap_score}/25`);
  sections.push(`- Budget: ${result.budget_score}/25`);
  sections.push(`- Urgency: ${result.urgency_score}/20`);
  sections.push(`- Industry Fit: ${result.industry_fit_score}/15`);
  sections.push(`- Company Size: ${result.company_size_score}/10`);
  sections.push(`- Engagement: ${result.engagement_score}/5`);

  // AI reasoning
  if (result.reasoning) {
    sections.push(`\nAI ASSESSMENT:\n${result.reasoning}`);
  }

  return sections.join('\n');
}
