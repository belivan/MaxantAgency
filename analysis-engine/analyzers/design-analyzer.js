/**
 * Design Analyzer - Uses GPT-4o Vision to analyze website screenshots
 *
 * Most expensive analysis (~$0.015 per call) but critical for web design agency value prop
 */

import { loadPrompt } from '../shared/prompt-loader.js';
import { callAI, parseJSONResponse } from '../shared/ai-client.js';

/**
 * Analyze website design using GPT-4o Vision
 *
 * @param {string} url - Website URL
 * @param {Buffer|string} screenshot - Screenshot as buffer or base64 string
 * @param {object} context - Additional context
 * @param {string} context.company_name - Company name
 * @param {string} context.industry - Industry type
 * @param {string} context.tech_stack - Tech stack info
 * @param {number} context.load_time - Page load time in seconds
 * @param {object} customPrompt - Custom prompt configuration (optional)
 * @returns {Promise<object>} Design analysis results
 */
export async function analyzeDesign(url, screenshot, context = {}, customPrompt = null) {
  try {
    // Variables for prompt substitution
    const variables = {
      company_name: context.company_name || 'this business',
      industry: context.industry || 'unknown industry',
      url: url,
      tech_stack: context.tech_stack || 'unknown',
      load_time: context.load_time || 'unknown'
    };

    // Use custom prompt if provided, otherwise load default
    let prompt;
    if (customPrompt) {
      console.log('[Design Analyzer] Using custom prompt configuration');
      // Substitute variables in custom prompt
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
      // Load default prompt from file
      prompt = await loadPrompt('web-design/design-critique', variables);
    }

    // Call GPT-4o Vision API with screenshot
    const response = await callAI({
      model: prompt.model,
      systemPrompt: prompt.systemPrompt,
      userPrompt: prompt.userPrompt,
      temperature: prompt.temperature,
      image: screenshot,  // callAI handles Buffer/base64 conversion
      jsonMode: true
    });

    // Debug logging
    console.log('[Design Analyzer] AI response received');
    console.log('[Design Analyzer] Content type:', typeof response.content);
    console.log('[Design Analyzer] Content length:', response.content ? response.content.length : 0);
    console.log('[Design Analyzer] First 200 chars:', response.content ? response.content.substring(0, 200) : 'null');

    // Parse response
    const result = parseJSONResponse(response.content);

    // Validate response structure
    validateDesignResponse(result);

    // Add metadata
    return {
      ...result,
      _meta: {
        analyzer: 'design',
        model: prompt.model,
        cost: response.cost,
        timestamp: new Date().toISOString()
      }
    };

  } catch (error) {
    console.error('Design analysis failed:', error);

    // Return graceful degradation
    return {
      overallDesignScore: 50,
      issues: [{
        category: 'error',
        severity: 'high',
        title: 'Design analysis failed',
        description: `Unable to analyze design: ${error.message}`,
        impact: 'Cannot provide design recommendations',
        recommendation: 'Manual review recommended',
        priority: 'high'
      }],
      positives: [],
      quickWinCount: 0,
      _meta: {
        analyzer: 'design',
        error: error.message,
        timestamp: new Date().toISOString()
      }
    };
  }
}

/**
 * Validate design analysis response structure
 */
function validateDesignResponse(result) {
  const required = ['overallDesignScore', 'issues', 'positives'];

  for (const field of required) {
    if (!(field in result)) {
      throw new Error(`Design response missing required field: ${field}`);
    }
  }

  if (typeof result.overallDesignScore !== 'number' ||
      result.overallDesignScore < 0 ||
      result.overallDesignScore > 100) {
    throw new Error('overallDesignScore must be number between 0-100');
  }

  if (!Array.isArray(result.issues)) {
    throw new Error('issues must be an array');
  }

  if (!Array.isArray(result.positives)) {
    throw new Error('positives must be an array');
  }
}

/**
 * Count quick-win issues in results
 */
export function countQuickWins(designResults) {
  if (!designResults || !designResults.issues) return 0;

  return designResults.issues.filter(issue =>
    issue.effort === 'quick-win' ||
    issue.priority === 'quick-win' ||
    (issue.effort && issue.effort.includes('minute'))
  ).length;
}

export default {
  analyzeDesign,
  countQuickWins
};
