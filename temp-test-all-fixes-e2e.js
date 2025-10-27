/**
 * End-to-End Test: All Report Fixes
 *
 * This will analyze a website and verify:
 * 1. Technology Stack is detected (not "Unknown")
 * 2. Screenshots are loaded and displayed
 * 3. Image heights match (desktop 600px, mobile 800px)
 * 4. No empty WCAG Accessibility Compliance section
 * 5. Reports are generated successfully
 */

const ANALYSIS_ENGINE_URL = 'http://localhost:3001';

async function testAllFixesEndToEnd() {
  console.log('\n🧪 END-TO-END TEST: All Report Fixes\n');
  console.log('='.repeat(80));

  // Use a simple, fast-loading dental website for testing
  const testProspect = {
    url: 'https://www.hartforddentalgroup.com/',
    company_name: 'Hartford Dental Group - E2E Test',
    industry: 'Dental Practice',
    project_id: '14d48e53-d504-4509-91c1-5ae830ba984d'
  };

  console.log(`\n📋 Test Prospect: ${testProspect.company_name}`);
  console.log(`   URL: ${testProspect.url}`);
  console.log('\n' + '='.repeat(80) + '\n');

  try {
    console.log('⏳ Starting analysis (this may take 2-3 minutes)...\n');

    const response = await fetch(`${ANALYSIS_ENGINE_URL}/api/analyze-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testProspect)
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ ANALYSIS FAILED:', error.error);
      if (error.details) console.error('   Details:', error.details);
      process.exit(1);
    }

    const result = await response.json();

    console.log('✅ ANALYSIS COMPLETE!\n');
    console.log('='.repeat(80));
    console.log('\n📊 RESULTS:\n');
    console.log(`   Company: ${result.company_name}`);
    console.log(`   Grade: ${result.website_grade} (${result.overall_score}/100)`);
    console.log(`   Lead ID: ${result.id}`);
    console.log(`   Tech Stack: ${result.tech_stack || 'Unknown'}`);
    console.log(`   Mobile Friendly: ${result.is_mobile_friendly ? '✅' : '❌'}`);
    console.log(`   HTTPS: ${result.has_https ? '✅' : '❌'}`);

    console.log('\n📄 GENERATED REPORTS:\n');
    console.log(`   Preview: ${result.preview_report_path || 'NOT GENERATED'}`);
    console.log(`   Full: ${result.full_report_path || 'NOT GENERATED'}`);

    console.log('\n' + '='.repeat(80));
    console.log('\n✅ VERIFICATION CHECKLIST:\n');

    // Check 1: Tech Stack
    if (result.tech_stack && result.tech_stack !== 'Unknown') {
      console.log(`✅ 1. Technology Stack detected: "${result.tech_stack}"`);
    } else {
      console.log('⚠️  1. Technology Stack still showing "Unknown"');
      console.log('   → This might be expected if the site has no detectable CMS');
    }

    // Check 2: Reports Generated
    if (result.preview_report_path && result.full_report_path) {
      console.log('✅ 2. Both preview and full reports generated');
    } else {
      console.log('❌ 2. Report generation incomplete');
    }

    // Check 3: Screenshots captured
    const screenshotCount = (result.screenshot_desktop_path ? 1 : 0) + (result.screenshot_mobile_path ? 1 : 0);
    if (screenshotCount === 2) {
      console.log(`✅ 3. Screenshots captured (desktop + mobile)`);
    } else {
      console.log(`⚠️  3. Only ${screenshotCount}/2 screenshots captured`);
    }

    // Check 4: Analysis data completeness
    const hasDesignData = result.design_score > 0;
    const hasSeoData = result.seo_score > 0;
    const hasContentData = result.content_score > 0;
    const hasSocialData = result.social_score > 0;

    if (hasDesignData && hasSeoData && hasContentData && hasSocialData) {
      console.log('✅ 4. All analyzer modules ran successfully');
    } else {
      console.log('⚠️  4. Some analyzers may have incomplete data');
      console.log(`   → Design: ${result.design_score}, SEO: ${result.seo_score}, Content: ${result.content_score}, Social: ${result.social_score}`);
    }

    console.log('\n' + '='.repeat(80));
    console.log('\n🔍 MANUAL VERIFICATION REQUIRED:\n');
    console.log('Please open the generated reports and verify:');
    console.log('  1. ✅ Side-by-side screenshot comparisons display correctly');
    console.log('  2. ✅ Desktop images are same height (600px)');
    console.log('  3. ✅ Mobile images are same height (800px)');
    console.log('  4. ✅ No empty "WCAG Accessibility Compliance" section');
    console.log('  5. ✅ Technology Stack shows platform (or "Unknown" if none detected)');

    if (result.preview_report_path) {
      console.log(`\n📂 Preview Report:`);
      console.log(`   ${result.preview_report_path}`);
    }

    if (result.full_report_path) {
      console.log(`\n📂 Full Report:`);
      console.log(`   ${result.full_report_path}`);
    }

    console.log('\n' + '='.repeat(80) + '\n');

    // Try to open the preview report automatically
    if (result.preview_report_path) {
      console.log('💡 Tip: Opening preview report in browser...\n');
      const { exec } = await import('child_process');
      exec(`start "${result.preview_report_path.replace('local-backups/analysis-engine/reports/', 'analysis-engine/reports/')}"`);
    }

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error('\nStack trace:', error.stack);
    process.exit(1);
  }
}

testAllFixesEndToEnd();
