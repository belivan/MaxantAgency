/**
 * Quick test script to run prospecting for leads
 */

import { runProspectingPipeline } from './orchestrator.js';
import dotenv from 'dotenv';

dotenv.config();

console.log('═══════════════════════════════════════════════════════════════════');
console.log('🔍 PROSPECTING ENGINE - QUICK TEST');
console.log('═══════════════════════════════════════════════════════════════════\n');

// Define ICP brief for restaurants in Philadelphia
const brief = {
  industry: 'Restaurants',
  location: 'Philadelphia, PA',
  searchQuery: 'restaurants in Philadelphia',
  targetCount: 5,
  description: 'Find high-quality restaurants in Philadelphia that need better websites'
};

const options = {
  maxResults: 5,
  skipSocialScraping: true, // Skip for speed
  verifyWebsites: true
};

console.log('📋 ICP Brief:');
console.log('   Industry:', brief.industry);
console.log('   Location:', brief.location);
console.log('   Target:', brief.targetCount, 'leads');
console.log('');

try {
  const results = await runProspectingPipeline(brief, options);

  console.log('\n═══════════════════════════════════════════════════════════════════');
  console.log('📊 RESULTS');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('✅ Found:', results.found, 'companies');
  console.log('✅ Verified:', results.verified, 'websites');
  console.log('✅ Saved:', results.saved, 'prospects');
  console.log('⏱️  Duration:', results.duration);
  console.log('💰 Total cost: $' + (results.totalCost || 0).toFixed(4));

  if (results.prospects && results.prospects.length > 0) {
    console.log('\n🎯 Sample prospects:');
    results.prospects.slice(0, 3).forEach((p, i) => {
      console.log(`   ${i + 1}. ${p.company_name}`);
      console.log(`      Website: ${p.website || 'N/A'}`);
      console.log(`      Rating: ${p.google_rating || 'N/A'} stars`);
    });
  }

  console.log('\n✅ Prospecting complete!');
  process.exit(0);

} catch (error) {
  console.error('\n❌ Error:', error.message);
  console.error(error.stack);
  process.exit(1);
}
