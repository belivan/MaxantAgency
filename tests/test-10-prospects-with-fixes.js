import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config({ path: './analysis-engine/.env' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

console.log('🧪 Testing 10 REAL PROSPECTS - WITH ALL FIXES\n');
console.log('This test will:');
console.log('  1. Fetch 10 real prospects from database');
console.log('  2. Analyze each with intelligent multi-page analysis');
console.log('  3. Save ALL new fields to database');
console.log('  4. Verify fields were saved correctly\n');
console.log('============================================================\n');

// Fetch 10 prospects
console.log('📊 Fetching 10 prospects from database...');
const { data: prospects, error: fetchError } = await supabase
  .from('prospects')
  .select('*')
  .limit(10);

if (fetchError) {
  console.log('❌ Error fetching prospects:', fetchError.message);
  process.exit(1);
}

console.log(`✅ Found ${prospects.length} prospects:\n`);
prospects.forEach((p, i) => {
  console.log(`  ${i+1}. ${p.company_name} (${p.website})`);
});
console.log('\n============================================================\n');

// Analyze each prospect
let successCount = 0;
let failCount = 0;

for (let i = 0; i < prospects.length; i++) {
  const prospect = prospects[i];
  console.log(`[${i+1}/${prospects.length}] Analyzing ${prospect.company_name}...`);
  console.log(`URL: ${prospect.website}`);
  console.log(`Industry: ${prospect.industry}`);
  console.log('------------------------------------------------------------');

  try {
    // Call the analysis engine API
    const response = await axios.post('http://localhost:3001/api/analyze', {
      prospects: [{
        id: prospect.id,
        website: prospect.website,
        company_name: prospect.company_name,
        industry: prospect.industry || 'unknown',
        city: prospect.city,
        state: prospect.state
      }]
    }, {
      timeout: 300000  // 5 minute timeout per prospect
    });

    if (response.data && response.data[0] && response.data[0].success) {
      const result = response.data[0];
      console.log(`✅ SUCCESS - Grade: ${result.grade} (${result.score}/100)`);
      successCount++;
    } else {
      console.log(`❌ FAILED - ${response.data[0]?.error || 'Unknown error'}`);
      failCount++;
    }
  } catch (error) {
    console.log(`❌ FAILED - ${error.message}`);
    failCount++;
  }

  console.log('');
}

console.log('============================================================');
console.log('📊 TEST SUMMARY');
console.log('============================================================\n');
console.log(`Total: ${prospects.length}`);
console.log(`✅ Successful: ${successCount}`);
console.log(`❌ Failed: ${failCount}\n`);

// Verify database saves
console.log('============================================================');
console.log('🔍 VERIFYING DATABASE SAVES');
console.log('============================================================\n');

const { data: leads, error: leadsError } = await supabase
  .from('leads')
  .select('*')
  .order('analyzed_at', { ascending: false })
  .limit(5);

if (leadsError) {
  console.log('❌ Error querying leads:', leadsError.message);
} else {
  console.log(`✅ Found ${leads.length} recent leads in database\n`);

  leads.forEach((lead, i) => {
    console.log(`Lead ${i+1}: ${lead.company_name}`);
    console.log(`   Grade: ${lead.website_grade} (${lead.overall_score}/100)`);
    console.log(`   Screenshots: Desktop ${lead.screenshot_desktop_url ? '✅' : '❌'}, Mobile ${lead.screenshot_mobile_url ? '✅' : '❌'}`);
    console.log(`   Desktop/Mobile: ${lead.design_score_desktop || 'N/A'}/${lead.design_score_mobile || 'N/A'}`);
    console.log(`   Pages: ${lead.pages_discovered || 0} discovered, ${lead.pages_crawled || 0} crawled`);
    console.log(`   Outreach Angle: ${lead.outreach_angle ? '✅' : '❌'}`);
    console.log(`   Crawl Metadata: ${lead.crawl_metadata?.pages_analyzed?.length || 0} pages with screenshots`);
    console.log('');
  });
}

console.log('============================================================');
console.log(`🎉 TEST COMPLETE - ${successCount}/${prospects.length} SUCCEEDED`);
console.log('============================================================');
