/**
 * Retry JP Dental Hartford with date validation fix
 */

const ANALYSIS_ENGINE_URL = 'http://localhost:3001';
const PROJECT_ID = '14d48e53-d504-4509-91c1-5ae830ba984d';

async function retryJPDental() {
  console.log('\n🔄 RETRYING JP DENTAL HARTFORD\n');
  console.log('Testing date validation fix for "Invalid time value" error');
  console.log('='.repeat(80) + '\n');

  const prospectData = {
    url: 'https://www.jpdentalhartford.com/',
    company_name: 'JP Dental Hartford',
    industry: 'Dental Practice',
    project_id: PROJECT_ID
  };

  console.log('📍 URL:', prospectData.url);
  console.log('⏱️  Starting analysis...\n');

  const startTime = Date.now();

  try {
    const response = await fetch(`${ANALYSIS_ENGINE_URL}/api/analyze-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(prospectData)
    });

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    if (!response.ok) {
      const error = await response.json();
      console.log(`❌ FAILED (${elapsed}s)`);
      console.log(`   Error: ${error.error}`);
      if (error.details) {
        console.log(`   Details: ${error.details}`);
      }
      process.exit(1);
    }

    const result = await response.json();
    const analysisData = result.result || {};

    console.log(`✅ SUCCESS (${elapsed}s)\n`);
    console.log('📊 Results:');
    console.log(`   Grade: ${analysisData.grade} (${analysisData.overall_score}/100)`);
    console.log(`   Lead ID: ${analysisData.database_id}`);
    console.log(`   Lead Score: ${analysisData.lead_priority}/100`);
    console.log(`   Database Saved: ${analysisData.database_saved ? 'YES' : 'NO'}`);

    if (analysisData.report) {
      console.log(`   Report Generated: YES`);
    }

    console.log('\n' + '='.repeat(80));
    console.log('\n✅ Date validation fix confirmed working!');
    console.log('   JP Dental Hartford analyzed successfully.\n');

  } catch (error) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`❌ NETWORK ERROR (${elapsed}s)`);
    console.log(`   ${error.message}\n`);
    process.exit(1);
  }
}

retryJPDental();
