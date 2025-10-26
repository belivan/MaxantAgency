/**
 * Direct Test of Benchmark Matcher Service
 */

import { findBestBenchmark } from '../services/benchmark-matcher.js';

console.log('🧪 TESTING BENCHMARK MATCHER DIRECTLY\n');

const result = await findBestBenchmark({
  company_name: 'Test Restaurant',
  industry: 'restaurant',
  url: 'https://www.panerabread.com'
});

console.log('Result:', JSON.stringify(result, null, 2));

if (result.success) {
  console.log('\n✅ Benchmark matching works!');
  console.log('Matched:', result.benchmark.company_name);
} else {
  console.log('\n❌ No benchmark found');
  console.log('Error:', result.error);
}
