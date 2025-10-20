/**
 * Check leads table in Supabase database
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: 'outreach-engine/.env' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

console.log('═══════════════════════════════════════════════════════════════════');
console.log('📊 CHECKING LEADS TABLE');
console.log('═══════════════════════════════════════════════════════════════════\n');

async function checkLeads() {
  try {
    // Get total count
    const { count: totalCount, error: countError } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.log('❌ Error getting total count:', countError.message);
      return;
    }

    console.log('📈 Total leads in database:', totalCount);

    // Get leads ready for outreach (with website grade)
    const { data: graded, count: gradedCount } = await supabase
      .from('leads')
      .select('*', { count: 'exact' })
      .not('website_grade', 'is', null)
      .limit(10);

    console.log('✅ Leads with website grades:', gradedCount);

    // Get leads by grade
    const { data: aGrades } = await supabase
      .from('leads')
      .select('company_name, url, website_grade, lead_grade')
      .eq('lead_grade', 'A')
      .limit(5);

    const { data: bGrades } = await supabase
      .from('leads')
      .select('company_name, url, website_grade, lead_grade')
      .eq('lead_grade', 'B')
      .limit(5);

    const { data: cGrades } = await supabase
      .from('leads')
      .select('company_name, url, website_grade, lead_grade')
      .eq('lead_grade', 'C')
      .limit(5);

    console.log('\n═══════════════════════════════════════════════════════════════════');
    console.log('📊 LEADS BY GRADE');
    console.log('═══════════════════════════════════════════════════════════════════\n');

    if (aGrades && aGrades.length > 0) {
      console.log('🏆 A-Grade Leads (' + aGrades.length + '):');
      aGrades.forEach((lead, i) => {
        console.log(`   ${i + 1}. ${lead.company_name}`);
        console.log(`      URL: ${lead.url}`);
        console.log(`      Grade: ${lead.website_grade} → ${lead.lead_grade}`);
      });
    } else {
      console.log('⚠️  No A-grade leads found');
    }

    if (bGrades && bGrades.length > 0) {
      console.log('\n📊 B-Grade Leads (' + bGrades.length + '):');
      bGrades.forEach((lead, i) => {
        console.log(`   ${i + 1}. ${lead.company_name}`);
        console.log(`      URL: ${lead.url}`);
        console.log(`      Grade: ${lead.website_grade} → ${lead.lead_grade}`);
      });
    } else {
      console.log('\n⚠️  No B-grade leads found');
    }

    if (cGrades && cGrades.length > 0) {
      console.log('\n🎯 C-Grade Leads (' + cGrades.length + '):');
      cGrades.forEach((lead, i) => {
        console.log(`   ${i + 1}. ${lead.company_name}`);
        console.log(`      URL: ${lead.url}`);
        console.log(`      Grade: ${lead.website_grade} → ${lead.lead_grade}`);
      });
    } else {
      console.log('\n⚠️  No C-grade leads found');
    }

    // Get leads ready for outreach (graded but not contacted)
    const { data: readyLeads, count: readyCount } = await supabase
      .from('leads')
      .select('*', { count: 'exact' })
      .not('lead_grade', 'is', null)
      .is('outreach_status', null)
      .limit(5);

    console.log('\n═══════════════════════════════════════════════════════════════════');
    console.log('🎯 LEADS READY FOR OUTREACH');
    console.log('═══════════════════════════════════════════════════════════════════\n');
    console.log('Total ready for outreach:', readyCount);

    if (readyLeads && readyLeads.length > 0) {
      console.log('\nTop 5 leads:');
      readyLeads.forEach((lead, i) => {
        console.log(`\n   ${i + 1}. ${lead.company_name} (${lead.lead_grade}-grade)`);
        console.log(`      URL: ${lead.url}`);
        console.log(`      Industry: ${lead.industry || 'N/A'}`);
        console.log(`      Grade: ${lead.website_grade} → ${lead.lead_grade}`);
        console.log(`      Contact: ${lead.contact_email || lead.contact_name || 'N/A'}`);
        if (lead.top_issue) {
          console.log(`      Top Issue: ${lead.top_issue}`);
        }
      });
    }

    console.log('\n═══════════════════════════════════════════════════════════════════');
    console.log('✅ LEADS ANALYSIS COMPLETE');
    console.log('═══════════════════════════════════════════════════════════════════');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
}

checkLeads();
