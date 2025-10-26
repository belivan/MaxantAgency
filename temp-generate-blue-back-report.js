import { createClient } from '@supabase/supabase-js';
import { generateReport } from './analysis-engine/reports/report-generator.js';
import { runReportSynthesis } from './analysis-engine/reports/synthesis/report-synthesis.js';
import { writeFile } from 'fs/promises';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const LEAD_ID = 'c019ff7a-c524-4510-ad57-29899449486a';

console.log('📄 Fetching Blue Back Dental analysis...\n');

const { data: lead, error } = await supabase
  .from('leads')
  .select('*')
  .eq('id', LEAD_ID)
  .single();

if (error) {
  console.error('❌ Error:', error);
  process.exit(1);
}

console.log('✅ Found:', lead.company_name);
console.log(`   Grade: ${lead.website_grade} (${Math.round(lead.overall_score)}/100)`);

// Fetch Heartland benchmark for comparison
const { data: benchmark } = await supabase
  .from('benchmarks')
  .select('*')
  .eq('industry', 'dental')
  .eq('is_active', true)
  .order('overall_score', { ascending: false })
  .limit(1)
  .single();

if (benchmark) {
  console.log(`\n🎯 Comparing against: ${benchmark.company_name}`);
  console.log(`   Benchmark Grade: ${benchmark.overall_grade} (${Math.round(benchmark.overall_score)}/100)`);
  console.log(`   Gap: ${Math.round(lead.overall_score - benchmark.overall_score)} points (Blue Back is ${lead.overall_score > benchmark.overall_score ? 'AHEAD' : 'BEHIND'})`);

  // Add benchmark to lead object for report generation (in expected format)
  lead.matched_benchmark = {
    company_name: benchmark.company_name,
    grade: benchmark.overall_grade,
    overall_score: benchmark.overall_score,
    scores: {
      grade: benchmark.overall_grade,
      overall: benchmark.overall_score,
      design: benchmark.design_score,
      seo: benchmark.seo_score,
      content: benchmark.content_score,
      social: benchmark.social_score,
      performance: 0, // Not available
      accessibility: benchmark.accessibility_score || 0
    },
    screenshot_desktop_url: benchmark.desktop_screenshot_url,
    screenshot_mobile_url: benchmark.mobile_screenshot_url
  };
}

// Run synthesis
console.log('\n🤖 Running AI synthesis...');
const synthesisData = await runReportSynthesis(lead);

// Generate HTML report
console.log('\n📝 Generating HTML report...');
const report = await generateReport(lead, {
  format: 'html',
  sections: ['all'],
  synthesisData
});

const filename = `local-backups/analysis-engine/reports/blue-back-dental-vs-heartland-2025-10-26.html`;
await writeFile(filename, report.content, 'utf8');

console.log(`\n✅ Report saved: ${filename}`);
console.log(`📊 Report size: ${(report.content.length / 1024).toFixed(1)} KB`);
console.log(`\n🎯 Final Comparison:`);
console.log(`   Blue Back Dental: ${lead.website_grade} (${Math.round(lead.overall_score)}/100)`);
if (benchmark) {
  console.log(`   Heartland Dental: ${benchmark.overall_grade} (${Math.round(benchmark.overall_score)}/100)`);
  console.log(`   Result: Blue Back is ${Math.abs(Math.round(lead.overall_score - benchmark.overall_score))} points ${lead.overall_score > benchmark.overall_score ? 'AHEAD' : 'BEHIND'}`);
}
