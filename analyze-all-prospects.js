/**
 * Batch Analyze All Dental Prospects
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const ANALYSIS_ENGINE_URL = 'http://localhost:3001';
const PROJECT_ID = '14d48e53-d504-4509-91c1-5ae830ba984d';

async function analyzeAllProspects() {
  console.log('\n🦷 BATCH DENTAL PROSPECT ANALYSIS\n');
  console.log('='.repeat(80));

  // Get all dental prospects
  const { data: prospects, error } = await supabase
    .from('prospects')
    .select('id, company_name, website, industry, city, state, google_rating')
    .ilike('industry', '%dental%')
    .not('website', 'is', null)
    .eq('status', 'ready_for_analysis')
    .order('google_rating', { ascending: false })
    .limit(20);

  if (error) {
    console.error('❌ Database error:', error.message);
    process.exit(1);
  }

  if (!prospects || prospects.length === 0) {
    console.log('No dental prospects found ready for analysis');
    process.exit(0);
  }

  console.log(`\nFound ${prospects.length} dental prospects ready for analysis\n`);
  console.log('='.repeat(80) + '\n');

  const results = {
    total: prospects.length,
    completed: 0,
    failed: 0,
    errors: []
  };

  for (let i = 0; i < prospects.length; i++) {
    const prospect = prospects[i];
    const num = i + 1;

    console.log(`\n[${num}/${prospects.length}] ${prospect.company_name}`);
    console.log(`    Website: ${prospect.website}`);
    console.log(`    Location: ${prospect.city}, ${prospect.state}`);
    console.log(`    Rating: ${prospect.google_rating || 'N/A'} ⭐`);
    console.log(`    Starting analysis...`);

    try {
      const response = await fetch(`${ANALYSIS_ENGINE_URL}/api/analyze-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: prospect.website,
          company_name: prospect.company_name,
          industry: prospect.industry,
          project_id: PROJECT_ID,
          prospect_id: prospect.id
        })
      });

      if (!response.ok) {
        const error = await response.json();
        console.log(`    ❌ FAILED: ${error.error}`);
        results.failed++;
        results.errors.push({
          prospect: prospect.company_name,
          error: error.error || 'Unknown error'
        });
        continue;
      }

      const result = await response.json();

      // Extract data from nested result structure
      const analysisData = result.result || {};

      // Update prospect status to "analyzed"
      await supabase
        .from('prospects')
        .update({ status: 'analyzed' })
        .eq('id', prospect.id);

      console.log(`    ✅ SUCCESS`);
      console.log(`       Grade: ${analysisData.grade || 'N/A'} (${analysisData.overall_score || 0}/100)`);
      console.log(`       Lead ID: ${analysisData.database_id}`);

      results.completed++;

      // Brief pause between requests to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 2000));

    } catch (error) {
      console.log(`    ❌ ERROR: ${error.message}`);
      results.failed++;
      results.errors.push({
        prospect: prospect.company_name,
        error: error.message
      });
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('\n📊 BATCH ANALYSIS COMPLETE\n');
  console.log(`Total: ${results.total}`);
  console.log(`✅ Completed: ${results.completed}`);
  console.log(`❌ Failed: ${results.failed}`);

  if (results.errors.length > 0) {
    console.log('\n❌ Errors:');
    results.errors.forEach((err, i) => {
      console.log(`   ${i + 1}. ${err.prospect}: ${err.error}`);
    });
  }

  console.log('\n✅ All prospects processed!');
  console.log('\nNext steps:');
  console.log('  - Check local-backups/analysis-engine/reports/ for HTML reports');
  console.log('  - Check Supabase leads table for saved data');
  console.log('  - Review any errors above and retry failed prospects if needed\n');
}

analyzeAllProspects()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });
