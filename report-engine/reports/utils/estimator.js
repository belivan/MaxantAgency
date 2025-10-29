/**
 * Estimator - Estimate time and cost for fixes
 */

/**
 * Estimate time to fix an issue
 */
export function estimateTimeToFix(issue) {
  const { difficulty, category } = issue;

  // Time estimates in minutes
  const estimates = {
    'quick-win': {
      'meta': 10,
      'headings': 15,
      'images': 20,
      'cta': 15,
      'navigation': 20,
      'default': 15
    },
    'medium': {
      'layout': 120,
      'hierarchy': 90,
      'conversion': 120,
      'whitespace': 60,
      'schema': 45,
      'default': 90
    },
    'major': {
      'redesign': 480,
      'architecture': 360,
      'performance': 240,
      'default': 300
    }
  };

  const difficultyEstimates = estimates[difficulty] || estimates['medium'];
  const timeInMinutes = difficultyEstimates[category] || difficultyEstimates['default'];

  return formatTime(timeInMinutes);
}

/**
 * Estimate cost for a fix
 * Assumes $100/hour agency rate
 */
export function estimateCost(timeInMinutes, hourlyRate = 100) {
  const hours = timeInMinutes / 60;
  const cost = hours * hourlyRate;

  if (cost < 100) {
    return `$${Math.round(cost / 10) * 10}`; // Round to nearest $10
  } else if (cost < 1000) {
    return `$${Math.round(cost / 50) * 50}`; // Round to nearest $50
  } else {
    return `$${Math.round(cost / 100) * 100}`; // Round to nearest $100
  }
}

/**
 * Format time estimate
 */
export function formatTime(minutes) {
  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) {
    return hours === 1 ? '1 hour' : `${hours} hours`;
  }

  return `${hours}h ${remainingMinutes}m`;
}

/**
 * Parse time string back to minutes
 */
export function parseTimeToMinutes(timeString) {
  const hourMatch = timeString.match(/(\d+)\s*h/);
  const minMatch = timeString.match(/(\d+)\s*min/);

  let minutes = 0;

  if (hourMatch) {
    minutes += parseInt(hourMatch[1]) * 60;
  }

  if (minMatch) {
    minutes += parseInt(minMatch[1]);
  }

  return minutes;
}

/**
 * Estimate total time for a phase
 */
export function estimatePhaseTime(issues) {
  const totalMinutes = issues.reduce((sum, issue) => {
    const timeStr = estimateTimeToFix(issue);
    return sum + parseTimeToMinutes(timeStr);
  }, 0);

  return formatTime(totalMinutes);
}

/**
 * Estimate total cost for a phase
 */
export function estimatePhaseCost(issues, hourlyRate = 100) {
  const totalMinutes = issues.reduce((sum, issue) => {
    const timeStr = estimateTimeToFix(issue);
    return sum + parseTimeToMinutes(timeStr);
  }, 0);

  return estimateCost(totalMinutes, hourlyRate);
}

/**
 * Calculate score improvement potential
 */
export function estimateScoreImprovement(issues, currentScore) {
  // Estimate 2-5 points per critical issue, 1-2 per medium, 0.5-1 per low
  const improvement = issues.reduce((sum, issue) => {
    if (issue.priority === 'critical' || issue.priority === 'high') {
      return sum + 3.5; // Average of 2-5
    } else if (issue.priority === 'medium') {
      return sum + 1.5; // Average of 1-2
    } else {
      return sum + 0.75; // Average of 0.5-1
    }
  }, 0);

  const potentialScore = Math.min(100, currentScore + Math.round(improvement));

  return {
    improvement: Math.round(improvement),
    potentialScore
  };
}