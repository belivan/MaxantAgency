/**
 * Show all leads including ungraded ones
 */

import { getRegularLeads } from './integrations/database.js';

console.log('\n═══════════════════════════════════════════════════════════════════');
console.log('📋 ALL LEADS IN DATABASE');
console.log('═══════════════════════════════════════════════════════════════════\n');

try {
  const leads = await getRegularLeads({ limit: 100 });

  if (leads.length === 0) {
    console.log('❌ No leads found in database');
    process.exit(0);
  }

  console.log(`Total leads: ${leads.length}\n`);

  leads.forEach((lead, i) => {
    console.log(`${i + 1}. ${lead.company_name}`);
    console.log(`   URL: ${lead.url}`);
    console.log(`   Industry: ${lead.industry || 'N/A'}`);
    console.log(`   Status: ${lead.status || 'N/A'}`);
    console.log(`   Website Grade: ${lead.website_grade || '⚠️  NOT GRADED'}`);
    console.log(`   Lead Grade: ${lead.lead_grade || '⚠️  NOT GRADED'}`);
    console.log(`   Contact: ${lead.contact_email || lead.contact_name || 'N/A'}`);
    console.log(`   Outreach Status: ${lead.outreach_status || 'Not contacted'}`);

    if (lead.top_issue) {
      console.log(`   Top Issue: ${lead.top_issue}`);
    }

    if (lead.analysis_summary) {
      console.log(`   Analysis: ${lead.analysis_summary.substring(0, 80)}...`);
    }

    console.log(`   Created: ${new Date(lead.created_at).toLocaleDateString()}`);
    console.log('');
  });

  // Summary
  const graded = leads.filter(l => l.lead_grade);
  const ungraded = leads.filter(l => !l.lead_grade);
  const readyForOutreach = leads.filter(l => l.lead_grade && !l.outreach_status);

  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('📊 SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log(`Total leads: ${leads.length}`);
  console.log(`✅ Graded and analyzed: ${graded.length}`);
  console.log(`⚠️  Not graded yet: ${ungraded.length}`);
  console.log(`🎯 Ready for outreach: ${readyForOutreach.length}`);
  console.log('═══════════════════════════════════════════════════════════════════\n');

  if (ungraded.length > 0) {
    console.log('⚠️  NOTE: Ungraded leads need to be processed by Analysis Engine (Agent 2) first!');
    console.log('   Run: cd analysis-engine && node analyze-leads.js\n');
  }

  if (readyForOutreach.length > 0) {
    console.log('✅ Ready to generate outreach emails for graded leads!');
    console.log('   Run: node generate-outreach.js\n');
  }

} catch (error) {
  console.error('❌ Error:', error.message);
  console.error(error.stack);
}
