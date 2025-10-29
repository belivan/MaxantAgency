/**
 * Score Formatter - Format scores with emoji indicators and status badges
 */

/**
 * Get emoji indicator for score
 */
export function getScoreEmoji(score) {
  if (score >= 85) return '🟢';
  if (score >= 70) return '🟡';
  if (score >= 55) return '🟠';
  return '🔴';
}

/**
 * Get status text for score
 */
export function getScoreStatus(score) {
  if (score >= 85) return '✅ Excellent';
  if (score >= 70) return '✅ Good';
  if (score >= 55) return '⚠️ Needs Work';
  if (score >= 40) return '❌ Poor';
  return '❌ Critical';
}

/**
 * Format score as "70/100"
 */
export function formatScore(score) {
  return `${Math.round(score)}/100`;
}

/**
 * Format grade badge
 */
export function formatGradeBadge(grade) {
  const badges = {
    'A': '🏆 Grade A',
    'B': '✨ Grade B',
    'C': '⚠️ Grade C',
    'D': '❌ Grade D',
    'F': '🚨 Grade F'
  };
  return badges[grade] || grade;
}

/**
 * Format priority badge
 */
export function formatPriority(priority) {
  const badges = {
    'critical': '🔴 Critical',
    'high': '🔴 High',
    'medium': '🟡 Medium',
    'low': '🟢 Low'
  };
  return badges[priority] || priority;
}

/**
 * Format difficulty badge
 */
export function formatDifficulty(difficulty) {
  const badges = {
    'quick-win': '⚡ Quick Win',
    'medium': '⏱️ Medium',
    'major': '🏗️ Major'
  };
  return badges[difficulty] || difficulty;
}

/**
 * Format WCAG compliance level
 */
export function formatWCAGCompliance(compliance) {
  const badges = {
    'full': '✅ Full Compliance',
    'partial': '⚠️ Partial Compliance',
    'minimal': '❌ Minimal Compliance',
    'unknown': '❓ Unknown'
  };
  return badges[compliance] || compliance;
}

/**
 * Create score comparison table row
 */
export function createScoreRow(category, score, emoji = null) {
  const emojiDisplay = emoji || getScoreEmoji(score);
  const status = getScoreStatus(score);
  return `| ${emojiDisplay} **${category}** | ${formatScore(score)} | ${status} |`;
}