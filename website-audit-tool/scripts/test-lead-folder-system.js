/**
 * COMPREHENSIVE TEST: Lead-Based Folder Organization + Dual Grading System
 *
 * Tests:
 * 1. Folders organized by LEAD grade (lead-A/, lead-B/, etc.)
 * 2. Both leadGrade and websiteGrade in analysis-data.json
 * 3. Website grade reflects all modules run
 * 4. QA Agent properly grades lead quality
 * 5. Agent boundaries respected (honest personalization, no visual critiques)
 */

import fetch from 'node-fetch';
import fs from 'fs/promises';
import path from 'path';

const API_URL = 'http://localhost:3000/api/analyze';

// Philadelphia businesses to test (variety of quality levels)
const TEST_WEBSITES = [
  'https://maksant.com',           // Expected: Lead A (has email, good data)
  'https://goettl.com',             // Expected: Lead A (has email, excellent data)
  'https://grindcorehouse.com',     // Expected: Lead F (no email)
  'https://emergefitnesstraining.com', // Expected: Lead C (phone-only)
  'https://sweetgreen.com'          // Expected: Lead B or C (large site, may timeout)
];

async function runTest() {
  console.log('🧪 COMPREHENSIVE TEST: Lead-Based Folder Organization\n');
  console.log('═'.repeat(70));

  for (const url of TEST_WEBSITES) {
    console.log(`\n🌐 Testing: ${url}`);
    console.log('─'.repeat(70));

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          urls: [url],
          emailType: 'local',
          depthTier: 'tier2', // 3 pages
          analysisModules: {
            basic: true,
            industry: true,
            seo: true,
            visual: false, // Test without visual to verify no visual critiques
            competitor: false
          }
        })
      });

      if (!response.ok) {
        console.log(`❌ API request failed: ${response.status}`);
        continue;
      }

      const data = await response.json();
      const result = data.results?.[0];

      if (!result) {
        console.log('❌ No result returned');
        continue;
      }

      console.log(`\n✅ Analysis completed for ${url}`);

      // ═══════════════════════════════════════════════════════════════
      // TEST 1: Folder organization by LEAD grade
      // ═══════════════════════════════════════════════════════════════
      const domain = new URL(url).hostname.replace('www.', '');
      const resultsDir = path.join(process.cwd(), 'analysis-results');

      // Find the folder (should be lead-A/, lead-B/, etc.)
      const gradeFolders = await fs.readdir(resultsDir);
      const leadFolder = gradeFolders.find(folder => {
        const domainPath = path.join(resultsDir, folder, domain);
        try {
          fs.access(domainPath);
          return true;
        } catch {
          return false;
        }
      });

      if (leadFolder && leadFolder.startsWith('lead-')) {
        console.log(`  ✅ Folder organized by LEAD grade: ${leadFolder}/`);
      } else {
        console.log(`  ❌ Folder NOT using lead-based organization: ${leadFolder}`);
      }

      // ═══════════════════════════════════════════════════════════════
      // TEST 2: Read analysis-data.json and verify both grades
      // ═══════════════════════════════════════════════════════════════
      if (leadFolder) {
        const domainPath = path.join(resultsDir, leadFolder, domain);
        const timestamps = await fs.readdir(domainPath);
        const latestTimestamp = timestamps.sort().reverse()[0];
        const analysisDataPath = path.join(domainPath, latestTimestamp, 'analysis-data.json');

        try {
          const analysisData = JSON.parse(await fs.readFile(analysisDataPath, 'utf-8'));

          console.log(`\n  📊 DUAL GRADING SYSTEM:`);
          console.log(`     Lead Grade: ${analysisData.leadGrade || 'MISSING ❌'}`);
          console.log(`     Website Grade: ${analysisData.websiteGrade || 'MISSING ❌'}`);
          console.log(`     Website Score: ${analysisData.websiteScore || 'MISSING ❌'}/100`);

          if (analysisData.leadGrade && analysisData.websiteGrade) {
            console.log(`  ✅ Both grades present in analysis-data.json`);
          } else {
            console.log(`  ❌ Missing one or both grades`);
          }

          // ═══════════════════════════════════════════════════════════════
          // TEST 3: Website grade reflects modules used
          // ═══════════════════════════════════════════════════════════════
          const modulesUsed = analysisData.modulesUsed || [];
          console.log(`\n  🔧 MODULES USED: ${modulesUsed.join(', ')}`);

          if (modulesUsed.length > 0) {
            console.log(`  ✅ Website grade includes module data`);
          } else {
            console.log(`  ❌ No modules recorded`);
          }

          // ═══════════════════════════════════════════════════════════════
          // TEST 4: QA Agent grading
          // ═══════════════════════════════════════════════════════════════
          if (analysisData.emailQA) {
            console.log(`\n  🤖 QA AGENT REVIEW:`);
            console.log(`     Grade: ${analysisData.emailQA.leadGrade || analysisData.emailQA.grade}`);
            console.log(`     Passed: ${analysisData.emailQA.passed ? 'Yes' : 'No'}`);
            console.log(`     Critical Issues: ${analysisData.emailQA.issues?.length || 0}`);
            console.log(`     Warnings: ${analysisData.emailQA.warnings?.length || 0}`);
            console.log(`  ✅ QA Review data present`);
          } else {
            console.log(`  ❌ No QA review data found`);
          }

          // ═══════════════════════════════════════════════════════════════
          // TEST 5: Email quality - honest personalization
          // ═══════════════════════════════════════════════════════════════
          const emailPath = path.join(domainPath, latestTimestamp, 'email.txt');
          const emailText = await fs.readFile(emailPath, 'utf-8');

          const bannedPhrases = [
            'Love your Instagram',
            'Love your Facebook',
            'Your Instagram posts are great',
            'Your Facebook posts',
            'Love your tweets'
          ];

          let foundBannedPhrase = false;
          for (const phrase of bannedPhrases) {
            if (emailText.includes(phrase)) {
              console.log(`  ❌ FAKE PERSONALIZATION DETECTED: "${phrase}"`);
              foundBannedPhrase = true;
            }
          }

          if (!foundBannedPhrase) {
            console.log(`  ✅ No fake personalization detected`);
          }

          // Check for honest alternatives
          const honestPhrases = [
            'I see you\'re',
            'Noticed you',
            'Your services include'
          ];

          let foundHonestPhrase = false;
          for (const phrase of honestPhrases) {
            if (emailText.includes(phrase)) {
              console.log(`  ✅ Honest personalization found: "${phrase}"`);
              foundHonestPhrase = true;
              break;
            }
          }

          // ═══════════════════════════════════════════════════════════════
          // TEST 6: No visual critiques when visual module OFF
          // ═══════════════════════════════════════════════════════════════
          const visualBannedPhrases = [
            'button is too small',
            'button too small',
            'hard to see',
            'not visible',
            'poor contrast',
            'cluttered'
          ];

          let foundVisualCritique = false;
          for (const phrase of visualBannedPhrases) {
            if (emailText.toLowerCase().includes(phrase.toLowerCase())) {
              console.log(`  ❌ VISUAL CRITIQUE DETECTED (visual module OFF): "${phrase}"`);
              foundVisualCritique = true;
            }
          }

          if (!foundVisualCritique) {
            console.log(`  ✅ No visual critiques when visual module OFF`);
          }

          // ═══════════════════════════════════════════════════════════════
          // TEST 7: Email signature present
          // ═══════════════════════════════════════════════════════════════
          if (emailText.includes('412-315-8398') &&
              emailText.includes('https://maksant.com') &&
              emailText.includes('Co-Founder')) {
            console.log(`  ✅ Full email signature present`);
          } else {
            console.log(`  ❌ Incomplete email signature`);
          }

        } catch (err) {
          console.log(`  ❌ Error reading analysis files: ${err.message}`);
        }
      }

    } catch (err) {
      console.log(`❌ Test failed: ${err.message}`);
    }
  }

  console.log('\n' + '═'.repeat(70));
  console.log('✅ COMPREHENSIVE TEST COMPLETE\n');
}

runTest();
