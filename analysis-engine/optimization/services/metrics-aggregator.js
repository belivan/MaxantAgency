/**
 * Metrics Aggregator
 *
 * Collects and aggregates performance data for analyzers from:
 * - ai_calls table (cost, tokens, duration, errors)
 * - leads table (scores, issues, validation results)
 * - analysis_feedback table (accuracy ratings)
 *
 * Used by prompt optimizer to understand what's working and what needs improvement.
 */

import { supabase } from '../../database/supabase-client.js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Get performance metrics for a specific analyzer
 * @param {string} analyzerName - Name of the analyzer (e.g., 'desktop-visual-analyzer')
 * @param {object} options - Query options
 * @param {number} options.limit - Number of recent analyses to include (default: 25)
 * @param {Date} options.startDate - Only include analyses after this date
 * @param {Date} options.endDate - Only include analyses before this date
 * @returns {Promise<object>} Aggregated metrics
 */
export async function getAnalyzerMetrics(analyzerName, options = {}) {
  const { limit = 25, startDate, endDate } = options;

  // Build date range query
  let dateFilter = {};
  if (startDate) dateFilter.gte = startDate.toISOString();
  if (endDate) dateFilter.lte = endDate.toISOString();

  try {
    // 1. Get AI call metrics from ai_calls table
    let aiCallQuery = supabase
      .from('ai_calls')
      .select('*')
      .eq('module', analyzerName)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (startDate || endDate) {
      aiCallQuery = aiCallQuery.filter('created_at', 'gte', dateFilter.gte || '1970-01-01');
      if (endDate) aiCallQuery = aiCallQuery.filter('created_at', 'lte', dateFilter.lte);
    }

    const { data: aiCalls, error: aiCallError } = await aiCallQuery;
    if (aiCallError) throw aiCallError;

    // 2. Calculate AI call metrics
    const aiMetrics = calculateAICallMetrics(aiCalls);

    // 3. Get feedback metrics (if available)
    const { data: feedback, error: feedbackError } = await supabase
      .from('analysis_feedback')
      .select('*')
      .eq('analyzer_name', analyzerName)
      .order('created_at', { ascending: false })
      .limit(limit);

    const feedbackMetrics = feedback && !feedbackError
      ? calculateFeedbackMetrics(feedback)
      : null;

    // 4. Get lead-specific metrics (scores, issue counts)
    const leadMetrics = await getLeadMetricsForAnalyzer(analyzerName, limit, dateFilter);

    // 5. Combine all metrics
    const aggregatedMetrics = {
      analyzer: analyzerName,
      dataPoints: aiCalls.length,
      dateRange: {
        start: aiCalls[aiCalls.length - 1]?.created_at || null,
        end: aiCalls[0]?.created_at || null
      },
      aiCalls: aiMetrics,
      feedback: feedbackMetrics,
      leads: leadMetrics,
      composite: calculateCompositeScore(aiMetrics, feedbackMetrics, leadMetrics),
      timestamp: new Date().toISOString()
    };

    return aggregatedMetrics;

  } catch (error) {
    console.error(`Error aggregating metrics for ${analyzerName}:`, error);
    throw error;
  }
}

/**
 * Calculate metrics from AI call data
 */
function calculateAICallMetrics(aiCalls) {
  if (!aiCalls || aiCalls.length === 0) {
    return {
      totalCalls: 0,
      avgCost: 0,
      totalCost: 0,
      avgDuration: 0,
      avgPromptTokens: 0,
      avgCompletionTokens: 0,
      avgTotalTokens: 0,
      errorRate: 0,
      cacheHitRate: 0
    };
  }

  const totalCalls = aiCalls.length;
  const successfulCalls = aiCalls.filter(c => !c.error);
  const errors = aiCalls.filter(c => c.error);
  const cachedCalls = aiCalls.filter(c => c.cached);

  return {
    totalCalls,
    successfulCalls: successfulCalls.length,
    failedCalls: errors.length,
    avgCost: successfulCalls.reduce((sum, c) => sum + (parseFloat(c.cost) || 0), 0) / totalCalls,
    totalCost: aiCalls.reduce((sum, c) => sum + (parseFloat(c.cost) || 0), 0),
    avgDuration: aiCalls.reduce((sum, c) => sum + (c.duration_ms || 0), 0) / totalCalls,
    avgPromptTokens: successfulCalls.reduce((sum, c) => sum + (c.prompt_tokens || 0), 0) / totalCalls,
    avgCompletionTokens: successfulCalls.reduce((sum, c) => sum + (c.completion_tokens || 0), 0) / totalCalls,
    avgTotalTokens: successfulCalls.reduce((sum, c) => sum + (c.total_tokens || 0), 0) / totalCalls,
    errorRate: errors.length / totalCalls,
    cacheHitRate: cachedCalls.length / totalCalls,
    errors: errors.map(e => ({
      error: e.error,
      timestamp: e.created_at
    }))
  };
}

/**
 * Calculate metrics from feedback data
 */
function calculateFeedbackMetrics(feedback) {
  if (!feedback || feedback.length === 0) {
    return null;
  }

  const totalFeedback = feedback.length;
  const accuracyFeedback = feedback.filter(f => f.is_accurate !== null);
  const relevanceFeedback = feedback.filter(f => f.is_relevant !== null);
  const actionabilityFeedback = feedback.filter(f => f.is_actionable !== null);
  const conversionFeedback = feedback.filter(f => f.led_to_conversion !== null);
  const falsePositives = feedback.filter(f => f.false_positive === true);

  return {
    totalFeedback,
    accuracyRate: accuracyFeedback.length > 0
      ? accuracyFeedback.filter(f => f.is_accurate === true).length / accuracyFeedback.length
      : null,
    relevanceRate: relevanceFeedback.length > 0
      ? relevanceFeedback.filter(f => f.is_relevant === true).length / relevanceFeedback.length
      : null,
    actionabilityRate: actionabilityFeedback.length > 0
      ? actionabilityFeedback.filter(f => f.is_actionable === true).length / actionabilityFeedback.length
      : null,
    conversionRate: conversionFeedback.length > 0
      ? conversionFeedback.filter(f => f.led_to_conversion === true).length / conversionFeedback.length
      : null,
    falsePositiveRate: falsePositives.length / totalFeedback,
    avgRating: feedback.filter(f => f.rating !== null)
      .reduce((sum, f) => sum + f.rating, 0) / feedback.filter(f => f.rating !== null).length || null
  };
}

/**
 * Get lead-specific metrics for an analyzer
 */
async function getLeadMetricsForAnalyzer(analyzerName, limit, dateFilter) {
  try {
    // Map analyzer name to relevant columns
    const analyzerFieldMap = {
      'desktop-visual-analyzer': { score: 'design_score_desktop', issues: 'design_issues_desktop' },
      'mobile-visual-analyzer': { score: 'design_score_mobile', issues: 'design_issues_mobile' },
      'unified-visual-analyzer': { score: 'design_score', issues: 'design_issues_desktop' },
      'seo-analyzer': { score: 'seo_score', issues: 'seo_issues' },
      'content-analyzer': { score: 'content_score', issues: 'content_issues' },
      'unified-technical-analyzer': { score: 'seo_score', issues: 'seo_issues' },
      'social-analyzer': { score: 'social_score', issues: 'social_issues' },
      'accessibility-analyzer': { score: 'accessibility_score', issues: 'accessibility_issues' }
    };

    const fields = analyzerFieldMap[analyzerName];
    if (!fields) {
      console.warn(`No field mapping for analyzer: ${analyzerName}`);
      return null;
    }

    // Get recent leads
    let leadQuery = supabase
      .from('leads')
      .select(`${fields.score}, ${fields.issues}, overall_score, website_grade, validated_at, validation_metadata`)
      .not(fields.score, 'is', null)
      .order('analyzed_at', { ascending: false })
      .limit(limit);

    if (dateFilter.gte) {
      leadQuery = leadQuery.filter('analyzed_at', 'gte', dateFilter.gte);
    }
    if (dateFilter.lte) {
      leadQuery = leadQuery.filter('analyzed_at', 'lte', dateFilter.lte);
    }

    const { data: leads, error } = await leadQuery;
    if (error) throw error;

    if (!leads || leads.length === 0) {
      return null;
    }

    // Calculate metrics
    const scores = leads.map(l => l[fields.score]).filter(s => s !== null);
    const issuesArrays = leads.map(l => l[fields.issues]).filter(i => i !== null);
    const issueCounts = issuesArrays.map(arr => Array.isArray(arr) ? arr.length : 0);

    // Extract validation metadata
    const validatedLeads = leads.filter(l => l.validation_metadata);
    const rejectedIssues = validatedLeads.flatMap(l =>
      l.validation_metadata?.rejected_issues || []
    );

    return {
      totalLeads: leads.length,
      avgScore: scores.reduce((sum, s) => sum + s, 0) / scores.length,
      minScore: Math.min(...scores),
      maxScore: Math.max(...scores),
      stdDevScore: calculateStdDev(scores),
      avgIssueCount: issueCounts.reduce((sum, c) => sum + c, 0) / issueCounts.length,
      minIssueCount: Math.min(...issueCounts),
      maxIssueCount: Math.max(...issueCounts),
      validatedLeads: validatedLeads.length,
      rejectedIssuesCount: rejectedIssues.length,
      rejectionRate: validatedLeads.length > 0
        ? rejectedIssues.length / validatedLeads.reduce((sum, l) => {
            const issues = l[fields.issues];
            return sum + (Array.isArray(issues) ? issues.length : 0);
          }, 0)
        : null
    };

  } catch (error) {
    console.error(`Error getting lead metrics for ${analyzerName}:`, error);
    return null;
  }
}

/**
 * Calculate standard deviation
 */
function calculateStdDev(values) {
  if (values.length === 0) return 0;
  const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
  const squaredDiffs = values.map(v => Math.pow(v - avg, 2));
  const variance = squaredDiffs.reduce((sum, d) => sum + d, 0) / values.length;
  return Math.sqrt(variance);
}

/**
 * Calculate composite score based on weighted metrics
 */
function calculateCompositeScore(aiMetrics, feedbackMetrics, leadMetrics) {
  // Default weights from config
  const weights = {
    accuracy: 0.6,
    cost: 0.2,
    speed: 0.2
  };

  // Accuracy component (0-1 scale)
  let accuracyScore = 0.5; // default neutral
  if (feedbackMetrics && feedbackMetrics.accuracyRate !== null) {
    accuracyScore = feedbackMetrics.accuracyRate;
  } else if (leadMetrics && leadMetrics.rejectionRate !== null) {
    // Use inverse rejection rate as proxy for accuracy
    accuracyScore = 1 - leadMetrics.rejectionRate;
  }

  // Cost component (normalized, lower is better)
  // Normalize to typical range: $0.001 - $0.020 per call
  const costScore = aiMetrics.avgCost > 0
    ? Math.max(0, 1 - (aiMetrics.avgCost - 0.001) / (0.020 - 0.001))
    : 0.5;

  // Speed component (normalized, lower duration is better)
  // Normalize to typical range: 1000ms - 5000ms
  const speedScore = aiMetrics.avgDuration > 0
    ? Math.max(0, 1 - (aiMetrics.avgDuration - 1000) / (5000 - 1000))
    : 0.5;

  // Weighted composite score
  const compositeScore =
    (accuracyScore * weights.accuracy) +
    (costScore * weights.cost) +
    (speedScore * weights.speed);

  return {
    score: parseFloat(compositeScore.toFixed(4)),
    components: {
      accuracy: parseFloat(accuracyScore.toFixed(4)),
      cost: parseFloat(costScore.toFixed(4)),
      speed: parseFloat(speedScore.toFixed(4))
    },
    weights
  };
}

/**
 * Get metrics for all analyzers
 */
export async function getAllAnalyzerMetrics(options = {}) {
  const analyzers = [
    'desktop-visual-analyzer',
    'mobile-visual-analyzer',
    'unified-visual-analyzer',
    'seo-analyzer',
    'content-analyzer',
    'unified-technical-analyzer',
    'social-analyzer',
    'accessibility-analyzer'
  ];

  const results = {};

  for (const analyzer of analyzers) {
    try {
      results[analyzer] = await getAnalyzerMetrics(analyzer, options);
    } catch (error) {
      console.error(`Failed to get metrics for ${analyzer}:`, error);
      results[analyzer] = { error: error.message };
    }
  }

  return results;
}

/**
 * Compare metrics between two time periods
 */
export async function compareMetricsPeriods(analyzerName, period1, period2) {
  const metrics1 = await getAnalyzerMetrics(analyzerName, period1);
  const metrics2 = await getAnalyzerMetrics(analyzerName, period2);

  return {
    period1: metrics1,
    period2: metrics2,
    changes: {
      accuracy: calculatePercentChange(
        metrics1.composite.components.accuracy,
        metrics2.composite.components.accuracy
      ),
      cost: calculatePercentChange(
        metrics1.aiCalls.avgCost,
        metrics2.aiCalls.avgCost
      ),
      speed: calculatePercentChange(
        metrics1.aiCalls.avgDuration,
        metrics2.aiCalls.avgDuration
      ),
      compositeScore: calculatePercentChange(
        metrics1.composite.score,
        metrics2.composite.score
      )
    }
  };
}

function calculatePercentChange(oldValue, newValue) {
  if (oldValue === 0) return null;
  return ((newValue - oldValue) / oldValue) * 100;
}
