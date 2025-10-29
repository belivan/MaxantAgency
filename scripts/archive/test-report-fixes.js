/**
 * Test Report Fixes:
 * 1. Top Priority shows "Action - Impact" format
 * 2. Score Breakdown appears after Executive Summary
 */

const ANALYSIS_ENGINE_URL = 'http://localhost:3001';

async function testReportFixes() {
  console.log('\n🧪 TESTING REPORT FIXES\n');
  console.log('Testing:');
  console.log('  1. Top Priority format: "Action - Impact"');
  console.log('  2. Score Breakdown position: After Executive Summary\n');

  try {
    const response = await fetch(`${ANALYSIS_ENGINE_URL}/api/analyze-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: 'https://www.elmwooddental.com/',
        company_name: 'Elmwood Dental - Report Fixes Test',
        industry: 'Dental Practice',
        project_id: '14d48e53-d504-4509-91c1-5ae830ba984d'
      })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ Analysis failed:', error.error);
      process.exit(1);
    }

    const result = await response.json();

    console.log('✅ Analysis complete!');
    console.log(`   Company: ${result.company_name}`);
    console.log(`   Grade: ${result.website_grade} (${result.overall_score}/100)`);
    console.log(`   Lead ID: ${result.id}\n`);

    console.log('📄 Generated Reports:');
    console.log(`   Preview: ${result.preview_report_path || 'NOT GENERATED'}`);
    console.log(`   Full: ${result.full_report_path || 'NOT GENERATED'}\n`);

    if (result.preview_report_path) {
      console.log('💡 Opening preview report...\n');
      const { exec } = await import('child_process');
      const reportPath = result.preview_report_path.replace('local-backups/analysis-engine/reports/', 'analysis-engine/reports/');
      exec(`start "${reportPath}"`);
    }

    console.log('✅ Test complete! Please verify in the opened report:');
    console.log('   1. Top Priority shows "Action - Impact" (not just action)');
    console.log('   2. "How We Calculated Your Score" appears early');
    console.log('   3. Score breakdown NOT in the middle of benchmark section');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

testReportFixes();
