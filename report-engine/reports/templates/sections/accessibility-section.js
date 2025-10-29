/**
 * Accessibility (WCAG) Analysis Section
 */

import { formatScore, formatWCAGCompliance } from '../../formatters/score-formatter.js';
import { formatIssuesByPriority } from '../../formatters/issue-formatter.js';

export function generateAccessibilitySection(analysisResult) {
  const {
    accessibility_score,
    accessibility_issues = [],
    accessibility_wcag_level = 'AA',
    accessibility_compliance = 'unknown'
  } = analysisResult;

  if (!accessibility_score) {
    return ''; // Skip if no accessibility analysis
  }

  let output = `# 6. Accessibility Audit (WCAG 2.1 ${accessibility_wcag_level})\n`;
  output += `**Score: ${formatScore(accessibility_score)}**\n\n`;

  // Compliance status
  output += `**Compliance Level:** ${formatWCAGCompliance(accessibility_compliance)}\n\n`;

  if (accessibility_issues.length === 0) {
    output += `✅ **No significant accessibility issues detected.**\n\n`;
    output += `Your website meets WCAG ${accessibility_wcag_level} standards.\n\n`;
    output += `---\n\n`;
    return output;
  }

  // Accessibility Issues (grouped by WCAG criteria)
  output += `## Accessibility Issues\n\n`;
  output += `_All issues reference WCAG 2.1 Level ${accessibility_wcag_level} criteria._\n\n`;

  output += formatIssuesByPriority(accessibility_issues);

  // WCAG Resources
  output += `## 📚 WCAG Resources\n\n`;
  output += `- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)\n`;
  output += `- [WebAIM Accessibility Checker](https://wave.webaim.org/)\n`;
  output += `- [Lighthouse Accessibility Audit](https://developers.google.com/web/tools/lighthouse)\n\n`;

  output += `---\n\n`;

  return output;
}
