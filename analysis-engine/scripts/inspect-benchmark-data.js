/**
 * Inspect what data is available in benchmark analysis_results
 * to determine what social/accessibility extractors can use
 */

import { getBenchmarkByUrl } from '../database/supabase-client.js';

const benchmark = await getBenchmarkByUrl('https://www.dolandental.com/');

if (!benchmark) {
  console.log('❌ Benchmark not found');
  process.exit(1);
}

console.log('📊 Dolan Dental Benchmark Data Inspection');
console.log('=========================================\n');

const analysisResults = benchmark.analysis_results;

console.log('🔍 Top-level fields in analysis_results:');
console.log(Object.keys(analysisResults).sort().join(', '));
console.log('');

// Check for social-related data
console.log('📱 Social-related data:');
console.log('  social_analysis:', analysisResults.social_analysis ? '✅ Present' : '❌ Missing');
if (analysisResults.social_analysis) {
  console.log('    Fields:', Object.keys(analysisResults.social_analysis).join(', '));
  console.log('    Sample:', JSON.stringify(analysisResults.social_analysis).substring(0, 200) + '...');
}
console.log('  social_links:', analysisResults.social_links ? '✅ Present' : '❌ Missing');
console.log('  html_content:', analysisResults.html_content ? '✅ Present' : '❌ Missing');
console.log('');

// Check for accessibility-related data
console.log('♿ Accessibility-related data:');
console.log('  accessibility_analysis:', analysisResults.accessibility_analysis ? '✅ Present' : '❌ Missing');
if (analysisResults.accessibility_analysis) {
  console.log('    Fields:', Object.keys(analysisResults.accessibility_analysis).join(', '));
  console.log('    Sample:', JSON.stringify(analysisResults.accessibility_analysis).substring(0, 200) + '...');
}
console.log('  aria_attributes:', analysisResults.aria_attributes ? '✅ Present' : '❌ Missing');
console.log('  color_palette:', analysisResults.color_palette ? '✅ Present' : '❌ Missing');
console.log('');

// Check for crawl data
console.log('🕷️  Crawl data:');
console.log('  crawl_data:', analysisResults.crawl_data ? '✅ Present' : '❌ Missing');
if (analysisResults.crawl_data) {
  console.log('    Fields:', Object.keys(analysisResults.crawl_data).join(', '));
  if (analysisResults.crawl_data.pages && analysisResults.crawl_data.pages.length > 0) {
    const firstPage = analysisResults.crawl_data.pages[0];
    console.log('    Sample page fields:', Object.keys(firstPage).join(', '));
  }
}
console.log('');

// Check for screenshot data
console.log('📸 Screenshot data:');
console.log('  screenshot_desktop_url:', analysisResults.screenshot_desktop_url ? '✅ Present' : '❌ Missing');
console.log('  screenshot_mobile_url:', analysisResults.screenshot_mobile_url ? '✅ Present' : '❌ Missing');
console.log('  screenshots_manifest:', analysisResults.screenshots_manifest ? '✅ Present' : '❌ Missing');
if (analysisResults.screenshots_manifest) {
  console.log('    Fields:', Object.keys(analysisResults.screenshots_manifest).join(', '));
}
console.log('');

// Check for design tokens
console.log('🎨 Design tokens:');
console.log('  design_tokens:', analysisResults.design_tokens ? '✅ Present' : '❌ Missing');
if (analysisResults.design_tokens) {
  console.log('    Fields:', Object.keys(analysisResults.design_tokens).join(', '));
}
console.log('');

console.log('💡 Summary:');
console.log('  - Social extractor currently needs: html_content, social_links');
console.log('  - Accessibility extractor currently needs: html_content, aria_attributes, color_palette');
console.log('  - We need to modify extractors to use available data instead');
