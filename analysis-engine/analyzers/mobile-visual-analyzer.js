/**
 * Mobile Visual Analyzer - Uses GPT-4o Vision to analyze mobile screenshot
 *
 * Cost: ~$0.015 per analysis
 * Analyzes: mobile layout, touch targets, navigation, typography, mobile UX issues
 */

import { loadPrompt } from '../shared/prompt-loader.js';
import { callAI, parseJSONResponse } from '../shared/ai-client.js';

/**
 * Analyze mobile visual design using GPT-4o Vision
 *
 * @param {string} url - Website URL
 * @param {Buffer} screenshotBuffer - Mobile screenshot as Buffer
 * @param {object} context - Additional context
 * @param {string} context.company_name - Company name
 * @param {string} context.industry - Industry type
 * @param {string} context.url - Website URL (same as first param, for consistency)
 * @param {string} context.tech_stack - Technology stack
 * @param {number} context.load_time - Page load time in milliseconds
 * @param {object} customPrompt - Custom prompt configuration (optional)
 * @returns {Promise<object>} Mobile visual analysis results
 */
export async function analyzeMobileVisual(url, screenshotBuffer, context = {}, customPrompt = null) {
  try {
    // Validate screenshot buffer
    if (!Buffer.isBuffer(screenshotBuffer)) {
      throw new Error('screenshotBuffer must be a Buffer');
    }

    // Variables for prompt substitution
    const variables = {
      company_name: context.company_name || 'this business',
      industry: context.industry || 'unknown industry',
      url: url,
      tech_stack: context.tech_stack || 'unknown',
      load_time: context.load_time ? String(context.load_time) : 'unknown'
    };

    // Use custom prompt if provided, otherwise load default
    let prompt;
    if (customPrompt) {
      console.log('[Mobile Visual Analyzer] Using custom prompt configuration');
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
      prompt = await loadPrompt('web-design/mobile-visual-analysis', variables);
    }

    // Call GPT-4o Vision API with screenshot
    const response = await callAI({
      model: prompt.model,
      systemPrompt: prompt.systemPrompt,
      userPrompt: prompt.userPrompt,
      temperature: prompt.temperature,
      image: screenshotBuffer,
      jsonMode: true
    });

    // Parse JSON response
    const result = parseJSONResponse(response.content);

    // Validate response
    validateMobileVisualResponse(result);

    // Add metadata
    return {
      ...result,
      _meta: {
        analyzer: 'mobile-visual',
        model: prompt.model,
        cost: response.cost,
        timestamp: new Date().toISOString(),
        screenshotSize: screenshotBuffer.length
      }
    };

  } catch (error) {
    console.error('Mobile visual analysis failed:', error);

    // Return graceful degradation
    return {
      visualScore: 50,
      issues: [{
        category: 'error',
        severity: 'high',
        title: 'Mobile visual analysis failed',
        description: `Unable to analyze mobile screenshot: ${error.message}`,
        impact: 'Cannot provide mobile-specific design recommendations',
        recommendation: 'Manual mobile design audit recommended',
        priority: 'high',
        difficulty: 'unknown'
      }],
      positives: [],
      quickWinCount: 0,
      _meta: {
        analyzer: 'mobile-visual',
        error: error.message,
        timestamp: new Date().toISOString()
      }
    };
  }
}

/**
 * Validate mobile visual analysis response
 */
function validateMobileVisualResponse(result) {
  const required = ['visualScore', 'issues'];

  for (const field of required) {
    if (!(field in result)) {
      throw new Error(`Mobile visual response missing required field: ${field}`);
    }
  }

  if (typeof result.visualScore !== 'number' ||
      result.visualScore < 0 ||
      result.visualScore > 100) {
    throw new Error('visualScore must be number between 0-100');
  }

  if (!Array.isArray(result.issues)) {
    throw new Error('issues must be an array');
  }

  // Validate positives if present
  if (result.positives && !Array.isArray(result.positives)) {
    throw new Error('positives must be an array');
  }
}

/**
 * Count high-priority mobile visual issues
 *
 * @param {object} mobileVisualResults - Results from analyzeMobileVisual
 * @returns {number} Count of critical issues
 */
export function countCriticalMobileIssues(mobileVisualResults) {
  if (!mobileVisualResults || !mobileVisualResults.issues) return 0;

  return mobileVisualResults.issues.filter(issue =>
    issue.severity === 'critical' ||
    issue.priority === 'high' ||
    issue.difficulty === 'quick-win'
  ).length;
}

export default {
  analyzeMobileVisual,
  countCriticalMobileIssues
};
