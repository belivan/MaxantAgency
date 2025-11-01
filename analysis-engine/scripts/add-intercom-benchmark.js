import { analyzeBenchmark } from '../services/benchmark-analyzer.js';
import { getBenchmarkByUrl } from '../database/supabase-client.js';

const INTERCOM_BENCHMARK = {
  company_name: 'Intercom',
  website_url: 'https://www.intercom.com/',
  industry: 'technology',
  industry_subcategory: 'saas-customer-support',
  location_city: 'San Francisco',
  location_state: 'CA',
  benchmark_tier: 'national',
  source: 'manual',
  google_rating: 4.5,
  google_review_count: 1200,
  notes: 'Leading SaaS company, excellent website design and UX'
};

async function addIntercom() {
  console.log('\n' + '='.repeat(80));
  console.log('📊 ADDING BENCHMARK: Intercom');
  console.log('   URL: https://www.intercom.com/');
  console.log('   Industry: technology');
  console.log('='.repeat(80) + '\n');

  // Check if already exists
  const existing = await getBenchmarkByUrl(INTERCOM_BENCHMARK.website_url);
  if (existing) {
    console.log('⚠️  Benchmark already exists:');
    console.log(`   ID: ${existing.id}`);
    console.log(`   Industry: ${existing.industry}`);
    console.log(`   Analyzed: ${existing.analyzed_at}`);
    console.log('\nℹ️  Use force=true to re-analyze');
    process.exit(0);
  }

  try {
    const result = await analyzeBenchmark(INTERCOM_BENCHMARK, { force: false });

    if (result.success && result.benchmark) {
      console.log('\n✅ BENCHMARK ADDED');
      console.log(`   ID: ${result.benchmark.id}`);
      console.log(`   Industry: ${result.benchmark.industry}`);
      console.log(`   Design Score: ${result.benchmark.design_score}`);
      console.log(`   SEO Score: ${result.benchmark.seo_score}`);
    } else {
      console.error('\n❌ FAILED:', result.error || 'Unknown error');
      console.error('Result:', JSON.stringify(result, null, 2));
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ ERROR analyzing benchmark:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

addIntercom();
