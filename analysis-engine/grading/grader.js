/**
 * Grader - Calculate letter grades and overall scores from analysis results
 *
 * Takes scores from design, SEO, content, and social analyzers
 * Applies weights, bonuses, and penalties
 * Returns letter grade (A-F) with detailed breakdown
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load grading configuration
let config;
try {
  const configPath = join(__dirname, 'weights.json');
  config = JSON.parse(readFileSync(configPath, 'utf8'));
} catch (error) {
  console.error('Failed to load grading configuration:', error.message);
  // Fallback to default config
  config = {
    weights: { design: 0.30, seo: 0.30, content: 0.20, social: 0.20 },
    scale: {
      A: { min: 85, label: 'Excellent' },
      B: { min: 70, label: 'Good' },
      C: { min: 55, label: 'Needs Work' },
      D: { min: 40, label: 'Poor' },
      F: { min: 0, label: 'Failing' }
    },
    defaults: { missingScores: { design: 30, seo: 30, content: 30, social: 30 } },
    bonuses: { quickWinBonus: { enabled: true, value: 5, threshold: 3 } },
    penalties: {
      brokenSite: { enabled: true, value: -20 },
      mobileFailure: { enabled: true, value: -15 },
      securityIssues: { enabled: true, value: -10 }
    }
  };
}

/**
 * Calculate overall grade from analysis results
 *
 * @param {object} scores - Scores from all analyzers
 * @param {number} scores.design - Design score (0-100)
 * @param {number} scores.seo - SEO score (0-100)
 * @param {number} scores.content - Content score (0-100)
 * @param {number} scores.social - Social media score (0-100)
 * @param {object} metadata - Additional data for bonuses/penalties
 * @param {number} metadata.quickWinCount - Number of quick-win fixes identified
 * @param {boolean} metadata.isMobileFriendly - Is site mobile-friendly?
 * @param {boolean} metadata.hasHTTPS - Does site use HTTPS?
 * @param {boolean} metadata.siteAccessible - Did site load successfully?
 * @param {string} metadata.industry - Industry type (for future industry-specific weights)
 * @returns {object} Grading results with letter grade and breakdown
 */
export function calculateGrade(scores, metadata = {}) {
  // Validate inputs
  validateScores(scores);

  // Use default scores if any are missing
  const finalScores = {
    design: scores.design ?? config.defaults.missingScores.design,
    seo: scores.seo ?? config.defaults.missingScores.seo,
    content: scores.content ?? config.defaults.missingScores.content,
    social: scores.social ?? config.defaults.missingScores.social
  };

  // Get weights (with industry adjustment if enabled)
  const weights = getWeights(metadata.industry);

  // Calculate base weighted score
  const weightedScore =
    finalScores.design * weights.design +
    finalScores.seo * weights.seo +
    finalScores.content * weights.content +
    finalScores.social * weights.social;

  // Apply bonuses
  const bonuses = calculateBonuses(metadata);
  const totalBonus = bonuses.reduce((sum, b) => sum + b.value, 0);

  // Apply penalties
  const penalties = calculatePenalties(metadata);
  const totalPenalty = penalties.reduce((sum, p) => sum + p.value, 0);

  // Calculate final score (clamped to 0-100)
  const finalScore = Math.max(0, Math.min(100, weightedScore + totalBonus + totalPenalty));

  // Determine letter grade
  const grade = getLetterGrade(finalScore);

  // Return detailed breakdown
  return {
    grade: grade.letter,
    overallScore: Math.round(finalScore * 10) / 10,
    gradeLabel: grade.label,
    gradeDescription: grade.description,
    outreachAngle: grade.outreachAngle,

    breakdown: {
      baseScore: Math.round(weightedScore * 10) / 10,
      bonuses: bonuses,
      penalties: penalties,
      totalBonus: totalBonus,
      totalPenalty: totalPenalty
    },

    scores: finalScores,
    weights: weights,

    _meta: {
      grader: 'v1.0',
      timestamp: new Date().toISOString()
    }
  };
}

/**
 * Get letter grade from numeric score
 */
function getLetterGrade(score) {
  const scale = config.scale;

  for (const [letter, range] of Object.entries(scale)) {
    if (score >= range.min && score <= range.max) {
      return {
        letter,
        label: range.label,
        description: range.description,
        outreachAngle: range.outreachAngle,
        expectedIssues: range.expectedIssues
      };
    }
  }

  return {
    letter: 'F',
    label: scale.F.label,
    description: scale.F.description,
    outreachAngle: scale.F.outreachAngle,
    expectedIssues: scale.F.expectedIssues
  };
}

/**
 * Get weights (with optional industry adjustment)
 */
function getWeights(industry) {
  if (
    config.industryAdjustments.enabled &&
    industry &&
    config.industryAdjustments.industries[industry]
  ) {
    return config.industryAdjustments.industries[industry];
  }

  return config.weights;
}

/**
 * Calculate applicable bonuses
 */
function calculateBonuses(metadata) {
  const bonuses = [];

  if (config.bonuses.quickWinBonus.enabled) {
    const { value, threshold } = config.bonuses.quickWinBonus;
    const quickWinCount = metadata.quickWinCount || 0;

    if (quickWinCount >= threshold) {
      bonuses.push({
        type: 'quick_win_bonus',
        value: value,
        reason: `${quickWinCount} quick-win fixes identified (threshold: ${threshold})`
      });
    }
  }

  if (config.bonuses.industryOptimization.enabled && metadata.industryOptimized) {
    bonuses.push({
      type: 'industry_optimization',
      value: config.bonuses.industryOptimization.value,
      reason: 'Site follows industry best practices'
    });
  }

  return bonuses;
}

/**
 * Calculate applicable penalties
 */
function calculatePenalties(metadata) {
  const penalties = [];

  if (config.penalties.brokenSite.enabled && metadata.siteAccessible === false) {
    penalties.push({
      type: 'broken_site',
      value: config.penalties.brokenSite.value,
      reason: 'Website failed to load or has critical errors'
    });
  }

  if (config.penalties.mobileFailure.enabled && metadata.isMobileFriendly === false) {
    penalties.push({
      type: 'mobile_failure',
      value: config.penalties.mobileFailure.value,
      reason: 'Site is not mobile-friendly'
    });
  }

  if (config.penalties.securityIssues.enabled && metadata.hasHTTPS === false) {
    penalties.push({
      type: 'security_issues',
      value: config.penalties.securityIssues.value,
      reason: 'Missing HTTPS or security warnings'
    });
  }

  return penalties;
}

/**
 * Validate score inputs
 */
function validateScores(scores) {
  if (!scores || typeof scores !== 'object') {
    throw new Error('Scores must be an object');
  }

  for (const [key, value] of Object.entries(scores)) {
    if (value !== undefined && value !== null) {
      if (typeof value !== 'number' || value < 0 || value > 100) {
        throw new Error(`Invalid ${key} score: must be a number between 0-100`);
      }
    }
  }
}

/**
 * Get all quick-win opportunities from analysis results
 */
export function extractQuickWins(analysisResults) {
  const quickWins = [];

  if (analysisResults.design?.issues) {
    for (const issue of analysisResults.design.issues) {
      if (
        issue.effort === 'quick-win' ||
        issue.priority === 'quick-win' ||
        issue.difficulty === 'quick-win'
      ) {
        quickWins.push({
          source: 'design',
          title: issue.title,
          description: issue.description,
          impact: issue.impact,
          effort: issue.effort || 'quick-win'
        });
      }
    }
  }

  if (analysisResults.seo?.quickWins) {
    for (const quickWin of analysisResults.seo.quickWins) {
      quickWins.push({
        source: 'seo',
        title: quickWin.title || quickWin,
        description: quickWin.description || quickWin,
        impact: quickWin.impact || 'Improves search visibility',
        effort: 'quick-win'
      });
    }
  }

  if (analysisResults.content?.issues) {
    for (const issue of analysisResults.content.issues) {
      if (issue.difficulty === 'easy' || issue.priority === 'quick-win') {
        quickWins.push({
          source: 'content',
          title: issue.title,
          description: issue.description,
          impact: issue.impact,
          effort: 'quick-win'
        });
      }
    }
  }

  if (analysisResults.social?.quickWins) {
    for (const quickWin of analysisResults.social.quickWins) {
      quickWins.push({
        source: 'social',
        title: quickWin.title || quickWin,
        description: quickWin.description || quickWin,
        impact: quickWin.impact || 'Improves social presence',
        effort: 'quick-win'
      });
    }
  }

  return quickWins;
}

/**
 * Get the most critical issue (for outreach hook)
 */
export function getTopIssue(analysisResults) {
  const allIssues = [];

  if (analysisResults.design?.issues) {
    for (const issue of analysisResults.design.issues) {
      if (issue.priority === 'high' || issue.severity === 'high' || issue.severity === 'critical') {
        allIssues.push({
          source: 'design',
          score: getPriorityScore(issue),
          ...issue
        });
      }
    }
  }

  if (analysisResults.seo?.issues) {
    for (const issue of analysisResults.seo.issues) {
      if (issue.priority === 'high' || issue.severity === 'critical') {
        allIssues.push({
          source: 'seo',
          score: getPriorityScore(issue),
          ...issue
        });
      }
    }
  }

  if (analysisResults.content?.issues) {
    for (const issue of analysisResults.content.issues) {
      if (issue.priority === 'high' || issue.severity === 'high') {
        allIssues.push({
          source: 'content',
          score: getPriorityScore(issue),
          ...issue
        });
      }
    }
  }

  if (analysisResults.social?.issues) {
    for (const issue of analysisResults.social.issues) {
      if (issue.priority === 'high' || issue.severity === 'high') {
        allIssues.push({
          source: 'social',
          score: getPriorityScore(issue),
          ...issue
        });
      }
    }
  }

  allIssues.sort((a, b) => b.score - a.score);

  if (allIssues.length > 0) {
    return {
      source: allIssues[0].source,
      title: allIssues[0].title,
      description: allIssues[0].description,
      impact: allIssues[0].impact
    };
  }

  return {
    source: 'general',
    title: 'Website optimization opportunities',
    description: 'Several areas for improvement identified',
    impact: 'Improvements could increase conversions and visibility'
  };
}

/**
 * Calculate priority score for sorting issues
 */
function getPriorityScore(issue) {
  let score = 0;

  if (issue.severity === 'critical') score += 100;
  else if (issue.severity === 'high') score += 75;
  else if (issue.severity === 'medium') score += 50;
  else if (issue.severity === 'low') score += 25;

  if (issue.priority === 'high') score += 50;
  else if (issue.priority === 'medium') score += 30;
  else if (issue.priority === 'low') score += 10;

  if (issue.impact && typeof issue.impact === 'string') {
    if (issue.impact.toLowerCase().includes('conversion')) score += 40;
    if (issue.impact.toLowerCase().includes('revenue')) score += 40;
    if (issue.impact.toLowerCase().includes('traffic')) score += 30;
    if (issue.impact.toLowerCase().includes('user')) score += 20;
  }

  return score;
}
