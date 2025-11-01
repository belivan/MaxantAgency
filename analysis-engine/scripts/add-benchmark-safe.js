/**
 * Safe Benchmark Addition Script
 *
 * Processes benchmarks ONE AT A TIME with delays to prevent Supabase overload
 * Uses the new database queue system for controlled concurrent requests
 */

import { analyzeBenchmark } from '../services/benchmark-analyzer.js';
import { getBenchmarkByUrl } from '../database/supabase-client.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '../../.env') });

// Benchmarks to add (add more as needed)
const BENCHMARKS_TO_ADD = [
  {
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
  }
];

/**
 * Sleep utility
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Add a single benchmark with full error handling
 */
async function addBenchmarkSafely(benchmarkData) {
  console.log('\n' + '='.repeat(80));
  console.log(`📊 PROCESSING BENCHMARK: ${benchmarkData.company_name}`);
  console.log(`   URL: ${benchmarkData.website_url}`);
  console.log(`   Industry: ${benchmarkData.industry}`);
  console.log('='.repeat(80) + '\n');

  try {
    // Check if already exists
    console.log('🔍 Checking if benchmark already exists...');
    const existing = await getBenchmarkByUrl(benchmarkData.website_url);

    if (existing) {
      console.log('\n⏭️  BENCHMARK ALREADY EXISTS');
      console.log(`   ID: ${existing.id}`);
      console.log(`   Industry: ${existing.industry}`);
      console.log(`   Score: ${existing.overall_score}/100 (Grade ${existing.website_grade})`);
      console.log(`   Analyzed: ${existing.analyzed_at}`);
      console.log('\n💡 To re-analyze, use force=true option');
      return { success: true, existed: true, benchmark: existing };
    }

    console.log('✅ Benchmark does not exist. Starting analysis...\n');

    // Analyze benchmark (this includes crawling, screenshots, AI analysis)
    const result = await analyzeBenchmark(
      benchmarkData,
      {
        force: false,
        verbose: true
      },
      (progress) => {
        console.log(`   [${progress.step}] ${progress.message}`);
      }
    );

    if (result.success && result.benchmark) {
      console.log('\n✅ BENCHMARK ADDED SUCCESSFULLY');
      console.log(`   ID: ${result.benchmark.id}`);
      console.log(`   Industry: ${result.benchmark.industry}`);
      console.log(`   Overall Score: ${result.benchmark.overall_score}/100`);
      console.log(`   Grade: ${result.benchmark.website_grade}`);
      console.log(`   Design Score: ${result.benchmark.design_score}`);
      console.log(`   SEO Score: ${result.benchmark.seo_score}`);
      return { success: true, existed: false, benchmark: result.benchmark };
    } else {
      console.error('\n❌ ANALYSIS FAILED');
      console.error(`   Error: ${result.error || 'Unknown error'}`);
      return { success: false, error: result.error || 'Unknown error' };
    }
  } catch (error) {
    console.error('\n❌ ERROR PROCESSING BENCHMARK');
    console.error(`   Message: ${error.message}`);
    console.error(`   Stack: ${error.stack}`);
    return { success: false, error: error.message };
  }
}

/**
 * Process all benchmarks sequentially
 */
async function main() {
  console.log('\n🚀 SAFE BENCHMARK ADDITION');
  console.log('='.repeat(80));
  console.log(`Processing ${BENCHMARKS_TO_ADD.length} benchmark(s) sequentially with delays`);
  console.log('Database queue is enabled for controlled request concurrency');
  console.log('Screenshot uploads are batched (5 at a time)');
  console.log('='.repeat(80) + '\n');

  const results = [];
  const DELAY_BETWEEN_BENCHMARKS_MS = 5000; // 5 seconds between benchmarks

  for (let i = 0; i < BENCHMARKS_TO_ADD.length; i++) {
    const benchmark = BENCHMARKS_TO_ADD[i];
    const benchmarkNum = i + 1;
    const totalBenchmarks = BENCHMARKS_TO_ADD.length;

    console.log(`\n[${'█'.repeat(benchmarkNum)}${'░'.repeat(totalBenchmarks - benchmarkNum)}] Benchmark ${benchmarkNum}/${totalBenchmarks}`);

    const result = await addBenchmarkSafely(benchmark);
    results.push({ ...benchmark, ...result });

    // Add delay between benchmarks (except after last one)
    if (i < BENCHMARKS_TO_ADD.length - 1) {
      console.log(`\n⏱️  Waiting ${DELAY_BETWEEN_BENCHMARKS_MS / 1000} seconds before next benchmark...`);
      await sleep(DELAY_BETWEEN_BENCHMARKS_MS);
    }
  }

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 FINAL SUMMARY');
  console.log('='.repeat(80));

  const added = results.filter(r => r.success && !r.existed).length;
  const skipped = results.filter(r => r.existed).length;
  const failed = results.filter(r => !r.success).length;

  console.log(`\n✅ Successfully Added: ${added}`);
  console.log(`⏭️  Skipped (already exist): ${skipped}`);
  console.log(`❌ Failed: ${failed}`);

  if (added > 0) {
    console.log('\n📋 Added Benchmarks:');
    results.filter(r => r.success && !r.existed).forEach(r => {
      console.log(`   • ${r.company_name} - Grade ${r.benchmark.website_grade} (${r.benchmark.overall_score}/100)`);
    });
  }

  if (skipped > 0) {
    console.log('\n⏭️  Skipped Benchmarks:');
    results.filter(r => r.existed).forEach(r => {
      console.log(`   • ${r.company_name} (already exists)`);
    });
  }

  if (failed > 0) {
    console.log('\n❌ Failed Benchmarks:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`   • ${r.company_name}: ${r.error}`);
    });
  }

  console.log('\n✅ Script completed!');
  console.log('\n💡 Next steps:');
  console.log('   - Run industry coverage analysis: node scripts/analyze-industry-coverage.js');
  console.log('   - Verify benchmarks in database');
  console.log('   - Test AI grading with new benchmarks');

  // Exit with appropriate code
  process.exit(failed > 0 ? 1 : 0);
}

// Run script
main().catch(err => {
  console.error('\n❌ FATAL ERROR:', err);
  console.error(err.stack);
  process.exit(1);
});
