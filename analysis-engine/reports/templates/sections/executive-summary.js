/**
 * Executive Summary Section
 */

import { formatGradeBadge, formatScore, createScoreRow } from '../../formatters/score-formatter.js';
import { formatQuickWins } from '../../formatters/issue-formatter.js';

export function generateExecutiveSummary(analysisResult) {
  const {
    company_name,
    industry,
    city,
    website_url = analysisResult.url,
    grade,
    overall_score,
    analyzed_at,
    one_liner,
    quick_wins = [],
    design_score,
    design_score_desktop,
    design_score_mobile,
    seo_score,
    content_score,
    social_score,
    accessibility_score
  } = analysisResult;

  const analysisDate = new Date(analyzed_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const location = city ? ` | **Location:** ${city}` : '';

  let output = `# Website Audit Report: ${company_name}\n\n`;

  // Header badges
  output += `**${formatGradeBadge(grade)}** | **Overall Score: ${formatScore(overall_score)}** | **Analyzed:** ${analysisDate}\n\n`;
  output += `**Industry:** ${industry}${location}  \n`;
  output += `**Website:** [${website_url}](${website_url})\n\n`;

  output += `---\n\n`;

  // At a Glance section
  output += `## 📊 At a Glance\n\n`;

  // Score breakdown table
  output += `| Category | Score | Status |\n`;
  output += `|----------|-------|--------|\n`;

  if (design_score_desktop !== undefined) {
    output += createScoreRow('🖥️ Desktop Design', design_score_desktop) + '\n';
  }
  if (design_score_mobile !== undefined) {
    output += createScoreRow('📱 Mobile Design', design_score_mobile) + '\n';
  } else if (design_score !== undefined) {
    output += createScoreRow('🎨 Design', design_score) + '\n';
  }

  output += createScoreRow('🔍 SEO', seo_score || 50) + '\n';
  output += createScoreRow('📝 Content', content_score || 50) + '\n';
  output += createScoreRow('📱 Social Media', social_score || 50) + '\n';

  if (accessibility_score !== undefined) {
    output += createScoreRow('♿ Accessibility', accessibility_score) + '\n';
  }

  output += '\n';

  // Top Priority
  if (one_liner) {
    output += `## 🎯 Top Priority\n\n`;
    output += `${one_liner}\n\n`;
  }

  // Quick Wins
  if (quick_wins && quick_wins.length > 0) {
    const totalQuickWins = quick_wins.length;
    const displayQuickWins = quick_wins.slice(0, 5);

    output += `## ⚡ Quick Wins (${totalQuickWins} item${totalQuickWins > 1 ? 's' : ''})\n\n`;
    output += formatQuickWins(displayQuickWins, false);
    output += '\n';
  }

  output += `---\n\n`;

  return output;
}