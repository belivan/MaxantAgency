/**
 * Optimization Scheduler
 *
 * Integrates with the analysis engine to trigger automatic optimization:
 * - Tracks analysis count per analyzer
 * - Triggers optimization every N analyses
 * - Handles both manual and scheduled triggers
 * - Manages optimization workflow (optimize → A/B test → apply)
 */

import { supabase } from '../../database/supabase-client.js';
import { optimizeAnalyzer } from './prompt-optimizer.js';
import { createABTest, recordTestResult, isTestReady, evaluateTest, applyWinningVariant } from './ab-test-manager.js';
import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const CONFIG_PATH = path.join(process.cwd(), 'optimization', 'config', 'optimization-config.json');
const STATE_FILE = path.join(process.cwd(), 'optimization', '.optimization-state.json');

/**
 * Load optimization state (analysis counts, active tests)
 */
async function loadState() {
  try {
    const stateData = await fs.readFile(STATE_FILE, 'utf-8');
    return JSON.parse(stateData);
  } catch (error) {
    // State file doesn't exist yet
    return {
      analysisCounts: {},
      activeTests: {},
      lastOptimization: {}
    };
  }
}

/**
 * Save optimization state
 */
async function saveState(state) {
  await fs.writeFile(STATE_FILE, JSON.stringify(state, null, 2));
}

/**
 * Load configuration
 */
async function loadConfig() {
  const configData = await fs.readFile(CONFIG_PATH, 'utf-8');
  return JSON.parse(configData);
}

/**
 * Check if optimization should be triggered for an analyzer
 * @param {string} analyzerName - Name of analyzer
 * @returns {Promise<boolean>} True if optimization should run
 */
export async function shouldTriggerOptimization(analyzerName) {
  const config = await loadConfig();
  const state = await loadState();

  if (!config.optimization.enabled) {
    return false;
  }

  const count = state.analysisCounts[analyzerName] || 0;
  const threshold = config.optimization.triggerFrequency;

  return count >= threshold;
}

/**
 * Increment analysis count for an analyzer
 * Called after each analysis completes
 * @param {string} analyzerName - Name of analyzer
 */
export async function incrementAnalysisCount(analyzerName) {
  const state = await loadState();

  if (!state.analysisCounts[analyzerName]) {
    state.analysisCounts[analyzerName] = 0;
  }

  state.analysisCounts[analyzerName]++;

  await saveState(state);

  // Check if we should trigger optimization
  if (await shouldTriggerOptimization(analyzerName)) {
    console.log(`\n🔔 Optimization threshold reached for ${analyzerName}`);
    console.log(`   Analyses since last optimization: ${state.analysisCounts[analyzerName]}`);

    // Trigger optimization asynchronously (don't block analysis)
    triggerOptimization(analyzerName).catch(error => {
      console.error(`Failed to trigger optimization for ${analyzerName}:`, error);
    });
  }
}

/**
 * Trigger optimization workflow
 * @param {string} analyzerName - Name of analyzer
 * @param {object} options - Optimization options
 */
export async function triggerOptimization(analyzerName, options = {}) {
  const startTime = Date.now();

  console.log(`\n${'='.repeat(70)}`);
  console.log(`🚀 OPTIMIZATION WORKFLOW STARTED: ${analyzerName}`);
  console.log(`${'='.repeat(70)}\n`);

  try {
    const config = await loadConfig();
    const state = await loadState();

    // 1. Run optimization
    console.log('📊 Step 1: Analyzing performance and generating recommendations...\n');
    const optimizationResult = await optimizeAnalyzer(analyzerName, {
      limit: config.optimization.triggerFrequency,
      ...options
    });

    if (!optimizationResult.success) {
      console.log(`⚠️  Optimization skipped: ${optimizationResult.message}`);
      return optimizationResult;
    }

    // 2. Handle decision
    const decision = optimizationResult.decision;

    console.log(`\n📋 Step 2: Processing decision: ${decision.action}\n`);

    if (decision.action === 'auto_applied') {
      // Apply immediately
      await applyOptimization(analyzerName, optimizationResult.newVariant.id);

      // Reset counter
      state.analysisCounts[analyzerName] = 0;
      state.lastOptimization[analyzerName] = new Date().toISOString();
      await saveState(state);

      console.log(`\n✅ Optimization auto-applied successfully!`);

    } else if (decision.action === 'ab_testing') {
      // Start A/B test
      const currentVariant = await getCurrentVariant(analyzerName);

      const testConfig = await createABTest(
        analyzerName,
        currentVariant?.id || null,
        optimizationResult.newVariant.id,
        {
          splitRatio: config.abTesting.splitRatio,
          minimumSampleSize: config.abTesting.minimumSampleSize,
          confidenceLevel: config.abTesting.confidenceLevel
        }
      );

      // Store active test in state
      state.activeTests[analyzerName] = testConfig;
      state.analysisCounts[analyzerName] = 0; // Reset counter
      await saveState(state);

      // Update optimization run with A/B test info
      await supabase
        .from('optimization_runs')
        .update({
          ab_test_started: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', optimizationResult.runId);

      console.log(`\n🧪 A/B test started! Next ${config.abTesting.minimumSampleSize * 2} analyses will use split testing.`);

    } else if (decision.action === 'pending_review') {
      // Notify for human review
      console.log(`\n👤 Human review required:`);
      console.log(`   Reason: ${decision.reason}`);
      console.log(`   Review optimization run: ${optimizationResult.runId}`);

      await notifyHumanReview(analyzerName, optimizationResult);

      // Reset counter
      state.analysisCounts[analyzerName] = 0;
      await saveState(state);

    } else if (decision.action === 'rejected') {
      console.log(`\n❌ Optimization rejected:`);
      console.log(`   Reason: ${decision.reason}`);

      // Reset counter
      state.analysisCounts[analyzerName] = 0;
      await saveState(state);
    }

    const duration = Date.now() - startTime;
    console.log(`\n${'='.repeat(70)}`);
    console.log(`✅ OPTIMIZATION WORKFLOW COMPLETED in ${(duration / 1000).toFixed(1)}s`);
    console.log(`${'='.repeat(70)}\n`);

    return {
      ...optimizationResult,
      workflowDuration: duration
    };

  } catch (error) {
    console.error(`\n❌ OPTIMIZATION WORKFLOW FAILED:`, error);
    throw error;
  }
}

/**
 * Record A/B test result after analysis
 * Called by analysis engine when an A/B test is active
 * @param {string} analyzerName - Name of analyzer
 * @param {object} analysisResult - Result from analysis
 */
export async function recordABTestResult(analyzerName, variantId, analysisResult) {
  const state = await loadState();
  const testConfig = state.activeTests[analyzerName];

  if (!testConfig) {
    console.warn(`No active A/B test for ${analyzerName}`);
    return;
  }

  // Record result
  await recordTestResult(testConfig.id, variantId, analysisResult, testConfig);

  // Update state
  await saveState(state);

  // Check if test is complete
  if (isTestReady(testConfig)) {
    console.log(`\n🎯 A/B test complete! Evaluating results...\n`);

    const results = await evaluateTest(testConfig.id, testConfig);

    // Update optimization run with results
    const { data: optimizationRun } = await supabase
      .from('optimization_runs')
      .select('*')
      .eq('analyzer_name', analyzerName)
      .eq('ab_test_started', true)
      .eq('ab_test_completed', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (optimizationRun) {
      await supabase
        .from('optimization_runs')
        .update({
          ab_test_completed: true,
          ab_test_results: results,
          updated_at: new Date().toISOString()
        })
        .eq('id', optimizationRun.id);
    }

    // Apply winner if recommended
    if (results.recommendation.startsWith('APPLY_EXPERIMENTAL')) {
      await applyWinningVariant(results.experimental.variant_id);

      state.lastOptimization[analyzerName] = new Date().toISOString();

      console.log(`\n✅ Experimental variant applied automatically based on test results!`);
    } else {
      console.log(`\n📊 Test results: ${results.recommendation}`);
    }

    // Clear active test
    delete state.activeTests[analyzerName];
    await saveState(state);
  }
}

/**
 * Get current active variant for an analyzer
 */
async function getCurrentVariant(analyzerName) {
  const { data, error } = await supabase
    .from('prompt_variants')
    .select('*')
    .eq('analyzer_name', analyzerName)
    .eq('is_active', true)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 = not found
    throw error;
  }

  return data;
}

/**
 * Apply optimization by making variant active
 */
async function applyOptimization(analyzerName, variantId) {
  console.log(`✅ Applying optimization for ${analyzerName}...`);

  // Deactivate all variants for this analyzer
  await supabase
    .from('prompt_variants')
    .update({ is_active: false })
    .eq('analyzer_name', analyzerName);

  // Activate new variant
  await supabase
    .from('prompt_variants')
    .update({
      is_active: true,
      variant_type: 'optimized',
      applied_at: new Date().toISOString()
    })
    .eq('id', variantId);

  // Update optimization run
  const { data: optimizationRun } = await supabase
    .from('optimization_runs')
    .select('*')
    .eq('analyzer_name', analyzerName)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (optimizationRun) {
    await supabase
      .from('optimization_runs')
      .update({
        applied_at: new Date().toISOString(),
        decision: 'auto_applied'
      })
      .eq('id', optimizationRun.id);
  }
}

/**
 * Notify human for review
 */
async function notifyHumanReview(analyzerName, optimizationResult) {
  // In production, this would send Slack/Discord notification
  // For now, just log and potentially write to file

  const notification = {
    analyzer: analyzerName,
    runId: optimizationResult.runId,
    decision: optimizationResult.decision,
    suggestions: optimizationResult.suggestions,
    timestamp: new Date().toISOString()
  };

  // Write notification to file
  const notificationsDir = path.join(process.cwd(), 'optimization', 'notifications');
  try {
    await fs.mkdir(notificationsDir, { recursive: true });
    const notificationFile = path.join(notificationsDir, `${analyzerName}-${Date.now()}.json`);
    await fs.writeFile(notificationFile, JSON.stringify(notification, null, 2));
    console.log(`   Notification saved to: ${notificationFile}`);
  } catch (error) {
    console.error('   Failed to save notification:', error);
  }
}

/**
 * Get optimization status for all analyzers
 */
export async function getOptimizationStatus() {
  const state = await loadState();
  const config = await loadConfig();

  const status = {};

  for (const analyzer of config.analyzers.enabled) {
    const count = state.analysisCounts[analyzer] || 0;
    const threshold = config.optimization.triggerFrequency;
    const activeTest = state.activeTests[analyzer];
    const lastOptimization = state.lastOptimization[analyzer];

    status[analyzer] = {
      analysisCount: count,
      threshold,
      progress: `${count}/${threshold}`,
      progressPercent: ((count / threshold) * 100).toFixed(1),
      activeTest: activeTest ? {
        testId: activeTest.id,
        controlSamples: activeTest.control_samples,
        experimentalSamples: activeTest.experimental_samples,
        progress: `${activeTest.control_samples + activeTest.experimental_samples}/${activeTest.minimum_sample_size * 2}`
      } : null,
      lastOptimization: lastOptimization || 'Never'
    };
  }

  return status;
}

/**
 * Manually trigger optimization for specific analyzer
 */
export async function manualTrigger(analyzerName, options = {}) {
  console.log(`\n🔧 Manual optimization trigger for ${analyzerName}`);
  return await triggerOptimization(analyzerName, { ...options, manual: true });
}

/**
 * Reset optimization state for an analyzer
 */
export async function resetOptimizationState(analyzerName) {
  const state = await loadState();

  state.analysisCounts[analyzerName] = 0;
  delete state.activeTests[analyzerName];

  await saveState(state);

  console.log(`✅ Reset optimization state for ${analyzerName}`);
}
