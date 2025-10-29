/**
 * Benchmark Comparison Section Component
 *
 * Displays comparison with industry benchmark:
 * - Matched benchmark info box
 * - Score breakdown comparison (side-by-side bars)
 * - What the benchmark company does well (strengths by category)
 */

import { escapeHtml } from '../utils/helpers.js';

/**
 * Generate Benchmark Comparison Chart Section
 * @param {Object} analysisResult - Complete analysis data
 * @param {Object} synthesisData - AI synthesis results (optional)
 * @param {Object} options - Configuration options
 * @returns {string} HTML section
 */
export function generateBenchmarkComparisonChart(analysisResult, synthesisData = {}, options = {}) {
  const { reportType = 'full' } = options;
  const {
    matched_benchmark,
    design_score,
    seo_score,
    content_score,
    performance_score,
    accessibility_score,
    social_score
  } = analysisResult;

  if (!matched_benchmark) return '';

  let html = '    <!-- Benchmark Comparison -->\n';
  html += '    <section class="section" id="benchmark">\n';
  html += '      <div class="section-header">\n';
  html += '        <h2 class="section-title">\n';
  html += '          <span class="section-title-icon">📊</span>\n';
  html += '          How You Compare to Industry Leaders\n';
  html += '        </h2>\n';
  html += '      </div>\n';

  // Match info box
  html += '      <div style="background: var(--bg-secondary); padding: 20px; border-radius: 8px; margin-bottom: 24px;">\n';
  html += `        <div style="font-weight: 600; margin-bottom: 8px; display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">`;
  html += `          <span>Matched to: ${escapeHtml(matched_benchmark.company_name)}</span>\n`;

  // Add website link if available
  if (matched_benchmark.website_url) {
    html += `          <a href="${escapeHtml(matched_benchmark.website_url)}" target="_blank" rel="noopener noreferrer" style="font-size: 13px; color: var(--primary); text-decoration: none; display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; background: rgba(37, 99, 235, 0.1); border-radius: 6px; transition: all 0.2s;" onmouseover="this.style.background='rgba(37,99,235,0.2)'" onmouseout="this.style.background='rgba(37,99,235,0.1)'">\n`;
    html += `            <span>🌐</span>\n`;
    html += `            <span>Visit Website</span>\n`;
    html += `          </a>\n`;
  }

  html += `        </div>\n`;
  html += `        <div style="font-size: 14px; opacity: 0.8; line-height: 1.6;">${escapeHtml(matched_benchmark.match_reasoning || `${Math.round(matched_benchmark.match_score)}% match based on industry, business model, and digital capabilities.`)}</div>\n`;
  html += `        <div style="margin-top: 12px; font-size: 13px;"><strong>Comparison Tier:</strong> ${matched_benchmark.comparison_tier}</div>\n`;
  html += '      </div>\n';

  // Score comparison bars
  html += '      <div style="margin-bottom: 32px;">\n';
  html += '        <h3 style="font-size: 1.5rem; font-weight: 600; margin-bottom: 20px;">Score Breakdown</h3>\n';

  const dimensions = [
    { label: 'Design', yourScore: design_score, benchmarkScore: matched_benchmark.scores.design },
    { label: 'SEO', yourScore: seo_score, benchmarkScore: matched_benchmark.scores.seo },
    { label: 'Performance', yourScore: performance_score, benchmarkScore: matched_benchmark.scores.performance },
    { label: 'Content', yourScore: content_score, benchmarkScore: matched_benchmark.scores.content },
    { label: 'Accessibility', yourScore: accessibility_score, benchmarkScore: matched_benchmark.scores.accessibility },
    { label: 'Social', yourScore: social_score, benchmarkScore: matched_benchmark.scores.social }
  ];

  dimensions.forEach(dim => {
    if (dim.yourScore === undefined || dim.benchmarkScore === undefined) return;

    const gap = dim.benchmarkScore - dim.yourScore;
    const gapText = gap > 0 ? `+${Math.round(gap)}` : gap < 0 ? `${Math.round(gap)}` : '✓';
    const gapColor = gap > 0 ? 'var(--warning)' : gap < 0 ? 'var(--success)' : 'var(--success)';

    html += '        <div style="margin-bottom: 16px;">\n';
    html += '          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">\n';
    html += `            <span style="font-weight: 500;">${dim.label}</span>\n`;
    html += `            <span style="font-size: 14px; color: ${gapColor};">${gapText}</span>\n`;
    html += '          </div>\n';
    html += '          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">\n';

    // Your score bar
    html += '            <div>\n';
    html += '              <div style="font-size: 12px; opacity: 0.7; margin-bottom: 4px;">You: ' + Math.round(dim.yourScore) + '</div>\n';
    html += '              <div style="background: var(--bg-secondary); border-radius: 4px; height: 24px; position: relative; overflow: hidden;">\n';
    html += `                <div style="background: var(--primary); height: 100%; width: ${dim.yourScore}%; border-radius: 4px; transition: width 0.3s;"></div>\n`;
    html += '              </div>\n';
    html += '            </div>\n';

    // Benchmark score bar
    html += '            <div>\n';
    html += `              <div style="font-size: 12px; opacity: 0.7; margin-bottom: 4px;">${escapeHtml(matched_benchmark.company_name)}: ` + Math.round(dim.benchmarkScore) + '</div>\n';
    html += '              <div style="background: var(--bg-secondary); border-radius: 4px; height: 24px; position: relative; overflow: hidden;">\n';
    html += `                <div style="background: var(--success); height: 100%; width: ${dim.benchmarkScore}%; border-radius: 4px; transition: width 0.3s;"></div>\n`;
    html += '              </div>\n';
    html += '            </div>\n';

    html += '          </div>\n';
    html += '        </div>\n';
  });

  html += '      </div>\n';

  // "What they do well" section - Grid layout
  html += '      <div>\n';
  html += `        <h3 style="font-size: 1.5rem; font-weight: 600; margin-bottom: 16px;">What ${escapeHtml(matched_benchmark.company_name)} Does Well</h3>\n`;
  html += '        <p style="opacity: 0.8; margin-bottom: 20px; font-size: 14px;">Learn from their approach to these areas:</p>\n';

  // Helper to extract string array from strength objects
  const extractStrengthStrings = (strengthObj) => {
    if (!strengthObj) return [];

    // If it's already an array of strings, return as-is
    if (Array.isArray(strengthObj) && strengthObj.every(s => typeof s === 'string')) {
      return strengthObj;
    }

    // Handle flat array structure (SEO, Content, Social, Accessibility)
    // Format: [{technique: "...", impact: "..."}, ...]
    if (Array.isArray(strengthObj)) {
      let strings = [];
      strengthObj.forEach(s => {
        if (s && s.technique) {
          strings.push(s.technique);
        } else if (typeof s === 'string') {
          strings.push(s);
        }
      });
      if (strings.length > 0) return strings;
    }

    // Extract from nested object structure (Design)
    // Format: {overallPatterns: [...], desktopStrengths: [...], mobileStrengths: [...]}
    let strings = [];

    // Check for overallPatterns (array of strings)
    if (strengthObj.overallPatterns && Array.isArray(strengthObj.overallPatterns)) {
      strings.push(...strengthObj.overallPatterns);
    }

    // Extract technique strings from desktop/mobile strength objects
    if (strengthObj.desktopStrengths && Array.isArray(strengthObj.desktopStrengths)) {
      strengthObj.desktopStrengths.slice(0, 2).forEach(s => {
        if (s.technique) strings.push(`Desktop: ${s.technique}`);
      });
    }

    if (strengthObj.mobileStrengths && Array.isArray(strengthObj.mobileStrengths)) {
      strengthObj.mobileStrengths.slice(0, 2).forEach(s => {
        if (s.technique) strings.push(`Mobile: ${s.technique}`);
      });
    }

    return strings;
  };

  const strengthCategories = [
    { label: 'Design', strengths: extractStrengthStrings(matched_benchmark.design_strengths), icon: '🎨' },
    { label: 'SEO', strengths: extractStrengthStrings(matched_benchmark.seo_strengths), icon: '🔍' },
    { label: 'Content', strengths: extractStrengthStrings(matched_benchmark.content_strengths), icon: '✍️' },
    { label: 'Social', strengths: extractStrengthStrings(matched_benchmark.social_strengths), icon: '📱' },
    { label: 'Accessibility', strengths: extractStrengthStrings(matched_benchmark.accessibility_strengths), icon: '♿' }
  ];

  // Filter categories with strengths
  const categoriesWithStrengths = strengthCategories.filter(c => c.strengths && c.strengths.length > 0);

  // Add notice highlighting benchmark's key strengths
  if (categoriesWithStrengths.length > 0 && categoriesWithStrengths.length < strengthCategories.length) {
    html += '        <div style="background: var(--primary-lightest); padding: 16px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid var(--primary);">\n';
    html += `          <p style="margin: 0; font-size: 14px; opacity: 0.9;"><strong>⭐ Key Strengths:</strong> ${matched_benchmark.company_name} excels in ${categoriesWithStrengths.length} key ${categoriesWithStrengths.length === 1 ? 'area' : 'areas'} based on our analysis.</p>\n`;
    html += '        </div>\n';
  }

  if (categoriesWithStrengths.length > 0) {
    // Grid layout - 2 columns on desktop, 1 on mobile
    html += '        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px;">\n';

    categoriesWithStrengths.forEach(category => {
      html += '          <div style="background: var(--bg-secondary); padding: 20px; border-radius: 8px; border-left: 4px solid var(--primary);">\n';
      html += `            <div style="font-weight: 600; font-size: 1.1rem; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">\n`;
      html += `              <span>${category.icon}</span>\n`;
      html += `              <span>${category.label}</span>\n`;
      html += '            </div>\n';
      html += '            <ul style="margin: 0; padding-left: 20px; opacity: 0.9; line-height: 1.6;">\n';
      category.strengths.slice(0, 4).forEach(strength => {
        html += `              <li style="margin-bottom: 6px; font-size: 14px;">${escapeHtml(strength)}</li>\n`;
      });
      html += '            </ul>\n';
      html += '          </div>\n';
    });

    html += '        </div>\n';
  } else {
    html += '        <p style="opacity: 0.7; font-style: italic;">Benchmark strengths data not available.</p>\n';
  }

  html += '      </div>\n';

  html += '    </section>\n\n';
  return html;
}
