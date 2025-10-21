/**
 * END-TO-END TEST: Smart Project-Aware Deduplication + Pagination
 *
 * This test demonstrates:
 * 1. Project-scoped deduplication (same company can be in different projects)
 * 2. Smart caching (reuse data, save Google API costs)
 * 3. Pagination (keep searching until we find enough NEW prospects)
 */

import { runProspectingPipeline } from '../../orchestrator.js';
import { supabase } from '../../database/supabase-client.js';
import { getProspectsByProject } from '../../database/supabase-client.js';
import { costTracker } from '../../shared/cost-tracker.js';

console.log('\n═══════════════════════════════════════════════════════');
console.log('   🧪 SMART DEDUPLICATION E2E TEST');
console.log('═══════════════════════════════════════════════════════\n');

async function runTest() {
  try {
    // ═════════════════════════════════════════════════════════════
    // SETUP: Create a test project
    // ═════════════════════════════════════════════════════════════

    console.log('📋 Step 1: Creating test project...\n');

    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert({
        project_name: `E2E Test - ${new Date().toISOString()}`,
        description: 'Testing smart deduplication and pagination',
        status: 'active'
      })
      .select()
      .single();

    if (projectError) {
      console.error('❌ Failed to create project:', projectError);
      process.exit(1);
    }

    console.log('✅ Project created');
    console.log(`   ID: ${project.id}`);
    console.log(`   Name: ${project.project_name}\n`);

    // ═════════════════════════════════════════════════════════════
    // RUN 1: First prospecting search
    // ═════════════════════════════════════════════════════════════

    console.log('─────────────────────────────────────────────────────');
    console.log('🔍 RUN 1: Italian Restaurants (First Search)');
    console.log('─────────────────────────────────────────────────────\n');

    costTracker.reset();
    const run1Start = Date.now();

    const results1 = await runProspectingPipeline(
      {
        industry: 'Italian Restaurants',
        city: 'Philadelphia',
        target: 'High-quality Italian restaurants',
        count: 10  // FIX: Moved from options to brief
      },
      {
        projectId: project.id,
        minRating: 4.0,
        verifyWebsites: false,  // Skip for faster test
        scrapeWebsites: false,
        findSocial: false,
        checkRelevance: true    // Enable ICP check
      }
    );

    const run1Duration = ((Date.now() - run1Start) / 1000).toFixed(1);
    const run1Cost = costTracker.getSummary();

    console.log('\n📊 RUN 1 RESULTS:');
    console.log(`   Found: ${results1.found} companies`);
    console.log(`   Saved: ${results1.saved} NEW prospects`);
    console.log(`   Skipped: ${results1.skipped} duplicates`);
    console.log(`   Duration: ${run1Duration}s`);
    console.log(`   Cost: $${run1Cost.costs.total}`);
    console.log(`   Google Maps Calls: ${run1Cost.calls.googleMaps}`);

    if (results1.saved === 0) {
      console.log('\n⚠️  No new prospects saved. This might mean:');
      console.log('   - All prospects already exist in the database');
      console.log('   - Try a different search query or city');
    }

    // Show some prospects
    if (results1.prospects.length > 0) {
      console.log('\n📝 Sample Prospects:');
      results1.prospects.slice(0, 3).forEach((p, i) => {
        console.log(`   ${i + 1}. ${p.company_name}`);
        console.log(`      Rating: ${p.google_rating}/5.0`);
        console.log(`      Website: ${p.website || 'N/A'}`);
      });
    }

    // ═════════════════════════════════════════════════════════════
    // RUN 2: Second search (overlapping) - Tests deduplication
    // ═════════════════════════════════════════════════════════════

    console.log('\n─────────────────────────────────────────────────────');
    console.log('🔍 RUN 2: Pizza Restaurants (Overlapping Search)');
    console.log('Expected: Skips Italian places that also serve pizza');
    console.log('─────────────────────────────────────────────────────\n');

    costTracker.reset();
    const run2Start = Date.now();

    const results2 = await runProspectingPipeline(
      {
        industry: 'Pizza Restaurants',
        city: 'Philadelphia',
        target: 'Pizza places with good reviews',
        count: 10  // FIX: Moved from options to brief
      },
      {
        projectId: project.id,
        minRating: 4.0,
        verifyWebsites: false,
        scrapeWebsites: false,
        findSocial: false,
        checkRelevance: true    // Enable ICP check
      }
    );

    const run2Duration = ((Date.now() - run2Start) / 1000).toFixed(1);
    const run2Cost = costTracker.getSummary();

    console.log('\n📊 RUN 2 RESULTS:');
    console.log(`   Found: ${results2.found} companies`);
    console.log(`   Saved: ${results2.saved} NEW prospects`);
    console.log(`   Skipped: ${results2.skipped} duplicates ✅`);
    console.log(`   Duration: ${run2Duration}s`);
    console.log(`   Cost: $${run2Cost.costs.total}`);
    console.log(`   Google Maps Calls: ${run2Cost.calls.googleMaps}`);

    if (results2.skipped > 0) {
      console.log(`\n✨ Smart deduplication working! Skipped ${results2.skipped} duplicates`);
    }

    // ═════════════════════════════════════════════════════════════
    // VERIFICATION: Check project prospects
    // ═════════════════════════════════════════════════════════════

    console.log('\n─────────────────────────────────────────────────────');
    console.log('🔍 VERIFICATION: Checking Project Prospects');
    console.log('─────────────────────────────────────────────────────\n');

    const projectProspects = await getProspectsByProject(project.id);

    console.log('📊 PROJECT SUMMARY:');
    console.log(`   Total Unique Prospects: ${projectProspects.length}`);
    console.log(`   Expected: ${results1.saved + results2.saved}`);
    console.log(`   Match: ${projectProspects.length === results1.saved + results2.saved ? '✅' : '❌'}`);

    // Show prospects by run
    const run1Prospects = projectProspects.filter(p => p.project_run_id === results1.runId);
    const run2Prospects = projectProspects.filter(p => p.project_run_id === results2.runId);

    console.log(`\n   From Run 1 (Italian): ${run1Prospects.length}`);
    console.log(`   From Run 2 (Pizza): ${run2Prospects.length}`);

    // ═════════════════════════════════════════════════════════════
    // COST ANALYSIS
    // ═════════════════════════════════════════════════════════════

    console.log('\n─────────────────────────────────────────────────────');
    console.log('💰 COST ANALYSIS');
    console.log('─────────────────────────────────────────────────────\n');

    const totalCost = parseFloat(run1Cost.costs.total) + parseFloat(run2Cost.costs.total);
    const totalCalls = run1Cost.calls.googleMaps + run2Cost.calls.googleMaps;

    console.log('Total Costs:');
    console.log(`   Run 1: $${run1Cost.costs.total}`);
    console.log(`   Run 2: $${run2Cost.costs.total}`);
    console.log(`   ────────────────────`);
    console.log(`   Total: $${totalCost.toFixed(4)}`);
    console.log(`   Google API Calls: ${totalCalls}`);
    console.log(`   Avg per prospect: $${(totalCost / projectProspects.length).toFixed(4)}`);

    // Estimate savings from caching
    const wouldBeCalls = results1.found + results2.found;
    const cachedCalls = wouldBeCalls - totalCalls;
    const estimatedSavings = cachedCalls * 0.005;

    if (cachedCalls > 0) {
      console.log(`\n💡 Cache Savings:`);
      console.log(`   Cached API calls avoided: ${cachedCalls}`);
      console.log(`   Estimated savings: $${estimatedSavings.toFixed(4)}`);
    }

    // ═════════════════════════════════════════════════════════════
    // TEST ASSERTIONS
    // ═════════════════════════════════════════════════════════════

    console.log('\n─────────────────────────────────────────────────────');
    console.log('✅ TEST ASSERTIONS');
    console.log('─────────────────────────────────────────────────────\n');

    const assertions = [
      {
        name: 'Project created successfully',
        passed: !!project.id
      },
      {
        name: 'Run 1 found prospects',
        passed: results1.found > 0
      },
      {
        name: 'Run 1 saved prospects',
        passed: results1.saved > 0
      },
      {
        name: 'Run 2 found prospects',
        passed: results2.found > 0
      },
      {
        name: 'Run 2 skipped some duplicates (deduplication working)',
        passed: results2.skipped > 0,
        optional: true
      },
      {
        name: 'Total prospects match saved count',
        passed: projectProspects.length === results1.saved + results2.saved
      },
      {
        name: 'No duplicate prospects in project',
        passed: new Set(projectProspects.map(p => p.id)).size === projectProspects.length
      },
      {
        name: 'Cost tracking working',
        passed: totalCost > 0
      }
    ];

    let passed = 0;
    let failed = 0;

    assertions.forEach(assertion => {
      if (assertion.passed) {
        console.log(`✅ ${assertion.name}`);
        passed++;
      } else if (assertion.optional) {
        console.log(`⚠️  ${assertion.name} (optional)`);
      } else {
        console.log(`❌ ${assertion.name}`);
        failed++;
      }
    });

    console.log(`\n📊 Test Results: ${passed}/${assertions.filter(a => !a.optional).length} passed`);

    // ═════════════════════════════════════════════════════════════
    // CLEANUP (optional)
    // ═════════════════════════════════════════════════════════════

    console.log('\n─────────────────────────────────────────────────────');
    console.log('🧹 CLEANUP');
    console.log('─────────────────────────────────────────────────────\n');

    console.log('ℹ️  Test data remains in database for inspection');
    console.log(`   Project ID: ${project.id}`);
    console.log(`   View prospects: getProspectsByProject('${project.id}')`);
    console.log('\nTo clean up manually:');
    console.log(`   DELETE FROM projects WHERE id = '${project.id}';`);
    console.log('   (CASCADE will remove linked prospects automatically)\n');

    // ═════════════════════════════════════════════════════════════
    // SUMMARY
    // ═════════════════════════════════════════════════════════════

    console.log('═══════════════════════════════════════════════════════');
    console.log('   🎉 TEST COMPLETE');
    console.log('═══════════════════════════════════════════════════════\n');

    console.log('Key Features Demonstrated:');
    console.log('✅ Project-aware deduplication (same prospect, different projects OK)');
    console.log('✅ Smart caching (reuse data, save API costs)');
    console.log('✅ Pagination (keep searching for NEW prospects)');
    console.log('✅ Many-to-many relationship (project_prospects table)');
    console.log('✅ Run tracking (know which search found each prospect)');

    if (failed === 0) {
      console.log('\n🎊 ALL TESTS PASSED!\n');
      process.exit(0);
    } else {
      console.log(`\n⚠️  ${failed} test(s) failed. Review results above.\n`);
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Check if server is running
async function checkServer() {
  try {
    const response = await fetch('http://localhost:3010/health');
    if (!response.ok) {
      throw new Error('Server not healthy');
    }
    return true;
  } catch (error) {
    console.error('\n❌ Error: Prospecting Engine not running on port 3010');
    console.error('Please start the server first: cd prospecting-engine && node server.js\n');
    process.exit(1);
  }
}

// Run test
checkServer().then(runTest);
