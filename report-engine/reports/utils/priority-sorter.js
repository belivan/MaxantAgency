/**
 * Priority Sorter - Sort and prioritize issues for action plans
 */

/**
 * Sort issues by priority (critical > high > medium > low)
 */
export function sortByPriority(issues) {
  const priorityOrder = {
    'critical': 0,
    'high': 1,
    'medium': 2,
    'low': 3
  };

  return [...issues].sort((a, b) => {
    const aPriority = priorityOrder[a.priority] ?? 99;
    const bPriority = priorityOrder[b.priority] ?? 99;
    return aPriority - bPriority;
  });
}

/**
 * Sort issues by difficulty (quick-win > medium > major)
 */
export function sortByDifficulty(issues) {
  const difficultyOrder = {
    'quick-win': 0,
    'medium': 1,
    'major': 2
  };

  return [...issues].sort((a, b) => {
    const aDifficulty = difficultyOrder[a.difficulty] ?? 99;
    const bDifficulty = difficultyOrder[b.difficulty] ?? 99;
    return aDifficulty - bDifficulty;
  });
}

/**
 * Sort issues by impact/effort ratio (impact score / effort score)
 */
export function sortByROI(issues) {
  return [...issues].sort((a, b) => {
    const aROI = calculateROI(a);
    const bROI = calculateROI(b);
    return bROI - aROI;
  });
}

/**
 * Calculate ROI score for an issue
 */
function calculateROI(issue) {
  // Impact score
  const impactScore = {
    'critical': 10,
    'high': 8,
    'medium': 5,
    'low': 2
  }[issue.priority] || 5;

  // Effort score (inverse - lower effort = higher score)
  const effortScore = {
    'quick-win': 10,
    'medium': 5,
    'major': 2
  }[issue.difficulty] || 5;

  return (impactScore + effortScore) / 2;
}

/**
 * Group issues into action plan phases
 */
export function groupIntoPhases(issues, quickWins) {
  // Phase 1: Quick Wins (quick-win difficulty, high ROI)
  const phase1 = quickWins.slice(0, 8); // Max 8 quick wins

  // Phase 2: High-Impact Fixes (high/critical priority, medium difficulty)
  const phase2 = issues
    .filter(i =>
      (i.priority === 'critical' || i.priority === 'high') &&
      i.difficulty !== 'quick-win' &&
      i.difficulty !== 'major'
    )
    .slice(0, 6); // Max 6 high-impact fixes

  // Phase 3: Strategic Improvements (major difficulty or remaining issues)
  const completedIssues = new Set([
    ...phase1.map(i => i.title),
    ...phase2.map(i => i.title)
  ]);

  const phase3 = issues
    .filter(i => !completedIssues.has(i.title))
    .filter(i => i.difficulty === 'major' || i.priority === 'medium')
    .slice(0, 5);

  return {
    phase1,
    phase2,
    phase3
  };
}

/**
 * Extract quick wins from all issues
 */
export function extractQuickWins(issues) {
  return issues
    .filter(i => i.difficulty === 'quick-win')
    .sort((a, b) => {
      // Sort quick wins by priority (high > medium > low)
      const priorityOrder = { 'high': 0, 'medium': 1, 'low': 2 };
      return (priorityOrder[a.priority] ?? 99) - (priorityOrder[b.priority] ?? 99);
    });
}

/**
 * Get top N critical issues
 */
export function getTopCriticalIssues(issues, n = 3) {
  return issues
    .filter(i => i.priority === 'critical' || i.priority === 'high')
    .slice(0, n);
}

/**
 * Calculate total impact score of issues
 */
export function calculateTotalImpact(issues) {
  const impactScores = {
    'critical': 10,
    'high': 7,
    'medium': 4,
    'low': 1
  };

  return issues.reduce((sum, issue) => {
    return sum + (impactScores[issue.priority] || 0);
  }, 0);
}