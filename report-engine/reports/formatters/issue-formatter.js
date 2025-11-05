/**
 * Issue Formatter - Format issues and recommendations for markdown output
 */

import { formatPriority, formatDifficulty } from './score-formatter.js';

/**
 * Format source analyzer name to human-readable label
 */
function formatSource(source) {
  if (!source) return '';

  const sourceLabels = {
    'seo-analyzer': 'SEO',
    'content-analyzer': 'Content',
    'accessibility-analyzer': 'Accessibility',
    'social-analyzer': 'Social',
    'desktop-visual-analyzer': 'Desktop Visual',
    'mobile-visual-analyzer': 'Mobile Visual',
    'unified-visual-analyzer': 'Visual',
    'unified-technical-analyzer': 'Technical'
  };

  return sourceLabels[source] || source;
}

/**
 * Format a single issue for markdown
 */
export function formatIssue(issue, index) {
  const { title, description, impact, fix, priority, difficulty, category, wcagCriterion, source, source_type } = issue;

  let output = `### ${index}. ${title}\n`;

  if (description) {
    output += `**Issue:** ${description}\n\n`;
  }

  if (impact) {
    output += `**Impact:** ${impact}\n\n`;
  }

  if (fix) {
    output += `**Fix:** ${fix}\n\n`;
  }

  const metadata = [];
  if (difficulty) metadata.push(`**Difficulty:** ${formatDifficulty(difficulty)}`);
  if (priority) metadata.push(`**Priority:** ${formatPriority(priority)}`);
  if (category) metadata.push(`**Category:** ${category}`);
  if (wcagCriterion) metadata.push(`**WCAG:** ${wcagCriterion}`);
  if (source) metadata.push(`**Source:** ${formatSource(source)}`);

  if (metadata.length > 0) {
    output += metadata.join(' | ') + '\n';
  }

  return output;
}

/**
 * Format list of issues grouped by priority
 */
export function formatIssuesByPriority(issues) {
  const critical = issues.filter(i => i.priority === 'critical' || i.priority === 'high');
  const medium = issues.filter(i => i.priority === 'medium');
  const low = issues.filter(i => i.priority === 'low');

  let output = '';

  if (critical.length > 0) {
    output += `## 🔴 Critical Issues (${critical.length})\n\n`;
    critical.forEach((issue, index) => {
      output += formatIssue(issue, index + 1) + '\n';
    });
  }

  if (medium.length > 0) {
    output += `## 🟡 Medium Priority (${medium.length})\n\n`;
    medium.forEach((issue, index) => {
      output += formatIssue(issue, index + 1) + '\n';
    });
  }

  if (low.length > 0) {
    output += `## 🟢 Low Priority (${low.length})\n\n`;
    low.forEach((issue, index) => {
      output += formatIssue(issue, index + 1) + '\n';
    });
  }

  return output;
}

/**
 * Format quick wins as numbered list
 */
export function formatQuickWins(quickWins, includeEstimates = true) {
  if (!quickWins || quickWins.length === 0) {
    return '_No quick wins identified._\n';
  }

  let output = '';
  quickWins.forEach((qw, index) => {
    const title = qw.title || qw;
    const estimate = includeEstimates && qw.estimatedTime ? ` _(${qw.estimatedTime})_` : '';
    const impact = qw.impact ? ` - ${qw.impact}` : '';
    output += `${index + 1}. ⚡ **${title}**${estimate}${impact}\n`;
  });

  return output;
}

/**
 * Format strengths as bulleted list
 */
export function formatStrengths(strengths) {
  if (!strengths || strengths.length === 0) {
    return '';
  }

  let output = '## ✅ Strengths\n\n';
  strengths.forEach(strength => {
    output += `- ${strength}\n`;
  });

  return output + '\n';
}

/**
 * Format recommendations with action items
 */
export function formatRecommendation(recommendation) {
  const { priority, title, items, impact, estimatedCost, estimatedTime } = recommendation;

  let output = `### ${title}\n\n`;

  if (impact) {
    output += `**Impact:** ${impact}\n\n`;
  }

  if (estimatedCost) {
    output += `**Estimated Cost:** ${estimatedCost}\n\n`;
  }

  if (estimatedTime) {
    output += `**Estimated Time:** ${estimatedTime}\n\n`;
  }

  if (items && items.length > 0) {
    output += '**Action Items:**\n';
    items.forEach(item => {
      output += `- ${item}\n`;
    });
  }

  return output + '\n';
}