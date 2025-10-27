import { supabase } from './prospecting-engine/database/supabase-client.js';

const FAILED_PROSPECTS = [
  {
    name: 'JP Dental Hartford',
    website: 'https://www.jpdentalhartford.com/'
  },
  {
    name: 'Dentist in Hartford | Gorgeous Smiles Dental | Emergency and Cosmetic Dentistry',
    website: 'https://dentalsmilesofhartford.com/'
  },
  {
    name: 'Hartford Family Dentist - Dental Implant Specialist and Emergency Dentist',
    website: 'https://hartfordfamilydentistct.com/'
  }
];

const ANALYSIS_ENGINE_URL = 'http://localhost:3001';
const PROJECT_ID = '14d48e53-d504-4509-91c1-5ae830ba984d';
const MAX_RETRY_ATTEMPTS = 3;
const BACKOFF_DELAYS = [5000, 15000, 45000]; // 5s, 15s, 45s

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function isPermanentError(errorMessage) {
  if (!errorMessage) return false;

  const permanentPatterns = [
    /CRYPT_E_NO_REVOCATION_CHECK/i,
    /certificate/i,
    /SSL.*error/i,
    /TLS.*error/i,
    /Invalid URL/i,
    /404/,
    /not found/i,
    /Bad request/i,
    /400/
  ];

  return permanentPatterns.some(pattern => pattern.test(errorMessage));
}

async function analyzeWithRetry(prospect) {
  console.log(`\n[${prospect.name}]`);
  console.log(`    Website: ${prospect.website}`);
  console.log(`    Starting analysis...`);

  for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
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

      if (response.ok) {
        const result = await response.json();
        const analysisData = result.result || {};

        console.log(`    ✅ SUCCESS ${attempt > 1 ? `(succeeded on attempt ${attempt}/${MAX_RETRY_ATTEMPTS})` : ''}`);
        console.log(`       Grade: ${analysisData.grade} (${analysisData.overall_score}/100)`);
        console.log(`       Lead ID: ${analysisData.database_id}`);

        return {
          success: true,
          data: analysisData,
          attempt
        };
      }

      // Server returned an error response
      const error = await response.json();
      const errorMessage = error.error || 'Unknown error';

      // Check if error is permanent
      if (isPermanentError(errorMessage)) {
        console.log(`    ❌ PERMANENT ERROR: ${errorMessage}`);
        return {
          success: false,
          error: errorMessage,
          permanent: true,
          attempt
        };
      }

      // Transient error - retry if attempts remain
      if (attempt < MAX_RETRY_ATTEMPTS) {
        const delay = BACKOFF_DELAYS[attempt - 1];
        console.log(`    ⚠️  ATTEMPT ${attempt}/${MAX_RETRY_ATTEMPTS} FAILED: ${errorMessage}`);
        console.log(`       Retrying in ${delay / 1000} seconds...`);
        await sleep(delay);
      } else {
        console.log(`    ❌ MAX RETRIES EXCEEDED: ${errorMessage}`);
        return {
          success: false,
          error: errorMessage,
          permanent: false,
          attempt
        };
      }
    } catch (error) {
      // Network/fetch errors
      const errorMessage = error.message || 'fetch failed';

      if (attempt < MAX_RETRY_ATTEMPTS) {
        const delay = BACKOFF_DELAYS[attempt - 1];
        console.log(`    ⚠️  ATTEMPT ${attempt}/${MAX_RETRY_ATTEMPTS} FAILED: ${errorMessage}`);
        console.log(`       Retrying in ${delay / 1000} seconds...`);
        await sleep(delay);
      } else {
        console.log(`    ❌ MAX RETRIES EXCEEDED: ${errorMessage}`);
        return {
          success: false,
          error: errorMessage,
          permanent: false,
          attempt
        };
      }
    }
  }

  return {
    success: false,
    error: 'Unknown error after all retries',
    permanent: false,
    attempt: MAX_RETRY_ATTEMPTS
  };
}

async function resetAndRetry() {
  console.log('\n🔄 RETRYING 3 FAILED PROSPECTS (with fixed Anthropic credits)\n');
  console.log('================================================================================\n');

  // Step 1: Fetch prospect IDs from database
  console.log('📋 Fetching prospect IDs from database...\n');

  const prospects = [];
  for (const failedProspect of FAILED_PROSPECTS) {
    const { data, error } = await supabase
      .from('prospects')
      .select('id, company_name, website, google_rating, industry, city, state')
      .eq('website', failedProspect.website)
      .single();

    if (error) {
      console.log(`❌ Failed to fetch prospect: ${failedProspect.name}`);
      console.log(`   Error: ${error.message}`);
      continue;
    }

    if (data) {
      prospects.push(data);
      console.log(`✓ Found: ${data.company_name} (ID: ${data.id})`);
    }
  }

  if (prospects.length === 0) {
    console.log('\n❌ No prospects found to retry!\n');
    return;
  }

  console.log(`\n✅ Found ${prospects.length} prospects to retry\n`);
  console.log('================================================================================\n');

  // Step 2: Reset prospects to ready_for_analysis
  console.log('🔄 Resetting prospects to ready_for_analysis status...\n');

  for (const prospect of prospects) {
    const { error } = await supabase
      .from('prospects')
      .update({ analysis_status: 'ready_for_analysis' })
      .eq('id', prospect.id);

    if (error) {
      console.log(`❌ Failed to reset: ${prospect.company_name}`);
      console.log(`   Error: ${error.message}`);
    } else {
      console.log(`✓ Reset: ${prospect.company_name}`);
    }
  }

  console.log('\n✅ All prospects reset\n');
  console.log('================================================================================\n');
  console.log('🚀 Starting analysis with retry logic...\n');

  // Step 3: Analyze each prospect with retry logic
  const results = {
    successful: [],
    failed: [],
    permanent: []
  };

  for (let i = 0; i < prospects.length; i++) {
    const prospect = prospects[i];
    console.log(`\n[${i + 1}/${prospects.length}] ${prospect.company_name}`);

    const result = await analyzeWithRetry(prospect);

    if (result.success) {
      results.successful.push({
        prospect: prospect.company_name,
        grade: result.data.grade,
        score: result.data.overall_score,
        leadId: result.data.database_id,
        attempts: result.attempt
      });
    } else if (result.permanent) {
      results.permanent.push({
        prospect: prospect.company_name,
        error: result.error
      });
    } else {
      results.failed.push({
        prospect: prospect.company_name,
        error: result.error
      });
    }
  }

  // Step 4: Print summary
  console.log('\n\n================================================================================');
  console.log('                              FINAL SUMMARY                                     ');
  console.log('================================================================================\n');

  console.log(`✅ Successful: ${results.successful.length}`);
  results.successful.forEach(r => {
    console.log(`   - ${r.prospect}: Grade ${r.grade} (${r.score}/100)`);
    console.log(`     Lead ID: ${r.leadId}${r.attempts > 1 ? ` (after ${r.attempts} attempts)` : ''}`);
  });

  if (results.permanent.length > 0) {
    console.log(`\n⚠️  Permanent Failures: ${results.permanent.length}`);
    results.permanent.forEach(r => {
      console.log(`   - ${r.prospect}`);
      console.log(`     Error: ${r.error}`);
    });
  }

  if (results.failed.length > 0) {
    console.log(`\n❌ Failed: ${results.failed.length}`);
    results.failed.forEach(r => {
      console.log(`   - ${r.prospect}`);
      console.log(`     Error: ${r.error}`);
    });
  }

  const successRate = Math.round((results.successful.length / prospects.length) * 100);
  console.log(`\n📊 Success Rate: ${successRate}% (${results.successful.length}/${prospects.length})`);

  console.log('\n================================================================================\n');
}

// Run the script
resetAndRetry().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
