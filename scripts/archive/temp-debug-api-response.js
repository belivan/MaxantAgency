/**
 * Debug API Response Structure
 */

const ANALYSIS_ENGINE_URL = 'http://localhost:3001';

async function debugApiResponse() {
  console.log('\n🔍 Debugging API Response Structure\n');

  try {
    const response = await fetch(`${ANALYSIS_ENGINE_URL}/api/analyze-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: 'https://www.elmwooddental.com/',
        company_name: 'Elmwood Dental - Debug Test',
        industry: 'Dental Practice',
        project_id: '14d48e53-d504-4509-91c1-5ae830ba984d'
      })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ ERROR:', JSON.stringify(error, null, 2));
      process.exit(1);
    }

    const result = await response.json();

    console.log('📦 Full Response Structure:\n');
    console.log(JSON.stringify(result, null, 2));

    console.log('\n\n📊 Key Fields:\n');
    console.log(`   id: ${result.id || result.data?.id}`);
    console.log(`   company_name: ${result.company_name || result.data?.company_name}`);
    console.log(`   website_grade: ${result.website_grade || result.data?.website_grade}`);
    console.log(`   overall_score: ${result.overall_score || result.data?.overall_score}`);
    console.log(`   tech_stack: ${result.tech_stack || result.data?.tech_stack}`);
    console.log(`   preview_report_path: ${result.preview_report_path || result.data?.preview_report_path}`);
    console.log(`   full_report_path: ${result.full_report_path || result.data?.full_report_path}`);

  } catch (error) {
    console.error('❌ Request failed:', error.message);
    process.exit(1);
  }
}

debugApiResponse();
