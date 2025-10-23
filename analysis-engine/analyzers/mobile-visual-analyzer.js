/**
 * Mobile Visual Analyzer - Uses GPT-5 Vision to analyze mobile screenshot
 *
 * Cost: ~$0.015 per analysis
 * Analyzes: mobile layout, touch targets, navigation, typography, mobile UX issues
 */

import { loadPrompt } from '../shared/prompt-loader.js';
import { callAI, parseJSONResponse } from '../shared/ai-client.js';

/**
 * Analyze mobile visual design using GPT-4o Vision (Multi-page version)
 *
 * @param {array} pages - Array of page objects
 * @param {string} pages[].url - Page URL (relative path)
 * @param {string} pages[].fullUrl - Full URL
 * @param {object} pages[].screenshots - Screenshot buffers
 * @param {Buffer} pages[].screenshots.mobile - Mobile screenshot buffer
 * @param {object} context - Additional context
 * @param {string} context.company_name - Company name
 * @param {string} context.industry - Industry type
 * @param {string} context.baseUrl - Base website URL
 * @param {string} context.tech_stack - Technology stack
 * @param {object} customPrompt - Custom prompt configuration (optional)
 * @returns {Promise<object>} Mobile visual analysis results (aggregated from all pages)
 */
export async function analyzeMobileVisual(pages, context = {}, customPrompt = null) {
  try {
    console.log(`[Mobile Visual Analyzer] Analyzing ${pages.length} mobile screenshots...`);

    // Validate all screenshots
    for (const page of pages) {
      if (!page.screenshots?.mobile || !Buffer.isBuffer(page.screenshots.mobile)) {
        throw new Error(`Missing or invalid mobile screenshot for page: ${page.url}`);
      }
    }

    // For multi-page analysis, we'll analyze the first 3 pages individually,
    // then look for mobile UX consistency patterns
    const pagesToAnalyze = pages.slice(0, 3);

    // Analyze each page individually
    const individualResults = [];
    let totalCost = 0;

    let lastPromptModel = null;

    for (const page of pagesToAnalyze) {
      console.log(`[Mobile Visual Analyzer] Analyzing page: ${page.url}`);

      const variables = {
        company_name: context.company_name || 'this business',
        industry: context.industry || 'unknown industry',
        url: page.fullUrl || page.url,
        tech_stack: context.tech_stack || 'unknown',
        pageContext: `Page: ${page.url}`,
        totalPages: String(pages.length)
      };

      // Use custom prompt if provided, otherwise load default
      let prompt;
      if (customPrompt) {
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
        image: page.screenshots.mobile,
        jsonMode: true
      });

      const modelUsed = response.model || prompt.model;
      lastPromptModel = modelUsed;

      // Parse JSON response
      const result = parseJSONResponse(response.content);
      validateMobileVisualResponse(result);

      individualResults.push({
        url: page.url,
        _meta: {
          model: modelUsed,
          usage: response.usage || null
        },
        ...result
      });

      totalCost += response.cost || 0;
    }

    // Detect mobile UX consistency issues across pages
    const consistencyIssues = detectMobileConsistency(individualResults);

    // Aggregate scores (weighted average)
    const avgScore = Math.round(
      individualResults.reduce((sum, r) => sum + r.visualScore, 0) / individualResults.length
    );

    // Aggregate all issues
    const allIssues = [];
    individualResults.forEach(result => {
      result.issues.forEach(issue => {
        allIssues.push({
          ...issue,
          page: result.url
        });
      });
    });

    // Add consistency issues
    allIssues.push(...consistencyIssues);

    // Aggregate positives
    const allPositives = [];
    individualResults.forEach(result => {
      if (result.positives) {
        result.positives.forEach(positive => {
          allPositives.push({
            ...positive,
            page: result.url
          });
        });
      }
    });

    // Count quick wins across all pages
    const quickWinCount = allIssues.filter(issue => issue.difficulty === 'quick-win').length;

    // Add metadata
    const resolvedModel = lastPromptModel || customPrompt?.model || 'gpt-5';

    return {
      model: resolvedModel,
      visualScore: avgScore,
      issues: allIssues,
      positives: allPositives,
      quickWinCount,
      _meta: {
        analyzer: 'mobile-visual',
        model: resolvedModel,
        cost: totalCost,
        timestamp: new Date().toISOString(),
        pagesAnalyzed: pagesToAnalyze.length,
        totalScreenshotSize: pages.reduce((sum, p) => sum + (p.screenshots?.mobile?.length || 0), 0),
        individualResults: individualResults.map(r => ({
          url: r.url,
          score: r.visualScore,
          issueCount: r.issues.length
        }))
      }
    };

  } catch (error) {
    console.error('Mobile visual analysis failed:', error);

    // Return graceful degradation
    const fallbackModel = customPrompt?.model || 'gpt-5';
    return {
      model: fallbackModel,
      visualScore: 30,
      issues: [{
        category: 'error',
        severity: 'high',
        title: 'Mobile visual analysis failed',
        description: `Unable to analyze mobile screenshots: ${error.message}`,
        impact: 'Cannot provide mobile-specific design recommendations',
        recommendation: 'Manual mobile design audit recommended',
        priority: 'high',
        difficulty: 'unknown'
      }],
      positives: [],
      quickWinCount: 0,
      _meta: {
        analyzer: 'mobile-visual',
        model: fallbackModel,
        error: error.message,
        timestamp: new Date().toISOString()
      }
    };
  }
}

/**
 * LEGACY: Analyze single page mobile visual (backward compatibility)
 * Use analyzeMobileVisual() with array for new implementations
 */
export async function analyzeMobileVisualSinglePage(url, screenshotBuffer, context = {}, customPrompt = null) {
  const pages = [{
    url: url,
    fullUrl: url,
    screenshots: {
      mobile: screenshotBuffer
    }
  }];

  return analyzeMobileVisual(pages, { ...context, baseUrl: url }, customPrompt);
}

/**
 * Detect mobile UX consistency issues across multiple pages
 */
function detectMobileConsistency(individualResults) {
  const issues = [];

  if (individualResults.length < 2) {
    return issues; // Need at least 2 pages to compare
  }

  // Check score variance (inconsistent mobile UX quality across pages)
  const scores = individualResults.map(r => r.visualScore);
  const avgScore = scores.reduce((sum, s) => sum + s, 0) / scores.length;
  const variance = scores.reduce((sum, s) => sum + Math.pow(s - avgScore, 2), 0) / scores.length;
  const stdDev = Math.sqrt(variance);

  if (stdDev > 15) {
    issues.push({
      category: 'consistency',
      severity: 'medium',
      title: 'Inconsistent mobile UX quality across pages',
      description: `Mobile experience varies significantly (std dev: ${Math.round(stdDev)}). Some pages work well on mobile while others don't.`,
      impact: 'Frustrating mobile user experience, higher bounce rates',
      recommendation: 'Apply consistent mobile design patterns across all pages',
      priority: 'high',
      difficulty: 'medium',
      affectedPages: individualResults.map(r => ({ url: r.url, score: r.visualScore }))
    });
  }

  // Check for common mobile issues across ALL pages (site-wide problems)
  const issuesByCategory = {};
  individualResults.forEach(result => {
    result.issues.forEach(issue => {
      const key = issue.category + ':' + issue.title;
      if (!issuesByCategory[key]) {
        issuesByCategory[key] = {
          issue: issue,
          count: 0,
          pages: []
        };
      }
      issuesByCategory[key].count++;
      issuesByCategory[key].pages.push(result.url);
    });
  });

  // Find mobile issues that appear on ALL pages
  Object.values(issuesByCategory).forEach(({ issue, count, pages }) => {
    if (count === individualResults.length) {
      issues.push({
        ...issue,
        category: 'site-wide-mobile',
        title: `Site-wide mobile issue: ${issue.title}`,
        description: `This mobile issue appears on all ${count} analyzed pages: ${issue.description}`,
        affectedPages: pages
      });
    }
  });

  return issues;
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
