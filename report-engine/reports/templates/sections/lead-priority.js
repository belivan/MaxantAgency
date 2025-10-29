/**
 * Lead Priority Assessment Section
 */

import { formatScore } from '../../formatters/score-formatter.js';

export function generateLeadPrioritySection(analysisResult) {
  const {
    lead_priority,
    lead_priority_reasoning,
    priority_tier,
    budget_likelihood,
    fit_score,
    quality_gap_score,
    budget_score,
    urgency_score,
    industry_fit_score,
    company_size_score,
    engagement_score
  } = analysisResult;

  if (!lead_priority) {
    return ''; // Skip if no lead priority data
  }

  let output = `# 8. Lead Priority Assessment\n\n`;

  // Overall Priority
  const tierEmoji = {
    'hot': '🔥',
    'warm': '♨️',
    'cold': '❄️'
  }[priority_tier?.toLowerCase()] || '⭐';

  output += `**Overall Priority Score:** ${formatScore(lead_priority)}\n\n`;
  output += `**Priority Tier:** ${tierEmoji} **${priority_tier || 'Unknown'}**\n\n`;

  if (lead_priority_reasoning) {
    output += `### AI Assessment\n\n`;
    output += `${lead_priority_reasoning}\n\n`;
  }

  // Dimension Breakdown
  const dimensionConfigs = [
    { key: 'quality_gap_score', label: '🔥 **Quality Gap**', max: 25, descriptors: ['High improvement potential', 'Moderate improvement potential', 'Limited improvement potential'] },
    { key: 'budget_score', label: '💰 **Budget Likelihood**', max: 25, descriptors: ['Strong budget indicators', 'Moderate budget signals', 'Limited budget evidence'] },
    { key: 'urgency_score', label: '⏱️ **Urgency**', max: 20, descriptors: ['High urgency to fix issues', 'Moderate urgency', 'Low urgency'] },
    { key: 'industry_fit_score', label: '🎯 **Industry Fit**', max: 15, descriptors: ['Excellent fit for services', 'Good fit', 'Moderate fit'] },
    { key: 'company_size_score', label: '🏢 **Company Size**', max: 10, descriptors: ['Ideal company size', 'Acceptable size', 'Smaller company'] },
    { key: 'engagement_score', label: '🤝 **Engagement Potential**', max: 5, descriptors: ['High engagement potential', 'Moderate engagement', 'Low engagement signals'] }
  ];

  const dimensionRows = dimensionConfigs
    .map(config => {
      const score = analysisResult[config.key];
      if (score === undefined || score === null) return null;

      const ratio = score / config.max;
      const [high, medium, low] = config.descriptors;
      const description = ratio >= 0.75 ? high : ratio >= 0.45 ? medium : low;

      return `| ${config.label} | ${score}/${config.max} | ${description} |`;
    })
    .filter(Boolean);

  if (dimensionRows.length > 0) {
    output += `## Score Breakdown by Dimension\n\n`;
    output += `| Dimension | Score | Analysis |\n`;
    output += `|-----------|-------|----------|\n`;
    dimensionRows.forEach(row => {
      output += `${row}\n`;
    });
    output += '\n';
  }

  // Budget Likelihood
  if (budget_likelihood) {
    output += `### 💰 Budget Assessment\n\n`;
    output += `**Budget Likelihood:** ${budget_likelihood}\n\n`;
  }

  // Fit Score
  if (fit_score) {
    output += `### 🎯 Fit Score\n\n`;
    output += `**Overall Fit:** ${formatScore(fit_score)}\n\n`;
  }

  output += `---\n\n`;

  return output;
}
