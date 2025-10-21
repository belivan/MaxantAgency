/**
 * Test Batch Intelligent Multi-Page Analysis - 5 Prospects
 * Analyzes 5 prospects using the new /api/analyze endpoint
 */

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
dotenv.config({ path: './analysis-engine/.env' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function testBatchAnalysis() {
  console.log('🧪 Testing Batch Intelligent Multi-Page Analysis (5 Prospects)\n');
  console.log('='.repeat(60));

  try {
    // Fetch 5 prospects
    console.log('\n📊 Fetching 5 prospects from database...');
    const { data: prospects, error } = await supabase
      .from('prospects')
      .select('id, company_name, website, industry')
      .not('website', 'is', null)
      .limit(5);

    if (error) {
      throw new Error(`Failed to fetch prospects: ${error.message}`);
    }

    if (!prospects || prospects.length === 0) {
      throw new Error('No prospects found in database');
    }

    console.log(`✅ Found ${prospects.length} prospects:\n`);
    prospects.forEach((p, i) => {
      console.log(`  ${i + 1}. ${p.company_name || 'Unknown'} (${p.website})`);
    });

    // Call /api/analyze
    const prospect_ids = prospects.map(p => p.id);

    console.log(`\n🚀 Starting intelligent analysis for ${prospect_ids.length} prospects...\n`);
    console.log('='.repeat(60));

    const startTime = Date.now();

    const response = await fetch('http://localhost:3001/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prospect_ids,
        project_id: null
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API request failed: ${response.statusText}\n${errorText}`);
    }

    const result = await response.json();
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log('\n' + '='.repeat(60));
    console.log('✅ BATCH ANALYSIS COMPLETE!');
    console.log('='.repeat(60));

    if (result.success) {
      console.log(`\n📊 RESULTS:`);
      console.log(`  Total: ${result.data.total}`);
      console.log(`  Successful: ${result.data.successful}`);
      console.log(`  Failed: ${result.data.failed}`);
      console.log(`  Duration: ${duration}s (${(duration/60).toFixed(1)} minutes)\n`);

      console.log('📋 INDIVIDUAL RESULTS:\n');
      result.data.results.forEach((r, i) => {
        if (r.success) {
          console.log(`  ${i + 1}. ✅ ${r.company_name}`);
          console.log(`     Grade: ${r.grade} (${r.score}/100)`);
          console.log(`     URL: ${r.url}\n`);
        } else {
          console.log(`  ${i + 1}. ❌ ${r.company_name}`);
          console.log(`     Error: ${r.error}`);
          console.log(`     URL: ${r.url}\n`);
        }
      });

      // Show summary stats if available
      const successfulResults = result.data.results.filter(r => r.success);
      if (successfulResults.length > 0) {
        const avgScore = successfulResults.reduce((sum, r) => sum + r.score, 0) / successfulResults.length;
        const grades = successfulResults.reduce((acc, r) => {
          acc[r.grade] = (acc[r.grade] || 0) + 1;
          return acc;
        }, {});

        console.log('📈 STATISTICS:');
        console.log(`  Average Score: ${avgScore.toFixed(1)}/100`);
        console.log(`  Grade Distribution:`);
        Object.entries(grades).sort().forEach(([grade, count]) => {
          console.log(`    ${grade}: ${count}`);
        });
      }

      console.log('\n' + '='.repeat(60));
      console.log('✅ TEST PASSED!');
      console.log('='.repeat(60));
    } else {
      throw new Error(result.error || 'Analysis failed');
    }

  } catch (error) {
    console.error('\n' + '='.repeat(60));
    console.error('❌ TEST FAILED!');
    console.error('='.repeat(60));
    console.error(`\n${error.message}\n`);
    process.exit(1);
  }
}

testBatchAnalysis();
