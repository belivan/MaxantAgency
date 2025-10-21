/**
 * Check leads table
 */

import { getRegularLeads } from './integrations/database.js';

console.log('═══════════════════════════════════════════════════════════════════');
console.log('📊 CHECKING LEADS TABLE');
console.log('═══════════════════════════════════════════════════════════════════\n');

try {
  const leads = await getRegularLeads({ limit: 100 });

  console.log('📈 Total leads fetched:', leads.length);

  // Filter by grade
  const aGrades = leads.filter(l => l.lead_grade === 'A');
  const bGrades = leads.filter(l => l.lead_grade === 'B');
  const cGrades = leads.filter(l => l.lead_grade === 'C');
  const dGrades = leads.filter(l => l.lead_grade === 'D');
  const fGrades = leads.filter(l => l.lead_grade === 'F');
  const noGrade = leads.filter(l => !l.lead_grade);

  console.log('✅ A-Grade:', aGrades.length);
  console.log('📊 B-Grade:', bGrades.length);
  console.log('🎯 C-Grade:', cGrades.length);
  console.log('⚠️  D-Grade:', dGrades.length);
  console.log('❌ F-Grade:', fGrades.length);
  console.log('❓ Not graded:', noGrade.length);

  // Show some leads ready for outreach
  const ready = leads.filter(l => l.lead_grade && !l.outreach_status).slice(0, 10);

  console.log('\n═══════════════════════════════════════════════════════════════════');
  console.log('🎯 LEADS READY FOR OUTREACH (' + ready.length + ' shown)');
  console.log('═══════════════════════════════════════════════════════════════════\n');

  ready.forEach((lead, i) => {
    console.log(`${i + 1}. ${lead.company_name} (${lead.lead_grade}-grade)`);
    console.log(`   URL: ${lead.url}`);
    console.log(`   Industry: ${lead.industry || 'N/A'}`);
    console.log(`   Grade: ${lead.website_grade} → ${lead.lead_grade}`);
    console.log(`   Contact: ${lead.contact_email || lead.contact_name || 'N/A'}`);
    if (lead.top_issue) {
      console.log(`   Top Issue: ${lead.top_issue}`);
    }
    console.log('');
  });

  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('✅ READY TO USE THESE LEADS FOR OUTREACH!');
  console.log('═══════════════════════════════════════════════════════════════════');

} catch (error) {
  console.error('❌ Error:', error.message);
  console.error(error.stack);
}
