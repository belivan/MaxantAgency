/**
 * End-to-End Test: Complete Pipeline (All 7 Steps)
 *
 * Tests the entire prospecting pipeline from ICP brief to qualified prospects
 */

import { runProspectingPipeline } from '../orchestrator.js';
import { getProspects } from '../database/supabase-client.js';
import { costTracker } from '../shared/cost-tracker.js';
import { logInfo, logError } from '../shared/logger.js';

async function testEndToEnd() {
  console.log('\n========================================');
  console.log('🧪 END-TO-END PIPELINE TEST');
  console.log('========================================\n');

  // Test ICP Brief - Small sample for quick testing
  const testBrief = {
    industry: 'Italian Restaurants',
    city: 'Philadelphia',
    target: 'High-quality Italian restaurants with good reviews',
    count: 5,  // FIX: Limit to 5 prospects for faster testing
    icp: {
      niches: ['restaurants', 'italian food', 'dining'],
      minRating: 4.0,
      targetCities: ['Philadelphia']
    }
  };

  console.log('📋 Test ICP Brief:');
  console.log(JSON.stringify(testBrief, null, 2));
  console.log('\n');

  // Pipeline Options - Test all features
  const options = {
    minRating: 4.0,             // Quality threshold
    verifyWebsites: true,       // Step 3: Website verification
    scrapeWebsites: true,       // Step 4: Website extraction
    findSocial: true,           // Step 5: Social discovery
    scrapeSocial: true,         // Step 6: Social metadata
    checkRelevance: true,       // Step 7: ICP relevance
    filterIrrelevant: false     // Keep all for testing (show scores)
  };

  console.log('⚙️  Pipeline Options:');
  console.log(JSON.stringify(options, null, 2));
  console.log('\n');

  // Progress callback
  const progressEvents = [];
  const onProgress = (event) => {
    progressEvents.push(event);

    // Log key events
    if (event.type === 'step_start') {
      console.log(`\n🔄 STEP ${event.step}: ${event.message}`);
    } else if (event.type === 'step_complete') {
      console.log(`✅ ${event.message}`);
    } else if (event.type === 'company_processed') {
      console.log(`   📊 ${event.company}: ${event.status}`);
      if (event.icpScore !== undefined) {
        console.log(`      ICP Score: ${event.icpScore}/100 (${event.isRelevant ? 'RELEVANT' : 'NOT RELEVANT'})`);
      }
    } else if (event.type === 'error') {
      console.log(`   ⚠️  ${event.message}`);
    }
  };

  console.log('🚀 Starting Pipeline...\n');
  console.log('========================================\n');

  const startTime = Date.now();

  try {
    // Run the complete pipeline
    const results = await runProspectingPipeline(testBrief, options, onProgress);

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log('\n========================================');
    console.log('✅ PIPELINE COMPLETE!');
    console.log('========================================\n');

    // Results Summary
    console.log('📊 RESULTS SUMMARY:\n');
    console.log(`   Companies Found:      ${results.found}`);
    console.log(`   Prospects Saved:      ${results.saved}`);
    console.log(`   Websites Verified:    ${results.websitesVerified || 0}`);
    console.log(`   Websites Scraped:     ${results.websitesScraped || 0}`);
    console.log(`   Social Profiles Found: ${results.socialProfilesFound || 0}`);
    console.log(`   Relevance Checked:    ${results.relevanceChecked || 0}`);
    console.log(`   Success Rate:         ${((results.saved / results.found) * 100).toFixed(1)}%`);
    console.log(`   Duration:             ${duration}s`);
    console.log('');

    // Cost Analysis
    const costSummary = costTracker.getSummary();
    console.log('💰 COST ANALYSIS:\n');
    console.log(`   Google Maps API:      $${costSummary.costs.googleMaps}`);
    console.log(`   Grok AI:              $${costSummary.costs.grokAi}`);
    console.log(`   OpenAI:               $${costSummary.costs.openAi}`);
    console.log(`   ─────────────────────────────────`);
    console.log(`   TOTAL:                $${costSummary.costs.total}`);
    console.log(`   Per Prospect:         $${results.saved > 0 ? (parseFloat(costSummary.costs.total) / results.saved).toFixed(4) : '0.0000'}`);
    console.log('');

    // Fetch and display saved prospects
    console.log('📋 SAVED PROSPECTS:\n');
    const prospects = await getProspects({
      limit: 10,
      orderBy: 'icp_match_score',
      orderDirection: 'desc'
    });

    if (prospects.length === 0) {
      console.log('   ⚠️  No prospects saved to database');
    } else {
      prospects.forEach((p, i) => {
        console.log(`   ${i + 1}. ${p.company_name}`);
        console.log(`      Industry: ${p.industry || 'N/A'}`);
        console.log(`      Location: ${p.city}, ${p.state}`);
        console.log(`      Rating: ${p.google_rating ? p.google_rating + '/5.0' : 'N/A'}`);
        console.log(`      Website: ${p.website || 'N/A'} (${p.website_status || 'unknown'})`);
        console.log(`      Email: ${p.contact_email || 'N/A'}`);
        console.log(`      Phone: ${p.contact_phone || 'N/A'}`);

        // Social profiles
        if (p.social_profiles) {
          const platforms = Object.keys(p.social_profiles).filter(k => p.social_profiles[k]);
          if (platforms.length > 0) {
            console.log(`      Social: ${platforms.join(', ')}`);
          }
        }

        // ICP score
        if (p.icp_match_score !== null) {
          console.log(`      ICP Score: ${p.icp_match_score}/100 ${p.is_relevant ? '✅' : '❌'}`);
        }

        console.log('');
      });
    }

    // Event Statistics
    console.log('📈 PIPELINE EVENTS:\n');
    const eventTypes = progressEvents.reduce((acc, e) => {
      acc[e.type] = (acc[e.type] || 0) + 1;
      return acc;
    }, {});

    Object.entries(eventTypes).forEach(([type, count]) => {
      console.log(`   ${type}: ${count}`);
    });
    console.log('');

    // Test Assessment
    console.log('========================================');
    console.log('🎯 TEST ASSESSMENT');
    console.log('========================================\n');

    const checks = [];

    // Check 1: Companies found
    checks.push({
      name: 'Companies discovered',
      passed: results.found > 0,
      detail: `${results.found} companies found`
    });

    // Check 2: Prospects saved
    checks.push({
      name: 'Prospects saved to database',
      passed: results.saved > 0,
      detail: `${results.saved} prospects saved`
    });

    // Check 3: Website verification
    if (options.verifyWebsites) {
      checks.push({
        name: 'Website verification (Step 3)',
        passed: (results.websitesVerified || 0) > 0,
        detail: `${results.websitesVerified || 0} websites verified`
      });
    }

    // Check 4: Website scraping
    if (options.scrapeWebsites) {
      checks.push({
        name: 'Website extraction (Step 4)',
        passed: (results.websitesScraped || 0) > 0,
        detail: `${results.websitesScraped || 0} websites scraped`
      });
    }

    // Check 5: Social profiles
    if (options.findSocial) {
      checks.push({
        name: 'Social discovery (Step 5)',
        passed: (results.socialProfilesFound || 0) > 0,
        detail: `${results.socialProfilesFound || 0} social profiles found`
      });
    }

    // Check 6: Relevance checking
    if (options.checkRelevance) {
      checks.push({
        name: 'ICP relevance scoring (Step 7)',
        passed: (results.relevanceChecked || 0) > 0,
        detail: `${results.relevanceChecked || 0} prospects scored`
      });
    }

    // Check 7: Cost tracking
    checks.push({
      name: 'Cost tracking',
      passed: parseFloat(costSummary.costs.total) > 0,
      detail: `$${costSummary.costs.total} total cost tracked`
    });

    // Check 8: Performance
    const avgTimePerProspect = duration / results.saved;
    checks.push({
      name: 'Performance (< 30s per prospect)',
      passed: avgTimePerProspect < 30,
      detail: `${avgTimePerProspect.toFixed(1)}s per prospect`
    });

    // Display checks
    checks.forEach(check => {
      const icon = check.passed ? '✅' : '❌';
      console.log(`${icon} ${check.name}`);
      console.log(`   ${check.detail}`);
    });

    const allPassed = checks.every(c => c.passed);
    const passRate = ((checks.filter(c => c.passed).length / checks.length) * 100).toFixed(0);

    console.log('\n========================================');
    if (allPassed) {
      console.log('🎉 ALL TESTS PASSED! SYSTEM IS PRODUCTION-READY!');
    } else {
      console.log(`⚠️  ${passRate}% TESTS PASSED - Review failures above`);
    }
    console.log('========================================\n');

    return {
      success: allPassed,
      results,
      costs: costSummary,
      duration,
      checks
    };

  } catch (error) {
    console.error('\n❌ PIPELINE FAILED:\n');
    console.error(error);

    logError('End-to-end test failed', error);

    return {
      success: false,
      error: error.message
    };
  }
}

// Run test
testEndToEnd()
  .then(result => {
    process.exit(result.success ? 0 : 1);
  })
  .catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });
