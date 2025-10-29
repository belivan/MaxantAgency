/**
 * Outreach Strategy Section
 * Displays pre-written sales hooks and engagement strategies
 */

import { formatGradeBadge } from '../../formatters/score-formatter.js';

export function generateOutreachStrategy(analysisResult) {
  const {
    call_to_action,
    outreach_angle,
    top_issue,
    website_grade,
    priority_tier,
    budget_likelihood,
    one_liner,
    analysis_summary
  } = analysisResult;

  // Skip if no outreach data available
  if (!call_to_action && !outreach_angle && !analysis_summary) {
    return '';
  }

  let output = `# 📧 Outreach Strategy\n\n`;

  // Outreach angle based on grade
  if (outreach_angle) {
    output += `## Sales Angle\n\n`;
    output += `${outreach_angle}\n\n`;
  }

  // Call to action
  if (call_to_action) {
    output += `## Suggested Call-to-Action\n\n`;
    output += `> "${call_to_action}"\n\n`;
  }

  // Primary concern with full details
  if (top_issue) {
    output += `## Primary Concern\n\n`;

    if (typeof top_issue === 'object') {
      output += `**Category:** ${top_issue.category || 'General'}\n`;
      output += `**Issue:** ${top_issue.issue || top_issue.description || one_liner}\n`;

      if (top_issue.impact) {
        output += `**Impact:** ${top_issue.impact}\n`;
      }

      if (top_issue.effort) {
        output += `**Effort to Fix:** ${top_issue.effort}\n`;
      }

      if (top_issue.recommendation) {
        output += `\n**Recommendation:** ${top_issue.recommendation}\n`;
      }
    } else {
      output += `${top_issue}\n`;
    }

    output += '\n';
  }

  // Analysis summary if available
  if (analysis_summary) {
    output += `## Analysis Summary\n\n`;
    output += `${analysis_summary}\n\n`;
  }

  // Qualification indicators
  if (priority_tier || budget_likelihood) {
    output += `## Lead Qualification\n\n`;

    if (priority_tier) {
      const tierEmoji = {
        'hot': '🔥',
        'warm': '🌡️',
        'cold': '❄️'
      };
      const tierLabel = priority_tier.charAt(0).toUpperCase() + priority_tier.slice(1);
      output += `**Priority Tier:** ${tierEmoji[priority_tier] || '📊'} ${tierLabel}\n`;
    }

    if (budget_likelihood) {
      const budgetEmoji = {
        'high': '💰',
        'medium': '💵',
        'low': '💸'
      };
      const budgetLabel = budget_likelihood.charAt(0).toUpperCase() + budget_likelihood.slice(1);
      output += `**Budget Likelihood:** ${budgetEmoji[budget_likelihood] || '💲'} ${budgetLabel}\n`;
    }

    output += '\n';
  }

  // Email subject line suggestions based on grade
  output += `## Email Subject Line Ideas\n\n`;

  if (website_grade === 'F') {
    output += `- ⚠️ "${one_liner || 'Critical website issues affecting your business'}"\n`;
    output += `- "Your website is actively losing customers - here's why"\n`;
    output += `- "Quick wins to stop losing ${analysisResult.industry || 'business'} customers online"\n`;
  } else if (website_grade === 'D') {
    output += `- "${one_liner || 'Your website needs attention'}"\n`;
    output += `- "Missing out on ${analysisResult.city || 'local'} customers? Website audit inside"\n`;
    output += `- "5 website fixes to boost your ${analysisResult.industry || 'business'}"\n`;
  } else if (website_grade === 'C') {
    output += `- "${one_liner || 'Room for improvement on your website'}"\n`;
    output += `- "Good website, but you're leaving money on the table"\n`;
    output += `- "How to go from average to exceptional online presence"\n`;
  } else if (website_grade === 'B') {
    output += `- "${one_liner || 'Optimize your already good website'}"\n`;
    output += `- "You're doing well - here's how to dominate"\n`;
    output += `- "The final tweaks to perfect your web presence"\n`;
  } else {
    output += `- "${one_liner || 'Exceptional website with minor optimizations'}"\n`;
    output += `- "Maintaining excellence - small tweaks for your A-grade site"\n`;
    output += `- "Stay ahead of the competition with these optimizations"\n`;
  }

  output += `\n---\n\n`;

  return output;
}