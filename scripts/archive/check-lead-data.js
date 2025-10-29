import { supabase } from './analysis-engine/database/supabase-client.js';

const { data, error } = await supabase
  .from('leads')
  .select('*')
  .eq('company_name', 'Elmwood Test FINAL VERIFICATION')
  .single();

if (error) {
  console.error('Error:', error);
  process.exit(1);
}

console.log('=== COMPLETE DATA AUDIT ===\n');
console.log('Company:', data.company_name);
console.log('Grade:', data.website_grade);
console.log('Overall Score:', data.overall_score);
console.log('');

console.log('SCORES:');
console.log('  Design:', data.design_score);
console.log('  Design Desktop:', data.design_score_desktop || 'MISSING');
console.log('  Design Mobile:', data.design_score_mobile || 'MISSING');
console.log('  SEO:', data.seo_score);
console.log('  Content:', data.content_score);
console.log('  Social:', data.social_score);
console.log('  Accessibility:', data.accessibility_score || 'MISSING');
console.log('  Performance Mobile:', data.performance_score_mobile || 'MISSING');
console.log('  Performance Desktop:', data.performance_score_desktop || 'MISSING');
console.log('');

console.log('SCREENSHOTS:');
console.log('  Desktop URL:', data.screenshot_desktop_url ? 'YES' : 'MISSING');
console.log('  Mobile URL:', data.screenshot_mobile_url ? 'YES' : 'MISSING');
console.log('  Manifest:', data.screenshots_manifest ? `YES (${data.screenshots_manifest.total_screenshots} screenshots, ${data.screenshots_manifest.pages ? Object.keys(data.screenshots_manifest.pages).length : 0} pages)` : 'MISSING');
console.log('');

console.log('BENCHMARK:');
console.log('  Matched Benchmark ID:', data.matched_benchmark_id || 'MISSING');
console.log('');

console.log('ISSUES:');
console.log('  Design Issues:', Array.isArray(data.design_issues) ? `${data.design_issues.length} issues` : 'MISSING');
console.log('  SEO Issues:', Array.isArray(data.seo_issues) ? `${data.seo_issues.length} issues` : 'MISSING');
console.log('  Content Issues:', Array.isArray(data.content_issues) ? `${data.content_issues.length} issues` : 'MISSING');
console.log('  Social Issues:', Array.isArray(data.social_issues) ? `${data.social_issues.length} issues` : 'MISSING');
console.log('  Accessibility Issues:', Array.isArray(data.accessibility_issues) ? `${data.accessibility_issues.length} issues` : 'MISSING');
console.log('  Performance Issues:', Array.isArray(data.performance_issues) ? `${data.performance_issues.length} issues` : 'MISSING');
console.log('  Quick Wins:', Array.isArray(data.quick_wins) ? `${data.quick_wins.length} items` : 'MISSING');
console.log('');

console.log('LEAD SCORING:');
console.log('  Lead Priority:', data.lead_priority || 'MISSING');
console.log('  Priority Tier:', data.priority_tier || 'MISSING');
console.log('  Budget Likelihood:', data.budget_likelihood || 'MISSING');
console.log('  Fit Score:', data.fit_score || 'MISSING');
console.log('  Quality Gap Score:', data.quality_gap_score || 'MISSING');
console.log('  Budget Score:', data.budget_score || 'MISSING');
console.log('  Urgency Score:', data.urgency_score || 'MISSING');
console.log('');

console.log('METADATA:');
console.log('  Pages Discovered:', data.pages_discovered || 'MISSING');
console.log('  Pages Crawled:', data.pages_crawled || 'MISSING');
console.log('  Pages Analyzed:', data.pages_analyzed || 'MISSING');
console.log('  AI Page Selection:', data.ai_page_selection ? 'YES' : 'MISSING');
console.log('  Crawl Metadata:', data.crawl_metadata ? 'YES' : 'MISSING');
console.log('  Business Intelligence:', data.business_intelligence ? 'YES' : 'MISSING');
console.log('  Discovery Log:', data.discovery_log ? 'YES' : 'MISSING');
console.log('');

console.log('DESIGN TOKENS:');
console.log('  Desktop Tokens:', data.design_tokens_desktop ? 'YES' : 'MISSING');
console.log('  Mobile Tokens:', data.design_tokens_mobile ? 'YES' : 'MISSING');
console.log('');

console.log('PERFORMANCE METRICS:');
console.log('  PageSpeed Insights:', data.performance_metrics_pagespeed ? 'YES' : 'MISSING');
console.log('  Chrome UX Report:', data.performance_metrics_crux ? 'YES' : 'MISSING');
console.log('');

console.log('WEIGHTS & REASONING:');
console.log('  Weights:', data.weights ? 'YES' : 'MISSING');
console.log('  Weight Reasoning:', data.weight_reasoning ? 'YES' : 'MISSING');
console.log('  Lead Priority Reasoning:', data.lead_priority_reasoning ? 'YES' : 'MISSING');
console.log('');

console.log('ANALYSIS METADATA:');
console.log('  Analysis Cost:', data.analysis_cost || 'MISSING');
console.log('  Analysis Time:', data.analysis_time ? `${(data.analysis_time / 1000).toFixed(1)}s` : 'MISSING');
console.log('  Analyzed At:', data.analyzed_at || 'MISSING');
console.log('');

console.log('=== MISSING CRITICAL FIELDS ===');
const missing = [];
if (!data.matched_benchmark_id) missing.push('matched_benchmark_id');
if (!data.lead_priority) missing.push('lead_priority');
if (!data.priority_tier) missing.push('priority_tier');
if (!data.budget_likelihood) missing.push('budget_likelihood');
if (!data.fit_score) missing.push('fit_score');
if (!data.weights) missing.push('weights');
if (!data.weight_reasoning) missing.push('weight_reasoning');
if (!data.lead_priority_reasoning) missing.push('lead_priority_reasoning');

if (missing.length === 0) {
  console.log('✅ All critical fields populated!');
} else {
  console.log('Missing fields:');
  missing.forEach(field => console.log(`  ❌ ${field}`));
}
