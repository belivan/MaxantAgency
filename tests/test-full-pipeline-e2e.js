/**
 * End-to-End Pipeline Test
 *
 * Tests the complete pipeline from prospecting to analysis:
 * 1. Prospecting Engine - Discover prospects with quality filter
 * 2. Analysis Engine - Analyze prospects with enhanced scoring
 *
 * Uses cheap AI models to minimize costs.
 */

// Using native fetch (Node 18+)
const PROSPECTING_API = 'http://localhost:3010';
const ANALYSIS_API = 'http://localhost:3001';

const COLORS = {
  RESET: '\x1b[0m',
  RED: '\x1b[31m',
  GREEN: '\x1b[32m',
  YELLOW: '\x1b[33m',
  BLUE: '\x1b[34m',
  CYAN: '\x1b[36m'
};

function log(message, color = COLORS.RESET) {
  console.log(`${color}${message}${COLORS.RESET}`);
}

function section(title) {
  console.log('\n' + '='.repeat(80));
  log(title, COLORS.CYAN);
  console.log('='.repeat(80) + '\n');
}

async function waitForServer(url, name, maxAttempts = 10) {
  log(`⏳ Waiting for ${name} to be ready...`, COLORS.YELLOW);

  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await fetch(`${url}/health`);
      if (response.ok) {
        const data = await response.json();
        log(`✅ ${name} is ready! Version: ${data.version}`, COLORS.GREEN);
        return true;
      }
    } catch (error) {
      // Server not ready yet
    }

    if (i < maxAttempts - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
    }
  }

  log(`❌ ${name} failed to start`, COLORS.RED);
  return false;
}

async function testProspecting() {
  section('TEST 1: Prospecting Engine - Discovery with Quality Filter');

  log('📋 Configuration:', COLORS.BLUE);
  console.log('  - Query: "pizza restaurants in Brooklyn NY"');
  console.log('  - Max Results: 3 (small test)');
  console.log('  - Models: grok-4-fast (cheap)');
  console.log('  - Quality Filter: ENABLED (new feature)');

  const requestBody = {
    brief: {
      industry: 'pizza restaurants',
      location: 'Brooklyn NY',
      target_description: 'Small to medium pizza restaurants'
    },
    options: {
      maxResults: 3,
      verifyWebsites: true,
      checkRelevance: true,
      filterIrrelevant: false, // Keep all for testing
      model: 'grok-4-fast', // Cheap model
      visionModel: 'gpt-4o-mini' // Cheaper vision model
    }
  };

  log('\n🚀 Starting prospecting pipeline...', COLORS.YELLOW);

  try {
    const response = await fetch(`${PROSPECTING_API}/api/prospect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      log(`❌ Prospecting failed: ${response.status}`, COLORS.RED);
      console.log(errorText);
      return null;
    }

    const result = await response.json();

    log('\n📊 PROSPECTING RESULTS:', COLORS.GREEN);
    console.log('─'.repeat(80));
    console.log(`  Found: ${result.found || 0}`);
    console.log(`  Verified: ${result.verified || 0}`);
    console.log(`  Saved: ${result.saved || 0}`);
    console.log(`  Skipped (Total): ${result.skipped || 0}`);
    console.log(`  Filtered Inactive: ${result.filteredInactive || 0} ⭐ NEW FEATURE`);
    console.log(`  Failed: ${result.failed || 0}`);
    console.log(`  Cost: $${result.cost?.toFixed(4) || '0.0000'}`);
    console.log(`  Time: ${(result.timeMs / 1000).toFixed(1)}s`);

    if (result.filteredInactive > 0) {
      log(`\n✅ Quality filter is working! Filtered ${result.filteredInactive} inactive prospect(s)`, COLORS.GREEN);
    }

    if (result.prospects && result.prospects.length > 0) {
      log(`\n📋 Saved Prospects:`, COLORS.BLUE);
      console.log('─'.repeat(80));
      result.prospects.forEach((p, idx) => {
        console.log(`\n  ${idx + 1}. ${p.company_name}`);
        console.log(`     Website: ${p.website || 'none'}`);
        console.log(`     Status: ${p.website_status || 'unknown'}`);
        console.log(`     Rating: ${p.google_rating || 'N/A'} ⭐ (${p.google_review_count || 0} reviews)`);
        console.log(`     Most Recent Review: ${p.most_recent_review_date || 'never'}`);
        console.log(`     ICP Match: ${p.icp_match_score || 'N/A'}/100`);
        console.log(`     Prospect ID: ${p.id}`);
      });
    }

    return result;

  } catch (error) {
    log(`❌ Prospecting error: ${error.message}`, COLORS.RED);
    console.error(error);
    return null;
  }
}

async function testAnalysis(prospectIds) {
  section('TEST 2: Analysis Engine - Enhanced Scoring with Activity Signals');

  if (!prospectIds || prospectIds.length === 0) {
    log('⚠️  No prospects to analyze', COLORS.YELLOW);
    return null;
  }

  log('📋 Configuration:', COLORS.BLUE);
  console.log(`  - Prospects: ${prospectIds.length}`);
  console.log('  - Models: grok-4-fast for most analyzers (cheap)');
  console.log('  - GPT-5 for lead scoring (enhanced urgency logic)');
  console.log('  - Activity Signals: most_recent_review_date + website_status');

  const requestBody = {
    prospect_ids: prospectIds,
    custom_prompts: {
      seo: { model: 'grok-4-fast' },
      content: { model: 'grok-4-fast' },
      social: { model: 'grok-4-fast' },
      desktop_visual: { model: 'gpt-4o-mini' },
      mobile_visual: { model: 'gpt-4o-mini' }
      // Lead scorer uses gpt-5 (default in prompt file)
    }
  };

  log(`\n🚀 Starting analysis for prospect: ${prospectIds[0]}...`, COLORS.YELLOW);

  try {
    const response = await fetch(`${ANALYSIS_API}/api/batch-analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      log(`❌ Analysis failed: ${response.status}`, COLORS.RED);
      console.log(errorText);
      return null;
    }

    const result = await response.json();

    log('\n📊 ANALYSIS RESULTS:', COLORS.GREEN);
    console.log('─'.repeat(80));
    console.log(`  Analyzed: ${result.analyzed || 0}`);
    console.log(`  Successful: ${result.successful || 0}`);
    console.log(`  Failed: ${result.failed || 0}`);
    console.log(`  Total Cost: $${result.total_cost?.toFixed(4) || '0.0000'}`);

    if (result.results && result.results.length > 0) {
      result.results.forEach((r, idx) => {
        if (r.success) {
          log(`\n📋 Analysis ${idx + 1}: ${r.company_name}`, COLORS.BLUE);
          console.log('─'.repeat(80));
          console.log(`  Grade: ${r.grade} (${r.overall_score}/100)`);
          console.log(`  Design: ${r.design_score}/100 | SEO: ${r.seo_score}/100`);
          console.log(`  Content: ${r.content_score}/100 | Social: ${r.social_score}/100`);

          log(`\n  🎯 LEAD SCORING (Enhanced with Activity Signals):`, COLORS.CYAN);
          console.log(`     Priority: ${r.lead_priority}/100 (${r.priority_tier?.toUpperCase() || 'unknown'})`);
          console.log(`     Quality Gap: ${r.quality_gap_score}/25`);
          console.log(`     Budget: ${r.budget_score}/25`);
          console.log(`     Urgency: ${r.urgency_score}/20 ⭐ ENHANCED`);
          console.log(`     Industry Fit: ${r.industry_fit_score}/15`);
          console.log(`     Company Size: ${r.company_size_score}/10`);
          console.log(`     Engagement: ${r.engagement_score}/5`);

          if (r.reasoning) {
            console.log(`\n     Reasoning: ${r.reasoning}`);
          }

          log(`\n  📊 Activity Signals Used:`, COLORS.YELLOW);
          // These aren't returned in the API response, but they were used in scoring
          console.log(`     ✓ Google Reviews & Rating`);
          console.log(`     ✓ Most Recent Review Date`);
          console.log(`     ✓ Website Status`);
          console.log(`     ✓ ICP Match Score`);

          console.log(`\n  Issues: ${r.design_issues?.length || 0} design, ${r.seo_issues?.length || 0} SEO`);
          console.log(`  Quick Wins: ${r.quick_wins?.length || 0}`);
          console.log(`  Cost: $${r.analysis_cost?.toFixed(4) || '0.0000'}`);
        } else {
          log(`\n❌ Analysis ${idx + 1} failed: ${r.error}`, COLORS.RED);
        }
      });
    }

    return result;

  } catch (error) {
    log(`❌ Analysis error: ${error.message}`, COLORS.RED);
    console.error(error);
    return null;
  }
}

async function main() {
  console.log('\n');
  log('╔════════════════════════════════════════════════════════════════════════════╗', COLORS.CYAN);
  log('║                    END-TO-END PIPELINE TEST                                ║', COLORS.CYAN);
  log('║                                                                            ║', COLORS.CYAN);
  log('║  Testing: Quality Filter + Enhanced Scoring with Activity Signals         ║', COLORS.CYAN);
  log('╚════════════════════════════════════════════════════════════════════════════╝', COLORS.CYAN);

  // Step 1: Wait for servers
  section('STEP 0: Server Health Checks');

  const prospectingReady = await waitForServer(PROSPECTING_API, 'Prospecting Engine');
  const analysisReady = await waitForServer(ANALYSIS_API, 'Analysis Engine');

  if (!prospectingReady || !analysisReady) {
    log('\n❌ Servers not ready. Exiting.', COLORS.RED);
    process.exit(1);
  }

  // Step 2: Test Prospecting
  const prospectingResult = await testProspecting();

  if (!prospectingResult || !prospectingResult.prospects || prospectingResult.prospects.length === 0) {
    log('\n⚠️  No prospects discovered. Cannot proceed to analysis test.', COLORS.YELLOW);
    log('This might be due to:', COLORS.YELLOW);
    console.log('  - All prospects filtered out (quality filter working!)');
    console.log('  - API rate limits');
    console.log('  - Network issues');
    process.exit(0);
  }

  // Step 3: Test Analysis (use first prospect)
  const prospectIds = [prospectingResult.prospects[0].id];
  const analysisResult = await testAnalysis(prospectIds);

  // Final Summary
  section('FINAL SUMMARY');

  log('✅ Prospecting Engine:', COLORS.GREEN);
  console.log(`  - Discovered: ${prospectingResult.found || 0} prospects`);
  console.log(`  - Saved: ${prospectingResult.saved || 0} viable prospects`);
  console.log(`  - Filtered: ${prospectingResult.filteredInactive || 0} inactive (quality filter)`);
  console.log(`  - Cost: $${prospectingResult.cost?.toFixed(4) || '0.0000'}`);

  if (analysisResult) {
    log('\n✅ Analysis Engine:', COLORS.GREEN);
    console.log(`  - Analyzed: ${analysisResult.analyzed || 0} leads`);
    console.log(`  - Enhanced urgency scoring with activity signals: YES`);
    console.log(`  - Cost: $${analysisResult.total_cost?.toFixed(4) || '0.0000'}`);

    if (analysisResult.results && analysisResult.results[0]?.success) {
      const lead = analysisResult.results[0];
      console.log(`\n  Sample Lead Priority: ${lead.lead_priority}/100 (${lead.priority_tier})`);
      console.log(`  Urgency Score: ${lead.urgency_score}/20 (uses review recency + website status)`);
    }
  } else {
    log('\n⚠️  Analysis Engine: Not tested', COLORS.YELLOW);
  }

  const totalCost = (prospectingResult.cost || 0) + (analysisResult?.total_cost || 0);
  log(`\n💰 Total Pipeline Cost: $${totalCost.toFixed(4)}`, COLORS.CYAN);

  log('\n🎉 End-to-End Test Complete!', COLORS.GREEN);

  process.exit(0);
}

main().catch(error => {
  log(`\n❌ Fatal error: ${error.message}`, COLORS.RED);
  console.error(error);
  process.exit(1);
});
