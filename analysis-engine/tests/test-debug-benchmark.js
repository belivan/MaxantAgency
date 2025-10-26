/**
 * Debug Test - Trace Benchmark Data Flow
 */

process.env.USE_BENCHMARK_CONTEXT = 'true';
process.env.USE_AI_GRADING = 'true';

console.log('🔍 BENCHMARK DEBUG TEST\n');
console.log('Environment:');
console.log('  USE_BENCHMARK_CONTEXT:', process.env.USE_BENCHMARK_CONTEXT);
console.log('  USE_AI_GRADING:', process.env.USE_AI_GRADING);
console.log('\n---\n');

import { analyzeWebsiteIntelligent } from '../orchestrator-refactored.js';

// Small test site for faster execution
const result = await analyzeWebsiteIntelligent('https://example.com', {
  company_name: 'Test Company',
  industry: 'test'
});

console.log('\n📊 RESULT ANALYSIS:\n');
console.log('Result keys:', Object.keys(result).filter(k => k.includes('bench')));
console.log('matched_benchmark value:', result.matched_benchmark);
console.log('matched_benchmark type:', typeof result.matched_benchmark);

if (result.matched_benchmark) {
  console.log('\n✅ BENCHMARK DATA FOUND:');
  console.log(JSON.stringify(result.matched_benchmark, null, 2));
} else {
  console.log('\n❌ NO BENCHMARK DATA IN RESULT');
}
