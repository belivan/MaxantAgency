/**
 * Social Media Analysis Section
 */

import { formatScore } from '../../formatters/score-formatter.js';
import { formatIssuesByPriority } from '../../formatters/issue-formatter.js';

export function generateSocialSection(analysisResult) {
  const {
    social_score,
    social_issues = [],
    social_platforms_present = [],
    social_profiles = {}
  } = analysisResult;

  let output = `# 5. Social Media Presence Analysis\n`;
  output += `**Score: ${formatScore(social_score || 50)}**\n\n`;

  // Platform Presence
  output += `## 📱 Platform Presence\n\n`;

  if (social_platforms_present.length === 0) {
    output += `❌ **No social media profiles detected on website.**\n\n`;
    output += `Recommendation: Add social media links to your website footer and contact page.\n\n`;
  } else {
    output += `**Active Platforms:** ${social_platforms_present.length}\n\n`;

    Object.entries(social_profiles).forEach(([platform, url]) => {
      const emoji = getPlatformEmoji(platform);
      output += `- ${emoji} **${platform}**: [${url}](${url})\n`;
    });

    output += '\n';
  }

  // Social Issues
  if (social_issues.length > 0) {
    output += `## Social Media Issues\n\n`;
    output += formatIssuesByPriority(social_issues);
  }

  output += `---\n\n`;

  return output;
}

function getPlatformEmoji(platform) {
  const emojis = {
    'facebook': '📘',
    'instagram': '📷',
    'twitter': '🐦',
    'x': '✖️',
    'linkedin': '💼',
    'youtube': '📹',
    'tiktok': '🎵',
    'pinterest': '📌',
    'yelp': '⭐',
    'google': '🔍'
  };

  return emojis[platform.toLowerCase()] || '🔗';
}
