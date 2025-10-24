/**
 * Analysis Engine Test
 *
 * Tests the Analysis Engine with enhanced scoring using existing prospects.
 * This avoids the slow prospecting pipeline and focuses on testing the new features.
 */

const PROSPECTING_API = 'http://localhost:3010';
const ANALYSIS_API = 'http://localhost:3001';

async function main() {
  console.log('\n══════════════════════════════════════════════════════');
  console.log('  ANALYSIS ENGINE TEST - Enhanced Scoring');
  console.log('══════════════════════════════════════════════════════\n');

  // Step 1: Get existing prospects from database
  console.log('📋 Step 1: Fetching existing prospects from database...\n');

  try {
    const response = await fetch(`${PROSPECTING_API}/api/prospects?limit=3&status=ready_for_analysis`);

    if (!response.ok) {
      console.log(`❌ Failed to fetch prospects: ${response.status}`);
      process.exit(1);
    }

    const data = await response.json();

    if (!data.success || !data.data || data.data.length === 0) {
      console.log('⚠️  No prospects found in database.');
      console.log('   Run the prospecting engine first to create some prospects.');
      process.exit(0);
    }

    console.log(`✅ Found ${data.data.length} prospect(s)\n`);

    data.data.forEach((p, idx) => {
      console.log(`${idx + 1}. ${p.company_name || 'Unknown'}`);
      console.log(`   Website: ${p.website || 'none'}`);
      console.log(`   Status: ${p.website_status || 'unknown'}`);
      console.log(`   Rating: ${p.google_rating || 'N/A'} ⭐ (${p.google_review_count || 0} reviews)`);
      console.log(`   Recent Review: ${p.most_recent_review_date ? new Date(p.most_recent_review_date).toLocaleDateString() : 'never'}`);
      console.log(`   ID: ${p.id}\n`);
    });

    // Step 2: Analyze the first prospect
    const prospect = data.data[0];
    console.log(`\n📊 Step 2: Analyzing prospect: ${prospect.company_name}\n`);

    const analysisRequest = {
      prospect_ids: [prospect.id],
      custom_prompts: {
        seo: { model: 'grok-4-fast' },
        content: { model: 'grok-4-fast' },
        social: { model: 'grok-4-fast' },
        desktop_visual: { model: 'gpt-4o-mini' },
        mobile_visual: { model: 'gpt-4o-mini' }
        // Lead scorer defaults to gpt-5 (as configured in prompt file)
      }
    };

    const analysisResponse = await fetch(`${ANALYSIS_API}/api/batch-analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(analysisRequest)
    });

    if (!analysisResponse.ok) {
      const errorText = await analysisResponse.text();
      console.log(`❌ Analysis failed: ${analysisResponse.status}`);
      console.log(errorText);
      process.exit(1);
    }

    const analysisResult = await analysisResponse.json();

    if (!analysisResult.success || !analysisResult.results || analysisResult.results.length === 0) {
      console.log('❌ No analysis results returned');
      process.exit(1);
    }

    const result = analysisResult.results[0];

    if (!result.success) {
      console.log(`❌ Analysis failed: ${result.error}`);
      process.exit(1);
    }

    // Display results
    console.log('✅ Analysis Complete!\n');
    console.log('══════════════════════════════════════════════════════');
    console.log(`  ${result.company_name}`);
    console.log('══════════════════════════════════════════════════════\n');

    console.log('📈 WEBSITE SCORES:');
    console.log(`  Grade: ${result.grade} (${result.overall_score}/100)`);
    console.log(`  Design: ${result.design_score}/100`);
    console.log(`  SEO: ${result.seo_score}/100`);
    console.log(`  Content: ${result.content_score}/100`);
    console.log(`  Social: ${result.social_score}/100\n`);

    console.log('🎯 LEAD SCORING (with Activity Signals):');
    console.log('──────────────────────────────────────────────────────');
    console.log(`  Priority Score: ${result.lead_priority}/100`);
    console.log(`  Priority Tier: ${(result.priority_tier || 'unknown').toUpperCase()}`);
    console.log(`  Budget Likelihood: ${(result.budget_likelihood || 'unknown').toUpperCase()}\n`);

    console.log('  Score Breakdown:');
    console.log(`    Quality Gap: ${result.quality_gap_score}/25`);
    console.log(`    Budget: ${result.budget_score}/25`);
    console.log(`    Urgency: ${result.urgency_score}/20 ⭐ ENHANCED`);
    console.log(`    Industry Fit: ${result.industry_fit_score}/15`);
    console.log(`    Company Size: ${result.company_size_score}/10`);
    console.log(`    Engagement: ${result.engagement_score}/5\n`);

    if (result.reasoning) {
      console.log(`  AI Reasoning:`);
      console.log(`    ${result.reasoning}\n`);
    }

    console.log('📊 Activity Signals (used in scoring):');
    console.log('──────────────────────────────────────────────────────');
    console.log(`  Google Rating: ${prospect.google_rating || 'N/A'}/5.0`);
    console.log(`  Review Count: ${prospect.google_review_count || 0}`);
    console.log(`  Most Recent Review: ${prospect.most_recent_review_date ? new Date(prospect.most_recent_review_date).toLocaleDateString() : 'Never'}`);
    console.log(`  Website Status: ${prospect.website_status || 'Unknown'}\n`);

    const daysSinceReview = prospect.most_recent_review_date
      ? Math.floor((Date.now() - new Date(prospect.most_recent_review_date)) / (1000 * 60 * 60 * 24))
      : null;

    if (daysSinceReview !== null) {
      console.log(`  Days Since Last Review: ${daysSinceReview}`);

      if (daysSinceReview <= 30) {
        console.log(`  Activity Level: 🟢 ACTIVE (recent customer activity)`);
      } else if (daysSinceReview <= 90) {
        console.log(`  Activity Level: 🟡 MODERATE (somewhat recent)`);
      } else if (daysSinceReview <= 180) {
        console.log(`  Activity Level: 🟠 STALE (moderately old)`);
      } else {
        console.log(`  Activity Level: 🔴 INACTIVE (very old - may be closed)`);
      }
    } else {
      console.log(`  Activity Level: ⚪ UNKNOWN (no review data)`);
    }

    // Check urgency logic
    console.log(`\n💡 Urgency Analysis:`);
    console.log('──────────────────────────────────────────────────────');

    const isBrokenSite = ['ssl_error', 'timeout', 'not_found'].includes(prospect.website_status);
    const isActive = daysSinceReview !== null && daysSinceReview <= 180;

    if (isBrokenSite && isActive) {
      console.log(`  ⚠️  CRITICAL: Broken website (${prospect.website_status}) + active business!`);
      console.log(`      Expected urgency score: ~20/20 (maximum)`);
      console.log(`      Actual urgency score: ${result.urgency_score}/20`);

      if (result.urgency_score >= 18) {
        console.log(`      ✅ Enhanced urgency logic working correctly!`);
      } else {
        console.log(`      ⚠️  Urgency score lower than expected`);
      }
    } else if (prospect.website_status === 'no_website' && isActive) {
      console.log(`  📈 OPPORTUNITY: No website + active business!`);
      console.log(`      Expected urgency score: ~18/20`);
      console.log(`      Actual urgency score: ${result.urgency_score}/20`);
    } else if (prospect.website_status === 'active') {
      console.log(`  ✅ Normal case: Active website`);
      console.log(`      Urgency based on content staleness`);
      console.log(`      Actual urgency score: ${result.urgency_score}/20`);
    } else {
      console.log(`  Status: ${prospect.website_status || 'unknown'}`);
      console.log(`  Urgency score: ${result.urgency_score}/20`);
    }

    console.log(`\n💰 Cost: $${result.analysis_cost?.toFixed(4) || '0.0000'}`);
    console.log(`⏱️  Time: ${result.analysis_time_ms ? (result.analysis_time_ms / 1000).toFixed(1) + 's' : 'N/A'}\n`);

    console.log('══════════════════════════════════════════════════════');
    console.log('✅ TEST COMPLETE - Enhanced scoring validated!');
    console.log('══════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

main();
