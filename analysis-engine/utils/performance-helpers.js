/**
 * Helper functions for parsing and analyzing performance metrics
 */

/**
 * Parse CrUX metric from API response
 * @param {object} metric - CrUX metric object
 * @param {boolean} isDecimal - Whether metric is decimal (CLS) vs milliseconds
 * @returns {object} Parsed metric
 */
export function parsePerformanceMetric(metric, isDecimal = false) {
  if (!metric) return null;

  const p75 = metric.percentiles?.p75;
  if (p75 === undefined || p75 === null) return null;

  // Ensure p75 is a number
  const p75Value = typeof p75 === 'number' ? p75 : parseFloat(p75);
  if (isNaN(p75Value)) return null;

  const histogram = metric.histogram || [];

  return {
    p75: isDecimal ? parseFloat(p75Value.toFixed(3)) : Math.round(p75Value),
    good: histogram[0]?.density || 0,
    needsImprovement: histogram[1]?.density || 0,
    poor: histogram[2]?.density || 0,
    rating: getRating(p75Value, isDecimal)
  };
}

function getRating(value, isDecimal) {
  if (isDecimal) {
    // CLS thresholds
    if (value < 0.1) return 'good';
    if (value < 0.25) return 'needs-improvement';
    return 'poor';
  } else {
    // Time-based thresholds (rough average)
    if (value < 2000) return 'good';
    if (value < 4000) return 'needs-improvement';
    return 'poor';
  }
}

/**
 * Calculate performance score from multiple metrics
 */
export function calculatePerformanceScore(metrics) {
  // Simplified scoring based on Core Web Vitals
  const scores = [];

  if (metrics.lcp) {
    scores.push(metrics.lcp < 2500 ? 100 : metrics.lcp < 4000 ? 50 : 0);
  }
  if (metrics.fid) {
    scores.push(metrics.fid < 100 ? 100 : metrics.fid < 300 ? 50 : 0);
  }
  if (metrics.cls) {
    scores.push(metrics.cls < 0.1 ? 100 : metrics.cls < 0.25 ? 50 : 0);
  }

  return scores.length > 0
    ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    : 0;
}

/**
 * Format milliseconds to human-readable time
 */
export function formatTime(ms) {
  if (ms < 1000) {
    return `${Math.round(ms)}ms`;
  }
  return `${(ms / 1000).toFixed(1)}s`;
}

/**
 * Get severity level based on metric and thresholds
 */
export function getSeverity(value, thresholds) {
  if (value <= thresholds.good) return 'low';
  if (value <= thresholds.needsImprovement) return 'medium';
  return 'high';
}
