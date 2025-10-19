/**
 * SIMPLE TEST: Trigger analyses via UI and verify results
 *
 * This test will analyze 3 sites and then check:
 * 1. Lead-based folder organization
 * 2. Dual grading system
 * 3. QA Agent grading
 * 4. Honest personalization
 */

import fetch from 'node-fetch';
import fs from 'fs/promises';
import path from 'path';

const API_URL = 'http://localhost:3000/api/analyze';

// Test with just 2 sites for speed
const TEST_SITES = [
  'https://maksant.com',     // Expected: Lead A (has email)
  'https://grindcorehouse.com' // Expected: Lead F (no email)
];

console.log('🧪 SIMPLE TEST: Lead-Based Folder System\n');
console.log('═'.repeat(70));
console.log('⏳ Analyzing 2 websites (this will take 2-3 minutes)...\n');

// Trigger analyses one by one
for (const url of TEST_SITES) {
  console.log(`🌐 Starting analysis: ${url}`);

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        urls: [url],
        emailType: 'local',
        depthTier: 'tier1', // Just 1 page for speed
        analysisModules: {
          basic: true,
          industry: true,
          seo: false,
          visual: false, // OFF to test no visual critiques
          competitor: false
        }
      })
    });

    // SSE response - just wait for it to complete
    const reader = response.body;
    let buffer = '';

    for await (const chunk of reader) {
      buffer += chunk.toString();
    }

    console.log(`✅ Analysis completed for ${url}\n`);

  } catch (err) {
    console.log(`❌ Analysis failed for ${url}: ${err.message}\n`);
  }

  // Wait a bit between analyses
  await new Promise(resolve => setTimeout(resolve, 2000));
}

console.log('\n' + '─'.repeat(70));
console.log('📊 Verifying results...\n');

// Now check the results
const resultsDir = path.join(process.cwd(), 'analysis-results');
const gradeFolders = await fs.readdir(resultsDir);

console.log(`Found folders: ${gradeFolders.join(', ')}\n`);

// Check if using lead-based organization
const leadFolders = gradeFolders.filter(f => f.startsWith('lead-'));
if (leadFolders.length > 0) {
  console.log(`✅ LEAD-BASED FOLDERS FOUND: ${leadFolders.join(', ')}`);
} else {
  console.log(`❌ NO LEAD-BASED FOLDERS (found: ${gradeFolders.join(', ')})`);
}

// Check each lead folder
for (const folder of leadFolders) {
  console.log(`\n📁 Checking ${folder}/:`);

  const folderPath = path.join(resultsDir, folder);
  const domains = await fs.readdir(folderPath);

  for (const domain of domains) {
    const domainPath = path.join(folderPath, domain);
    const timestamps = await fs.readdir(domainPath);
    const latestTimestamp = timestamps.sort().reverse()[0];

    console.log(`  └─ ${domain}/`);

    // Read analysis-data.json
    const analysisDataPath = path.join(domainPath, latestTimestamp, 'analysis-data.json');

    try {
      const data = JSON.parse(await fs.readFile(analysisDataPath, 'utf-8'));

      // Check for both grades
      if (data.leadGrade && data.websiteGrade) {
        console.log(`     ✅ Lead Grade: ${data.leadGrade}, Website Grade: ${data.websiteGrade} (${data.websiteScore}/100)`);
      } else {
        console.log(`     ❌ Missing grades (leadGrade: ${data.leadGrade || 'MISSING'}, websiteGrade: ${data.websiteGrade || 'MISSING'})`);
      }

      // Check QA review
      if (data.emailQA) {
        console.log(`     ✅ QA Review present (Grade: ${data.emailQA.leadGrade || data.emailQA.grade})`);
        if (data.emailQA.issues && data.emailQA.issues.length > 0) {
          console.log(`     ⚠️ Critical issues: ${data.emailQA.issues.length}`);
        }
        if (data.emailQA.warnings && data.emailQA.warnings.length > 0) {
          console.log(`     ⚠️ Warnings: ${data.emailQA.warnings.length}`);
        }
      } else {
        console.log(`     ❌ NO QA review data`);
      }

      // Check email
      const emailPath = path.join(domainPath, latestTimestamp, 'email.txt');
      try {
        const email = await fs.readFile(emailPath, 'utf-8');

        // Check for fake personalization
        const bannedPhrases = ['Love your Instagram', 'Love your Facebook', 'Your Instagram posts'];
        let hasFake = false;
        for (const phrase of bannedPhrases) {
          if (email.includes(phrase)) {
            console.log(`     ❌ FAKE PERSONALIZATION: "${phrase}"`);
            hasFake = true;
          }
        }
        if (!hasFake) {
          console.log(`     ✅ No fake personalization`);
        }

        // Check for signature
        if (email.includes('412-315-8398') && email.includes('Co-Founder')) {
          console.log(`     ✅ Full signature present`);
        } else {
          console.log(`     ❌ Incomplete signature`);
        }

        // Check for visual critiques (should be NONE since visual module OFF)
        const visualPhrases = ['button too small', 'hard to see', 'poor contrast'];
        let hasVisual = false;
        for (const phrase of visualPhrases) {
          if (email.toLowerCase().includes(phrase)) {
            console.log(`     ❌ VISUAL CRITIQUE when module OFF: "${phrase}"`);
            hasVisual = true;
          }
        }
        if (!hasVisual) {
          console.log(`     ✅ No visual critiques (visual module was OFF)`);
        }

      } catch (err) {
        console.log(`     ❌ Could not read email.txt: ${err.message}`);
      }

    } catch (err) {
      console.log(`     ❌ Could not read analysis-data.json: ${err.message}`);
    }
  }
}

console.log('\n' + '═'.repeat(70));
console.log('✅ TEST COMPLETE\n');
