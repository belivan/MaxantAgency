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

const LEAD_ID = 'de3c47da-bc6c-4362-84ff-4a2a28f42ae3';

async function regenerateReport() {
  console.log('📄 Fetching Heartland analysis...\n');

  const { data: lead, error } = await supabase
    .from('leads')
    .select('*')
    .eq('id', LEAD_ID)
    .single();

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  console.log('✅ Found:', lead.company_name);
  console.log('   Grade:', lead.website_grade, `(${lead.overall_score}/100)`);

  // Run synthesis
  console.log('\n🤖 Running AI synthesis...');
  const synthesisData = await runReportSynthesis(lead);

  // Generate HTML report
  console.log('\n📝 Generating HTML report with fixed screenshot placement...');
  const report = await generateReport(lead, {
    format: 'html',
    sections: ['all'],
    synthesisData
  });

  // Save report
  const filename = `local-backups/analysis-engine/reports/heartland-dental-website-audit-2025-10-26-FIXED.html`;
  await writeFile(filename, report.content, 'utf8');

  console.log('\n✅ Report saved:', filename);
  console.log('📊 Report size:', (report.content.length / 1024).toFixed(1), 'KB');
  console.log('\n🎯 Key changes:');
  console.log('   1. Screenshots now appear RIGHT AFTER Executive Summary');
  console.log('   2. Screenshot filter fixed to show Desktop + Mobile views');
  console.log('   3. "Current State" section moved from bottom to top');

  return filename;
}

regenerateReport();
