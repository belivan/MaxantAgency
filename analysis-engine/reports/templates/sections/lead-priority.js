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
    'high': '🔥',
    'medium': '⚡',
    'low': '📌'
  }[priority_tier?.toLowerCase()] || '📊';

  output += `**Overall Priority Score:** ${formatScore(lead_priority)}\n\n`;
  output += `**Priority Tier:** ${tierEmoji} **${priority_tier || 'Unknown'}**\n\n`;

  if (lead_priority_reasoning) {
    output += `### AI Assessment\n\n`;
    output += `${lead_priority_reasoning}\n\n`;
  }

  // Dimension Breakdown
  if (quality_gap_score || budget_score || urgency_score) {
    output += `## 📊 Dimension Breakdown\n\n`;

    output += `| Dimension | Score | Analysis |\n`;
    output += `|-----------|-------|----------|\n`;

    if (quality_gap_score) {
      const analysis = quality_gap_score >= 7 ? 'High improvement potential' :
                      quality_gap_score >= 5 ? 'Moderate improvement potential' :
                      'Limited improvement potential';
      output += `| 🎯 **Quality Gap** | ${quality_gap_score}/10 | ${analysis} |\n`;
    }

    if (budget_score) {
      const analysis = budget_score >= 7 ? 'Strong budget indicators' :
                      budget_score >= 5 ? 'Moderate budget signals' :
                      'Limited budget evidence';
      output += `| 💰 **Budget Likelihood** | ${budget_score}/10 | ${analysis} |\n`;
    }

    if (urgency_score) {
      const analysis = urgency_score >= 7 ? 'High urgency to fix issues' :
                      urgency_score >= 5 ? 'Moderate urgency' :
                      'Low urgency';
      output += `| ⏰ **Urgency** | ${urgency_score}/10 | ${analysis} |\n`;
    }

    if (industry_fit_score) {
      const analysis = industry_fit_score >= 7 ? 'Excellent fit for services' :
                      industry_fit_score >= 5 ? 'Good fit' :
                      'Moderate fit';
      output += `| 🎨 **Industry Fit** | ${industry_fit_score}/10 | ${analysis} |\n`;
    }

    if (company_size_score) {
      const analysis = company_size_score >= 7 ? 'Ideal company size' :
                      company_size_score >= 5 ? 'Acceptable size' :
                      'Small company';
      output += `| 🏢 **Company Size** | ${company_size_score}/10 | ${analysis} |\n`;
    }

    if (engagement_score) {
      const analysis = engagement_score >= 7 ? 'High engagement potential' :
                      engagement_score >= 5 ? 'Moderate engagement' :
                      'Low engagement signals';
      output += `| 📞 **Engagement Potential** | ${engagement_score}/10 | ${analysis} |\n`;
    }

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
