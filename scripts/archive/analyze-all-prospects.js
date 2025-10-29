/**
 * Batch Analyze All Dental Prospects with Retry Logic
 *
 * Features:
 * - Automatic retry on transient failures (up to 3 attempts)
 * - Exponential backoff (5s, 15s, 45s)
 * - Smart error classification (permanent vs transient)
 * - Detailed progress tracking
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
const MAX_RETRY_ATTEMPTS = 3;
const BACKOFF_DELAYS = [5000, 15000, 45000]; // 5s, 15s, 45s

/**
 * Check if an error is permanent (should not retry)
 */
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

/**
 * Sleep for specified milliseconds
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Analyze a prospect with automatic retry on transient failures
 */
async function analyzeWithRetry(prospect) {
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
        return {
          success: true,
          data: result.result || {},
          attempt
        };
      }

      // Server returned an error response
      const error = await response.json();
      const errorMessage = error.error || 'Unknown error';

      // Check if error is permanent
      if (isPermanentError(errorMessage)) {
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
        // All attempts exhausted
        return {
          success: false,
          error: errorMessage,
          maxRetriesExceeded: true,
          attempt
        };
      }

    } catch (error) {
      // Network/fetch errors
      const errorMessage = error.message || 'Network error';

      // Check if error is permanent
      if (isPermanentError(errorMessage)) {
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
        // All attempts exhausted
        return {
          success: false,
          error: errorMessage,
          maxRetriesExceeded: true,
          attempt
        };
      }
    }
  }

  // Should never reach here, but just in case
  return {
    success: false,
    error: 'Max retries exceeded',
    maxRetriesExceeded: true,
    attempt: MAX_RETRY_ATTEMPTS
  };
}

async function analyzeAllProspects() {
  console.log('\n🦷 BATCH DENTAL PROSPECT ANALYSIS (with Retry Logic)\n');
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

  console.log(`\nFound ${prospects.length} dental prospects ready for analysis`);
  console.log(`Max retry attempts: ${MAX_RETRY_ATTEMPTS}`);
  console.log(`Backoff delays: ${BACKOFF_DELAYS.map(d => d/1000 + 's').join(', ')}\n`);
  console.log('='.repeat(80) + '\n');

  const results = {
    total: prospects.length,
    completed: 0,
    succeededFirstAttempt: 0,
    succeededAfterRetry: 0,
    permanentlyFailed: 0,
    maxRetriesFailed: 0,
    totalRetries: 0,
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

    const analysisResult = await analyzeWithRetry(prospect);

    if (analysisResult.success) {
      // Success!
      const analysisData = analysisResult.data;

      // Update prospect status to "analyzed"
      await supabase
        .from('prospects')
        .update({ status: 'analyzed' })
        .eq('id', prospect.id);

      const attemptInfo = analysisResult.attempt > 1
        ? ` (succeeded on attempt ${analysisResult.attempt}/${MAX_RETRY_ATTEMPTS})`
        : '';

      console.log(`    ✅ SUCCESS${attemptInfo}`);
      console.log(`       Grade: ${analysisData.grade || 'N/A'} (${analysisData.overall_score || 0}/100)`);
      console.log(`       Lead ID: ${analysisData.database_id}`);

      results.completed++;

      if (analysisResult.attempt === 1) {
        results.succeededFirstAttempt++;
      } else {
        results.succeededAfterRetry++;
        results.totalRetries += (analysisResult.attempt - 1);
      }

    } else {
      // Failed
      if (analysisResult.permanent) {
        console.log(`    ❌ PERMANENT FAILURE: ${analysisResult.error}`);
        console.log(`       (SSL/certificate issue - cannot be retried)`);
        results.permanentlyFailed++;
      } else if (analysisResult.maxRetriesExceeded) {
        console.log(`    ❌ MAX RETRIES EXCEEDED: ${analysisResult.error}`);
        console.log(`       (Failed all ${MAX_RETRY_ATTEMPTS} attempts)`);
        results.maxRetriesFailed++;
        results.totalRetries += (MAX_RETRY_ATTEMPTS - 1);
      } else {
        console.log(`    ❌ FAILED: ${analysisResult.error}`);
        results.maxRetriesFailed++;
      }

      results.errors.push({
        prospect: prospect.company_name,
        error: analysisResult.error,
        permanent: analysisResult.permanent || false,
        attempts: analysisResult.attempt
      });
    }

    // Brief pause between prospects to avoid overwhelming the server
    if (i < prospects.length - 1) {
      await sleep(2000);
    }
  }

  // Final Report
  console.log('\n' + '='.repeat(80));
  console.log('\n📊 BATCH ANALYSIS COMPLETE\n');
  console.log(`Total: ${results.total}`);
  console.log(`✅ Completed: ${results.completed}`);
  console.log(`   - First attempt: ${results.succeededFirstAttempt}`);
  console.log(`   - After retry: ${results.succeededAfterRetry}`);
  console.log(`❌ Failed: ${results.permanentlyFailed + results.maxRetriesFailed}`);
  console.log(`   - Permanent errors: ${results.permanentlyFailed} (SSL/certificate issues)`);
  console.log(`   - Max retries exceeded: ${results.maxRetriesFailed}`);

  if (results.totalRetries > 0 || results.succeededAfterRetry > 0) {
    console.log(`\n📈 Retry Statistics:`);
    console.log(`   Total retries performed: ${results.totalRetries}`);
    if (results.succeededAfterRetry > 0) {
      const retrySuccessRate = Math.round((results.succeededAfterRetry / (results.succeededAfterRetry + results.maxRetriesFailed)) * 100);
      console.log(`   Success rate after retry: ${retrySuccessRate}% (${results.succeededAfterRetry}/${results.succeededAfterRetry + results.maxRetriesFailed})`);
    }
  }

  if (results.errors.length > 0) {
    console.log('\n❌ Error Details:');
    results.errors.forEach((err, i) => {
      const typeLabel = err.permanent ? '[PERMANENT]' : '[TRANSIENT]';
      console.log(`   ${i + 1}. ${err.prospect} ${typeLabel}`);
      console.log(`      Error: ${err.error}`);
      console.log(`      Attempts: ${err.attempts}/${MAX_RETRY_ATTEMPTS}`);
    });
  }

  const successRate = Math.round((results.completed / results.total) * 100);
  console.log(`\n📊 Overall Success Rate: ${successRate}% (${results.completed}/${results.total})`);

  console.log('\n✅ All prospects processed!');
  console.log('\nNext steps:');
  console.log('  - Check local-backups/analysis-engine/reports/ for HTML reports');
  console.log('  - Check Supabase leads table for saved data');
  if (results.maxRetriesFailed > 0) {
    console.log('  - Consider manually retrying prospects that exceeded max attempts');
  }
  if (results.permanentlyFailed > 0) {
    console.log('  - Review permanently failed prospects (SSL issues cannot be fixed on our end)');
  }
  console.log('');
}

analyzeAllProspects()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });
