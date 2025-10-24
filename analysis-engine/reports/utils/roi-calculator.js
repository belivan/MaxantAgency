/**
 * ROI Calculator Utility
 * ======================
 * Functions to calculate return on investment projections
 * based on website improvements and industry benchmarks.
 */

/**
 * Calculate ROI multiplier based on improvement potential
 * @param {number} currentScore - Current website score (0-100)
 * @param {number} projectedScore - Projected score after improvements
 * @param {string} industry - Industry vertical
 * @returns {Object} ROI projection data
 */
export function calculateROI(currentScore, projectedScore, industry = null) {
  const improvement = projectedScore - currentScore;

  // Base multipliers by improvement range
  let baseMultiplier = 1;
  if (improvement >= 40) {
    baseMultiplier = 7;
  } else if (improvement >= 30) {
    baseMultiplier = 5;
  } else if (improvement >= 20) {
    baseMultiplier = 3;
  } else if (improvement >= 10) {
    baseMultiplier = 2;
  } else if (improvement >= 5) {
    baseMultiplier = 1.5;
  }

  // Industry adjustments
  const industryMultipliers = {
    'ecommerce': 1.3,
    'saas': 1.2,
    'healthcare': 1.1,
    'finance': 1.2,
    'education': 0.9,
    'nonprofit': 0.7,
    'restaurant': 1.1,
    'retail': 1.2,
    'real estate': 1.1,
    'professional services': 1.0
  };

  const industryFactor = industryMultipliers[industry?.toLowerCase()] || 1.0;
  const adjustedMultiplier = baseMultiplier * industryFactor;

  // Calculate ranges
  const minMultiplier = Math.round((adjustedMultiplier * 0.8) * 10) / 10;
  const maxMultiplier = Math.round((adjustedMultiplier * 1.2) * 10) / 10;

  return {
    multiplier: `${minMultiplier}-${maxMultiplier}`,
    minMultiplier,
    maxMultiplier,
    improvement,
    timeline: getROITimeline(improvement),
    confidence: getConfidenceLevel(improvement),
    drivers: getValueDrivers(currentScore, projectedScore)
  };
}

/**
 * Calculate investment required based on issues
 * @param {Array} issues - Array of consolidated issues
 * @returns {Object} Investment estimate
 */
export function calculateInvestment(issues) {
  let totalHours = 0;
  let developerHours = 0;
  let designerHours = 0;
  let contentHours = 0;

  issues.forEach(issue => {
    const effort = issue.effort || issue.fix_effort || 'medium';
    const category = issue.category?.toLowerCase() || '';

    let hours = 0;
    switch (effort.toLowerCase()) {
      case 'easy':
      case 'low':
        hours = 4;
        break;
      case 'medium':
        hours = 16;
        break;
      case 'hard':
      case 'high':
        hours = 40;
        break;
      default:
        hours = 16;
    }

    totalHours += hours;

    // Allocate to roles
    if (category.includes('design') || category.includes('ux')) {
      designerHours += hours * 0.7;
      developerHours += hours * 0.3;
    } else if (category.includes('content') || category.includes('copy')) {
      contentHours += hours * 0.8;
      developerHours += hours * 0.2;
    } else {
      developerHours += hours;
    }
  });

  // Calculate costs (using average rates)
  const developerRate = 100; // $/hour
  const designerRate = 85;   // $/hour
  const contentRate = 60;     // $/hour

  const developerCost = developerHours * developerRate;
  const designerCost = designerHours * designerRate;
  const contentCost = contentHours * contentRate;
  const totalCost = developerCost + designerCost + contentCost;

  // Create range
  const minCost = Math.round(totalCost * 0.8 / 1000) * 1000;
  const maxCost = Math.round(totalCost * 1.2 / 1000) * 1000;

  return {
    range: formatCostRange(minCost, maxCost),
    minCost,
    maxCost,
    totalHours: Math.round(totalHours),
    breakdown: {
      developer: Math.round(developerHours),
      designer: Math.round(designerHours),
      content: Math.round(contentHours)
    },
    timeline: getProjectTimeline(totalHours)
  };
}

/**
 * Calculate conversion rate improvement
 * @param {number} currentScore - Current website score
 * @param {number} projectedScore - Projected score
 * @returns {Object} Conversion improvement data
 */
export function calculateConversionImprovement(currentScore, projectedScore) {
  // Baseline conversion rates by score range
  const getConversionRate = (score) => {
    if (score >= 85) return 4.5;
    if (score >= 70) return 3.0;
    if (score >= 55) return 2.0;
    if (score >= 40) return 1.5;
    return 1.0;
  };

  const currentRate = getConversionRate(currentScore);
  const projectedRate = getConversionRate(projectedScore);
  const improvement = ((projectedRate - currentRate) / currentRate) * 100;

  return {
    currentRate: `${currentRate}%`,
    projectedRate: `${projectedRate}%`,
    improvement: `${Math.round(improvement)}%`,
    multiplier: (projectedRate / currentRate).toFixed(1) + 'x'
  };
}

/**
 * Calculate traffic improvement potential
 * @param {Object} analysisResult - Analysis data with SEO and other scores
 * @returns {Object} Traffic improvement projections
 */
export function calculateTrafficImprovement(analysisResult) {
  const { seo_score, content_score, page_load_time } = analysisResult;

  let trafficMultiplier = 1;

  // SEO impact (biggest driver)
  if (seo_score < 40) {
    trafficMultiplier *= 3.5; // Huge improvement potential
  } else if (seo_score < 60) {
    trafficMultiplier *= 2.5;
  } else if (seo_score < 80) {
    trafficMultiplier *= 1.5;
  }

  // Content impact
  if (content_score < 50) {
    trafficMultiplier *= 1.4;
  } else if (content_score < 70) {
    trafficMultiplier *= 1.2;
  }

  // Page speed impact
  if (page_load_time > 5000) {
    trafficMultiplier *= 1.3;
  } else if (page_load_time > 3000) {
    trafficMultiplier *= 1.15;
  }

  const minIncrease = Math.round((trafficMultiplier - 1) * 80);
  const maxIncrease = Math.round((trafficMultiplier - 1) * 120);

  return {
    increase: `${minIncrease}-${maxIncrease}%`,
    multiplier: trafficMultiplier.toFixed(1) + 'x',
    timeline: '3-6 months',
    primaryDriver: seo_score < 60 ? 'SEO optimization' : 'Content and performance'
  };
}

/**
 * Calculate business impact metrics
 * @param {Object} metrics - Current business metrics
 * @param {Object} improvements - Projected improvements
 * @returns {Object} Business impact projections
 */
export function calculateBusinessImpact(metrics, improvements) {
  const {
    monthlyVisitors = 1000,
    conversionRate = 2,
    averageOrderValue = 100,
    customerLifetimeValue = 500
  } = metrics;

  const {
    trafficMultiplier = 2,
    conversionMultiplier = 1.5
  } = improvements;

  // Current state
  const currentConversions = monthlyVisitors * (conversionRate / 100);
  const currentRevenue = currentConversions * averageOrderValue;
  const currentAnnualRevenue = currentRevenue * 12;

  // Projected state
  const projectedVisitors = monthlyVisitors * trafficMultiplier;
  const projectedConversionRate = conversionRate * conversionMultiplier;
  const projectedConversions = projectedVisitors * (projectedConversionRate / 100);
  const projectedRevenue = projectedConversions * averageOrderValue;
  const projectedAnnualRevenue = projectedRevenue * 12;

  // Impact
  const additionalRevenue = projectedAnnualRevenue - currentAnnualRevenue;
  const revenueIncrease = ((projectedAnnualRevenue - currentAnnualRevenue) / currentAnnualRevenue) * 100;

  return {
    current: {
      visitors: monthlyVisitors,
      conversions: Math.round(currentConversions),
      monthlyRevenue: formatCurrency(currentRevenue),
      annualRevenue: formatCurrency(currentAnnualRevenue)
    },
    projected: {
      visitors: Math.round(projectedVisitors),
      conversions: Math.round(projectedConversions),
      monthlyRevenue: formatCurrency(projectedRevenue),
      annualRevenue: formatCurrency(projectedAnnualRevenue)
    },
    impact: {
      additionalRevenue: formatCurrency(additionalRevenue),
      revenueIncrease: `${Math.round(revenueIncrease)}%`,
      newCustomers: Math.round(projectedConversions - currentConversions) * 12,
      lifetimeValue: formatCurrency((projectedConversions - currentConversions) * 12 * customerLifetimeValue)
    }
  };
}

/**
 * Helper Functions
 */

function getROITimeline(improvement) {
  if (improvement >= 30) return '6-12 months';
  if (improvement >= 20) return '4-6 months';
  if (improvement >= 10) return '2-4 months';
  return '1-2 months';
}

function getConfidenceLevel(improvement) {
  if (improvement >= 30) return 'High confidence - significant improvements';
  if (improvement >= 15) return 'Good confidence - moderate improvements';
  return 'Conservative estimate - incremental improvements';
}

function getValueDrivers(currentScore, projectedScore) {
  const drivers = [];

  if (currentScore < 50) {
    drivers.push('Fix critical issues stopping conversions');
  }

  if (currentScore < 60 && projectedScore >= 70) {
    drivers.push('Capture lost mobile traffic');
    drivers.push('Improve search engine visibility');
  }

  if (currentScore < 70 && projectedScore >= 80) {
    drivers.push('Enhanced user experience');
    drivers.push('Better conversion optimization');
  }

  if (projectedScore >= 85) {
    drivers.push('Industry-leading performance');
    drivers.push('Competitive advantage');
  }

  drivers.push('Reduced bounce rate');
  drivers.push('Increased customer trust');

  return drivers.slice(0, 4);
}

function getProjectTimeline(hours) {
  const weeks = Math.ceil(hours / 40);

  if (weeks <= 1) return '1 week';
  if (weeks <= 4) return `${weeks} weeks`;
  if (weeks <= 8) return '1-2 months';
  if (weeks <= 12) return '2-3 months';
  return '3+ months';
}

function formatCostRange(min, max) {
  if (max <= 5000) {
    return `$${(min/1000).toFixed(1)}k - $${(max/1000).toFixed(1)}k`;
  } else if (max <= 50000) {
    return `$${Math.round(min/1000)}k - $${Math.round(max/1000)}k`;
  } else {
    return `$${Math.round(min/1000)}k - $${Math.round(max/1000)}k`;
  }
}

function formatCurrency(amount) {
  if (amount >= 1000000) {
    return `$${(amount/1000000).toFixed(1)}M`;
  } else if (amount >= 1000) {
    return `$${Math.round(amount/1000)}k`;
  } else {
    return `$${Math.round(amount)}`;
  }
}

export default {
  calculateROI,
  calculateInvestment,
  calculateConversionImprovement,
  calculateTrafficImprovement,
  calculateBusinessImpact
};