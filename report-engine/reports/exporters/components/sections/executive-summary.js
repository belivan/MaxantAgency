/**
 * Executive Summary Section Component
 *
 * Displays strategic assessment with:
 * - Benchmark-aware summary (uses AI synthesis if available)
 * - Top priority issue callout
 * - Business impact analysis table (if synthesis data available)
 */

import { escapeHtml, generateBenchmarkAwareSummary } from '../utils/helpers.js';

/**
 * Generate Executive Summary Section
 * @param {Object} analysisResult - Complete analysis data
 * @param {Object} synthesisData - AI synthesis results (optional)
 * @param {Object} options - Configuration options
 * @returns {string} HTML section
 */
export function generateStrategicAssessment(analysisResult, synthesisData = {}, options = {}) {
  const { reportType = 'full' } = options;
  const {
    grade,
    overall_score,
    company_name,
    top_issue,
    one_liner,
    matched_benchmark,
    design_score,
    seo_score,
    content_score,
    social_score
  } = analysisResult;

  let html = '    <!-- Executive Summary -->\n';
  html += '    <section class="section" id="assessment">\n';
  html += '      <div class="section-header">\n';
  html += '        <h2 class="section-title">\n';
  html += '          <span class="section-title-icon">📋</span>\n';
  html += '          Executive Summary\n';
  html += '        </h2>\n';
  html += '      </div>\n';

  // DEBUG: Log synthesis data structure
  console.log('[EXECUTIVE-SUMMARY] Synthesis data check:');
  console.log(`  - synthesisData type: ${typeof synthesisData}`);
  console.log(`  - synthesisData keys: ${synthesisData ? Object.keys(synthesisData).join(', ') : 'null'}`);
  if (synthesisData && synthesisData.executiveSummary) {
    console.log(`  - executiveSummary type: ${typeof synthesisData.executiveSummary}`);
    console.log(`  - executiveSummary keys: ${Object.keys(synthesisData.executiveSummary).join(', ')}`);
    console.log(`  - Has overview?: ${synthesisData.executiveSummary.overview ? 'YES' : 'NO'}`);
    if (synthesisData.executiveSummary.overview) {
      console.log(`  - Overview length: ${synthesisData.executiveSummary.overview.length} chars`);
    }
  } else {
    console.log(`  - executiveSummary: ${synthesisData?.executiveSummary || 'null/undefined'}`);
  }

  // Generate benchmark-aware summary (2-3 paragraphs)
  let summary = '';

  if (synthesisData.executiveSummary?.overview) {
    // Use AI synthesis if available
    console.log('✅ [EXECUTIVE-SUMMARY] Using AI-generated overview');
    summary = synthesisData.executiveSummary.overview;
  } else {
    // Generate benchmark-aware summary
    console.log('⚠️  [EXECUTIVE-SUMMARY] Falling back to basic summary');
    summary = generateBenchmarkAwareSummary({
      company_name,
      grade,
      overall_score,
      matched_benchmark,
      design_score,
      seo_score,
      content_score,
      social_score,
      one_liner
    });
  }

  html += `      <p class="section-description">${escapeHtml(summary)}</p>\n`;

  // Top Priority Issue (if available)
  if (top_issue || synthesisData.executiveSummary?.topPriority) {
    let priority = top_issue || synthesisData.executiveSummary.topPriority;
    let priorityText = '';

    // Handle if priority is an object (from synthesis or getTopIssue)
    if (typeof priority === 'object' && priority !== null) {
      const title = priority.title || priority.description || priority.text || '';
      const impact = priority.impact || '';

      // Format as "Action - Impact" if both available
      if (title && impact) {
        priorityText = `${title} - ${impact}`;
      } else {
        priorityText = title || impact || JSON.stringify(priority);
      }
    } else {
      priorityText = priority;
    }

    html += '      <div class="alert-box mt-8" style="background: var(--warning-lightest); border-left: 4px solid var(--warning); padding: 20px; border-radius: 8px; margin-top: 32px;">\n';
    html += '        <strong style="display: block; margin-bottom: 8px;">🎯 Top Priority:</strong>\n';
    html += `        ${escapeHtml(priorityText)}\n`;
    html += '      </div>\n';
  }

  // Business Impact Table (only if synthesis data available)
  if (synthesisData.executiveSummary?.businessImpact && synthesisData.executiveSummary.businessImpact.length > 0) {
    html += '      <div class="mt-8" style="margin-top: 32px;">\n';
    html += '        <h3 style="font-size: 1.25rem; margin-bottom: 16px;">Business Impact Analysis</h3>\n';
    html += '        <table class="data-table">\n';
    html += '          <thead>\n';
    html += '            <tr>\n';
    html += '              <th>Area</th>\n';
    html += '              <th>Current Impact</th>\n';
    html += '              <th>Opportunity</th>\n';
    html += '            </tr>\n';
    html += '          </thead>\n';
    html += '          <tbody>\n';

    synthesisData.executiveSummary.businessImpact.slice(0, 3).forEach(impact => {
      html += '            <tr>\n';
      html += `              <td><strong>${escapeHtml(impact.area)}</strong></td>\n`;
      html += `              <td>${escapeHtml(impact.current)}</td>\n`;
      html += `              <td style="color: var(--success);">${escapeHtml(impact.potential)}</td>\n`;
      html += '            </tr>\n';
    });

    html += '          </tbody>\n';
    html += '        </table>\n';
    html += '      </div>\n';
  }

  html += '    </section>\n\n';
  return html;
}
