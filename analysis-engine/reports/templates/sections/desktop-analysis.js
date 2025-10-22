/**
 * Desktop Visual Analysis Section
 */

import { formatScore } from '../../formatters/score-formatter.js';
import { formatIssuesByPriority, formatStrengths } from '../../formatters/issue-formatter.js';

export function generateDesktopAnalysis(analysisResult) {
  const {
    design_score_desktop,
    design_issues_desktop = [],
    screenshot_desktop_url,
    desktop_critical_issues
  } = analysisResult;

  if (!design_score_desktop) {
    return ''; // Skip if no desktop analysis
  }

  let output = `# 1. Desktop Experience Analysis\n`;
  output += `**Score: ${formatScore(design_score_desktop)}**`;

  // Show critical issue count if available
  if (desktop_critical_issues > 0) {
    output += ` | **🚨 ${desktop_critical_issues} Critical Issue${desktop_critical_issues > 1 ? 's' : ''} Found**`;
  }

  output += `\n\n`;

  // Include desktop screenshot if available
  if (screenshot_desktop_url) {
    output += `![Desktop Screenshot](${screenshot_desktop_url})\n\n`;
  }

  if (design_issues_desktop.length === 0) {
    output += `✅ **No significant desktop UX issues detected.**\n\n`;
    output += `Your desktop experience is well-optimized with strong visual hierarchy and user flow.\n\n`;
    return output;
  }

  // Group and format issues by priority
  output += formatIssuesByPriority(design_issues_desktop);

  // Extract strengths if available
  const strengths = design_issues_desktop
    .filter(i => i.isStrength)
    .map(i => i.description || i.title);

  if (strengths.length > 0) {
    output += formatStrengths(strengths);
  }

  output += `---\n\n`;

  return output;
}