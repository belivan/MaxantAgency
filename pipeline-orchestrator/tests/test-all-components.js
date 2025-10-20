/**
 * COMPREHENSIVE COMPONENT TEST SUITE
 * Tests all Pipeline Orchestrator components
 */

import { log } from '../shared/logger.js';

console.log('\n╔═══════════════════════════════════════════════════════════════╗');
console.log('║                                                               ║');
console.log('║         PIPELINE ORCHESTRATOR - FULL TEST SUITE              ║');
console.log('║                                                               ║');
console.log('╚═══════════════════════════════════════════════════════════════╝\n');

let passed = 0;
let failed = 0;

function test(name, fn) {
  return async () => {
    try {
      await fn();
      console.log(`✅ ${name}`);
      passed++;
      return true;
    } catch (error) {
      console.log(`❌ ${name}`);
      console.log(`   Error: ${error.message}`);
      failed++;
      return false;
    }
  };
}

// ============================================================================
// TEST 1: Validators
// ============================================================================

console.log('\n📋 TEST GROUP 1: Validators\n');

const testValidators = test('Validator: Campaign config validation', async () => {
  const { validateCampaignConfig, ValidationError } = await import('../shared/validators.js');

  // Valid config should pass
  const validConfig = {
    name: 'Test Campaign',
    steps: [
      {
        name: 'test-step',
        engine: 'prospecting',
        endpoint: 'http://localhost:3010/api/test',
        method: 'POST',
        onFailure: 'abort'
      }
    ]
  };

  validateCampaignConfig(validConfig);

  // Invalid config should throw
  try {
    validateCampaignConfig({ name: 'Test' }); // Missing steps
    throw new Error('Should have thrown ValidationError');
  } catch (error) {
    if (error.name !== 'ValidationError') {
      throw error;
    }
  }
});

const testCronValidation = test('Validator: Cron expression validation', async () => {
  const { validateScheduleConfig, ValidationError } = await import('../shared/validators.js');

  // Valid cron
  validateScheduleConfig({ cron: '0 9 * * MON', enabled: true });

  // Invalid cron should throw
  try {
    validateScheduleConfig({ cron: 'invalid cron' });
    throw new Error('Should have thrown ValidationError');
  } catch (error) {
    if (error.name !== 'ValidationError') {
      throw error;
    }
  }
});

const testBudgetValidation = test('Validator: Budget validation', async () => {
  const { validateBudgetConfig, ValidationError } = await import('../shared/validators.js');

  // Valid budget
  validateBudgetConfig({ daily: 10.00, weekly: 50.00, monthly: 200.00 });

  // Invalid budget (negative) should throw
  try {
    validateBudgetConfig({ daily: -5 });
    throw new Error('Should have thrown ValidationError');
  } catch (error) {
    if (error.name !== 'ValidationError') {
      throw error;
    }
  }
});

await testValidators();
await testCronValidation();
await testBudgetValidation();

// ============================================================================
// TEST 2: Error Handlers
// ============================================================================

console.log('\n🛡️  TEST GROUP 2: Error Handlers\n');

const testCustomErrors = test('Error Handler: Custom error classes', async () => {
  const {
    ValidationError,
    NotFoundError,
    BudgetExceededError,
    EngineError
  } = await import('../shared/error-handler.js');

  const valError = new ValidationError('Test validation', 'field');
  if (valError.statusCode !== 400) throw new Error('Wrong status code');

  const notFoundError = new NotFoundError('Campaign', 'test-id');
  if (notFoundError.statusCode !== 404) throw new Error('Wrong status code');

  const budgetError = new BudgetExceededError('Budget exceeded');
  if (budgetError.statusCode !== 429) throw new Error('Wrong status code');

  const engineError = new EngineError('Test Engine', 'Test error');
  if (engineError.statusCode !== 502) throw new Error('Wrong status code');
});

const testSanitization = test('Error Handler: Input sanitization', async () => {
  const { sanitizeInput } = await import('../shared/error-handler.js');

  const dirty = '<script>alert("xss")</script>Hello';
  const clean = sanitizeInput(dirty);

  if (clean.includes('<script>')) {
    throw new Error('Sanitization failed - script tag still present');
  }
});

const testValidateRequired = test('Error Handler: Required field validation', async () => {
  const { validateRequired, ValidationError } = await import('../shared/error-handler.js');

  // Should pass
  validateRequired({ name: 'Test', email: 'test@test.com' }, ['name', 'email']);

  // Should throw
  try {
    validateRequired({ name: 'Test' }, ['name', 'email']);
    throw new Error('Should have thrown');
  } catch (error) {
    if (error.name !== 'ValidationError') {
      throw error;
    }
  }
});

await testCustomErrors();
await testSanitization();
await testValidateRequired();

// ============================================================================
// TEST 3: Campaign Manager
// ============================================================================

console.log('\n🎯 TEST GROUP 3: Campaign Manager\n');

const testCampaignManagerImport = test('Campaign Manager: Module import', async () => {
  const manager = await import('../campaigns/campaign-manager.js');

  if (!manager.executeCampaign) throw new Error('Missing executeCampaign');
  if (!manager.pauseCampaign) throw new Error('Missing pauseCampaign');
  if (!manager.resumeCampaign) throw new Error('Missing resumeCampaign');
});

await testCampaignManagerImport();

// ============================================================================
// TEST 4: Executors
// ============================================================================

console.log('\n⚡ TEST GROUP 4: Executors\n');

const testProspectExecutor = test('Executor: Prospect executor import', async () => {
  const executor = await import('../executors/prospect-executor.js');

  if (!executor.executeProspectStep) throw new Error('Missing executeProspectStep');
  if (!executor.getProspectMetrics) throw new Error('Missing getProspectMetrics');
});

const testAnalyzeExecutor = test('Executor: Analyze executor import', async () => {
  const executor = await import('../executors/analyze-executor.js');

  if (!executor.executeAnalyzeStep) throw new Error('Missing executeAnalyzeStep');
  if (!executor.getAnalysisMetrics) throw new Error('Missing getAnalysisMetrics');
});

const testComposeExecutor = test('Executor: Compose executor import', async () => {
  const executor = await import('../executors/compose-executor.js');

  if (!executor.executeComposeStep) {
    throw new Error('Missing executeComposeStep');
  }
  if (!executor.getComposeMetrics) throw new Error('Missing getComposeMetrics');
});

const testSendExecutor = test('Executor: Send executor import', async () => {
  const executor = await import('../executors/send-executor.js');

  if (!executor.executeSendStep) {
    throw new Error('Missing executeSendStep');
  }
  if (!executor.getSendMetrics) throw new Error('Missing getSendMetrics');
});

const testExecutorIndex = test('Executor: Index exports', async () => {
  const executors = await import('../executors/index.js');

  if (!executors.executeProspectStep) throw new Error('Missing executeProspectStep');
  if (!executors.executeAnalyzeStep) throw new Error('Missing executeAnalyzeStep');
});

await testProspectExecutor();
await testAnalyzeExecutor();
await testComposeExecutor();
await testSendExecutor();
await testExecutorIndex();

// ============================================================================
// TEST 5: Monitors
// ============================================================================

console.log('\n📊 TEST GROUP 5: Monitors\n');

const testHealthMonitor = test('Monitor: Health monitor import', async () => {
  const monitor = await import('../monitors/pipeline-health.js');

  if (!monitor.checkPipelineHealth) throw new Error('Missing checkPipelineHealth');
  if (!monitor.isEngineHealthy) throw new Error('Missing isEngineHealthy');
  if (!monitor.startHealthMonitoring) throw new Error('Missing startHealthMonitoring');
  if (!monitor.getSystemHealthMetrics) throw new Error('Missing getSystemHealthMetrics');
});

const testHealthCheck = test('Monitor: System health check (async)', async () => {
  const { getSystemHealthMetrics } = await import('../monitors/pipeline-health.js');

  const metrics = await getSystemHealthMetrics();

  if (!metrics.system) throw new Error('Missing system metrics');
  if (!metrics.pipeline) throw new Error('Missing pipeline metrics');
  if (typeof metrics.system.uptime !== 'number') throw new Error('Invalid uptime');
});

const testMonitorIndex = test('Monitor: Index exports', async () => {
  const monitors = await import('../monitors/index.js');

  if (!monitors.checkPipelineHealth) throw new Error('Missing checkPipelineHealth');
  if (!monitors.isEngineHealthy) throw new Error('Missing isEngineHealthy');
});

await testHealthMonitor();
await testHealthCheck();
await testMonitorIndex();

// ============================================================================
// TEST 6: Shared Utilities
// ============================================================================

console.log('\n🔧 TEST GROUP 6: Shared Utilities\n');

const testLogger = test('Shared: Logger import', async () => {
  const { log } = await import('../shared/logger.js');

  if (!log.info) throw new Error('Missing log.info');
  if (!log.error) throw new Error('Missing log.error');
  if (!log.warn) throw new Error('Missing log.warn');
});

const testRetryHandler = test('Shared: Retry handler import', async () => {
  const retry = await import('../shared/retry-handler.js');

  if (!retry.default) throw new Error('Missing default export');
  if (!retry.smartRetry) throw new Error('Missing smartRetry');
});

const testNotifier = test('Shared: Notifier import', async () => {
  const notifier = await import('../shared/notifier.js');

  if (!notifier.sendEmail) throw new Error('Missing sendEmail');
  if (!notifier.sendCampaignCompletionNotification) {
    throw new Error('Missing sendCampaignCompletionNotification');
  }
});

await testLogger();
await testRetryHandler();
await testNotifier();

// ============================================================================
// TEST 7: Database
// ============================================================================

console.log('\n💾 TEST GROUP 7: Database\n');

const testDatabaseClient = test('Database: Supabase client import', async () => {
  const db = await import('../database/supabase-client.js');

  if (!db.supabase) throw new Error('Missing supabase client');
  if (!db.createCampaign) throw new Error('Missing createCampaign');
  if (!db.getCampaigns) throw new Error('Missing getCampaigns');
  if (!db.getCampaignById) throw new Error('Missing getCampaignById');
});

await testDatabaseClient();

// ============================================================================
// TEST 8: File Structure
// ============================================================================

console.log('\n📁 TEST GROUP 8: File Structure\n');

const testFileStructure = test('Structure: All core files exist', async () => {
  const fs = await import('fs');
  const path = await import('path');

  const requiredFiles = [
    'server.js',
    'orchestrator.js',
    'campaign-manager.js',
    'package.json',
    'scheduler/cron-scheduler.js',
    'scheduler/campaign-runner.js',
    'executors/prospect-executor.js',
    'executors/analyze-executor.js',
    'executors/outreach-executor.js',
    'monitors/pipeline-health.js',
    'shared/logger.js',
    'shared/error-handler.js',
    'shared/validators.js',
    'database/supabase-client.js'
  ];

  for (const file of requiredFiles) {
    const filePath = path.join(process.cwd(), file);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Missing file: ${file}`);
    }
  }
});

await testFileStructure();

// ============================================================================
// RESULTS SUMMARY
// ============================================================================

console.log('\n╔═══════════════════════════════════════════════════════════════╗');
console.log('║                                                               ║');
console.log('║                    TEST RESULTS SUMMARY                       ║');
console.log('║                                                               ║');
console.log('╚═══════════════════════════════════════════════════════════════╝\n');

console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log(`📊 Total:  ${passed + failed}`);

const successRate = ((passed / (passed + failed)) * 100).toFixed(1);
console.log(`\n🎯 Success Rate: ${successRate}%\n`);

if (failed === 0) {
  console.log('🎉 ALL TESTS PASSED! Pipeline Orchestrator is ready!\n');
  process.exit(0);
} else {
  console.log(`⚠️  ${failed} test(s) failed. Review errors above.\n`);
  process.exit(1);
}
