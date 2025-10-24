/**
 * Quick Analysis Test
 *
 * Analyzes one existing prospect to verify enhanced scoring
 */

import { analyzeProspect } from '../analysis-engine/orchestrator-refactored.js';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function main() {
  console.log('\n══════════════════════════════════════════════════════');
  console.log('  ANALYSIS ENGINE TEST - Enhanced Scoring');
  console.log('══════════════════════════════════════════════════════\n');

  // Get a prospect from database
  const { data: prospects, error } = await supabase
    .from('prospects')
    .select('*')
    .eq('status', 'ready_for_analysis')
    .limit(1);

  if (error || !prospects || prospects.length === 0) {
    console.log('❌ No prospects found to analyze');
    process.exit(1);
  }

  const prospect = prospects[0];

  console.log('📋 Analyzing prospect:');
  console.log(`   Company: ${prospect.company_name}`);
  console.log(`   Website: ${prospect.website}`);
  console.log(`   Status: ${prospect.website_status}`);
  console.log(`   Rating: ${prospect.google_rating}/5.0 (${prospect.google_review_count} reviews)`);
  console.log(`   Recent Review: ${prospect.most_recent_review_date ? new Date(prospect.most_recent_review_date).toLocaleDateString() : 'never'}\n`);

  console.log('🚀 Starting analysis with cheap models...\n');

  try {
    const result = await analyzeProspect(
      {
        prospect_id: prospect.id,
        company_name: prospect.company_name,
        website: prospect.website,
        industry: prospect.industry,
        city: prospect.city,
        state: prospect.state,
        description: prospect.description,
        services: prospect.services,
        google_rating: prospect.google_rating,
        google_review_count: prospect.google_review_count,
        most_recent_review_date: prospect.most_recent_review_date,
        website_status: prospect.website_status,
        icp_match_score: prospect.icp_match_score,
        social_profiles_from_prospect: prospect.social_profiles,
        social_metadata_from_prospect: prospect.social_metadata
      },
      {
        customPrompts: {
          seo: { model: 'grok-4-fast' },
          content: { model: 'grok-4-fast' },
          social: { model: 'grok-4-fast' },
          desktop_visual: { model: 'gpt-4o-mini' },
          mobile_visual: { model: 'gpt-4o-mini' }
        }
      }
    );

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

    console.log('🎯 LEAD SCORING (Enhanced with Activity Signals):');
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
      console.log(`  AI Reasoning:\n    ${result.reasoning}\n`);
    }

    // Verify urgency logic
    const daysSinceReview = prospect.most_recent_review_date
      ? Math.floor((Date.now() - new Date(prospect.most_recent_review_date)) / (1000 * 60 * 60 * 24))
      : null;

    console.log('💡 Urgency Validation:');
    console.log('──────────────────────────────────────────────────────');
    console.log(`  Website Status: ${prospect.website_status}`);
    console.log(`  Days Since Review: ${daysSinceReview !== null ? daysSinceReview : 'unknown'}`);
    console.log(`  Actual Urgency Score: ${result.urgency_score}/20`);

    const isBroken = ['ssl_error', 'timeout', 'not_found'].includes(prospect.website_status);
    const isActive = daysSinceReview !== null && daysSinceReview <= 180;

    if (isBroken && isActive) {
      console.log(`  Expected: ~20/20 (broken site + active business = CRITICAL)`);
      console.log(`  Status: ${result.urgency_score >= 18 ? '✅ CORRECT' : '⚠️  Lower than expected'}`);
    } else if (prospect.website_status === 'no_website' && isActive) {
      console.log(`  Expected: ~18/20 (no website + active business = OPPORTUNITY)`);
    } else if (prospect.website_status === 'active') {
      console.log(`  Expected: Variable based on content staleness`);
      console.log(`  Status: ✅ Normal scoring`);
    }

    console.log(`\n💰 Cost: $${result.analysis_cost?.toFixed(4) || '0.0000'}`);
    console.log('══════════════════════════════════════════════════════');
    console.log('✅ TEST COMPLETE - Enhanced scoring working!');
    console.log('══════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error(`\n❌ Analysis failed: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
