#!/usr/bin/env node

/**
 * Comprehensive End-to-End Test: 20 Prospects with Different Models & Prompts
 *
 * Tests the prospecting engine with:
 * - 20 companies across 4 different industries
 * - Multiple AI model configurations (Grok, GPT-4o, Claude)
 * - Custom prompts with varying temperatures
 * - All 7 pipeline steps
 * - Full validation and reporting
 */

import dotenv from 'dotenv';
import { runProspectingPipeline } from '../orchestrator.js';
import { getProspects, deleteProspects } from '../database/supabase-client.js';
import { logInfo } from '../shared/logger.js';

dotenv.config();

// ═══════════════════════════════════════════════════════════════════════════
// Test Configuration
// ═══════════════════════════════════════════════════════════════════════════

const TEST_CONFIGURATIONS = [
  // Group 1: Restaurants (5 prospects) - Testing Grok models
  {
    name: 'Italian Restaurants - Grok Fast',
    brief: {
      industry: 'Italian Restaurants',
      city: 'Philadelphia, PA',
      target: 'Upscale Italian restaurants with outdoor seating',
      count: 5
    },
    customPrompts: {
      queryUnderstanding: {
        model: 'grok-4-fast',
        temperature: 0.2,
        systemPrompt: 'You are a search query optimization expert. Convert business descriptions into optimal Google Maps queries.',
        userPromptTemplate: 'Convert this ICP brief into a Google Maps search query:\n\nIndustry: {{industry}}\nLocation: {{city}}\nTarget: {{target_description}}\n\nReturn ONLY the search query (no quotes, no explanation).'
      },
      websiteExtraction: {
        model: 'gpt-4o',
        temperature: 0.2
      },
      relevanceCheck: {
        model: 'grok-4-fast',
        temperature: 0.1
      }
    }
  },

  // Group 2: Plumbing (5 prospects) - Testing GPT-4o
  {
    name: 'Plumbers - GPT-4o',
    brief: {
      industry: 'Plumbing',
      city: 'Boston, MA',
      target: 'Emergency plumbers serving residential customers',
      count: 5
    },
    customPrompts: {
      queryUnderstanding: {
        model: 'gpt-4o',
        temperature: 0.3,
        systemPrompt: 'You are an expert at understanding business search intent. Create concise, effective search queries.',
        userPromptTemplate: 'Create a Google Maps search query for:\n\nIndustry: {{industry}}\nCity: {{city}}\nTarget: {{target_description}}\n\nQuery:'
      },
      websiteExtraction: {
        model: 'gpt-4o',
        temperature: 0.3
      },
      relevanceCheck: {
        model: 'gpt-4o',
        temperature: 0.2
      }
    }
  },

  // Group 3: Law Firms (5 prospects) - Testing Claude Sonnet
  {
    name: 'Law Firms - Claude Sonnet',
    brief: {
      industry: 'Legal Services',
      city: 'New York, NY',
      target: 'Family law attorneys specializing in divorce',
      count: 5
    },
    customPrompts: {
      queryUnderstanding: {
        model: 'claude-sonnet-4-5',
        temperature: 0.2,
        systemPrompt: 'You are a search optimization specialist. Transform business requirements into effective search queries.',
        userPromptTemplate: 'Business target:\n- Industry: {{industry}}\n- Location: {{city}}\n- Niche: {{target_description}}\n\nOptimal Google Maps query:'
      },
      websiteExtraction: {
        model: 'claude-sonnet-4-5',
        temperature: 0.2
      },
      relevanceCheck: {
        model: 'claude-sonnet-4-5',
        temperature: 0.1
      }
    }
  },

  // Group 4: Hair Salons (5 prospects) - Testing Claude Haiku (budget option)
  {
    name: 'Hair Salons - Claude Haiku',
    brief: {
      industry: 'Beauty Services',
      city: 'Los Angeles, CA',
      target: 'High-end hair salons for women',
      count: 5
    },
    customPrompts: {
      queryUnderstanding: {
        model: 'claude-haiku-4-5',
        temperature: 0.2,
        systemPrompt: 'You create effective search queries. Keep them simple and specific.',
        userPromptTemplate: 'Target: {{target_description}}\nLocation: {{city}}\n\nSearch query:'
      },
      websiteExtraction: {
        model: 'gpt-4o', // Using GPT-4o for vision (Haiku doesn't support vision)
        temperature: 0.2
      },
      relevanceCheck: {
        model: 'claude-haiku-4-5',
        temperature: 0.1
      }
    }
  }
];

// ═══════════════════════════════════════════════════════════════════════════
// Test State
// ═══════════════════════════════════════════════════════════════════════════

const testResults = {
  startTime: null,
  endTime: null,
  totalProspects: 0,
  successful: 0,
  failed: 0,
  configurations: [],
  prospects: [],
  costs: {
    total: 0,
    byModel: {}
  },
  timing: {
    total: 0,
    average: 0,
    byConfig: {}
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// Progress Tracking
// ═══════════════════════════════════════════════════════════════════════════

function logProgress(message, data = {}) {
  const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
  console.log(`[${timestamp}] ${message}`);
  if (Object.keys(data).length > 0) {
    console.log(`         ${JSON.stringify(data, null, 2).replace(/\n/g, '\n         ')}`);
  }
}

function logSection(title) {
  console.log('\n' + '═'.repeat(80));
  console.log(`  ${title}`);
  console.log('═'.repeat(80) + '\n');
}

function handleProgress(event) {
  switch (event.type) {
    case 'step_start':
      logProgress(`▶ Step ${event.step}: ${event.message}`);
      break;

    case 'step_complete':
      logProgress(`✓ Step ${event.step} complete`, {
        duration: `${event.duration}ms`,
        ...event.data
      });
      break;

    case 'prospect_found':
      logProgress(`  → Found: ${event.company}`);
      break;

    case 'prospect_saved':
      logProgress(`  ✓ Saved: ${event.company}`, {
        icp_score: event.icp_score,
        website: event.website_status
      });
      break;

    case 'error':
      logProgress(`  ✗ Error: ${event.error}`);
      break;

    case 'warning':
      logProgress(`  ⚠ Warning: ${event.message}`);
      break;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Test Execution
// ═══════════════════════════════════════════════════════════════════════════

async function runConfigurationTest(config, index) {
  logSection(`Test ${index + 1}/${TEST_CONFIGURATIONS.length}: ${config.name}`);

  console.log('📋 Configuration:');
  console.log(`   Industry: ${config.brief.industry}`);
  console.log(`   Location: ${config.brief.city}`);
  console.log(`   Target: ${config.brief.target}`);
  console.log(`   Count: ${config.brief.count} prospects\n`);

  console.log('🤖 AI Models:');
  console.log(`   Query Understanding: ${config.customPrompts.queryUnderstanding.model} @ temp ${config.customPrompts.queryUnderstanding.temperature}`);
  console.log(`   Website Extraction:  ${config.customPrompts.websiteExtraction.model} @ temp ${config.customPrompts.websiteExtraction.temperature}`);
  console.log(`   Relevance Check:     ${config.customPrompts.relevanceCheck.model} @ temp ${config.customPrompts.relevanceCheck.temperature}\n`);

  const startTime = Date.now();
  const configResult = {
    name: config.name,
    brief: config.brief,
    models: {
      queryUnderstanding: config.customPrompts.queryUnderstanding.model,
      websiteExtraction: config.customPrompts.websiteExtraction.model,
      relevanceCheck: config.customPrompts.relevanceCheck.model
    },
    startTime,
    endTime: null,
    duration: 0,
    prospects: [],
    stats: {
      found: 0,
      verified: 0,
      saved: 0,
      failed: 0
    },
    cost: 0
  };

  try {
    // Run the prospecting pipeline
    const results = await runProspectingPipeline(
      config.brief,
      {
        customPrompts: config.customPrompts,
        enableSocialScraping: true,
        verifyWebsites: true,
        checkRelevance: true
      },
      handleProgress
    );

    configResult.endTime = Date.now();
    configResult.duration = configResult.endTime - startTime;
    configResult.stats = {
      found: results.found || 0,
      verified: results.verified || 0,
      saved: results.saved || 0,
      failed: results.failed || 0,
      skipped: results.skipped || 0
    };
    configResult.cost = results.cost || 0;
    configResult.prospects = results.prospects || [];

    // Update global stats
    testResults.successful += results.saved || 0;
    testResults.failed += results.failed || 0;
    testResults.totalProspects += (results.saved || 0) + (results.failed || 0);
    testResults.costs.total += results.cost || 0;
    testResults.timing.total += configResult.duration;
    testResults.timing.byConfig[config.name] = configResult.duration;

    // Track costs by model
    Object.values(config.customPrompts).forEach(prompt => {
      if (prompt.model) {
        testResults.costs.byModel[prompt.model] =
          (testResults.costs.byModel[prompt.model] || 0) + (results.cost || 0) / 3; // Divide by 3 prompts
      }
    });

    console.log('\n📊 Configuration Results:');
    console.log(`   ✓ Found: ${results.found}`);
    console.log(`   ✓ Verified: ${results.verified}`);
    console.log(`   ✓ Saved: ${results.saved}`);
    console.log(`   ✗ Failed: ${results.failed}`);
    console.log(`   ⏭ Skipped: ${results.skipped}`);
    console.log(`   💰 Cost: $${results.cost?.toFixed(4) || '0.0000'}`);
    console.log(`   ⏱ Duration: ${(configResult.duration / 1000).toFixed(1)}s`);

    if (results.prospects && results.prospects.length > 0) {
      console.log('\n📋 Prospects:');
      results.prospects.slice(0, 5).forEach((p, i) => {
        console.log(`   ${i + 1}. ${p.company_name}`);
        console.log(`      Website: ${p.website_status}`);
        console.log(`      ICP Score: ${p.icp_match_score || 'N/A'}/100`);
        console.log(`      Rating: ${p.google_rating || 'N/A'}/5.0`);
      });
      if (results.prospects.length > 5) {
        console.log(`   ... and ${results.prospects.length - 5} more`);
      }
    }

  } catch (error) {
    configResult.endTime = Date.now();
    configResult.duration = configResult.endTime - startTime;
    configResult.error = error.message;
    testResults.failed += config.brief.count;

    console.log(`\n❌ Configuration FAILED: ${error.message}`);
  }

  testResults.configurations.push(configResult);
  return configResult;
}

async function runAllTests() {
  console.log('\n╔═══════════════════════════════════════════════════════════════════════════╗');
  console.log('║  COMPREHENSIVE PROSPECTING ENGINE TEST - 20 PROSPECTS                     ║');
  console.log('║  Multiple Industries × Multiple AI Models × Custom Prompts                ║');
  console.log('╚═══════════════════════════════════════════════════════════════════════════╝\n');

  testResults.startTime = Date.now();

  // Run each configuration sequentially
  for (let i = 0; i < TEST_CONFIGURATIONS.length; i++) {
    await runConfigurationTest(TEST_CONFIGURATIONS[i], i);

    // Small delay between configurations
    if (i < TEST_CONFIGURATIONS.length - 1) {
      console.log('\n⏳ Waiting 2 seconds before next configuration...\n');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  testResults.endTime = Date.now();
  testResults.timing.average = testResults.timing.total / TEST_CONFIGURATIONS.length;
}

// ═══════════════════════════════════════════════════════════════════════════
// Results Reporting
// ═══════════════════════════════════════════════════════════════════════════

function generateReport() {
  logSection('TEST SUMMARY REPORT');

  const totalTime = testResults.endTime - testResults.startTime;
  const successRate = (testResults.successful / testResults.totalProspects * 100).toFixed(1);

  console.log('📊 Overall Statistics:');
  console.log(`   Total Configurations: ${TEST_CONFIGURATIONS.length}`);
  console.log(`   Total Prospects: ${testResults.totalProspects}`);
  console.log(`   ✓ Successful: ${testResults.successful} (${successRate}%)`);
  console.log(`   ✗ Failed: ${testResults.failed}`);
  console.log(`   ⏱ Total Time: ${(totalTime / 1000).toFixed(1)}s (~${(totalTime / 60000).toFixed(1)} minutes)`);
  console.log(`   ⏱ Average per Config: ${(testResults.timing.average / 1000).toFixed(1)}s`);
  console.log(`   💰 Total Cost: $${testResults.costs.total.toFixed(4)}`);

  console.log('\n💰 Cost by AI Model:');
  Object.entries(testResults.costs.byModel)
    .sort((a, b) => b[1] - a[1])
    .forEach(([model, cost]) => {
      console.log(`   ${model.padEnd(25)} $${cost.toFixed(4)}`);
    });

  console.log('\n⏱ Time by Configuration:');
  Object.entries(testResults.timing.byConfig)
    .sort((a, b) => b[1] - a[1])
    .forEach(([name, time]) => {
      console.log(`   ${name.padEnd(40)} ${(time / 1000).toFixed(1)}s`);
    });

  console.log('\n📋 Configuration Details:');
  testResults.configurations.forEach((config, i) => {
    console.log(`\n   ${i + 1}. ${config.name}`);
    console.log(`      Models: ${config.models.queryUnderstanding}, ${config.models.websiteExtraction}, ${config.models.relevanceCheck}`);
    console.log(`      Found: ${config.stats.found}, Saved: ${config.stats.saved}, Failed: ${config.stats.failed}`);
    console.log(`      Cost: $${config.cost?.toFixed(4) || '0.0000'}, Time: ${(config.duration / 1000).toFixed(1)}s`);
    if (config.error) {
      console.log(`      ❌ Error: ${config.error}`);
    }
  });

  // Success indicators
  console.log('\n' + '═'.repeat(80));
  if (testResults.failed === 0) {
    console.log('🎉 ALL TESTS PASSED! ALL 20 PROSPECTS PROCESSED SUCCESSFULLY!');
  } else if (successRate >= 80) {
    console.log('✅ TESTS MOSTLY SUCCESSFUL (>80% success rate)');
  } else if (successRate >= 50) {
    console.log('⚠️  TESTS PARTIALLY SUCCESSFUL (50-80% success rate)');
  } else {
    console.log('❌ TESTS FAILED (< 50% success rate)');
  }
  console.log('═'.repeat(80) + '\n');

  return testResults;
}

// ═══════════════════════════════════════════════════════════════════════════
// Database Validation
// ═══════════════════════════════════════════════════════════════════════════

async function validateDatabaseResults() {
  logSection('DATABASE VALIDATION');

  try {
    console.log('🔍 Fetching prospects from database...\n');

    // Get prospects for each configuration
    for (const config of testResults.configurations) {
      if (config.prospects && config.prospects.length > 0) {
        const prospectIds = config.prospects.map(p => p.id);
        const { data: dbProspects } = await getProspects({
          limit: 100,
          filters: {
            city: config.brief.city
          }
        });

        const matchedProspects = dbProspects?.filter(p =>
          prospectIds.includes(p.id)
        ) || [];

        console.log(`✓ ${config.name}:`);
        console.log(`   Expected: ${config.prospects.length} prospects`);
        console.log(`   Found in DB: ${matchedProspects.length} prospects`);
        console.log(`   Match: ${matchedProspects.length === config.prospects.length ? '✅' : '⚠️'}`);

        // Validate data completeness
        const withWebsite = matchedProspects.filter(p => p.website).length;
        const withRating = matchedProspects.filter(p => p.google_rating).length;
        const withIcpScore = matchedProspects.filter(p => p.icp_match_score).length;

        console.log(`   Data completeness:`);
        console.log(`     - Website: ${withWebsite}/${matchedProspects.length}`);
        console.log(`     - Rating: ${withRating}/${matchedProspects.length}`);
        console.log(`     - ICP Score: ${withIcpScore}/${matchedProspects.length}`);
        console.log('');
      }
    }

  } catch (error) {
    console.log(`❌ Database validation failed: ${error.message}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Main Execution
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  try {
    // Check environment
    if (!process.env.GOOGLE_MAPS_API_KEY) {
      console.error('❌ Error: GOOGLE_MAPS_API_KEY not set in environment');
      console.error('   Please add it to your .env file');
      process.exit(1);
    }

    // Run tests
    await runAllTests();

    // Generate report
    const results = generateReport();

    // Validate database
    await validateDatabaseResults();

    // Save results to file
    const fs = await import('fs/promises');
    const reportPath = `./test-results-${Date.now()}.json`;
    await fs.writeFile(reportPath, JSON.stringify(results, null, 2));
    console.log(`\n💾 Full results saved to: ${reportPath}\n`);

    // Exit with appropriate code
    process.exit(results.failed === 0 ? 0 : 1);

  } catch (error) {
    console.error('\n' + '═'.repeat(80));
    console.error('❌ TEST SUITE CRASHED');
    console.error('═'.repeat(80));
    console.error(error);
    process.exit(1);
  }
}

// Run the test
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});