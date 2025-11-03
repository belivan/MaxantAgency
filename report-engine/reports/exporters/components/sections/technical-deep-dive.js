/**
 * Technical Deep Dive Section - Full Report Only
 * Displays tech stack, performance metrics, PageSpeed Insights, and CrUX data.
 */

import { escapeHtml } from '../utils/helpers.js';

/**
 * Generate Technical Deep Dive Section
 * @param {Object} analysisResult - Complete analysis result object
 * @returns {string} HTML string for technical deep dive section
 */
export function generateTechnicalDeepDive(analysisResult) {
  const {
    performance_metrics_pagespeed,
    performance_metrics_crux,
    tech_stack,
    accessibility_compliance,
    has_https,
    is_mobile_friendly,
    page_load_time
  } = analysisResult;

  let html = '';
  html += '    <!-- Technical Deep Dive -->\n';
  html += '    <section class="section" id="technical-deep-dive">\n';
  html += '      <div class="section-header">\n';
  html += '        <h2 class="section-title" style="font-size: 1.5rem; font-weight: bold;">\n';
  html += '          <span class="section-title-icon">⚙️</span>\n';
  html += '          Technical Deep Dive\n';
  html += '        </h2>\n';
  html += '        <p class="section-description">Performance metrics, tech stack, and technical infrastructure analysis.</p>\n';
  html += '      </div>\n\n';

  // Tech Stack
  let parsedTechStack = null;
  try {
    // Parse tech stack if it's a JSON string
    if (typeof tech_stack === 'string' && tech_stack !== 'Unknown') {
      parsedTechStack = JSON.parse(tech_stack);
    }
  } catch (e) {
    // If parsing fails, treat as plain string
  }

  html += '      <div style="background: var(--bg-secondary); padding: 24px; border-radius: var(--radius-lg); margin-bottom: 24px;">\n';
  html += '        <h3 style="font-size: 1.3rem; font-weight: 600; margin-bottom: 16px;">🛠️ Technology Stack</h3>\n';
  html += '        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">\n';

  // Display platform/CMS
  if (parsedTechStack) {
    const platformDisplay = parsedTechStack.cms === 'Unknown' ? 'Custom/Proprietary Platform' : parsedTechStack.cms;
    html += `          <div><strong>Platform:</strong> ${escapeHtml(platformDisplay)}</div>\n`;
    if (parsedTechStack.frameworks && parsedTechStack.frameworks.length > 0) {
      html += `          <div><strong>Frameworks:</strong> ${escapeHtml(parsedTechStack.frameworks.join(', '))}</div>\n`;
    }
    if (parsedTechStack.analytics && parsedTechStack.analytics.length > 0) {
      html += `          <div><strong>Analytics:</strong> ${escapeHtml(parsedTechStack.analytics.join(', '))}</div>\n`;
    }
  } else {
    const platformDisplay = tech_stack === 'Unknown' ? 'Custom/Proprietary Platform' : (tech_stack || 'Custom/Proprietary Platform');
    html += `          <div><strong>Platform:</strong> ${escapeHtml(platformDisplay)}</div>\n`;
  }

  html += `          <div><strong>HTTPS:</strong> ${has_https ? '✅ Enabled' : '❌ Not Enabled'}</div>\n`;
  html += `          <div><strong>Mobile Friendly:</strong> ${is_mobile_friendly ? '✅ Yes' : '❌ No'}</div>\n`;
  if (page_load_time) {
    html += `          <div><strong>Page Load Time:</strong> ${page_load_time}ms</div>\n`;
  }
  html += '        </div>\n';
  html += '      </div>\n';

  // Note: PageSpeed Insights and CrUX data are displayed in the Performance Metrics section

  html += '    </section>\n\n';
  return html;
}
