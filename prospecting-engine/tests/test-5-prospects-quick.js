#!/usr/bin/env node

/**
 * Quick Test: 5 Prospects with Different AI Models
 *
 * Fast version for testing the prospecting engine with:
 * - 5 companies (1 from each industry)
 * - 3 different AI model configurations
 * - Validates all 7 pipeline steps
 */

import dotenv from 'dotenv';
import { runProspectingPipeline } from '../orchestrator.js';

dotenv.config();

const TEST_CONFIGS = [
  {
    name: 'Restaurants - Grok-4-Fast',
    brief: {
      industry: 'Italian Restaurants',
      city: 'Philadelphia, PA',
      target: 'Italian restaurants with good reviews',
      count: 2
    },
    customPrompts: {
      queryUnderstanding: { model: 'grok-4-fast', temperature: 0.2 },
      websiteExtraction: { model: 'gpt-4o', temperature: 0.2 },
      relevanceCheck: { model: 'grok-4-fast', temperature: 0.1 }
    }
  },
  {
    name: 'Plumbers - GPT-4o',
    brief: {
      industry: 'Plumbing',
      city: 'Boston, MA',
      target: 'Emergency plumbers',
      count: 2
    },
    customPrompts: {
      queryUnderstanding: { model: 'gpt-4o', temperature: 0.3 },
      websiteExtraction: { model: 'gpt-4o', temperature: 0.3 },
      relevanceCheck: { model: 'gpt-4o', temperature: 0.2 }
    }
  },
  {
    name: 'Hair Salons - Claude Haiku',
    brief: {
      industry: 'Beauty Services',
      city: 'Los Angeles, CA',
      target: 'Hair salons',
      count: 1
    },
    customPrompts: {
      queryUnderstanding: { model: 'claude-haiku-4-5', temperature: 0.2 },
      websiteExtraction: { model: 'gpt-4o', temperature: 0.2 },
      relevanceCheck: { model: 'claude-haiku-4-5', temperature: 0.1 }
    }
  }
];

async function runQuickTest() {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║  QUICK TEST - 5 Prospects × 3 AI Model Configurations        ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  const results = {
    total: 0,
    successful: 0,
    failed: 0,
    cost: 0,
    duration: 0
  };

  const startTime = Date.now();

  for (let i = 0; i < TEST_CONFIGS.length; i++) {
    const config = TEST_CONFIGS[i];
    console.log(`\n[${ i + 1}/${TEST_CONFIGS.length}] ${config.name}`);
    console.log('─'.repeat(60));
    console.log(`Models: ${config.customPrompts.queryUnderstanding.model}, ${config.customPrompts.websiteExtraction.model}, ${config.customPrompts.relevanceCheck.model}`);

    try {
      const result = await runProspectingPipeline(
        config.brief,
        { customPrompts: config.customPrompts },
        (event) => {
          if (event.type === 'prospect_found') {
            console.log(`  → ${event.company}`);
          }
        }
      );

      results.total += result.found || 0;
      results.successful += result.saved || 0;
      results.failed += result.failed || 0;
      results.cost += result.cost || 0;

      console.log(`✓ Saved: ${result.saved}, Failed: ${result.failed}, Cost: $${result.cost?.toFixed(4)}`);

    } catch (error) {
      console.log(`✗ Failed: ${error.message}`);
      results.failed += config.brief.count;
    }
  }

  results.duration = Date.now() - startTime;

  console.log('\n' + '═'.repeat(60));
  console.log('SUMMARY');
  console.log('═'.repeat(60));
  console.log(`Total: ${results.total}`);
  console.log(`✓ Successful: ${results.successful}`);
  console.log(`✗ Failed: ${results.failed}`);
  console.log(`💰 Total Cost: $${results.cost.toFixed(4)}`);
  console.log(`⏱ Duration: ${(results.duration / 1000).toFixed(1)}s`);
  console.log('═'.repeat(60) + '\n');

  process.exit(results.failed === 0 ? 0 : 1);
}

runQuickTest().catch(error => {
  console.error('Test crashed:', error);
  process.exit(1);
});