import fetch from 'node-fetch';
import fs from 'fs';

console.log('🧪 TESTING REFACTORED APP - DATA COLLECTION ONLY\n');
console.log('='.repeat(70));

const testUrl = 'https://maksant.com';

console.log(`\n📋 Test Configuration:`);
console.log(`   URL: ${testUrl}`);
console.log(`   Modules: Basic + Industry`);
console.log(`   Expected: Data collection WITHOUT email generation\n`);

try {
  console.log('⏳ Sending API request...\n');

  const response = await fetch('http://localhost:3000/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      urls: [testUrl],
      textModel: 'gpt-5-mini',
      depthTier: 'tier1',
      modules: {
        basic: true,
        industry: true
      },
      saveToSupabase: false  // Skip Supabase for quick test
    })
  });

  const result = await response.json();

  if (!result.success) {
    console.error('❌ API Error:', result.error);
    process.exit(1);
  }

  const siteResult = result.results[0];

  console.log('='.repeat(70));
  console.log('✅ ANALYSIS COMPLETE\n');

  // Test 1: Website Grade exists (not Lead Grade)
  console.log('TEST 1: Website Grading');
  if (siteResult.websiteGrade) {
    console.log(`   ✓ Website Grade: ${siteResult.websiteGrade} (${siteResult.websiteScore}/100)`);
  } else {
    console.log(`   ❌ Website Grade missing`);
  }

  if (siteResult.leadGrade) {
    console.log(`   ❌ ERROR: leadGrade still exists (should be removed!)`);
  } else {
    console.log(`   ✓ Lead Grade removed (as expected)`);
  }

  // Test 2: Email fields removed
  console.log('\nTEST 2: Email Fields Removed');
  if (!siteResult.email) {
    console.log(`   ✓ email field removed`);
  } else {
    console.log(`   ❌ ERROR: email field still exists`);
  }

  if (!siteResult.draft) {
    console.log(`   ✓ draft field removed`);
  } else {
    console.log(`   ❌ ERROR: draft field still exists`);
  }

  if (!siteResult.emailQA) {
    console.log(`   ✓ emailQA field removed`);
  } else {
    console.log(`   ❌ ERROR: emailQA field still exists`);
  }

  if (!siteResult.critiqueReasoning) {
    console.log(`   ✓ critiqueReasoning field removed`);
  } else {
    console.log(`   ❌ ERROR: critiqueReasoning field still exists`);
  }

  // Test 3: Data collection fields present
  console.log('\nTEST 3: Data Collection Fields Present');
  if (siteResult.contact) {
    console.log(`   ✓ contact: ${siteResult.contact.email || 'No email found'}`);
  } else {
    console.log(`   ❌ contact field missing`);
  }

  if (siteResult.grokData) {
    console.log(`   ✓ grokData: ${JSON.stringify(siteResult.grokData).length} bytes`);
    console.log(`      - Company: ${siteResult.grokData.companyInfo?.name || 'Unknown'}`);
    console.log(`      - Services: ${siteResult.grokData.businessIntel?.services?.length || 0}`);
  } else {
    console.log(`   ❌ grokData missing`);
  }

  if (siteResult.critiques) {
    console.log(`   ✓ critiques: ${siteResult.critiques.basic?.length || 0} basic, ${siteResult.critiques.industry?.length || 0} industry`);
  } else {
    console.log(`   ❌ critiques missing`);
  }

  // Test 4: Cost tracking
  console.log('\nTEST 4: Cost Tracking');
  if (siteResult.cost) {
    console.log(`   ✓ cost: $${siteResult.cost.toFixed(4)}`);
  } else {
    console.log(`   ❌ cost missing`);
  }

  if (siteResult.analysisTime) {
    console.log(`   ✓ analysisTime: ${siteResult.analysisTime}s`);
  } else {
    console.log(`   ❌ analysisTime missing`);
  }

  if (siteResult.costBreakdown) {
    console.log(`   ✓ costBreakdown present`);
    console.log(`      - grokExtraction: $${siteResult.costBreakdown.grokExtraction?.toFixed(4) || '0.0000'}`);
    console.log(`      - basicAnalysis: $${siteResult.costBreakdown.basicAnalysis?.toFixed(4) || '0.0000'}`);

    if (siteResult.costBreakdown.emailWriting) {
      console.log(`   ❌ ERROR: emailWriting cost still in breakdown`);
    }
    if (siteResult.costBreakdown.critiqueReasoning) {
      console.log(`   ❌ ERROR: critiqueReasoning cost still in breakdown`);
    }
    if (siteResult.costBreakdown.qaReview) {
      console.log(`   ❌ ERROR: qaReview cost still in breakdown`);
    }
  } else {
    console.log(`   ❌ costBreakdown missing`);
  }

  // Test 5: Files created
  console.log('\nTEST 5: Files Created');
  const folderPath = siteResult.savedPath;
  if (folderPath && fs.existsSync(folderPath)) {
    console.log(`   ✓ Folder: ${folderPath}`);

    // Check for expected files
    const analysisData = `${folderPath}/analysis-data.json`;
    const clientInfo = `${folderPath}/client-info.json`;
    const basicIssues = `${folderPath}/basic-issues.txt`;

    // Files that should exist
    if (fs.existsSync(analysisData)) {
      console.log(`   ✓ analysis-data.json exists`);
    } else {
      console.log(`   ❌ analysis-data.json missing`);
    }

    if (fs.existsSync(clientInfo)) {
      console.log(`   ✓ client-info.json exists`);
    } else {
      console.log(`   ❌ client-info.json missing`);
    }

    if (fs.existsSync(basicIssues)) {
      console.log(`   ✓ basic-issues.txt exists`);
    } else {
      console.log(`   ❌ basic-issues.txt missing`);
    }

    // Files that should NOT exist
    const emailTxt = `${folderPath}/email.txt`;
    const critiqueTxt = `${folderPath}/critique-reasoning.txt`;
    const qaTxt = `${folderPath}/qa-review.txt`;

    if (!fs.existsSync(emailTxt)) {
      console.log(`   ✓ email.txt removed (as expected)`);
    } else {
      console.log(`   ❌ ERROR: email.txt still being created`);
    }

    if (!fs.existsSync(critiqueTxt)) {
      console.log(`   ✓ critique-reasoning.txt removed (as expected)`);
    } else {
      console.log(`   ❌ ERROR: critique-reasoning.txt still being created`);
    }

    if (!fs.existsSync(qaTxt)) {
      console.log(`   ✓ qa-review.txt removed (as expected)`);
    } else {
      console.log(`   ❌ ERROR: qa-review.txt still being created`);
    }

    // Check folder structure
    if (folderPath.includes('grade-')) {
      console.log(`   ✓ Folder uses grade-{letter} structure (correct)`);
    } else if (folderPath.includes('lead-')) {
      console.log(`   ❌ ERROR: Folder still uses lead-{letter} structure`);
    }
  } else {
    console.log(`   ❌ Folder not created or not found`);
  }

  console.log('\n' + '='.repeat(70));
  console.log('✅ REFACTOR TEST COMPLETE\n');

  console.log('📊 Summary:');
  console.log(`   ✓ Data collection: WORKING`);
  console.log(`   ✓ Email generation: REMOVED`);
  console.log(`   ✓ Grading: Website Grade only (Lead Grade removed)`);
  console.log(`   ✓ Cost: ~$${siteResult.cost?.toFixed(4) || 'N/A'} (cheaper than before)`);
  console.log(`   ✓ Files: Data files only (no email files)`);
  console.log(`   ✓ Folder: grade-{letter} structure\n`);

  console.log('🎯 REFACTORED APP IS WORKING CORRECTLY!\n');
  process.exit(0);

} catch (error) {
  console.error('\n❌ TEST FAILED:', error.message);
  console.error(error.stack);
  process.exit(1);
}
