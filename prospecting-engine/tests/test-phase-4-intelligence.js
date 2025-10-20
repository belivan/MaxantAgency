/**
 * Phase 4 Intelligence Layer Test
 *
 * Tests the AI-powered components with fallback modes
 */

import { understandQuery } from '../validators/query-understanding.js';
import { checkRelevance } from '../validators/relevance-checker.js';

console.log('\n========================================');
console.log('🧪 PHASE 4: INTELLIGENCE LAYER TEST');
console.log('========================================\n');

async function testQueryUnderstanding() {
  console.log('📋 Test 1: Query Understanding\n');

  const testBriefs = [
    {
      industry: 'Italian Restaurants',
      city: 'Philadelphia',
      target: 'High-quality Italian restaurants with outdoor seating'
    },
    {
      industry: 'Plumbing',
      city: 'Philadelphia',
      target: 'Emergency residential plumbers 24/7'
    },
    {
      industry: 'Family Law',
      city: 'Philadelphia',
      target: 'Divorce and custody attorneys'
    }
  ];

  for (const brief of testBriefs) {
    try {
      console.log(`   Input: "${brief.target}"`);
      const query = await understandQuery(brief);
      console.log(`   Output: "${query}"`);
      console.log(`   ✅ Success\n`);
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}\n`);
    }
  }
}

async function testRelevanceScoring() {
  console.log('\n📊 Test 2: ICP Relevance Scoring\n');

  const brief = {
    industry: 'Italian Restaurants',
    city: 'Philadelphia',
    target: 'High-quality Italian restaurants',
    icp: {
      niches: ['restaurants', 'italian food', 'dining']
    }
  };

  const testProspects = [
    {
      company_name: 'Vetri Cucina',
      industry: 'Restaurant',
      city: 'Philadelphia',
      state: 'PA',
      google_rating: 4.6,
      google_review_count: 500,
      description: 'Upscale Italian restaurant with seasonal tasting menus',
      services: ['Fine dining', 'Catering', 'Private events'],
      website_status: 'active',
      contact_email: 'info@vetricucina.com',
      contact_phone: '(215) 555-0100',
      social_profiles: {
        instagram: 'https://instagram.com/vetricucina',
        facebook: 'https://facebook.com/vetricucina',
        linkedin: 'https://linkedin.com/company/vetri-cucina'
      }
    },
    {
      company_name: 'Joe\'s Pizza Shop',
      industry: 'Restaurant',
      city: 'Philadelphia',
      state: 'PA',
      google_rating: 3.8,
      google_review_count: 45,
      description: null,
      services: null,
      website_status: 'timeout',
      contact_email: null,
      contact_phone: '(215) 555-0200',
      social_profiles: {}
    },
    {
      company_name: 'Tokyo Sushi Bar',
      industry: 'Japanese Restaurant',
      city: 'Philadelphia',
      state: 'PA',
      google_rating: 4.5,
      google_review_count: 320,
      description: 'Fresh sushi and Japanese cuisine',
      services: ['Dine-in', 'Takeout', 'Delivery'],
      website_status: 'active',
      contact_email: 'hello@tokyosushi.com',
      contact_phone: '(215) 555-0300',
      social_profiles: {
        instagram: 'https://instagram.com/tokyosushi'
      }
    }
  ];

  console.log(`   ICP: ${brief.industry} in ${brief.city}\n`);

  for (const prospect of testProspects) {
    try {
      console.log(`   Testing: ${prospect.company_name}`);
      console.log(`   - Industry: ${prospect.industry}`);
      console.log(`   - Rating: ${prospect.google_rating}/5.0`);
      console.log(`   - Website: ${prospect.website_status}`);

      const result = await checkRelevance(prospect, brief);

      console.log(`   - ICP Score: ${result.score}/100`);
      console.log(`   - Relevant: ${result.isRelevant ? 'YES ✅' : 'NO ❌'}`);
      console.log(`   - Reasoning: ${result.reasoning}`);

      if (result.breakdown) {
        console.log(`   - Breakdown:`);
        console.log(`     • Industry Match: ${result.breakdown.industryMatch}`);
        console.log(`     • Location Match: ${result.breakdown.locationMatch}`);
        console.log(`     • Quality Score: ${result.breakdown.qualityScore}`);
        console.log(`     • Presence Score: ${result.breakdown.presenceScore}`);
        console.log(`     • Data Score: ${result.breakdown.dataScore}`);
      }

      console.log('');
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}\n`);
    }
  }
}

async function runTests() {
  try {
    console.log('🚀 Testing AI intelligence layer with fallback systems\n');
    console.log('Note: Tests will use rule-based fallbacks if API keys not set\n');
    console.log('========================================\n');

    await testQueryUnderstanding();
    await testRelevanceScoring();

    console.log('========================================');
    console.log('✅ PHASE 4 INTELLIGENCE TESTS COMPLETE!');
    console.log('========================================\n');

    console.log('💡 Key Takeaways:');
    console.log('   • Query Understanding: Optimizes search queries for Google Maps');
    console.log('   • Relevance Scoring: Rates prospects 0-100 against ICP');
    console.log('   • Fallback Systems: Works even without API keys');
    console.log('   • Detailed Breakdown: Shows exactly why each score was given\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

runTests();
