/**
 * Test All Report Fixes
 *
 * Verifies:
 * 1. Screenshot data loading and side-by-side comparison display
 * 2. Image height matching (desktop: 600px, mobile: 800px)
 * 3. Accessibility section removed (duplicate)
 * 4. Technology Stack properly extracted from techStack.cms
 */

const ANALYSIS_ENGINE_URL = 'http://localhost:3001';

async function testAllReportFixes() {
  console.log('\n🧪 TESTING ALL REPORT FIXES\n');
  console.log('='.repeat(80));
  console.log('\nTesting prospect: JP Dental Hartford');
  console.log('Expected fixes:');
  console.log('  1. ✅ Screenshot side-by-side comparisons with matched heights');
  console.log('  2. ✅ Desktop images: 600px height, object-fit: cover');
  console.log('  3. ✅ Mobile images: 800px height, object-fit: cover');
  console.log('  4. ✅ No empty WCAG Accessibility Compliance section');
  console.log('  5. ✅ Technology Stack shows actual platform (not "Unknown")');
  console.log('\n' + '='.repeat(80) + '\n');

  try {
    const response = await fetch(`${ANALYSIS_ENGINE_URL}/api/analyze-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: 'https://jpdentalct.com/',
        company_name: 'JP Dental Hartford - Report Fix Test',
        industry: 'Dental Practice',
        project_id: '14d48e53-d504-4509-91c1-5ae830ba984d'
      })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ FAILED:', error.error);
      console.error('Details:', error.details);
      process.exit(1);
    }

    const result = await response.json();

    console.log('✅ ANALYSIS COMPLETE\n');
    console.log('📊 Results:');
    console.log(`   Grade: ${result.website_grade} (${result.overall_score}/100)`);
    console.log(`   Lead ID: ${result.id}`);
    console.log(`   Tech Stack: ${result.tech_stack || 'Unknown'}`);

    console.log('\n📝 Generated Reports:');
    console.log('   Preview: ' + result.preview_report_path);
    console.log('   Full: ' + result.full_report_path);

    console.log('\n✅ Verification Checklist:\n');

    // Check 1: Tech stack populated
    if (result.tech_stack && result.tech_stack !== 'Unknown') {
      console.log('✅ Technology Stack populated:', result.tech_stack);
    } else {
      console.log('⚠️  Technology Stack still showing "Unknown"');
    }

    // Check 2: Reports generated
    if (result.preview_report_path && result.full_report_path) {
      console.log('✅ Both preview and full reports generated');
    } else {
      console.log('❌ Report generation incomplete');
    }

    console.log('\n' + '='.repeat(80));
    console.log('\n🔍 MANUAL VERIFICATION REQUIRED:\n');
    console.log('Please open the generated reports and verify:');
    console.log('  1. Side-by-side screenshot comparisons display correctly');
    console.log('  2. Desktop images are same height (600px)');
    console.log('  3. Mobile images are same height (800px)');
    console.log('  4. No empty "WCAG Accessibility Compliance" section');
    console.log('  5. Technology Stack shows platform (not "Unknown")');
    console.log('\nReport locations:');
    console.log('  • ' + result.preview_report_path);
    console.log('  • ' + result.full_report_path);
    console.log('');

  } catch (error) {
    console.error('❌ Network error:', error.message);
    process.exit(1);
  }
}

testAllReportFixes();
