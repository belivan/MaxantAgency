/**
 * Mobile Visual Analysis Section
 */

import { formatScore } from '../../formatters/score-formatter.js';
import { formatIssuesByPriority, formatStrengths } from '../../formatters/issue-formatter.js';

export function generateMobileAnalysis(analysisResult) {
  const {
    design_score_mobile,
    design_issues_mobile = [],
    is_mobile_friendly,
    screenshot_mobile_url,
    mobile_critical_issues
  } = analysisResult;

  if (!design_score_mobile) {
    return ''; // Skip if no mobile analysis
  }

  let output = `# 2. Mobile Experience Analysis\n`;
  output += `**Score: ${formatScore(design_score_mobile)}**`;

  // Show critical issue count if available
  if (mobile_critical_issues > 0) {
    output += ` | **🚨 ${mobile_critical_issues} Critical Issue${mobile_critical_issues > 1 ? 's' : ''} Found**`;
  }

  output += `\n\n`;

  // Mobile-friendly indicator
  if (is_mobile_friendly !== undefined) {
    const friendlyStatus = is_mobile_friendly ? '✅ Mobile-Friendly' : '❌ Not Mobile-Friendly';
    output += `**Mobile-Friendly Test:** ${friendlyStatus}\n\n`;
  }

  // Include mobile screenshot if available
  if (screenshot_mobile_url) {
    output += `![Mobile Screenshot](${screenshot_mobile_url})\n\n`;
  }

  if (design_issues_mobile.length === 0) {
    output += `✅ **No significant mobile UX issues detected.**\n\n`;
    output += `Your mobile experience provides excellent usability with responsive design.\n\n`;
    return output;
  }

  // Group and format issues by priority
  output += formatIssuesByPriority(design_issues_mobile);

  // Extract strengths if available
  const strengths = design_issues_mobile
    .filter(i => i.isStrength)
    .map(i => i.description || i.title);

  if (strengths.length > 0) {
    output += formatStrengths(strengths);
  }

  output += `---\n\n`;

  return output;
}