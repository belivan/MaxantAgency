/**
 * Test Analysis Engine with real prospects from database
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

console.log('🔍 Fetching prospects from database...\n');

// Get prospects with websites
const { data: prospects, error } = await supabase
  .from('prospects')
  .select('id, company_name, website, industry, city, google_rating')
  .not('website', 'is', null)
  .limit(10)
  .order('created_at', { ascending: false });

if (error) {
  console.error('❌ Error fetching prospects:', error);
  process.exit(1);
}

console.log(`📊 Found ${prospects.length} prospects with websites:\n`);

prospects.forEach((p, i) => {
  console.log(`${i + 1}. ${p.company_name}`);
  console.log(`   Website: ${p.website}`);
  console.log(`   ${p.industry} | ${p.city} | Rating: ${p.google_rating || 'N/A'}`);
  console.log('');
});

// Pick 3 prospects to analyze
const toAnalyze = prospects.slice(0, 3);

console.log(`\n🚀 Analyzing ${toAnalyze.length} prospects...\n`);

for (const prospect of toAnalyze) {
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`Analyzing: ${prospect.company_name}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  try {
    // Call the Analysis Engine API
    const response = await fetch('http://localhost:3001/api/analyze-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: prospect.website,
        company_name: prospect.company_name,
        industry: prospect.industry
      })
    });

    const result = await response.json();

    if (result.success) {
      const analysis = result.result;

      console.log(`✅ Analysis Complete!`);
      console.log(`   Grade: ${analysis.grade} (${analysis.overall_score}/100)`);
      console.log(`   Design: ${analysis.design_score} | SEO: ${analysis.seo_score}`);
      console.log(`   Content: ${analysis.content_score} | Social: ${analysis.social_score}`);
      console.log(`   Quick Wins: ${analysis.quick_wins?.length || 0}`);
      console.log(`   Top Issue: ${analysis.top_issue?.title || 'None'}`);
      console.log(`   Time: ${(analysis.analysis_time / 1000).toFixed(1)}s`);
    } else {
      console.log(`❌ Analysis failed:`, result.error);
    }
  } catch (err) {
    console.log(`❌ Error:`, err.message);
  }
}

// Check database for saved leads
console.log(`\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
console.log(`DATABASE VERIFICATION`);
console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

const { data: leads, error: leadsError } = await supabase
  .from('leads')
  .select('company_name, website_grade, design_score, seo_score, analyzed_at, source_app')
  .eq('source_app', 'analysis-engine')
  .order('analyzed_at', { ascending: false })
  .limit(10);

if (leadsError) {
  console.error('❌ Error fetching leads:', leadsError);
} else {
  console.log(`✅ ${leads.length} leads from analysis-engine in database:\n`);
  leads.forEach((lead, i) => {
    console.log(`${i + 1}. ${lead.company_name} - Grade ${lead.website_grade}`);
    console.log(`   Design: ${lead.design_score} | SEO: ${lead.seo_score}`);
    console.log(`   Analyzed: ${new Date(lead.analyzed_at).toLocaleString()}`);
    console.log('');
  });
}

console.log('\n✅ Test complete!');
