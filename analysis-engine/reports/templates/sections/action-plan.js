/**
 * Recommended Action Plan Section
 */

import { estimatePhaseTime, estimatePhaseCost, estimateScoreImprovement } from '../../utils/estimator.js';
import { groupIntoPhases } from '../../utils/priority-sorter.js';
import { formatQuickWins, formatRecommendation } from '../../formatters/issue-formatter.js';

export function generateActionPlan(analysisResult) {
  const {
    quick_wins = [],
    design_issues_desktop = [],
    design_issues_mobile = [],
    seo_issues = [],
    content_issues = [],
    social_issues = [],
    accessibility_issues = [],
    overall_score
  } = analysisResult;

  // Combine all issues
  const allIssues = [
    ...design_issues_desktop,
    ...design_issues_mobile,
    ...seo_issues,
    ...content_issues,
    ...social_issues,
    ...accessibility_issues
  ];

  if (allIssues.length === 0 && quick_wins.length === 0) {
    return `# 9. Recommended Action Plan\n\n✅ **No significant issues detected.** Your website is well-optimized!\n\n`;
  }

  let output = `# 9. Recommended Action Plan\n\n`;

  output += `This section provides a phased approach to improving your website, prioritized by impact and effort.\n\n`;

  // Group issues into phases
  const { phase1, phase2, phase3 } = groupIntoPhases(allIssues, quick_wins);

  // Phase 1: Quick Wins
  if (phase1.length > 0) {
    const phaseTime = estimatePhaseTime(phase1);
    const phaseCost = estimatePhaseCost(phase1);
    const improvement = estimateScoreImprovement(phase1, overall_score);

    output += `## Phase 1: Quick Wins\n\n`;
    output += `**Timeline:** Week 1 | **Estimated Time:** ${phaseTime} | **Estimated Cost:** ${phaseCost}\n\n`;
    output += `**Impact:** +${improvement.improvement} points → ${improvement.potentialScore}/100 potential score\n\n`;

    output += formatQuickWins(phase1, true);
    output += '\n';
  }

  // Phase 2: High-Impact Fixes
  if (phase2.length > 0) {
    const phaseTime = estimatePhaseTime(phase2);
    const phaseCost = estimatePhaseCost(phase2);
    const baseScore = phase1.length > 0 ?
      estimateScoreImprovement(phase1, overall_score).potentialScore :
      overall_score;
    const improvement = estimateScoreImprovement(phase2, baseScore);

    output += `## Phase 2: High-Impact Fixes\n\n`;
    output += `**Timeline:** Month 1 | **Estimated Time:** ${phaseTime} | **Estimated Cost:** ${phaseCost}\n\n`;
    output += `**Impact:** +${improvement.improvement} points → ${improvement.potentialScore}/100 potential score\n\n`;

    output += `**Action Items:**\n\n`;
    phase2.forEach((issue, index) => {
      output += `${index + 1}. **${issue.title}**\n`;
      if (issue.fix) {
        output += `   - ${issue.fix}\n`;
      }
    });
    output += '\n';
  }

  // Phase 3: Strategic Improvements
  if (phase3.length > 0) {
    const phaseTime = estimatePhaseTime(phase3);
    const phaseCost = estimatePhaseCost(phase3);

    output += `## Phase 3: Strategic Improvements\n\n`;
    output += `**Timeline:** Month 2-3 | **Estimated Time:** ${phaseTime} | **Estimated Cost:** ${phaseCost}\n\n`;

    output += `**Strategic Initiatives:**\n\n`;
    phase3.forEach((issue, index) => {
      output += `${index + 1}. **${issue.title}**\n`;
      if (issue.description) {
        output += `   - ${issue.description}\n`;
      }
    });
    output += '\n';
  }

  // Total Investment Summary
  const totalIssues = phase1.length + phase2.length + phase3.length;
  const totalTime = estimatePhaseTime([...phase1, ...phase2, ...phase3]);
  const totalCost = estimatePhaseCost([...phase1, ...phase2, ...phase3]);
  const finalImprovement = estimateScoreImprovement(allIssues, overall_score);

  output += `## 💰 Total Investment Summary\n\n`;
  output += `| Metric | Value |\n`;
  output += `|--------|-------|\n`;
  output += `| **Total Issues to Address** | ${totalIssues} |\n`;
  output += `| **Total Estimated Time** | ${totalTime} |\n`;
  output += `| **Total Estimated Cost** | ${totalCost} |\n`;
  output += `| **Potential Score Improvement** | +${finalImprovement.improvement} points |\n`;
  output += `| **Projected Final Score** | ${finalImprovement.potentialScore}/100 |\n`;
  output += '\n';

  output += `_Note: Estimates are based on typical agency rates ($100/hour) and may vary based on specific implementation requirements._\n\n`;

  output += `---\n\n`;

  return output;
}
