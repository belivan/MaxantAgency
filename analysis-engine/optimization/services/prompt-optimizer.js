/**
 * Prompt Optimizer Service
 *
 * Uses meta-AI to analyze prompt performance and suggest improvements.
 * Orchestrates the optimization process:
 * 1. Get performance metrics
 * 2. Load current prompt
 * 3. Call meta-AI with data
 * 4. Parse suggestions
 * 5. Save variant to database
 * 6. Decide on next steps (auto-apply, A/B test, human review)
 */

import { callAI, parseJSONResponse } from '../../../database-tools/shared/ai-client.js';
import { getAnalyzerMetrics } from './metrics-aggregator.js';
import { supabase } from '../../database/supabase-client.js';
import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const OPTIMIZATION_CONFIG_PATH = path.join(process.cwd(), 'optimization', 'config', 'optimization-config.json');
const META_PROMPT_PATH = path.join(process.cwd(), 'optimization', 'prompts', 'meta-prompts', 'prompt-optimizer.json');

/**
 * Load optimization configuration
 */
async function loadOptimizationConfig() {
  const configData = await fs.readFile(OPTIMIZATION_CONFIG_PATH, 'utf-8');
  return JSON.parse(configData);
}

/**
 * Load meta-prompt
 */
async function loadMetaPrompt() {
  const promptData = await fs.readFile(META_PROMPT_PATH, 'utf-8');
  return JSON.parse(promptData);
}

/**
 * Load current prompt for an analyzer
 */
async function loadCurrentPrompt(analyzerName) {
  // Use the shared prompt loader to load the current active prompt
  const { loadPrompt } = await import('../../shared/prompt-loader.js');
  return await loadPrompt(analyzerName);
}

/**
 * Run optimization for a specific analyzer
 * @param {string} analyzerName - Name of the analyzer to optimize
 * @param {object} options - Optimization options
 * @returns {Promise<object>} Optimization result
 */
export async function optimizeAnalyzer(analyzerName, options = {}) {
  const startTime = Date.now();

  console.log(`\n🔧 Starting optimization for: ${analyzerName}`);

  try {
    // 1. Load configuration
    const config = await loadOptimizationConfig();

    if (!config.optimization.enabled) {
      return {
        success: false,
        message: 'Optimization is disabled in config'
      };
    }

    // 2. Get performance metrics
    console.log('📊 Gathering performance metrics...');
    const metrics = await getAnalyzerMetrics(analyzerName, {
      limit: options.limit || config.optimization.triggerFrequency
    });

    if (metrics.dataPoints < config.optimization.minimumDataPoints) {
      return {
        success: false,
        message: `Insufficient data points. Need ${config.optimization.minimumDataPoints}, have ${metrics.dataPoints}`
      };
    }

    // 3. Load current prompt
    console.log('📄 Loading current prompt...');
    const currentPrompt = await loadCurrentPrompt(analyzerName);

    // 4. Get current variant from database (if exists)
    const { data: currentVariant } = await supabase
      .from('prompt_variants')
      .select('*')
      .eq('analyzer_name', analyzerName)
      .eq('is_active', true)
      .single();

    // 5. Prepare meta-prompt input
    const metaPromptInput = await prepareMetaPromptInput(
      analyzerName,
      currentPrompt,
      metrics,
      options.humanFeedback
    );

    // 6. Call meta-AI
    console.log('🤖 Calling meta-AI optimizer...');
    const metaPrompt = await loadMetaPrompt();

    const optimizationResult = await callAI({
      model: metaPrompt.model,
      systemPrompt: metaPrompt.systemPrompt,
      userPrompt: metaPromptInput,
      temperature: metaPrompt.temperature,
      maxTokens: metaPrompt.maxTokens,
      jsonMode: true,
      metadata: {
        engine: 'analysis',
        module: 'prompt-optimizer',
        analyzer: analyzerName
      }
    });

    // 7. Parse AI response
    console.log('\n📝 AI response type:', typeof optimizationResult.content);
    console.log('📝 AI response length:', optimizationResult.content?.length);
    console.log('📝 Raw AI response (first 500 chars):', optimizationResult.content?.substring(0, 500));

    // Try direct JSON parse first
    let suggestions;
    try {
      suggestions = typeof optimizationResult.content === 'string'
        ? JSON.parse(optimizationResult.content)
        : optimizationResult.content;
      console.log('\n✅ Direct JSON parse successful');
    } catch (e) {
      console.log('\n⚠️  Direct parse failed, using parseJSONResponse:', e.message);
      suggestions = parseJSONResponse(optimizationResult.content);
    }

    console.log('\n✅ Parsed suggestions:', {
      hasAnalysis: !!suggestions.analysis,
      recommendationCount: suggestions.recommendations?.length || 0,
      hasProposedPrompt: !!suggestions.proposedPrompt,
      keys: Object.keys(suggestions)
    });

    // 8. Validate suggestions
    if (!suggestions.recommendations || suggestions.recommendations.length === 0) {
      console.log('\n⚠️  No recommendations found. Full parsed object:');
      console.log(JSON.stringify(suggestions, null, 2));
      return {
        success: false,
        message: 'Meta-AI provided no recommendations',
        analysis: suggestions.analysis,
        rawResponse: optimizationResult.content
      };
    }

    // 9. Save variant to database
    console.log('💾 Saving optimized variant...');
    const newVariant = await savePromptVariant(
      analyzerName,
      currentPrompt,
      suggestions,
      currentVariant,
      metrics
    );

    // 10. Decide on next steps
    const decision = await makeOptimizationDecision(
      suggestions,
      metrics,
      config
    );

    // 11. Log optimization run
    const optimizationRun = await logOptimizationRun(
      analyzerName,
      currentVariant,
      newVariant,
      metrics,
      suggestions,
      decision,
      optimizationResult.cost,
      Date.now() - startTime
    );

    console.log(`✅ Optimization complete! Decision: ${decision.action}`);

    return {
      success: true,
      analyzer: analyzerName,
      runId: optimizationRun.id,
      currentMetrics: metrics,
      suggestions,
      newVariant,
      decision,
      duration: Date.now() - startTime,
      cost: optimizationResult.cost
    };

  } catch (error) {
    console.error(`❌ Optimization failed for ${analyzerName}:`, error);
    throw error;
  }
}

/**
 * Prepare input for meta-prompt
 */
async function prepareMetaPromptInput(analyzerName, currentPrompt, metrics, humanFeedback) {
  const input = {
    analyzer_name: analyzerName,
    prompt_category: currentPrompt.category || 'web-design',
    current_version: currentPrompt.version || '1.0',
    current_prompt: JSON.stringify(currentPrompt, null, 2),
    data_points: metrics.dataPoints,

    // AI call metrics
    avg_cost: metrics.aiCalls.avgCost.toFixed(6),
    avg_duration: Math.round(metrics.aiCalls.avgDuration),
    avg_total_tokens: Math.round(metrics.aiCalls.avgTotalTokens),
    avg_prompt_tokens: Math.round(metrics.aiCalls.avgPromptTokens),
    avg_completion_tokens: Math.round(metrics.aiCalls.avgCompletionTokens),
    error_rate: (metrics.aiCalls.errorRate * 100).toFixed(1),
    model: currentPrompt.model,

    // Composite scores
    composite_score: metrics.composite.score.toFixed(4),
    accuracy_component: metrics.composite.components.accuracy.toFixed(4),
    cost_component: metrics.composite.components.cost.toFixed(4),
    speed_component: metrics.composite.components.speed.toFixed(4)
  };

  // Add feedback metrics if available
  if (metrics.feedback) {
    input.feedback_accuracy_rate = (metrics.feedback.accuracyRate * 100).toFixed(1);
    input.feedback_relevance_rate = (metrics.feedback.relevanceRate * 100).toFixed(1);
    input.feedback_actionability_rate = (metrics.feedback.actionabilityRate * 100).toFixed(1);
    input.feedback_false_positive_rate = (metrics.feedback.falsePositiveRate * 100).toFixed(1);
  } else if (metrics.leads) {
    input.validation_rejection_rate = ((metrics.leads.rejectionRate || 0) * 100).toFixed(1);
  }

  // Add lead metrics if available
  if (metrics.leads) {
    input.avg_score = metrics.leads.avgScore.toFixed(1);
    input.avg_issue_count = metrics.leads.avgIssueCount.toFixed(1);
    input.score_std_dev = metrics.leads.stdDevScore.toFixed(1);
  }

  // Add patterns if detectable
  const patterns = [];
  if (metrics.leads && metrics.leads.stdDevScore > 10) {
    patterns.push(`High score variance (σ=${metrics.leads.stdDevScore.toFixed(1)}) indicates inconsistent scoring`);
  }
  if (metrics.leads && metrics.leads.rejectionRate > 0.2) {
    patterns.push(`High validation rejection rate (${(metrics.leads.rejectionRate * 100).toFixed(0)}%) suggests quality issues`);
  }
  if (metrics.aiCalls.errorRate > 0.05) {
    patterns.push(`Elevated error rate (${(metrics.aiCalls.errorRate * 100).toFixed(1)}%) may indicate prompt issues`);
  }
  if (patterns.length > 0) {
    input.patterns = patterns.join('\n');
  }

  // Add recent errors if any
  if (metrics.aiCalls.errors && metrics.aiCalls.errors.length > 0) {
    input.recent_errors = metrics.aiCalls.errors
      .slice(0, 3)
      .map(e => `- ${e.error} (${new Date(e.timestamp).toLocaleString()})`)
      .join('\n');
  }

  // Add human feedback if provided
  if (humanFeedback) {
    input.human_feedback = humanFeedback;
  }

  // Build full prompt by replacing template variables
  const metaPrompt = await loadMetaPrompt();
  let userPrompt = metaPrompt.userPromptTemplate;

  for (const [key, value] of Object.entries(input)) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    userPrompt = userPrompt.replace(regex, value || 'N/A');
  }

  // Handle conditionals (simplified)
  userPrompt = userPrompt.replace(/{{#if \w+}}[\s\S]*?{{\/if}}/g, (match) => {
    const condition = match.match(/{{#if (\w+)}}/)[1];
    return input[condition] ? match.replace(/{{#if \w+}}|{{\/if}}/g, '') : '';
  });

  return userPrompt;
}

/**
 * Save prompt variant to database
 */
async function savePromptVariant(analyzerName, currentPrompt, suggestions, currentVariant, metrics) {
  const versionNumber = currentVariant ? currentVariant.version_number + 1 : 1;

  const variantData = {
    analyzer_name: analyzerName,
    prompt_category: currentPrompt.category || 'web-design',
    prompt_file: getPromptFileName(analyzerName),
    version_number: versionNumber,
    variant_type: 'experimental',
    is_active: false,
    prompt_content: suggestions.proposedPrompt,
    changes_made: suggestions.proposedPrompt.changes || suggestions.recommendations,
    change_reasoning: suggestions.reasoning,
    performance_metrics: {
      before: metrics,
      expectedAfter: suggestions.expectedOutcome
    },
    sample_size: 0,
    composite_score: null,
    parent_variant_id: currentVariant?.id || null,
    created_by: 'system'
  };

  const { data, error } = await supabase
    .from('prompt_variants')
    .insert(variantData)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Make decision about what to do with optimization
 */
async function makeOptimizationDecision(suggestions, metrics, config) {
  // Check if human review is needed
  if (suggestions.humanReviewNeeded) {
    return {
      action: 'pending_review',
      reason: 'AI recommends human review: ' + suggestions.reasoning
    };
  }

  // Check if all changes are "safe"
  const allSafe = suggestions.recommendations.every(r =>
    config.autoApproval.safeChanges.includes(r.changeType) ||
    r.classification === 'safe'
  );

  // Check safety thresholds
  const expectedAccuracy = parseFloat(suggestions.expectedOutcome.accuracyImprovement?.replace('%', '') || 0) / 100;
  const expectedCostChange = parseFloat(suggestions.expectedOutcome.costReduction?.replace('%', '') || 0) / 100;
  const expectedSpeedChange = parseFloat(suggestions.expectedOutcome.speedImprovement?.replace('%', '') || 0) / 100;

  const currentAccuracy = metrics.composite.components.accuracy;
  const newAccuracy = currentAccuracy * (1 + expectedAccuracy);

  if (newAccuracy < config.autoApproval.safetyThresholds.minimumAccuracy) {
    return {
      action: 'rejected',
      reason: `Expected accuracy (${(newAccuracy * 100).toFixed(1)}%) below minimum threshold (${config.autoApproval.safetyThresholds.minimumAccuracy * 100}%)`
    };
  }

  if (expectedCostChange < -config.autoApproval.safetyThresholds.maximumCostIncrease) {
    return {
      action: 'rejected',
      reason: `Cost increase (${(expectedCostChange * 100).toFixed(1)}%) exceeds threshold`
    };
  }

  // Decide action
  if (allSafe && config.autoApproval.enabled) {
    if (suggestions.testingRecommendation?.method === 'ab_test') {
      return {
        action: 'ab_testing',
        reason: 'Multiple changes warrant A/B test before auto-apply'
      };
    }
    return {
      action: 'auto_applied',
      reason: 'All changes are safe and meet thresholds'
    };
  }

  if (config.abTesting.enabled) {
    return {
      action: 'ab_testing',
      reason: 'Changes require controlled testing'
    };
  }

  return {
    action: 'pending_review',
    reason: 'Changes require human approval'
  };
}

/**
 * Log optimization run to database
 */
async function logOptimizationRun(
  analyzerName,
  currentVariant,
  newVariant,
  metrics,
  suggestions,
  decision,
  cost,
  duration
) {
  const runData = {
    analyzer_name: analyzerName,
    trigger_reason: 'scheduled',
    data_points_analyzed: metrics.dataPoints,
    current_variant_id: currentVariant?.id || null,
    suggested_variant_id: newVariant.id,
    metrics_before: metrics,
    optimization_insights: suggestions.analysis,
    changes_proposed: suggestions.recommendations,
    change_reasoning: suggestions.reasoning,
    decision: decision.action,
    decision_reasoning: decision.reason,
    ab_test_started: decision.action === 'ab_testing',
    cost_of_optimization: cost,
    duration_ms: duration
  };

  // Get next run number
  const { data: lastRun } = await supabase
    .from('optimization_runs')
    .select('run_number')
    .eq('analyzer_name', analyzerName)
    .order('run_number', { ascending: false })
    .limit(1)
    .single();

  runData.run_number = lastRun ? lastRun.run_number + 1 : 1;

  const { data, error } = await supabase
    .from('optimization_runs')
    .insert(runData)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get prompt file name for analyzer
 */
function getPromptFileName(analyzerName) {
  const fileMap = {
    'desktop-visual-analyzer': 'desktop-visual-analysis.json',
    'mobile-visual-analyzer': 'mobile-visual-analysis.json',
    'unified-visual-analyzer': 'unified-visual-analysis.json',
    'seo-analyzer': 'seo-analysis.json',
    'content-analyzer': 'content-analysis.json',
    'unified-technical-analyzer': 'unified-technical-analysis.json',
    'social-analyzer': 'social-analysis.json',
    'accessibility-analyzer': 'accessibility-analysis.json'
  };
  return fileMap[analyzerName] || 'unknown.json';
}

/**
 * Optimize all enabled analyzers
 */
export async function optimizeAllAnalyzers(options = {}) {
  const config = await loadOptimizationConfig();
  const analyzers = options.analyzers || config.analyzers.enabled;

  const results = {};

  for (const analyzer of analyzers) {
    console.log(`\n${'='.repeat(60)}`);
    try {
      results[analyzer] = await optimizeAnalyzer(analyzer, options);
    } catch (error) {
      console.error(`Failed to optimize ${analyzer}:`, error);
      results[analyzer] = {
        success: false,
        error: error.message
      };
    }
  }

  return results;
}
