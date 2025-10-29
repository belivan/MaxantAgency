import { autoGenerateReport } from './analysis-engine/reports/auto-report-generator.js';
import { supabase } from './analysis-engine/database/supabase-client.js';

const LEAD_ID = '7a555edb-1b7d-441b-baba-4425202f7995'; // JP Dental Hartford

console.log('🔄 Regenerating reports for JP Dental Hartford with HTML fixes...\n');
console.log('Lead ID:', LEAD_ID);
console.log('Expected fixes:');
console.log('  ✅ Benchmark strengths now show text (not [object Object])');
console.log('  ✅ Budget Indicator removed');
console.log('  ✅ CrUX empty data shows helpful message');
console.log('  ✅ Screenshot gallery displays actual images\n');

try {
  // Fetch lead data from database
  console.log('📥 Fetching lead data from database...');
  const { data: lead, error } = await supabase
    .from('leads')
    .select('*')
    .eq('id', LEAD_ID)
    .single();

  if (error || !lead) {
    throw new Error(`Failed to fetch lead: ${error?.message || 'Lead not found'}`);
  }

  console.log(`✅ Found lead: ${lead.company_name} (${lead.grade} - ${lead.overall_score}/100)\n`);

  console.log('📊 Generating reports (PREVIEW + FULL)...\n');

  const result = await autoGenerateReport(lead, { format: 'html' });

  if (result.success) {
    console.log('✅ REPORTS GENERATED SUCCESSFULLY!\n');
    console.log('Report Details:');
    console.log('  - Report ID:', result.report_id);
    console.log('  - Format:', result.format);
    console.log('  - Preview Path:', result.preview_path);
    console.log('  - Full Path:', result.full_report_path);
    console.log('  - File Size:', Math.round(result.file_size / 1024), 'KB');
    console.log('\nSynthesis Details:');
    console.log('  - Used Synthesis:', result.synthesis.used);
    console.log('  - Consolidated Issues:', result.synthesis.consolidatedIssuesCount);
    console.log('  - Errors:', result.synthesis.errors.length);

    console.log('\n📂 Opening reports in browser...');
    console.log('Preview:', result.preview_path);
    console.log('Full:', result.full_report_path);

  } else {
    console.error('❌ Report generation failed:', result.error);
    process.exit(1);
  }

} catch (error) {
  console.error('❌ ERROR:', error.message);
  console.error(error.stack);
  process.exit(1);
}
