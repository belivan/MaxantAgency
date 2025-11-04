/**
 * Unified Visual Analyzer - Uses GPT-4o Vision to analyze BOTH desktop AND mobile screenshots
 *
 * Cost: ~$0.025 per analysis (down from $0.030 for separate calls)
 * Time: ~30s (down from ~40s for separate calls)
 *
 * Analyzes:
 * - Desktop layout, navigation, typography, visual hierarchy
 * - Mobile layout, touch targets, navigation, mobile UX
 * - Responsive design consistency between viewports
 * - Cross-viewport issues (layout breaks, content shifts)
 */

import { loadPrompt } from '../shared/prompt-loader.js';
import { callAI, parseJSONResponse } from '../../database-tools/shared/ai-client.js';
import { readFile } from 'fs/promises';

/**
 * Analyze visual design using GPT-4o Vision (Multi-page version with both viewports)
 *
 * @param {array} pages - Array of page objects
 * @param {string} pages[].url - Page URL (relative path)
 * @param {string} pages[].fullUrl - Full URL
 * @param {object} pages[].screenshots - Screenshot file paths (memory optimization)
 * @param {string} pages[].screenshots.desktop - Desktop screenshot file path (1920x1080)
 * @param {string} pages[].screenshots.mobile - Mobile screenshot file path (375x812)
 * @param {object} context - Additional context
 * @param {string} context.company_name - Company name
 * @param {string} context.industry - Industry type
 * @param {string} context.baseUrl - Base website URL
 * @param {string} context.tech_stack - Technology stack
 * @param {object} customPrompt - Custom prompt configuration (optional)
 * @returns {Promise<object>} Unified visual analysis results (desktop + mobile + responsive)
 */
export async function analyzeUnifiedVisual(pages, context = {}, customPrompt = null) {
  try {
    console.log(`[Unified Visual Analyzer] Analyzing ${pages.length} pages (desktop + mobile screenshots)...`);

    // Validate all screenshots (must have BOTH viewports as file paths)
    for (const page of pages) {
      if (!page.screenshots?.desktop || typeof page.screenshots.desktop !== 'string') {
        throw new Error(`Missing or invalid desktop screenshot path for page: ${page.url}`);
      }
      if (!page.screenshots?.mobile || typeof page.screenshots.mobile !== 'string') {
        throw new Error(`Missing or invalid mobile screenshot path for page: ${page.url}`);
      }
    }

    // For multi-page analysis, analyze the first 3 pages
    const pagesToAnalyze = pages.slice(0, 3);

    // Analyze each page (both viewports in a SINGLE AI call)
    const individualResults = [];
    let totalCost = 0;
    let lastPromptModel = null;

    for (const page of pagesToAnalyze) {
      console.log(`[Unified Visual Analyzer] Analyzing page: ${page.url} (both viewports)...`);

      // Extract design tokens from this page
      const designTokensDesktop = page.designTokens?.desktop || { fonts: [], colors: [], extractedAt: new Date().toISOString() };
      const designTokensMobile = page.designTokens?.mobile || { fonts: [], colors: [], extractedAt: new Date().toISOString() };

      const variables = {
        company_name: context.company_name || 'this business',
        industry: context.industry || 'unknown industry',
        url: page.fullUrl || page.url,
        tech_stack: context.tech_stack || 'unknown',
        pageContext: `Page: ${page.url}`,
        totalPages: String(pages.length),
        designTokensDesktop: JSON.stringify(designTokensDesktop, null, 2),
        designTokensMobile: JSON.stringify(designTokensMobile, null, 2)
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
          userPrompt: await substituteVariables(customPrompt.userPromptTemplate, variables, customPrompt.variables),
          outputFormat: customPrompt.outputFormat
        };
      } else {
        prompt = await loadPrompt('web-design/unified-visual-analysis', variables);
      }

      // Call centralized AI client with both desktop and mobile screenshots
      // Prepare images with smart split support
      // Import compression function to handle sections
      const { compressImageIfNeeded } = await import('../../database-tools/shared/ai-client.js');

      // Lazy-load screenshots from disk (memory optimization)
      // Screenshots are loaded only when needed for AI processing
      console.log(`[Unified Visual Analyzer] Loading screenshots from disk for ${page.url}...`);
      const desktopBuffer = await readFile(page.screenshots.desktop);
      const mobileBuffer = await readFile(page.screenshots.mobile);
      console.log(`[Unified Visual Analyzer] Screenshots loaded (Desktop: ${desktopBuffer.length} bytes, Mobile: ${mobileBuffer.length} bytes)`);

      const desktopProcessed = await compressImageIfNeeded(desktopBuffer);
      const mobileProcessed = await compressImageIfNeeded(mobileBuffer);

      // Build images array and description
      const images = [];
      const imageDescriptions = [];
      let imageCounter = 1;

      // Handle desktop (single image or sections)
      if (Array.isArray(desktopProcessed)) {
        desktopProcessed.forEach((section) => {
          images.push(section.buffer);
          imageDescriptions.push(`Screenshot ${imageCounter}: DESKTOP - ${section.label} SECTION`);
          imageCounter++;
        });
      } else {
        images.push(desktopProcessed);
        imageDescriptions.push(`Screenshot ${imageCounter}: DESKTOP viewport`);
        imageCounter++;
      }

      // Handle mobile (single image or sections)
      if (Array.isArray(mobileProcessed)) {
        mobileProcessed.forEach((section) => {
          images.push(section.buffer);
          imageDescriptions.push(`Screenshot ${imageCounter}: MOBILE - ${section.label} SECTION`);
          imageCounter++;
        });
      } else {
        images.push(mobileProcessed);
        imageDescriptions.push(`Screenshot ${imageCounter}: MOBILE viewport`);
        imageCounter++;
      }

      const imageContext = '\n\n**' + imageDescriptions.join(' | ') + '**';

      // Call centralized AI client with processed images
      const response = await callAI({
        model: prompt.model,
        systemPrompt: prompt.systemPrompt,
        userPrompt: prompt.userPrompt + imageContext,
        temperature: prompt.temperature,
        images: images,
        jsonMode: true
      });

      console.log(`[Unified Visual Analyzer] AI response (${response.usage?.total_tokens || 0} tokens, $${response.cost?.toFixed(4) || '0.0000'})`);

      const modelUsed = response.model || prompt.model;
      lastPromptModel = modelUsed;

      // Parse JSON response
      const result = parseJSONResponse(response.content);
      validateUnifiedVisualResponse(result);

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

    // Detect cross-page consistency issues
    const consistencyIssues = detectVisualConsistency(individualResults);

    // Aggregate scores (weighted average)
    const avgDesktopScore = Math.round(
      individualResults.reduce((sum, r) => sum + r.desktopScore, 0) / individualResults.length
    );
    const avgMobileScore = Math.round(
      individualResults.reduce((sum, r) => sum + r.mobileScore, 0) / individualResults.length
    );
    const avgResponsiveScore = Math.round(
      individualResults.reduce((sum, r) => sum + r.responsiveScore, 0) / individualResults.length
    );

    // Calculate overall visual score (weighted: desktop 40%, mobile 40%, responsive 20%)
    const overallScore = Math.round(
      (avgDesktopScore * 0.4) + (avgMobileScore * 0.4) + (avgResponsiveScore * 0.2)
    );

    // Aggregate all issues by viewport
    const desktopIssues = [];
    const mobileIssues = [];
    const responsiveIssues = [];
    const sharedIssues = [];

    individualResults.forEach(result => {
      // Desktop-specific issues
      result.desktopIssues?.forEach(issue => {
        desktopIssues.push({
          ...issue,
          page: result.url,
          viewport: 'desktop'
        });
      });

      // Mobile-specific issues
      result.mobileIssues?.forEach(issue => {
        mobileIssues.push({
          ...issue,
          page: result.url,
          viewport: 'mobile'
        });
      });

      // Responsive design issues
      result.responsiveIssues?.forEach(issue => {
        responsiveIssues.push({
          ...issue,
          page: result.url,
          viewport: 'responsive'
        });
      });

      // Shared issues (present in both viewports)
      result.sharedIssues?.forEach(issue => {
        sharedIssues.push({
          ...issue,
          page: result.url,
          viewport: 'both'
        });
      });
    });

    // Add consistency issues
    responsiveIssues.push(...consistencyIssues);

    // Aggregate positives
    const allPositives = [];
    individualResults.forEach(result => {
      if (result.positives) {
        result.positives.forEach(positive => {
          // Handle both string and object formats
          if (typeof positive === 'string') {
            allPositives.push({
              text: positive,
              page: result.url
            });
          } else if (typeof positive === 'object' && positive !== null) {
            // If it's already an object, just add the page
            allPositives.push({
              ...positive,
              page: result.url
            });
          }
        });
      }
    });

    // Count quick wins across all issues
    const allIssues = [...desktopIssues, ...mobileIssues, ...responsiveIssues, ...sharedIssues];
    const quickWinCount = allIssues.filter(issue => issue.difficulty === 'quick-win').length;

    // Add metadata
    const resolvedModel = lastPromptModel || customPrompt?.model || 'gpt-5';

    return {
      model: resolvedModel,

      // Scores
      overallVisualScore: overallScore,
      desktopScore: avgDesktopScore,
      mobileScore: avgMobileScore,
      responsiveScore: avgResponsiveScore,

      // Issues categorized by viewport
      desktopIssues,
      mobileIssues,
      responsiveIssues,
      sharedIssues,

      // Legacy compatibility (combine all for backward compat)
      visualScore: overallScore,
      issues: allIssues,
      positives: allPositives,
      quickWinCount,

      _meta: {
        analyzer: 'unified-visual',
        model: resolvedModel,
        cost: totalCost,
        timestamp: new Date().toISOString(),
        pagesAnalyzed: pagesToAnalyze.length,
        totalScreenshotSize: pages.reduce((sum, p) =>
          sum + (p.screenshots?.desktop?.length || 0) + (p.screenshots?.mobile?.length || 0), 0
        ),
        individualResults: individualResults.map(r => ({
          url: r.url,
          desktopScore: r.desktopScore,
          mobileScore: r.mobileScore,
          responsiveScore: r.responsiveScore,
          issueCount: {
            desktop: r.desktopIssues?.length || 0,
            mobile: r.mobileIssues?.length || 0,
            responsive: r.responsiveIssues?.length || 0,
            shared: r.sharedIssues?.length || 0
          }
        }))
      }
    };

  } catch (error) {
    console.error('Unified visual analysis failed:', error);

    // Return graceful degradation
    const fallbackModel = customPrompt?.model || 'gpt-5';
    return {
      model: fallbackModel,
      overallVisualScore: 30,
      desktopScore: 30,
      mobileScore: 30,
      responsiveScore: 30,
      visualScore: 30,
      desktopIssues: [],
      mobileIssues: [],
      responsiveIssues: [{
        category: 'error',
        severity: 'high',
        title: 'Unified visual analysis failed',
        description: `Unable to analyze screenshots: ${error.message}`,
        impact: 'Cannot provide visual design recommendations',
        recommendation: 'Manual design audit recommended',
        priority: 'high',
        difficulty: 'unknown',
        viewport: 'responsive'
      }],
      sharedIssues: [],
      issues: [],
      positives: [],
      quickWinCount: 0,
      _meta: {
        analyzer: 'unified-visual',
        model: fallbackModel,
        error: error.message,
        timestamp: new Date().toISOString()
      }
    };
  }
}

/**
 * Detect visual consistency and responsive design issues across multiple pages
 */
function detectVisualConsistency(individualResults) {
  const issues = [];

  if (individualResults.length < 2) {
    return issues; // Need at least 2 pages to compare
  }

  // Check desktop score variance
  const desktopScores = individualResults.map(r => r.desktopScore);
  const desktopAvg = desktopScores.reduce((sum, s) => sum + s, 0) / desktopScores.length;
  const desktopVariance = desktopScores.reduce((sum, s) => sum + Math.pow(s - desktopAvg, 2), 0) / desktopScores.length;
  const desktopStdDev = Math.sqrt(desktopVariance);

  if (desktopStdDev > 15) {
    issues.push({
      category: 'consistency',
      severity: 'medium',
      title: 'Inconsistent desktop design quality across pages',
      description: `Desktop design scores vary significantly (std dev: ${Math.round(desktopStdDev)}). Some pages are well-designed while others need improvement.`,
      impact: 'Unprofessional appearance, confusing desktop user experience',
      recommendation: 'Apply consistent design standards across all desktop pages',
      priority: 'medium',
      difficulty: 'medium',
      viewport: 'desktop',
      affectedPages: individualResults.map(r => ({ url: r.url, score: r.desktopScore }))
    });
  }

  // Check mobile score variance
  const mobileScores = individualResults.map(r => r.mobileScore);
  const mobileAvg = mobileScores.reduce((sum, s) => sum + s, 0) / mobileScores.length;
  const mobileVariance = mobileScores.reduce((sum, s) => sum + Math.pow(s - mobileAvg, 2), 0) / mobileScores.length;
  const mobileStdDev = Math.sqrt(mobileVariance);

  if (mobileStdDev > 15) {
    issues.push({
      category: 'consistency',
      severity: 'high',
      title: 'Inconsistent mobile UX quality across pages',
      description: `Mobile experience varies significantly (std dev: ${Math.round(mobileStdDev)}). Some pages work well on mobile while others don't.`,
      impact: 'Frustrating mobile user experience, higher bounce rates',
      recommendation: 'Apply consistent mobile design patterns across all pages',
      priority: 'high',
      difficulty: 'medium',
      viewport: 'mobile',
      affectedPages: individualResults.map(r => ({ url: r.url, score: r.mobileScore }))
    });
  }

  // Check responsive score variance (NEW - unique to unified analyzer!)
  const responsiveScores = individualResults.map(r => r.responsiveScore);
  const responsiveAvg = responsiveScores.reduce((sum, s) => sum + s, 0) / responsiveScores.length;

  if (responsiveAvg < 60) {
    issues.push({
      category: 'responsive',
      severity: 'high',
      title: 'Poor responsive design implementation',
      description: `Average responsive score is ${Math.round(responsiveAvg)}/100. The site doesn't adapt well between desktop and mobile viewports.`,
      impact: 'Layout breaks, content shifts, poor mobile experience',
      recommendation: 'Implement proper responsive design with consistent breakpoints',
      priority: 'high',
      difficulty: 'medium',
      viewport: 'responsive',
      affectedPages: individualResults.map(r => ({ url: r.url, score: r.responsiveScore }))
    });
  }

  return issues;
}

/**
 * Validate unified visual analysis response
 */
function validateUnifiedVisualResponse(result) {
  const required = ['desktopScore', 'mobileScore', 'responsiveScore', 'desktopIssues', 'mobileIssues', 'responsiveIssues', 'sharedIssues'];

  for (const field of required) {
    if (!(field in result)) {
      throw new Error(`Unified visual response missing required field: ${field}`);
    }
  }

  // Validate scores
  const scores = [result.desktopScore, result.mobileScore, result.responsiveScore];
  scores.forEach((score, index) => {
    const fieldName = ['desktopScore', 'mobileScore', 'responsiveScore'][index];
    if (typeof score !== 'number' || score < 0 || score > 100) {
      throw new Error(`${fieldName} must be number between 0-100`);
    }
  });

  // Validate issue arrays
  const issueFields = ['desktopIssues', 'mobileIssues', 'responsiveIssues', 'sharedIssues'];
  issueFields.forEach(field => {
    if (!Array.isArray(result[field])) {
      throw new Error(`${field} must be an array`);
    }
  });

  // Validate positives if present
  if (result.positives && !Array.isArray(result.positives)) {
    throw new Error('positives must be an array');
  }
}

/**
 * Count high-priority visual issues (all viewports)
 *
 * @param {object} unifiedVisualResults - Results from analyzeUnifiedVisual
 * @returns {object} Count of critical issues by viewport
 */
export function countCriticalVisualIssues(unifiedVisualResults) {
  if (!unifiedVisualResults) {
    return {
      desktop: 0,
      mobile: 0,
      responsive: 0,
      shared: 0,
      total: 0
    };
  }

  const desktop = (unifiedVisualResults.desktopIssues || []).filter(issue =>
    issue.severity === 'critical' || issue.priority === 'high' || issue.difficulty === 'quick-win'
  ).length;

  const mobile = (unifiedVisualResults.mobileIssues || []).filter(issue =>
    issue.severity === 'critical' || issue.priority === 'high' || issue.difficulty === 'quick-win'
  ).length;

  const responsive = (unifiedVisualResults.responsiveIssues || []).filter(issue =>
    issue.severity === 'critical' || issue.priority === 'high' || issue.difficulty === 'quick-win'
  ).length;

  const shared = (unifiedVisualResults.sharedIssues || []).filter(issue =>
    issue.severity === 'critical' || issue.priority === 'high' || issue.difficulty === 'quick-win'
  ).length;

  return {
    desktop,
    mobile,
    responsive,
    shared,
    total: desktop + mobile + responsive + shared
  };
}

/**
 * Backward compatibility: Split unified results into desktop-only results
 */
export function getDesktopResults(unifiedResults) {
  return {
    model: unifiedResults.model,
    visualScore: unifiedResults.desktopScore,
    issues: unifiedResults.desktopIssues,
    positives: unifiedResults.positives,
    quickWinCount: unifiedResults.desktopIssues.filter(i => i.difficulty === 'quick-win').length,
    _meta: {
      ...unifiedResults._meta,
      analyzer: 'desktop-visual'
    }
  };
}

/**
 * Backward compatibility: Split unified results into mobile-only results
 */
export function getMobileResults(unifiedResults) {
  return {
    model: unifiedResults.model,
    visualScore: unifiedResults.mobileScore,
    issues: unifiedResults.mobileIssues,
    positives: unifiedResults.positives,
    quickWinCount: unifiedResults.mobileIssues.filter(i => i.difficulty === 'quick-win').length,
    _meta: {
      ...unifiedResults._meta,
      analyzer: 'mobile-visual'
    }
  };
}

export default {
  analyzeUnifiedVisual,
  countCriticalVisualIssues,
  getDesktopResults,
  getMobileResults
};
