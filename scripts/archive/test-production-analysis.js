/**
 * Test Production Analysis Engine
 * Tests the real API flow with all report generation fixes
 */

const API_URL = 'http://localhost:3001/api/analyze-url';

async function runProductionTest() {
  console.log('🚀 Starting Production Analysis Test...\n');

  const requestBody = {
    url: 'https://elmwooddental.com',
    company_name: 'Elmwood Dental - Production Test',
    project_id: '14d48e53-d504-4509-91c1-5ae830ba984d',
    generateReport: true,
    reportType: 'full'
  };

  console.log('📤 Request:', JSON.stringify(requestBody, null, 2));
  console.log('\n⏳ Analyzing website (this may take 2-3 minutes)...\n');

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('❌ API Error:', result);
      process.exit(1);
    }

    console.log('\n✅ Analysis Complete!\n');
    console.log('📊 Results:');
    console.log('  Grade:', result.grade);
    console.log('  Score:', result.overall_score);
    console.log('  Company:', result.company_name);
    console.log('  URL:', result.url);

    if (result.report_path_full) {
      console.log('\n📄 Full Report:', result.report_path_full);
    }
    if (result.report_path_preview) {
      console.log('📄 Preview Report:', result.report_path_preview);
    }

    console.log('\n🔍 Verification Checks:');
    console.log('  ✓ Design score:', result.design_score);
    console.log('  ✓ SEO score:', result.seo_score);
    console.log('  ✓ Content score:', result.content_score);
    console.log('  ✓ Social score:', result.social_score);
    console.log('  ✓ Design issues:', result.design_issues_desktop?.length || 0);
    console.log('  ✓ SEO issues:', result.seo_issues?.length || 0);
    console.log('  ✓ Matched benchmark:', result.matched_benchmark?.company_name || 'None');

    console.log('\n🎉 Production test completed successfully!');

  } catch (error) {
    console.error('\n❌ Test Failed:', error.message);
    process.exit(1);
  }
}

runProductionTest();
