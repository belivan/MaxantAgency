/**
 * Content Quality Analysis Section
 */

import { formatScore } from '../../formatters/score-formatter.js';
import { formatIssuesByPriority } from '../../formatters/issue-formatter.js';

export function generateContentSection(analysisResult) {
  const {
    content_score,
    content_issues = [],
    has_blog,
    content_insights = {},
    contact_email,
    contact_phone
  } = analysisResult;

  let output = `# 4. Content Quality Analysis\n`;
  output += `**Score: ${formatScore(content_score || 50)}**\n\n`;

  // Content Inventory
  output += `## 📦 Content Inventory\n\n`;
  output += `| Metric | Value |\n`;
  output += `|--------|-------|\n`;

  if (content_insights && content_insights.wordCount) {
    output += `| **Word Count** | ${content_insights.wordCount} |\n`;
  }

  if (has_blog !== undefined) {
    const blogStatus = has_blog ? '✅ Present' : '❌ Missing';
    output += `| **Blog** | ${blogStatus} |\n`;

    if (has_blog && content_insights && content_insights.blogPostCount) {
      output += `| **Blog Posts** | ${content_insights.blogPostCount} |\n`;
    }
  }

  if (content_insights && content_insights.ctaCount !== undefined) {
    output += `| **CTAs** | ${content_insights.ctaCount} |\n`;
  }

  if (content_insights && content_insights.completeness) {
    output += `| **Content Completeness** | ${content_insights.completeness} |\n`;
  }

  if (contact_email) {
    output += `| **Contact Email** | ${contact_email} |\n`;
  }

  if (contact_phone) {
    output += `| **Contact Phone** | ${contact_phone} |\n`;
  }

  output += '\n';

  // Content Issues
  if (content_issues.length === 0) {
    output += `✅ **No significant content issues detected.**\n\n`;
    output += `Your content strategy is effective and engaging.\n\n`;
  } else {
    output += `## Content Issues\n\n`;
    output += formatIssuesByPriority(content_issues);
  }

  output += `---\n\n`;

  return output;
}
