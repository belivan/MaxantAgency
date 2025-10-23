/**
 * Desktop Visual Analyzer - Uses GPT-5 Vision to analyze desktop screenshot
 *
 * Cost: ~$0.015 per analysis
 * Analyzes: desktop layout, navigation, typography, visual hierarchy, design issues
 */

import { loadPrompt } from '../shared/prompt-loader.js';
import { callAI, parseJSONResponse } from '../shared/ai-client.js';

/**
 * Analyze desktop visual design using GPT-4o Vision (Multi-page version)
 *
 * @param {array} pages - Array of page objects
 * @param {string} pages[].url - Page URL (relative path)
 * @param {string} pages[].fullUrl - Full URL
 * @param {object} pages[].screenshots - Screenshot buffers
 * @param {Buffer} pages[].screenshots.desktop - Desktop screenshot buffer
 * @param {object} context - Additional context
 * @param {string} context.company_name - Company name
 * @param {string} context.industry - Industry type
 * @param {string} context.baseUrl - Base website URL
 * @param {string} context.tech_stack - Technology stack
 * @param {object} customPrompt - Custom prompt configuration (optional)
 * @returns {Promise<object>} Desktop visual analysis results (aggregated from all pages)
 */
export async function analyzeDesktopVisual(pages, context = {}, customPrompt = null) {
  try {
    console.log(`[Desktop Visual Analyzer] Analyzing ${pages.length} desktop screenshots...`);

    // Validate all screenshots
    for (const page of pages) {
      if (!page.screenshots?.desktop || !Buffer.isBuffer(page.screenshots.desktop)) {
        throw new Error(`Missing or invalid desktop screenshot for page: ${page.url}`);
      }
    }

    // For multi-page analysis, we'll analyze the first 3 pages individually,
    // then look for design consistency patterns
    const pagesToAnalyze = pages.slice(0, 3);

    // Analyze each page individually
    const individualResults = [];
    let totalCost = 0;

    let lastPromptModel = null;

    for (const page of pagesToAnalyze) {
      console.log(`[Desktop Visual Analyzer] Analyzing page: ${page.url}`);

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
        prompt = await loadPrompt('web-design/desktop-visual-analysis', variables);
      }

      // Call GPT-4o Vision API with screenshot
      const response = await callAI({
        model: prompt.model,
        systemPrompt: prompt.systemPrompt,
        userPrompt: prompt.userPrompt,
        temperature: prompt.temperature,
        image: page.screenshots.desktop,
        jsonMode: true
      });

      const modelUsed = response.model || prompt.model;
      lastPromptModel = modelUsed;

      // Parse JSON response
      const result = parseJSONResponse(response.content);
      validateDesktopVisualResponse(result);

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

    // Detect design consistency issues across pages
    const consistencyIssues = detectDesignConsistency(individualResults);

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
        analyzer: 'desktop-visual',
        model: resolvedModel,
        cost: totalCost,
        timestamp: new Date().toISOString(),
        pagesAnalyzed: pagesToAnalyze.length,
        totalScreenshotSize: pages.reduce((sum, p) => sum + (p.screenshots?.desktop?.length || 0), 0),
        individualResults: individualResults.map(r => ({
          url: r.url,
          score: r.visualScore,
          issueCount: r.issues.length
        }))
      }
    };

  } catch (error) {
    console.error('Desktop visual analysis failed:', error);

    // Return graceful degradation
    const fallbackModel = customPrompt?.model || 'gpt-5';
    return {
      model: fallbackModel,
      visualScore: 30,
      issues: [{
        category: 'error',
        severity: 'high',
        title: 'Desktop visual analysis failed',
        description: `Unable to analyze desktop screenshots: ${error.message}`,
        impact: 'Cannot provide desktop-specific design recommendations',
        recommendation: 'Manual desktop design audit recommended',
        priority: 'high',
        difficulty: 'unknown'
      }],
      positives: [],
      quickWinCount: 0,
      _meta: {
        analyzer: 'desktop-visual',
        model: fallbackModel,
        error: error.message,
        timestamp: new Date().toISOString()
      }
    };
  }
}

/**
 * LEGACY: Analyze single page desktop visual (backward compatibility)
 * Use analyzeDesktopVisual() with array for new implementations
 */
export async function analyzeDesktopVisualSinglePage(url, screenshotBuffer, context = {}, customPrompt = null) {
  const pages = [{
    url: url,
    fullUrl: url,
    screenshots: {
      desktop: screenshotBuffer
    }
  }];

  return analyzeDesktopVisual(pages, { ...context, baseUrl: url }, customPrompt);
}

/**
 * Detect design consistency issues across multiple pages
 */
function detectDesignConsistency(individualResults) {
  const issues = [];

  if (individualResults.length < 2) {
    return issues; // Need at least 2 pages to compare
  }

  // Check score variance (inconsistent quality across pages)
  const scores = individualResults.map(r => r.visualScore);
  const avgScore = scores.reduce((sum, s) => sum + s, 0) / scores.length;
  const variance = scores.reduce((sum, s) => sum + Math.pow(s - avgScore, 2), 0) / scores.length;
  const stdDev = Math.sqrt(variance);

  if (stdDev > 15) {
    issues.push({
      category: 'consistency',
      severity: 'medium',
      title: 'Inconsistent design quality across pages',
      description: `Design scores vary significantly (std dev: ${Math.round(stdDev)}). Some pages are well-designed while others need improvement.`,
      impact: 'Unprofessional appearance, confusing user experience',
      recommendation: 'Apply consistent design standards across all pages',
      priority: 'medium',
      difficulty: 'medium',
      affectedPages: individualResults.map(r => ({ url: r.url, score: r.visualScore }))
    });
  }

  // Check for common issues across ALL pages (site-wide problems)
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

  // Find issues that appear on ALL pages
  Object.values(issuesByCategory).forEach(({ issue, count, pages }) => {
    if (count === individualResults.length) {
      issues.push({
        ...issue,
        category: 'site-wide',
        title: `Site-wide issue: ${issue.title}`,
        description: `This issue appears on all ${count} analyzed pages: ${issue.description}`,
        affectedPages: pages
      });
    }
  });

  return issues;
}

/**
 * Validate desktop visual analysis response
 */
function validateDesktopVisualResponse(result) {
  const required = ['visualScore', 'issues'];

  for (const field of required) {
    if (!(field in result)) {
      throw new Error(`Desktop visual response missing required field: ${field}`);
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
 * Count high-priority desktop visual issues
 *
 * @param {object} desktopVisualResults - Results from analyzeDesktopVisual
 * @returns {number} Count of critical issues
 */
export function countCriticalDesktopIssues(desktopVisualResults) {
  if (!desktopVisualResults || !desktopVisualResults.issues) return 0;

  return desktopVisualResults.issues.filter(issue =>
    issue.severity === 'critical' ||
    issue.priority === 'high' ||
    issue.difficulty === 'quick-win'
  ).length;
}

export default {
  analyzeDesktopVisual,
  countCriticalDesktopIssues
};
