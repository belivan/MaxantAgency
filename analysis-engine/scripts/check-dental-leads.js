import { supabase } from '../database/supabase-client.js';

async function checkDentalLeads() {
  const { data, error } = await supabase
    .from('leads')
    .select('id, company_name, url, industry, fit_score, quality_gap_score, analyzed_at')
    .eq('industry', 'Dental Practice')
    .order('analyzed_at', { ascending: false });

  if (error) {
    console.error('❌ Database error:', error);
    return;
  }

  if (!data || data.length === 0) {
    console.log('\n⚠️  No Dental Practice leads found in database');
    return;
  }

  console.log('\n📋 Dental Practice Leads:\n');

  data.forEach((lead, i) => {
    const hasAI = lead.fit_score !== null;
    console.log(`${i + 1}. ${lead.company_name.padEnd(30)} ${hasAI ? '✅ AI grading' : '❌ No AI grading'}`);
    console.log(`   URL: ${lead.url}`);
    console.log(`   Analyzed: ${lead.analyzed_at}`);
    console.log(`   Fit Score: ${lead.fit_score || 'NULL'}, Quality Gap: ${lead.quality_gap_score || 'NULL'}\n`);
  });

  const failedLead = data.find(l => l.fit_score === null);
  if (failedLead) {
    console.log(`\n🎯 Lead still missing AI grading: ${failedLead.company_name}`);
    console.log(`   ID: ${failedLead.id}`);
    console.log(`   URL: ${failedLead.url}`);
    console.log('\n💡 To re-analyze with AI grading, run:');
    console.log(`   POST /api/analyze-url`);
    console.log(`   { "url": "${failedLead.url}", "company_name": "${failedLead.company_name}", "force": true }`);
  } else {
    console.log('\n✅ All Dental Practice leads now have AI grading!');
  }

  const successCount = data.filter(l => l.fit_score !== null).length;
  console.log(`\n📊 AI Grading Success Rate: ${successCount}/${data.length} (${Math.round((successCount / data.length) * 100)}%)`);
}

checkDentalLeads()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
  });
