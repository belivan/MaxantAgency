/**
 * Add benchmarks for Restaurant and Technology industries
 */
import { analyzeBenchmark } from '../services/benchmark-analyzer.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '../../.env') });

const BENCHMARKS_TO_ADD = [
  // Restaurant
  {
    company_name: 'The Charles',
    website_url: 'https://www.thecharlesct.com/',
    industry: 'Restaurant',  // Match the leads table capitalization
    industry_subcategory: 'fine-dining-american',
    location_city: 'Wethersfield',
    location_state: 'CT',
    benchmark_tier: 'regional',
    source: 'manual',
    google_rating: 4.8,
    google_review_count: 300,
    notes: 'Award-winning fine dining, CT Magazine & Hartford Magazine winner'
  },
  // Technology
  {
    company_name: 'Intercom',
    website_url: 'https://www.intercom.com/',
    industry: 'technology',  // Match the leads table (lowercase for tech)
    industry_subcategory: 'saas-customer-support',
    location_city: 'San Francisco',
    location_state: 'CA',
    benchmark_tier: 'national',
    source: 'manual',
    google_rating: 4.5,
    google_review_count: 1200,
    notes: 'Leading SaaS company, excellent website design and UX'
  }
];

async function addBenchmark(benchmarkData) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`📊 ADDING BENCHMARK: ${benchmarkData.company_name}`);
  console.log(`   URL: ${benchmarkData.website_url}`);
  console.log(`   Industry: ${benchmarkData.industry}`);
  console.log(`${'='.repeat(80)}\n`);

  try {
    const result = await analyzeBenchmark(
      benchmarkData,
      {
        force: false // Skip if already exists
      },
      (progress) => {
        console.log(`   [${progress.step}] ${progress.message}`);
      }
    );

    if (result.existed) {
      console.log(`\n⏭️  SKIPPED (already exists)`);
      console.log(`   ID: ${result.benchmark.id}`);
      return { success: true, existed: true };
    }

    console.log(`\n✅ BENCHMARK ADDED`);
    console.log(`   ID: ${result.benchmark.id}`);
    console.log(`   Score: ${result.benchmark.overall_score}/100 (Grade ${result.benchmark.website_grade})`);
    return { success: true, existed: false };
  } catch (error) {
    console.error(`\n❌ FAILED: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('\n🚀 Adding Missing Industry Benchmarks\n');

  const results = [];

  for (const benchmark of BENCHMARKS_TO_ADD) {
    const result = await addBenchmark(benchmark);
    results.push({ ...benchmark, ...result });
  }

  console.log('\n' + '='.repeat(80));
  console.log('📊 SUMMARY');
  console.log('='.repeat(80));

  const added = results.filter(r => r.success && !r.existed).length;
  const skipped = results.filter(r => r.existed).length;
  const failed = results.filter(r => !r.success).length;

  console.log(`✅ Added: ${added}`);
  console.log(`⏭️  Skipped (already exist): ${skipped}`);
  console.log(`❌ Failed: ${failed}`);

  if (failed > 0) {
    console.log('\n❌ Failed benchmarks:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`  - ${r.company_name}: ${r.error}`);
    });
  }

  console.log('\n✅ Done! Re-run industry coverage analysis to verify:');
  console.log('   node scripts/analyze-industry-coverage.js');
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('\n❌ Fatal error:', err);
    process.exit(1);
  });
