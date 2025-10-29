/**
 * Empty State Component
 *
 * Generates standardized empty state UI for sections with missing data
 * Provides consistent messaging and styling across all report sections
 */

import { escapeHtml } from './utils/helpers.js';

/**
 * Generate a standardized empty state component
 *
 * @param {Object} options - Configuration options
 * @param {string} options.icon - Emoji or symbol to display (e.g., '📊', '⚠️')
 * @param {string} options.title - Main heading
 * @param {string} options.description - Explanation of why data is missing
 * @param {string} options.reason - Optional technical reason (shown in smaller text)
 * @param {string} options.type - Visual style: 'info' | 'warning' | 'neutral' (default: 'neutral')
 * @param {boolean} options.showBorder - Whether to show border (default: true)
 * @param {string} options.suggestion - Optional suggestion for getting this data
 * @returns {string} HTML string
 */
export function generateEmptyState(options = {}) {
  const {
    icon = '📄',
    title = 'Data Not Available',
    description = 'This section requires data that was not collected during analysis.',
    reason = null,
    type = 'neutral',
    showBorder = true,
    suggestion = null
  } = options;

  // Color schemes for different types
  const typeStyles = {
    info: {
      bg: 'var(--primary-lightest)',
      border: 'var(--primary-light)',
      iconBg: 'var(--primary)',
      iconOpacity: '0.1'
    },
    warning: {
      bg: 'var(--warning-lightest)',
      border: 'var(--warning-light)',
      iconBg: 'var(--warning)',
      iconOpacity: '0.1'
    },
    neutral: {
      bg: 'var(--bg-secondary)',
      border: 'var(--border-light)',
      iconBg: 'var(--text-secondary)',
      iconOpacity: '0.05'
    },
    success: {
      bg: 'var(--success-lightest)',
      border: 'var(--success-light)',
      iconBg: 'var(--success)',
      iconOpacity: '0.1'
    }
  };

  const style = typeStyles[type] || typeStyles.neutral;

  let html = '';
  html += `<div style="background: ${style.bg}; padding: 48px 32px; border-radius: 12px; text-align: center; ${showBorder ? `border: 1px solid ${style.border};` : ''}">\n`;

  // Icon container
  html += `  <div style="position: relative; width: 80px; height: 80px; margin: 0 auto 24px; background: ${style.iconBg}; opacity: ${style.iconOpacity}; border-radius: 50%; display: flex; align-items: center; justify-content: center;">\n`;
  html += `    <div style="font-size: 3rem; opacity: 1;">${icon}</div>\n`;
  html += '  </div>\n';

  // Title
  html += `  <h3 style="font-size: 1.5rem; font-weight: 600; margin-bottom: 12px; color: var(--text-primary);">${escapeHtml(title)}</h3>\n`;

  // Description
  html += `  <p style="font-size: 15px; line-height: 1.6; color: var(--text-secondary); max-width: 500px; margin: 0 auto 16px;">${escapeHtml(description)}</p>\n`;

  // Technical reason (if provided)
  if (reason) {
    html += `  <p style="font-size: 13px; opacity: 0.6; font-style: italic; margin-bottom: 16px;">Technical note: ${escapeHtml(reason)}</p>\n`;
  }

  // Suggestion (if provided)
  if (suggestion) {
    html += `  <div style="margin-top: 20px; padding: 16px; background: var(--bg-tertiary); border-radius: 8px; display: inline-block; text-align: left; max-width: 450px;">\n`;
    html += `    <div style="font-size: 13px; font-weight: 600; margin-bottom: 6px; opacity: 0.8;">💡 How to get this data:</div>\n`;
    html += `    <div style="font-size: 13px; opacity: 0.7;">${escapeHtml(suggestion)}</div>\n`;
    html += '  </div>\n';
  }

  html += '</div>\n';

  return html;
}

/**
 * Generate empty state for missing benchmark data
 * @returns {string} HTML string
 */
export function generateBenchmarkEmptyState() {
  return generateEmptyState({
    icon: '📊',
    title: 'No Benchmark Comparison Available',
    description: 'Industry benchmark comparison is not available for this analysis. Benchmarks help you understand how your website performs relative to industry leaders.',
    type: 'info',
    suggestion: 'Benchmark data is automatically matched based on industry and business model. If no match was found, it may be added in future analyses.'
  });
}

/**
 * Generate empty state for missing performance metrics
 * @returns {string} HTML string
 */
export function generatePerformanceEmptyState() {
  return generateEmptyState({
    icon: '⚡',
    title: 'Performance Data Not Collected',
    description: 'PageSpeed Insights data was not collected for this analysis. Performance metrics help identify loading speed and Core Web Vitals issues.',
    type: 'warning',
    reason: 'PageSpeed API may have been unavailable or rate-limited during analysis',
    suggestion: 'Re-run the analysis to collect performance data, or check PageSpeed Insights manually.'
  });
}

/**
 * Generate empty state for missing accessibility data
 * @returns {string} HTML string
 */
export function generateAccessibilityEmptyState() {
  return generateEmptyState({
    icon: '♿',
    title: 'Accessibility Analysis Not Available',
    description: 'No accessibility issues were detected, or accessibility analysis was not performed. WCAG compliance is important for legal protection and reaching a broader audience.',
    type: 'neutral',
    suggestion: 'Run a manual accessibility audit using tools like WAVE or axe DevTools for comprehensive testing.'
  });
}

/**
 * Generate empty state for missing business intelligence
 * @returns {string} HTML string
 */
export function generateBusinessIntelligenceEmptyState() {
  return generateEmptyState({
    icon: '💼',
    title: 'Business Intelligence Not Available',
    description: 'Advanced business intelligence analysis was not performed for this lead. This section typically includes market analysis, competitor insights, and lead scoring.',
    type: 'info',
    reason: 'Business intelligence requires additional data sources and AI analysis',
    suggestion: 'Upgrade analysis to include business intelligence for deeper market insights.'
  });
}

/**
 * Generate empty state for missing screenshot gallery
 * @returns {string} HTML string
 */
export function generateScreenshotGalleryEmptyState() {
  return generateEmptyState({
    icon: '📸',
    title: 'Multi-Page Screenshots Not Available',
    description: 'Screenshots from multiple pages were not collected during this analysis. Multi-page analysis helps identify design consistency and user flow issues.',
    type: 'neutral',
    reason: 'Analysis was performed on homepage only',
    suggestion: 'Enable multi-page crawling to capture screenshots across the entire site.'
  });
}

/**
 * Generate empty state for AI synthesis not used
 * @returns {string} HTML string
 */
export function generateSynthesisEmptyState() {
  return generateEmptyState({
    icon: '🤖',
    title: 'AI Synthesis Not Enabled',
    description: 'This report was generated without AI-powered synthesis. Synthesis provides consolidated issues, executive summaries, and strategic insights.',
    type: 'info',
    suggestion: 'Enable USE_AI_SYNTHESIS in configuration to get AI-enhanced reports with consolidated findings.'
  });
}

/**
 * Generate partial data notice (not a full empty state)
 * @param {string} message - Notice message
 * @param {string} type - Notice type: 'info' | 'warning' | 'success'
 * @returns {string} HTML string
 */
export function generatePartialDataNotice(message, type = 'info') {
  const typeColors = {
    info: 'var(--primary-light)',
    warning: 'var(--warning-light)',
    success: 'var(--success-light)'
  };

  const typeIcons = {
    info: 'ℹ️',
    warning: '⚠️',
    success: '✓'
  };

  const color = typeColors[type] || typeColors.info;
  const icon = typeIcons[type] || typeIcons.info;

  let html = '';
  html += `<div style="background: ${color}10; border-left: 4px solid ${color}; padding: 16px 20px; border-radius: 8px; margin-bottom: 24px;">\n`;
  html += `  <div style="display: flex; align-items: flex-start; gap: 12px;">\n`;
  html += `    <div style="font-size: 1.2rem; line-height: 1; margin-top: 2px;">${icon}</div>\n`;
  html += `    <div style="flex: 1; font-size: 14px; line-height: 1.6; color: var(--text-primary);">${escapeHtml(message)}</div>\n`;
  html += '  </div>\n';
  html += '</div>\n';

  return html;
}
