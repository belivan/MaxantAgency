/**
 * COMPREHENSIVE TEST: Verify All New Features
 *
 * Tests:
 * 1. Lead-based folder organization (lead-A/, lead-B/, etc.)
 * 2. Dual grading system (websiteGrade + leadGrade)
 * 3. emailQA field in analysis-data.json
 * 4. Platform detection (techStack field)
 * 5. Honest personalization
 */

import fetch from 'node-fetch';
import fs from 'fs/promises';
import path from 'path';

console.log('🧪 COMPREHENSIVE FEATURE TEST\n');
console.log('Testing: maksant.com (should have email, get good grades)\n');
console.log('═'.repeat(70));

// Trigger analysis
const response = await fetch('http://localhost:3000/api/analyze', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    urls: ['https://maksant.com'],
    emailType: 'local',
    depthTier: 'tier1',
    analysisModules: {
      basic: true,
      industry: true,
      seo: false,
      visual: false,
      competitor: false
    }
  })
});

// Wait for SSE to complete
for await (const chunk of response.body) {
  // Just consume the stream
}

console.log('✅ Analysis complete!\n');

// Find the latest result
const resultsDir = path.join(process.cwd(), 'analysis-results');
const leadFolders = (await fs.readdir(resultsDir)).filter(f => f.startsWith('lead-'));

console.log('📁 FEATURE 1: Lead-Based Folder Organization');
console.log(`   Found folders: ${leadFolders.join(', ')}`);

if (leadFolders.length > 0) {
  console.log('   ✅ PASS: Using lead-based folders\n');
} else {
  console.log('   ❌ FAIL: No lead-based folders found\n');
}

// Find maksant.com in folders
let analysisData = null;
let folderPath = null;

for (const folder of leadFolders) {
  const domainPath = path.join(resultsDir, folder, 'maksant.com');
  try {
    const timestamps = await fs.readdir(domainPath);
    const latest = timestamps.sort().reverse()[0];
    folderPath = path.join(domainPath, latest);

    const dataPath = path.join(folderPath, 'analysis-data.json');
    analysisData = JSON.parse(await fs.readFile(dataPath, 'utf-8'));

    console.log(`📂 Found latest analysis: ${folder}/maksant.com/${latest}\n`);
    break;
  } catch (e) {
    // Folder doesn't exist, continue
  }
}

if (!analysisData) {
  console.log('❌ Could not find analysis data');
  process.exit(1);
}

// Test Feature 2: Dual Grading System
console.log('📊 FEATURE 2: Dual Grading System');
console.log(`   Website Grade: ${analysisData.websiteGrade || 'MISSING ❌'}`);
console.log(`   Website Score: ${analysisData.websiteScore || 'MISSING ❌'}/100`);
console.log(`   Lead Grade: ${analysisData.leadGrade || 'MISSING ❌'}`);

if (analysisData.websiteGrade && analysisData.websiteScore !== undefined && analysisData.leadGrade) {
  console.log('   ✅ PASS: Both grades present\n');
} else {
  console.log('   ❌ FAIL: Missing one or both grades\n');
}

// Test Feature 3: emailQA Field
console.log('🤖 FEATURE 3: QA Review Data (emailQA)');

if (analysisData.emailQA) {
  console.log(`   Lead Grade: ${analysisData.emailQA.leadGrade || analysisData.emailQA.grade}`);
  console.log(`   Passed: ${analysisData.emailQA.passed ? 'Yes' : 'No'}`);
  console.log(`   Critical Issues: ${analysisData.emailQA.issues?.length || 0}`);
  console.log(`   Warnings: ${analysisData.emailQA.warnings?.length || 0}`);
  console.log(`   Suggestions: ${analysisData.emailQA.suggestions?.length || 0}`);
  console.log(`   Summary: ${analysisData.emailQA.summary}`);
  console.log('   ✅ PASS: emailQA field present and populated\n');
} else {
  console.log('   ❌ FAIL: emailQA field missing\n');
}

// Test Feature 4: Platform Detection
console.log('🔧 FEATURE 4: Platform/Tech Stack Detection');

if (analysisData.grokData?.techStack) {
  const tech = analysisData.grokData.techStack;
  console.log(`   Platform: ${tech.platform || 'Not detected'}`);
  console.log(`   Version: ${tech.platformVersion || 'N/A'}`);
  console.log(`   Framework: ${tech.framework || 'Not detected'}`);
  console.log(`   CSS Framework: ${tech.cssFramework || 'Not detected'}`);
  console.log(`   Hosting: ${tech.hosting || 'Not detected'}`);
  console.log(`   Tools: ${tech.tools?.join(', ') || 'None detected'}`);
  console.log(`   Confidence: ${tech.confidence || 'N/A'}`);
  console.log(`   Detection Method: ${tech.detectionMethod || 'N/A'}`);
  console.log('   ✅ PASS: techStack field present\n');
} else {
  console.log('   ⚠️  WARN: techStack field missing (Grok may not have detected anything)\n');
}

// Test Feature 5: Honest Personalization
console.log('✉️  FEATURE 5: Honest Personalization (No Fake Engagement)');

const emailPath = path.join(folderPath, 'email.txt');
const emailText = await fs.readFile(emailPath, 'utf-8');

const bannedPhrases = [
  'Love your Instagram',
  'Love your Facebook',
  'Your Instagram posts are great',
  'Your Facebook posts',
  'Love your tweets',
  'Your Instagram photos are amazing'
];

let foundBanned = false;
for (const phrase of bannedPhrases) {
  if (emailText.includes(phrase)) {
    console.log(`   ❌ FAIL: Found fake personalization: "${phrase}"`);
    foundBanned = true;
  }
}

if (!foundBanned) {
  console.log('   ✅ PASS: No fake personalization detected\n');
}

// Summary
console.log('═'.repeat(70));
console.log('\n📋 TEST SUMMARY:\n');

const tests = [
  { name: 'Lead-Based Folders', passed: leadFolders.length > 0 },
  { name: 'Dual Grading System', passed: analysisData.websiteGrade && analysisData.leadGrade },
  { name: 'QA Review Data (emailQA)', passed: !!analysisData.emailQA },
  { name: 'Platform Detection', passed: !!analysisData.grokData?.techStack },
  { name: 'Honest Personalization', passed: !foundBanned }
];

const passedCount = tests.filter(t => t.passed).length;

tests.forEach(test => {
  console.log(`${test.passed ? '✅' : '❌'} ${test.name}`);
});

console.log(`\n${passedCount}/${tests.length} tests passed`);

if (passedCount === tests.length) {
  console.log('\n🎉 ALL FEATURES WORKING PERFECTLY!\n');
} else {
  console.log('\n⚠️  Some features need attention\n');
}
