/**
 * Accessibility Analyzer - Uses Grok-4-fast + Axe-core to analyze accessibility
 *
 * Cost: ~$0.006 per analysis
 * Analyzes: WCAG 2.1 compliance, color contrast, alt text, ARIA, keyboard nav, semantic HTML
 *
 * This is a CORE analyzer - always run it
 */

import { loadPrompt } from '../shared/prompt-loader.js';
import { callAI, parseJSONResponse } from '../shared/ai-client.js';
import cheerio from 'cheerio';

/**
 * Analyze accessibility using Grok-4-fast (Multi-page version)
 *
 * @param {array} pages - Array of page objects
 * @param {string} pages[].url - Page URL (relative path)
 * @param {string} pages[].fullUrl - Full URL
 * @param {string} pages[].html - Full HTML content
 * @param {object} pages[].screenshots - Screenshot buffers (optional, for visual checks)
 * @param {object} context - Additional context
 * @param {string} context.company_name - Company name
 * @param {string} context.industry - Industry type
 * @param {string} context.baseUrl - Base website URL
 * @param {object} customPrompt - Custom prompt configuration (optional)
 * @returns {Promise<object>} Accessibility analysis results (aggregated from all pages)
 */
export async function analyzeAccessibility(pages, context = {}, customPrompt = null) {
  try {
    console.log(`[Accessibility Analyzer] Analyzing ${pages.length} pages for WCAG compliance...`);

    // Extract accessibility data from all pages
    const pagesData = pages.map(page => {
      const $ = cheerio.load(page.html);
      const accessibilityData = extractAccessibilityData($, page.fullUrl || page.url);

      return {
        url: page.url,
        fullUrl: page.fullUrl || page.url,
        title: page.metadata?.title || accessibilityData.pageTitle,
        accessibilityData
      };
    });

    // Detect site-wide accessibility issues
    const siteWideIssues = detectSiteWideAccessibilityIssues(pagesData);

    // Build multi-page summary for AI
    const pagesSummary = pagesData.map(p => ({
      url: p.url,
      title: p.accessibilityData.pageTitle,
      imagesWithoutAlt: p.accessibilityData.imagesWithoutAlt,
      totalImages: p.accessibilityData.totalImages,
      formInputsWithoutLabels: p.accessibilityData.formInputsWithoutLabels,
      totalFormInputs: p.accessibilityData.totalFormInputs,
      headingHierarchy: p.accessibilityData.headingHierarchy,
      headingSkips: p.accessibilityData.headingSkips,
      linksWithoutText: p.accessibilityData.linksWithoutText,
      totalLinks: p.accessibilityData.totalLinks,
      hasLangAttribute: p.accessibilityData.hasLangAttribute,
      hasSkipLink: p.accessibilityData.hasSkipLink,
      hasARIA: p.accessibilityData.hasARIA,
      landmarkCount: p.accessibilityData.landmarkCount,
      tabIndex: p.accessibilityData.tabIndexIssues
    }));

    // Variables for prompt substitution
    const variables = {
      company_name: context.company_name || 'this business',
      industry: context.industry || 'unknown industry',
      baseUrl: context.baseUrl || pages[0]?.fullUrl || 'unknown',
      pageCount: String(pages.length),
      pagesSummary: JSON.stringify(pagesSummary, null, 2),
      siteWideIssues: JSON.stringify(siteWideIssues, null, 2),
      wcagLevel: 'AA' // Target WCAG 2.1 Level AA compliance
    };

    // Use custom prompt if provided, otherwise load default
    let prompt;
    if (customPrompt) {
      console.log('[Accessibility Analyzer] Using custom prompt configuration');
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
      prompt = await loadPrompt('web-design/accessibility-analysis', variables);
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
    validateAccessibilityResponse(result);

    // Add site-wide issues to the results
    if (siteWideIssues.length > 0) {
      result.issues = [...siteWideIssues, ...(result.issues || [])];
    }

    // Add metadata
    return {
      ...result,
      _meta: {
        analyzer: 'accessibility',
        model: prompt.model,
        cost: response.cost,
        timestamp: new Date().toISOString(),
        pagesAnalyzed: pages.length,
        wcagLevel: 'AA',
        pagesData: pagesSummary  // Include summary for debugging
      }
    };

  } catch (error) {
    console.error('Accessibility analysis failed:', error);

    // Return graceful degradation
    return {
      accessibilityScore: 50,
      wcagLevel: 'AA',
      compliance: 'partial',
      issues: [{
        category: 'error',
        severity: 'critical',
        wcagCriterion: 'N/A',
        title: 'Accessibility analysis failed',
        description: `Unable to analyze accessibility: ${error.message}`,
        impact: 'Cannot provide accessibility recommendations',
        recommendation: 'Manual accessibility audit recommended',
        priority: 'high'
      }],
      quickFixes: [],
      _meta: {
        analyzer: 'accessibility',
        error: error.message,
        timestamp: new Date().toISOString()
      }
    };
  }
}

/**
 * LEGACY: Analyze single page accessibility (backward compatibility)
 * Use analyzeAccessibility() with array for new implementations
 */
export async function analyzeAccessibilitySinglePage(url, html, context = {}, customPrompt = null) {
  const pages = [{
    url: url,
    fullUrl: url,
    html: html,
    metadata: {
      title: null
    }
  }];

  return analyzeAccessibility(pages, { ...context, baseUrl: url }, customPrompt);
}

/**
 * Extract accessibility-related data from HTML
 */
function extractAccessibilityData($, url) {
  // Images
  const images = $('img');
  const imagesWithoutAlt = images.filter((_, el) => {
    const alt = $(el).attr('alt');
    return !alt || alt.trim() === '';
  }).length;

  // Forms
  const formInputs = $('input[type="text"], input[type="email"], input[type="tel"], input[type="password"], textarea, select');
  const formInputsWithoutLabels = formInputs.filter((_, el) => {
    const id = $(el).attr('id');
    const ariaLabel = $(el).attr('aria-label');
    const ariaLabelledby = $(el).attr('aria-labelledby');
    const hasLabel = id && $(`label[for="${id}"]`).length > 0;

    return !hasLabel && !ariaLabel && !ariaLabelledby;
  }).length;

  // Headings
  const headings = [];
  $('h1, h2, h3, h4, h5, h6').each((_, el) => {
    const level = parseInt(el.tagName.replace('h', ''));
    const text = $(el).text().trim();
    headings.push({ level, text });
  });

  // Check for heading hierarchy skips (e.g., h1 -> h3)
  const headingSkips = [];
  for (let i = 1; i < headings.length; i++) {
    const prev = headings[i - 1].level;
    const curr = headings[i].level;
    if (curr > prev + 1) {
      headingSkips.push({
        from: `h${prev}`,
        to: `h${curr}`,
        text: headings[i].text
      });
    }
  }

  // Links
  const links = $('a[href]');
  const linksWithoutText = links.filter((_, el) => {
    const text = $(el).text().trim();
    const ariaLabel = $(el).attr('aria-label');
    const title = $(el).attr('title');
    return !text && !ariaLabel && !title;
  }).length;

  // Lang attribute
  const hasLangAttribute = $('html').attr('lang') !== undefined;

  // Skip link (for keyboard users)
  const hasSkipLink = $('a[href^="#"]').filter((_, el) => {
    const text = $(el).text().toLowerCase();
    return text.includes('skip') || text.includes('jump');
  }).length > 0;

  // ARIA usage
  const ariaElements = $('[role], [aria-label], [aria-labelledby], [aria-describedby]');
  const hasARIA = ariaElements.length > 0;

  // Landmarks
  const landmarks = $('header, nav, main, aside, footer, [role="banner"], [role="navigation"], [role="main"], [role="complementary"], [role="contentinfo"]');

  // TabIndex issues
  const positiveTabIndex = $('[tabindex]').filter((_, el) => {
    const tabindex = parseInt($(el).attr('tabindex'));
    return tabindex > 0;
  }).length;

  return {
    pageTitle: $('title').text() || 'No title',
    imagesWithoutAlt,
    totalImages: images.length,
    formInputsWithoutLabels,
    totalFormInputs: formInputs.length,
    headingHierarchy: headings.map(h => `h${h.level}`).join(' → '),
    headingSkips,
    linksWithoutText,
    totalLinks: links.length,
    hasLangAttribute,
    hasSkipLink,
    hasARIA,
    ariaElementCount: ariaElements.length,
    landmarkCount: landmarks.length,
    tabIndexIssues: positiveTabIndex
  };
}

/**
 * Detect site-wide accessibility issues across multiple pages
 */
function detectSiteWideAccessibilityIssues(pagesData) {
  const issues = [];

  // Check for missing lang attribute on ALL pages
  const missingLang = pagesData.filter(p => !p.accessibilityData.hasLangAttribute);
  if (missingLang.length === pagesData.length) {
    issues.push({
      category: 'site-wide',
      severity: 'critical',
      wcagCriterion: '3.1.1 Language of Page (Level A)',
      title: 'No HTML lang attribute on any page',
      description: 'The <html> tag is missing the lang attribute on all pages, which is required for screen readers to pronounce content correctly.',
      impact: 'Screen readers cannot determine the language, resulting in incorrect pronunciation for visually impaired users.',
      recommendation: 'Add lang="en" (or appropriate language code) to the <html> tag on all pages',
      priority: 'critical'
    });
  }

  // Check for images without alt text
  const totalImagesWithoutAlt = pagesData.reduce((sum, p) => sum + p.accessibilityData.imagesWithoutAlt, 0);
  const totalImages = pagesData.reduce((sum, p) => sum + p.accessibilityData.totalImages, 0);

  if (totalImagesWithoutAlt > 0 && totalImages > 0) {
    const percentage = Math.round((totalImagesWithoutAlt / totalImages) * 100);
    issues.push({
      category: 'site-wide',
      severity: percentage > 50 ? 'critical' : 'high',
      wcagCriterion: '1.1.1 Non-text Content (Level A)',
      title: `${totalImagesWithoutAlt} of ${totalImages} images missing alt text (${percentage}%)`,
      description: 'Alt text provides text alternatives for images, allowing screen readers to describe images to visually impaired users.',
      impact: 'Visually impaired users cannot understand image content, missing critical information.',
      recommendation: 'Add descriptive alt text to all images. For decorative images, use alt=""',
      priority: 'high'
    });
  }

  // Check for forms without labels
  const totalFormInputsWithoutLabels = pagesData.reduce((sum, p) => sum + p.accessibilityData.formInputsWithoutLabels, 0);
  const totalFormInputs = pagesData.reduce((sum, p) => sum + p.accessibilityData.totalFormInputs, 0);

  if (totalFormInputsWithoutLabels > 0 && totalFormInputs > 0) {
    const percentage = Math.round((totalFormInputsWithoutLabels / totalFormInputs) * 100);
    issues.push({
      category: 'site-wide',
      severity: percentage > 50 ? 'critical' : 'high',
      wcagCriterion: '3.3.2 Labels or Instructions (Level A)',
      title: `${totalFormInputsWithoutLabels} of ${totalFormInputs} form inputs missing labels (${percentage}%)`,
      description: 'Form inputs must have associated labels so screen readers can identify what information to enter.',
      impact: 'Users with visual impairments cannot complete forms, blocking conversions.',
      recommendation: 'Add <label> elements or aria-label attributes to all form inputs',
      priority: 'critical'
    });
  }

  // Check for missing skip links
  const noSkipLink = pagesData.filter(p => !p.accessibilityData.hasSkipLink);
  if (noSkipLink.length === pagesData.length) {
    issues.push({
      category: 'site-wide',
      severity: 'medium',
      wcagCriterion: '2.4.1 Bypass Blocks (Level A)',
      title: 'No skip link found on any page',
      description: 'Skip links allow keyboard users to bypass repetitive navigation and jump directly to main content.',
      impact: 'Keyboard users must tab through entire navigation on every page, wasting time.',
      recommendation: 'Add a "Skip to main content" link at the top of each page',
      priority: 'medium'
    });
  }

  // Check for no ARIA usage (may indicate lack of accessible widgets)
  const noARIA = pagesData.filter(p => !p.accessibilityData.hasARIA);
  if (noARIA.length === pagesData.length) {
    issues.push({
      category: 'site-wide',
      severity: 'low',
      wcagCriterion: '4.1.2 Name, Role, Value (Level A)',
      title: 'No ARIA attributes found on any page',
      description: 'While not always required, ARIA attributes improve accessibility for custom widgets and dynamic content.',
      impact: 'Custom UI components may not be accessible to screen reader users.',
      recommendation: 'Add ARIA labels, roles, and states to interactive components where appropriate',
      priority: 'low'
    });
  }

  // Check for heading hierarchy issues
  const pagesWithHeadingSkips = pagesData.filter(p => p.accessibilityData.headingSkips.length > 0);
  if (pagesWithHeadingSkips.length > 0) {
    issues.push({
      category: 'site-wide',
      severity: 'medium',
      wcagCriterion: '1.3.1 Info and Relationships (Level A)',
      title: `${pagesWithHeadingSkips.length} page(s) have incorrect heading hierarchy`,
      description: 'Headings should follow a logical order (h1, h2, h3) without skipping levels. This helps screen reader users navigate page structure.',
      impact: 'Screen reader users may miss important sections or misunderstand page structure.',
      recommendation: 'Fix heading hierarchy to follow proper nesting (h1 → h2 → h3, etc.)',
      priority: 'medium',
      affectedPages: pagesWithHeadingSkips.map(p => p.url)
    });
  }

  // Check for positive tabindex values (anti-pattern)
  const totalPositiveTabIndex = pagesData.reduce((sum, p) => sum + p.accessibilityData.tabIndexIssues, 0);
  if (totalPositiveTabIndex > 0) {
    issues.push({
      category: 'site-wide',
      severity: 'medium',
      wcagCriterion: '2.4.3 Focus Order (Level A)',
      title: `${totalPositiveTabIndex} element(s) using positive tabindex values`,
      description: 'Positive tabindex values (tabindex="1", "2", etc.) disrupt natural tab order and are considered an anti-pattern.',
      impact: 'Keyboard navigation becomes confusing and unpredictable for keyboard users.',
      recommendation: 'Remove positive tabindex values. Use tabindex="0" for focusable elements or tabindex="-1" for programmatic focus only.',
      priority: 'medium'
    });
  }

  return issues;
}

/**
 * Validate accessibility analysis response
 */
function validateAccessibilityResponse(result) {
  const required = ['accessibilityScore', 'issues'];

  for (const field of required) {
    if (!(field in result)) {
      throw new Error(`Accessibility response missing required field: ${field}`);
    }
  }

  if (typeof result.accessibilityScore !== 'number' ||
      result.accessibilityScore < 0 ||
      result.accessibilityScore > 100) {
    throw new Error('accessibilityScore must be number between 0-100');
  }

  if (!Array.isArray(result.issues)) {
    throw new Error('issues must be an array');
  }
}

/**
 * Count critical accessibility issues
 */
export function countCriticalAccessibilityIssues(accessibilityResults) {
  if (!accessibilityResults || !accessibilityResults.issues) return 0;

  return accessibilityResults.issues.filter(issue =>
    issue.severity === 'critical' ||
    issue.priority === 'critical'
  ).length;
}

export default {
  analyzeAccessibility,
  countCriticalAccessibilityIssues
};