/**
 * Verify Benchmark Strengths
 * Quick script to check if strength data was populated
 */

import { getBenchmarkByUrl } from '../database/supabase-client.js';

const benchmark = await getBenchmarkByUrl('https://www.dolandental.com/');

if (!benchmark) {
  console.log('❌ Benchmark not found');
  process.exit(1);
}

console.log('📊 Dolan Dental Benchmark Data:');
console.log('================================\n');
console.log('Company:', benchmark.company_name);
console.log('URL:', benchmark.website_url);
console.log('Overall Score:', benchmark.overall_score);
console.log('');

console.log('Strength Fields Status:');
console.log('  Design Strengths:', benchmark.design_strengths ? '✅ Present' : '❌ NULL');
console.log('  SEO Strengths:', benchmark.seo_strengths ? '✅ Present' : '❌ NULL');
console.log('  Content Strengths:', benchmark.content_strengths ? '✅ Present' : '❌ NULL');
console.log('  Social Strengths:', benchmark.social_strengths ? '✅ Present' : '❌ NULL');
console.log('  Accessibility Strengths:', benchmark.accessibility_strengths ? '✅ Present' : '❌ NULL');
console.log('');

if (benchmark.design_strengths) {
  console.log('🎨 Design Strengths Summary:');
  const ds = benchmark.design_strengths;
  if (ds.desktopStrengths) {
    console.log(`  Desktop: ${ds.desktopStrengths.length} strengths`);
    ds.desktopStrengths.slice(0, 2).forEach(s => {
      console.log(`    - ${s.technique}`);
    });
  }
  if (ds.mobileStrengths) {
    console.log(`  Mobile: ${ds.mobileStrengths.length} strengths`);
  }
  console.log('');
}

if (benchmark.seo_strengths) {
  console.log('🔍 SEO Strengths:');
  if (Array.isArray(benchmark.seo_strengths)) {
    console.log(`  Found ${benchmark.seo_strengths.length} SEO strengths`);
    benchmark.seo_strengths.slice(0, 2).forEach((s, idx) => {
      const display = s.strategy || s.technique || s.title || JSON.stringify(s).substring(0, 40);
      console.log(`    ${idx + 1}. ${display}`);
    });
  } else {
    console.log('  (Structured data present)');
  }
  console.log('');
}

if (benchmark.content_strengths) {
  console.log('✍️  Content Strengths:');
  if (Array.isArray(benchmark.content_strengths)) {
    console.log(`  Found ${benchmark.content_strengths.length} content strengths`);
    benchmark.content_strengths.slice(0, 2).forEach((s, idx) => {
      const display = s.strategy || s.technique || s.title || JSON.stringify(s).substring(0, 40);
      console.log(`    ${idx + 1}. ${display}`);
    });
  } else {
    console.log('  (Structured data present)');
  }
  console.log('');
}

console.log('✅ Verification complete!');
console.log('');

// Count how many strengths are populated
const strengthCount = [
  benchmark.design_strengths,
  benchmark.seo_strengths,
  benchmark.content_strengths,
  benchmark.social_strengths,
  benchmark.accessibility_strengths
].filter(s => s !== null).length;

console.log(`📊 Total: ${strengthCount}/5 strength categories populated`);

if (strengthCount >= 3) {
  console.log('✅ Sufficient strength data for report display!');
} else {
  console.log('⚠️  May need more strength data for optimal report display');
}
