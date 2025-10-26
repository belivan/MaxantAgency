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

// Blue Back Dental
const PROSPECT_ID = 'ee64a595-ddc2-4e2a-8334-2ee980d65c53';
const PROSPECT_URL = 'https://www.bluebackdental.com/';
const COMPANY_NAME = 'Blue Back Dental';
const PROJECT_ID = '6024ee94-aeab-48a6-ad2e-3b814d23f798'; // Hartford Dental Offices Test

console.log(`🎯 Analyzing: ${COMPANY_NAME}`);
console.log(`   URL: ${PROSPECT_URL}\n`);

// Call Analysis Engine API
console.log('📡 Calling Analysis Engine API...');
const response = await fetch('http://localhost:3001/api/analyze-url', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    url: PROSPECT_URL,
    company_name: COMPANY_NAME,
    industry: 'dental',
    prospect_id: PROSPECT_ID,
    project_id: PROJECT_ID
  })
});

const result = await response.json();

if (!result.success) {
  console.error('❌ Analysis failed:', result.error);
  process.exit(1);
}

console.log('\n✅ Analysis complete!');
console.log(`   Lead ID: ${result.data.lead_id}`);
console.log(`   Grade: ${result.data.grade} (${result.data.overall_score}/100)`);
console.log(`   Benchmark: ${result.data.matched_benchmark ? result.data.matched_benchmark.company_name : 'None'}`);

// Fetch the lead from database
const { data: lead } = await supabase
  .from('leads')
  .select('*')
  .eq('id', result.data.lead_id)
  .single();

// Generate report with synthesis
console.log('\n🤖 Running AI synthesis...');
const synthesisData = await runReportSynthesis(lead);

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
console.log(`\n🎯 Comparison:`);
console.log(`   Blue Back Dental: ${result.data.grade} (${result.data.overall_score}/100)`);
if (result.data.matched_benchmark) {
  console.log(`   Heartland Dental: ${result.data.matched_benchmark.grade} (${result.data.matched_benchmark.overall_score}/100)`);
  console.log(`   Gap: ${result.data.matched_benchmark.overall_score - result.data.overall_score} points`);
}
