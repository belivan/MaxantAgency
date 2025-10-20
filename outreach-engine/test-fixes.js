/**
 * TEST SCRIPT - Verify Issue #1 and Issue #2 Fixes
 *
 * Tests:
 * - Issue 1: strategy_id parameter recognition
 * - Issue 2: variant generation and data structure
 */

const testLead = {
  url: "https://zahavrestaurant.com",
  company_name: "Zahav Restaurant",
  industry: "restaurant",
  grade: "B",
  website_score: 78,
  top_issue: "No online reservation system",
  quick_win: "Add OpenTable integration",
  one_liner: "Award-winning Israeli cuisine with dated booking process"
};

const API_BASE = 'http://localhost:3002';

async function runTests() {
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║  OUTREACH ENGINE - FIX VERIFICATION TESTS             ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  let passedTests = 0;
  let failedTests = 0;

  // ═══════════════════════════════════════════════════════════
  // ISSUE 1: Strategy Selection Tests
  // ═══════════════════════════════════════════════════════════

  console.log('📋 ISSUE 1: Strategy Selection Tests');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const strategies = [
    'problem-first',
    'achievement-focused',
    'compliment-sandwich',
    'industry-insight'
  ];

  for (const strategy of strategies) {
    try {
      console.log(`🧪 Test: strategy_id="${strategy}"`);

      const response = await fetch(`${API_BASE}/api/compose`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: testLead.url,
          strategy_id: strategy,
          lead: testLead
        })
      });

      const data = await response.json();

      if (!response.ok) {
        console.log(`   ❌ FAIL: HTTP ${response.status}`);
        console.log(`   Error: ${data.error || 'Unknown error'}\n`);
        failedTests++;
        continue;
      }

      // Verify strategy was applied
      const actualStrategy = data.email?.strategy || data.result?.strategy;

      if (actualStrategy === strategy) {
        console.log(`   ✅ PASS: Strategy correctly set to "${actualStrategy}"`);
        passedTests++;
      } else {
        console.log(`   ❌ FAIL: Expected "${strategy}", got "${actualStrategy}"`);
        failedTests++;
      }

      // Show email preview
      const subject = data.email?.subject || 'N/A';
      console.log(`   📧 Subject: ${subject.substring(0, 60)}${subject.length > 60 ? '...' : ''}`);
      console.log('');

    } catch (error) {
      console.log(`   ❌ FAIL: ${error.message}\n`);
      failedTests++;
    }
  }

  // ═══════════════════════════════════════════════════════════
  // ISSUE 2: Variant Generation Tests
  // ═══════════════════════════════════════════════════════════

  console.log('\n📋 ISSUE 2: Variant Generation Tests');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Test 2.1: Variants OFF (default)
  try {
    console.log('🧪 Test: generateVariants=false (default)');

    const response = await fetch(`${API_BASE}/api/compose`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: testLead.url,
        strategy_id: 'problem-first',
        generateVariants: false,
        lead: testLead
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.log(`   ❌ FAIL: HTTP ${response.status}\n`);
      failedTests++;
    } else if (data.email?.has_variants === false) {
      console.log('   ✅ PASS: has_variants = false');
      console.log('   ✅ PASS: No variant data generated');
      passedTests++;
    } else {
      console.log(`   ❌ FAIL: has_variants should be false, got ${data.email?.has_variants}\n`);
      failedTests++;
    }
    console.log('');
  } catch (error) {
    console.log(`   ❌ FAIL: ${error.message}\n`);
    failedTests++;
  }

  // Test 2.2: Variants ON
  try {
    console.log('🧪 Test: generateVariants=true');
    console.log('   (This will take ~10-15 seconds due to AI generation...)');

    const response = await fetch(`${API_BASE}/api/compose`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: testLead.url,
        strategy_id: 'problem-first',
        generateVariants: true,
        lead: testLead
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.log(`   ❌ FAIL: HTTP ${response.status}`);
      console.log(`   Error: ${data.error || 'Unknown error'}\n`);
      failedTests++;
    } else {
      let testsPassed = 0;
      let testsFailed = 0;

      // Check has_variants flag
      if (data.email?.has_variants === true) {
        console.log('   ✅ PASS: has_variants = true');
        testsPassed++;
      } else {
        console.log(`   ❌ FAIL: has_variants = ${data.email?.has_variants}`);
        testsFailed++;
      }

      // Check subject_variants
      if (Array.isArray(data.email?.subject_variants) && data.email.subject_variants.length === 3) {
        console.log(`   ✅ PASS: subject_variants has 3 items`);
        testsPassed++;

        console.log('\n   📝 Subject Variants:');
        data.email.subject_variants.forEach((subj, i) => {
          console.log(`      ${i + 1}. "${subj}"`);
        });
      } else {
        console.log(`   ❌ FAIL: subject_variants count = ${data.email?.subject_variants?.length || 0}`);
        testsFailed++;
      }

      // Check body_variants
      if (Array.isArray(data.email?.body_variants) && data.email.body_variants.length === 2) {
        console.log(`\n   ✅ PASS: body_variants has 2 items`);
        testsPassed++;

        console.log('\n   📄 Body Variants:');
        data.email.body_variants.forEach((body, i) => {
          const preview = body.substring(0, 80).replace(/\n/g, ' ');
          console.log(`      ${i + 1}. ${preview}...`);
        });
      } else {
        console.log(`   ❌ FAIL: body_variants count = ${data.email?.body_variants?.length || 0}`);
        testsFailed++;
      }

      // Check recommended_variant
      if (data.email?.recommended_variant &&
          typeof data.email.recommended_variant.subject === 'number' &&
          typeof data.email.recommended_variant.body === 'number') {
        console.log(`\n   ✅ PASS: recommended_variant = {subject: ${data.email.recommended_variant.subject}, body: ${data.email.recommended_variant.body}}`);
        testsPassed++;
      } else {
        console.log(`   ❌ FAIL: recommended_variant is invalid`);
        testsFailed++;
      }

      if (testsFailed === 0) {
        passedTests++;
      } else {
        failedTests++;
      }

      console.log('');
    }
  } catch (error) {
    console.log(`   ❌ FAIL: ${error.message}\n`);
    failedTests++;
  }

  // ═══════════════════════════════════════════════════════════
  // RESULTS SUMMARY
  // ═══════════════════════════════════════════════════════════

  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║  TEST RESULTS                                          ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  const totalTests = passedTests + failedTests;
  const passRate = totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0;

  console.log(`   Total Tests: ${totalTests}`);
  console.log(`   ✅ Passed: ${passedTests}`);
  console.log(`   ❌ Failed: ${failedTests}`);
  console.log(`   📊 Pass Rate: ${passRate}%\n`);

  if (failedTests === 0) {
    console.log('   🎉 ALL TESTS PASSED! Both issues are fixed.\n');
    process.exit(0);
  } else {
    console.log('   ⚠️  Some tests failed. Review output above.\n');
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  console.error('\n❌ Test suite crashed:', error.message);
  process.exit(1);
});
