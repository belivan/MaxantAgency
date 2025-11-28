/**
 * A/B Test Manager
 *
 * Manages controlled experiments to validate prompt improvements.
 * - Runs variant A (control) vs variant B (experimental) on same data
 * - Tracks results for statistical significance
 * - Determines winner based on composite score
 * - Updates database with test results
 */

import { supabase } from '../../database/supabase-client.js';
import { getAnalyzerMetrics } from './metrics-aggregator.js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Create a new A/B test
 * @param {string} analyzerName - Analyzer to test
 * @param {string} controlVariantId - Current/control variant UUID
 * @param {string} experimentalVariantId - New/experimental variant UUID
 * @param {object} options - Test configuration
 * @returns {Promise<object>} Test configuration
 */
export async function createABTest(analyzerName, controlVariantId, experimentalVariantId, options = {}) {
  const {
    splitRatio = 0.5,
    minimumSampleSize = 20,
    confidenceLevel = 0.95
  } = options;

  const testConfig = {
    id: crypto.randomUUID(),
    analyzer_name: analyzerName,
    control_variant_id: controlVariantId,
    experimental_variant_id: experimentalVariantId,
    split_ratio: splitRatio,
    minimum_sample_size: minimumSampleSize,
    confidence_level: confidenceLevel,
    status: 'running',
    control_samples: 0,
    experimental_samples: 0,
    started_at: new Date().toISOString(),
    created_at: new Date().toISOString()
  };

  // Store test config in database (we'll need an ab_tests table)
  // For now, store in optimization_runs with ab_test metadata
  console.log(`🧪 Created A/B test for ${analyzerName}`);
  console.log(`   Control: ${controlVariantId}`);
  console.log(`   Experimental: ${experimentalVariantId}`);
  console.log(`   Split: ${(splitRatio * 100)}% / ${((1 - splitRatio) * 100)}%`);
  console.log(`   Min samples: ${minimumSampleSize} each`);

  return testConfig;
}

/**
 * Select which variant to use for next analysis
 * @param {string} testId - A/B test ID
 * @returns {Promise<object>} Variant to use
 */
export async function selectVariantForAnalysis(testId, testConfig) {
  // Simple random selection based on split ratio
  const useControl = Math.random() < testConfig.split_ratio;

  const variantId = useControl
    ? testConfig.control_variant_id
    : testConfig.experimental_variant_id;

  // Get variant from database
  const { data: variant, error } = await supabase
    .from('prompt_variants')
    .select('*')
    .eq('id', variantId)
    .single();

  if (error) throw error;

  return {
    variant,
    isControl: useControl,
    testId
  };
}

/**
 * Record analysis result for A/B test
 * @param {string} testId - A/B test ID
 * @param {string} variantId - Which variant was used
 * @param {object} analysisResult - Result from analysis
 */
export async function recordTestResult(testId, variantId, analysisResult, testConfig) {
  const isControl = variantId === testConfig.control_variant_id;

  // Update sample counts
  if (isControl) {
    testConfig.control_samples++;
  } else {
    testConfig.experimental_samples++;
  }

  // Update variant sample size and metrics
  const { data: variant, error: fetchError } = await supabase
    .from('prompt_variants')
    .select('*')
    .eq('id', variantId)
    .single();

  if (fetchError) throw fetchError;

  // Aggregate new result with existing metrics
  const updatedMetrics = aggregateResult(
    variant.performance_metrics || {},
    analysisResult
  );

  const { error: updateError } = await supabase
    .from('prompt_variants')
    .update({
      sample_size: variant.sample_size + 1,
      performance_metrics: updatedMetrics,
      updated_at: new Date().toISOString()
    })
    .eq('id', variantId);

  if (updateError) throw updateError;

  console.log(`📝 Recorded result for ${isControl ? 'control' : 'experimental'} (${testConfig.control_samples}/${testConfig.experimental_samples} samples)`);
}

/**
 * Aggregate a new result into existing metrics
 */
function aggregateResult(existingMetrics, newResult) {
  const samples = (existingMetrics.samples || 0) + 1;

  // Initialize if first sample
  if (!existingMetrics.accuracy) {
    return {
      samples: 1,
      accuracy: newResult.accuracy || 0.85,
      cost: newResult.cost || 0,
      duration: newResult.duration_ms || 0,
      score: newResult.score || 0,
      issueCount: newResult.issue_count || 0,
      results: [newResult]
    };
  }

  // Running averages
  const accuracy = (existingMetrics.accuracy * (samples - 1) + (newResult.accuracy || 0.85)) / samples;
  const cost = (existingMetrics.cost * (samples - 1) + (newResult.cost || 0)) / samples;
  const duration = (existingMetrics.duration * (samples - 1) + (newResult.duration_ms || 0)) / samples;
  const score = (existingMetrics.score * (samples - 1) + (newResult.score || 0)) / samples;
  const issueCount = (existingMetrics.issueCount * (samples - 1) + (newResult.issue_count || 0)) / samples;

  return {
    samples,
    accuracy,
    cost,
    duration,
    score,
    issueCount,
    results: [...(existingMetrics.results || []).slice(-10), newResult] // Keep last 10 results
  };
}

/**
 * Check if A/B test is ready for evaluation
 * @param {object} testConfig - Test configuration
 * @returns {boolean} True if ready to evaluate
 */
export function isTestReady(testConfig) {
  return (
    testConfig.control_samples >= testConfig.minimum_sample_size &&
    testConfig.experimental_samples >= testConfig.minimum_sample_size
  );
}

/**
 * Evaluate A/B test results and determine winner
 * @param {string} testId - Test ID
 * @param {object} testConfig - Test configuration
 * @returns {Promise<object>} Test results with winner
 */
export async function evaluateTest(testId, testConfig) {
  console.log(`\n📊 Evaluating A/B test results...`);

  // Get both variants with their metrics
  const { data: controlVariant, error: controlError } = await supabase
    .from('prompt_variants')
    .select('*')
    .eq('id', testConfig.control_variant_id)
    .single();

  const { data: experimentalVariant, error: experimentalError } = await supabase
    .from('prompt_variants')
    .select('*')
    .eq('id', testConfig.experimental_variant_id)
    .single();

  if (controlError || experimentalError) {
    throw new Error('Failed to fetch variant data');
  }

  const controlMetrics = controlVariant.performance_metrics;
  const experimentalMetrics = experimentalVariant.performance_metrics;

  // Calculate composite scores (accuracy 60%, cost 20%, speed 20%)
  const controlComposite = calculateCompositeScore(controlMetrics);
  const experimentalComposite = calculateCompositeScore(experimentalMetrics);

  // Determine winner
  const winner = experimentalComposite > controlComposite ? 'experimental' : 'control';
  const improvementPercent = ((experimentalComposite - controlComposite) / controlComposite * 100).toFixed(2);

  // Statistical significance test (simplified t-test)
  const significance = calculateSignificance(
    controlMetrics,
    experimentalMetrics,
    testConfig.confidence_level
  );

  const results = {
    testId,
    analyzer: testConfig.analyzer_name,
    control: {
      variant_id: testConfig.control_variant_id,
      samples: testConfig.control_samples,
      metrics: controlMetrics,
      composite_score: controlComposite
    },
    experimental: {
      variant_id: testConfig.experimental_variant_id,
      samples: testConfig.experimental_samples,
      metrics: experimentalMetrics,
      composite_score: experimentalComposite
    },
    winner,
    improvement: improvementPercent,
    statistically_significant: significance.isSignificant,
    p_value: significance.pValue,
    confidence_level: testConfig.confidence_level,
    recommendation: determineRecommendation(winner, improvementPercent, significance),
    completed_at: new Date().toISOString()
  };

  console.log(`\n✅ A/B Test Results:`);
  console.log(`   Winner: ${winner === 'experimental' ? '🆕 Experimental' : '🔵 Control'}`);
  console.log(`   Improvement: ${improvementPercent}%`);
  console.log(`   Significant: ${significance.isSignificant ? 'Yes' : 'No'} (p=${significance.pValue.toFixed(4)})`);
  console.log(`   Recommendation: ${results.recommendation}`);

  return results;
}

/**
 * Calculate composite score from metrics
 */
function calculateCompositeScore(metrics) {
  if (!metrics || !metrics.accuracy) return 0;

  const weights = { accuracy: 0.6, cost: 0.2, speed: 0.2 };

  // Normalize cost (lower is better, typical range $0.001 - $0.020)
  const costScore = Math.max(0, 1 - (metrics.cost - 0.001) / (0.020 - 0.001));

  // Normalize speed (lower duration is better, typical range 1000-5000ms)
  const speedScore = Math.max(0, 1 - (metrics.duration - 1000) / (5000 - 1000));

  return (
    metrics.accuracy * weights.accuracy +
    costScore * weights.cost +
    speedScore * weights.speed
  );
}

/**
 * Calculate statistical significance (simplified t-test)
 */
function calculateSignificance(controlMetrics, experimentalMetrics, confidenceLevel) {
  // This is a simplified version. A proper implementation would use
  // a full two-sample t-test with variance calculation.

  const n1 = controlMetrics.samples;
  const n2 = experimentalMetrics.samples;

  if (n1 < 10 || n2 < 10) {
    return { isSignificant: false, pValue: 1.0, note: 'Insufficient samples for significance test' };
  }

  // Calculate pooled standard error (simplified)
  // In a real implementation, you'd calculate variance from the results array
  const pooledSE = Math.sqrt((1 / n1) + (1 / n2)) * 0.1; // Assume 10% std dev

  const controlScore = calculateCompositeScore(controlMetrics);
  const experimentalScore = calculateCompositeScore(experimentalMetrics);

  // t-statistic
  const tStat = Math.abs(experimentalScore - controlScore) / pooledSE;

  // Critical t-value for 95% confidence, large sample (approximation)
  const criticalT = confidenceLevel === 0.95 ? 1.96 : 2.58;

  // Approximate p-value (simplified)
  const pValue = Math.max(0.001, 1 / (1 + Math.exp(tStat - 2)));

  return {
    isSignificant: tStat > criticalT,
    pValue,
    tStatistic: tStat,
    criticalValue: criticalT
  };
}

/**
 * Determine recommendation based on test results
 */
function determineRecommendation(winner, improvementPercent, significance) {
  if (winner === 'experimental' && significance.isSignificant && parseFloat(improvementPercent) > 5) {
    return 'APPLY_EXPERIMENTAL - Statistically significant improvement';
  }

  if (winner === 'experimental' && parseFloat(improvementPercent) > 10) {
    return 'APPLY_EXPERIMENTAL - Large improvement (not yet significant, consider more samples)';
  }

  if (winner === 'control' || Math.abs(parseFloat(improvementPercent)) < 3) {
    return 'KEEP_CONTROL - No meaningful improvement';
  }

  return 'CONTINUE_TESTING - Results inconclusive, gather more data';
}

/**
 * Apply winning variant
 * @param {string} winnerVariantId - UUID of winning variant
 */
export async function applyWinningVariant(winnerVariantId) {
  // Get variant details
  const { data: winnerVariant, error: fetchError } = await supabase
    .from('prompt_variants')
    .select('*')
    .eq('id', winnerVariantId)
    .single();

  if (fetchError) throw fetchError;

  // Mark all other variants for this analyzer as inactive
  const { error: deactivateError } = await supabase
    .from('prompt_variants')
    .update({ is_active: false })
    .eq('analyzer_name', winnerVariant.analyzer_name);

  if (deactivateError) throw deactivateError;

  // Mark winner as active
  const { error: activateError } = await supabase
    .from('prompt_variants')
    .update({
      is_active: true,
      variant_type: 'optimized',
      applied_at: new Date().toISOString()
    })
    .eq('id', winnerVariantId);

  if (activateError) throw activateError;

  console.log(`✅ Applied winning variant ${winnerVariantId} for ${winnerVariant.analyzer_name}`);

  return winnerVariant;
}

/**
 * Run a full A/B test cycle (for testing/demo purposes)
 * In production, this would be integrated into the analysis engine
 */
export async function runABTestCycle(analyzerName, controlVariantId, experimentalVariantId, options = {}) {
  console.log(`\n🧪 Starting A/B Test Cycle for ${analyzerName}\n`);

  // 1. Create test
  const testConfig = await createABTest(
    analyzerName,
    controlVariantId,
    experimentalVariantId,
    options
  );

  // 2. Simulate analyses (in production, this happens organically)
  const totalSamples = (options.minimumSampleSize || 20) * 2;

  for (let i = 0; i < totalSamples; i++) {
    const { variant, isControl } = await selectVariantForAnalysis(testConfig.id, testConfig);

    // Simulate analysis result
    const mockResult = generateMockAnalysisResult(variant, isControl);

    await recordTestResult(testConfig.id, variant.id, mockResult, testConfig);

    // Progress indicator
    if ((i + 1) % 10 === 0) {
      console.log(`   Progress: ${i + 1}/${totalSamples} analyses`);
    }
  }

  // 3. Evaluate results
  if (isTestReady(testConfig)) {
    const results = await evaluateTest(testConfig.id, testConfig);

    // 4. Apply winner if recommended
    if (results.recommendation.startsWith('APPLY_EXPERIMENTAL')) {
      await applyWinningVariant(experimentalVariantId);
    }

    return results;
  }

  return { error: 'Test not ready for evaluation' };
}

/**
 * Generate mock analysis result for testing
 */
function generateMockAnalysisResult(variant, isControl) {
  // Experimental variant should perform slightly better on average
  const performanceBoost = isControl ? 0 : 0.05;

  return {
    accuracy: 0.85 + performanceBoost + (Math.random() * 0.1 - 0.05),
    cost: 0.012 - (performanceBoost * 0.2) + (Math.random() * 0.003),
    duration_ms: 3200 - (performanceBoost * 400) + (Math.random() * 500),
    score: 75 + (performanceBoost * 10) + (Math.random() * 10 - 5),
    issue_count: 8 + Math.floor(Math.random() * 5)
  };
}
