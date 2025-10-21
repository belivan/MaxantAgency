/**
 * Direct API Test - Outreach Engine Fixes
 * Tests strategy_id parameter and variant generation
 */

const API_BASE = 'http://localhost:3002';

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

async function runTests() {
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║  DIRECT API TESTS - OUTREACH ENGINE FIXES            ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  // ═══════════════════════════════════════════════════════════
  // TEST 1: Strategy Selection (strategy_id parameter)
  // ═══════════════════════════════════════════════════════════

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 1: Strategy Selection (strategy_id parameter)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const strategies = [
    'problem-first',
    'achievement-focused',
    'compliment-sandwich',
    'industry-insight'
  ];

  for (const strategy of strategies) {
    try {
      console.log(`🧪 Testing: strategy_id="${strategy}"`);

      const response = await fetch(`${API_BASE}/api/compose`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: testLead.url,
          strategy_id: strategy,  // Using strategy_id (frontend's parameter name)
          generateVariants: false,  // Keep it simple for this test
          lead: testLead
        })
      });

      if (!response.ok) {
        const error = await response.json();
        console.log(`   ❌ FAIL: ${error.error || 'Unknown error'}\n`);
        continue;
      }

      const data = await response.json();
      const actualStrategy = data.email?.strategy || 'NOT FOUND';

      if (actualStrategy === strategy) {
        console.log(`   ✅ PASS: Strategy correctly set to "${actualStrategy}"`);
      } else {
        console.log(`   ❌ FAIL: Expected "${strategy}", got "${actualStrategy}"`);
      }

      // Show subject preview
      const subject = data.email?.subject || 'N/A';
      console.log(`   📧 Subject: ${subject}`);
      console.log('');

    } catch (error) {
      console.log(`   ❌ ERROR: ${error.message}\n`);
    }
  }

  // ═══════════════════════════════════════════════════════════
  // TEST 2: Variant Generation (A/B Testing)
  // ═══════════════════════════════════════════════════════════

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 2: Variant Generation (A/B Testing)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    console.log('🧪 Testing: generateVariants=true');
    console.log('   (This will take ~10-15 seconds due to AI generation...)\n');

    const startTime = Date.now();

    const response = await fetch(`${API_BASE}/api/compose`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: testLead.url,
        strategy_id: 'problem-first',
        generateVariants: true,  // Enable A/B testing
        lead: testLead
      })
    });

    const duration = Math.round((Date.now() - startTime) / 1000);

    if (!response.ok) {
      const error = await response.json();
      console.log(`   ❌ FAIL: ${error.error || 'Unknown error'}\n`);
      return;
    }

    const data = await response.json();
    const email = data.email || {};

    console.log(`   ⏱️  Generation time: ${duration} seconds\n`);

    // Check has_variants flag
    console.log(`📊 Variant Data Structure:`);
    console.log(`   has_variants: ${email.has_variants} ${email.has_variants === true ? '✅' : '❌'}`);

    // Check subject_variants
    if (Array.isArray(email.subject_variants)) {
      console.log(`   subject_variants: ${email.subject_variants.length} items ✅`);
      console.log(`\n   📝 Subject Line Variants:`);
      email.subject_variants.forEach((subject, idx) => {
        const isRecommended = email.recommended_variant?.subject === idx;
        const marker = isRecommended ? '⭐' : '  ';
        console.log(`      ${marker} ${idx + 1}. "${subject}"`);
      });
    } else {
      console.log(`   subject_variants: null ❌`);
    }

    // Check body_variants
    if (Array.isArray(email.body_variants)) {
      console.log(`\n   body_variants: ${email.body_variants.length} items ✅`);
      console.log(`\n   📄 Email Body Variants:`);
      email.body_variants.forEach((body, idx) => {
        const isRecommended = email.recommended_variant?.body === idx;
        const marker = isRecommended ? '⭐' : '  ';
        const preview = body.substring(0, 100).replace(/\n/g, ' ').trim();
        console.log(`      ${marker} ${idx + 1}. ${preview}...`);
      });
    } else {
      console.log(`   body_variants: null ❌`);
    }

    // Check recommended_variant
    if (email.recommended_variant) {
      console.log(`\n   recommended_variant: ✅`);
      console.log(`      Subject Index: ${email.recommended_variant.subject}`);
      console.log(`      Body Index: ${email.recommended_variant.body}`);
      console.log(`      (⭐ = Recommended variant marked above)`);
    } else {
      console.log(`\n   recommended_variant: null ❌`);
    }

    // Show AI reasoning
    if (email.variant_reasoning) {
      console.log(`\n   💡 AI Reasoning:`);
      console.log(`      "${email.variant_reasoning}"`);
    }

    // Show metadata
    console.log(`\n📈 Metadata:`);
    console.log(`   Strategy: ${email.strategy || 'N/A'}`);
    console.log(`   Model: ${email.model_used || 'N/A'}`);
    console.log(`   Cost: $${(email.total_cost || 0).toFixed(6)}`);
    console.log(`   Validation Score: ${email.validation_score || 'N/A'}/100`);

    // Calculate total possible combinations
    const subjectCount = email.subject_variants?.length || 0;
    const bodyCount = email.body_variants?.length || 0;
    const totalCombinations = subjectCount * bodyCount;

    console.log(`\n🎯 Total Possible Combinations: ${totalCombinations}`);
    console.log(`   (${subjectCount} subjects × ${bodyCount} bodies = ${totalCombinations} unique emails)`);

  } catch (error) {
    console.log(`   ❌ ERROR: ${error.message}\n`);
  }

  // ═══════════════════════════════════════════════════════════
  // RESULTS SUMMARY
  // ═══════════════════════════════════════════════════════════

  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║  TESTS COMPLETE                                        ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');
  console.log('✅ Strategy selection test: Check results above');
  console.log('✅ Variant generation test: Check results above\n');
}

// Run tests
console.log('🚀 Starting Outreach Engine API tests...');
runTests().catch(error => {
  console.error('\n❌ Test suite crashed:', error.message);
  process.exit(1);
});
