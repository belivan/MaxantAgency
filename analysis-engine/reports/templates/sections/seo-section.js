/**
 * SEO & Technical Analysis Section
 */

import { formatScore } from '../../formatters/score-formatter.js';
import { formatIssuesByPriority } from '../../formatters/issue-formatter.js';

export function generateSEOSection(analysisResult) {
  const {
    seo_score,
    seo_issues = [],
    page_title,
    meta_description,
    tech_stack,
    page_load_time,
    has_https
  } = analysisResult;

  let output = `# 3. SEO & Technical Analysis\n`;
  output += `**Score: ${formatScore(seo_score || 50)}**\n\n`;

  // Technical Snapshot
  output += `## 📋 Technical Snapshot\n\n`;
  output += `| Metric | Value |\n`;
  output += `|--------|-------|\n`;

  if (page_title) {
    output += `| **Page Title** | ${page_title} |\n`;
  }
  if (meta_description) {
    output += `| **Meta Description** | ${meta_description.substring(0, 80)}${meta_description.length > 80 ? '...' : ''} |\n`;
  }
  if (tech_stack) {
    output += `| **Tech Stack** | ${tech_stack} |\n`;
  }
  if (page_load_time) {
    const loadSeconds = (page_load_time / 1000).toFixed(2);
    const loadStatus = page_load_time < 2000 ? '✅ Fast' : page_load_time < 3000 ? '⚠️ Acceptable' : '❌ Slow';
    output += `| **Page Load Time** | ${loadSeconds}s (${loadStatus}) |\n`;
  }
  if (has_https !== undefined) {
    output += `| **HTTPS** | ${has_https ? '✅ Enabled' : '❌ Not Enabled'} |\n`;
  }

  output += '\n';

  // SEO Issues
  if (seo_issues.length === 0) {
    output += `✅ **No significant SEO issues detected.**\n\n`;
    output += `Your on-page SEO is well-optimized.\n\n`;
  } else {
    output += `## SEO Issues\n\n`;
    output += formatIssuesByPriority(seo_issues);
  }

  output += `---\n\n`;

  return output;
}
