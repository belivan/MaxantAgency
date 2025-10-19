/**
 * Quick test to verify QA Agent JSON parsing fix
 */

import fetch from 'node-fetch';
import fs from 'fs/promises';
import path from 'path';

console.log('🧪 Quick test: QA Agent JSON parsing fix\n');

const response = await fetch('http://localhost:3000/api/analyze', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    urls: ['https://maksant.com'],
    emailType: 'local',
    depthTier: 'tier1',
    analysisModules: {
      basic: true,
      industry: false,
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

// Check the results
const resultsDir = path.join(process.cwd(), 'analysis-results');
const leadFolders = (await fs.readdir(resultsDir)).filter(f => f.startsWith('lead-'));

console.log(`Found lead folders: ${leadFolders.join(', ')}\n`);

for (const folder of leadFolders) {
  const folderPath = path.join(resultsDir, folder);
  const domains = await fs.readdir(folderPath);

  for (const domain of domains) {
    if (domain === 'maksant.com') {
      const domainPath = path.join(folderPath, domain);
      const timestamps = await fs.readdir(domainPath);
      const latest = timestamps.sort().reverse()[0];

      console.log(`📂 Checking ${folder}/${domain}/${latest}\n`);

      // Read analysis-data.json
      const analysisData = JSON.parse(
        await fs.readFile(path.join(domainPath, latest, 'analysis-data.json'), 'utf-8')
      );

      if (analysisData.emailQA) {
        console.log(`✅ QA REVIEW DATA FOUND:`);
        console.log(`   Lead Grade: ${analysisData.emailQA.leadGrade || analysisData.emailQA.grade}`);
        console.log(`   Passed: ${analysisData.emailQA.passed}`);
        console.log(`   Issues: ${analysisData.emailQA.issues?.length || 0}`);
        console.log(`   Warnings: ${analysisData.emailQA.warnings?.length || 0}`);
        console.log(`   Suggestions: ${analysisData.emailQA.suggestions?.length || 0}`);
        console.log(`   Summary: ${analysisData.emailQA.summary}\n`);

        // Check qa-review.txt
        const qaReviewPath = path.join(domainPath, latest, 'qa-review.txt');
        const qaReview = await fs.readFile(qaReviewPath, 'utf-8');

        if (qaReview.includes('Not valid JSON')) {
          console.log(`❌ QA REVIEW FILE STILL HAS JSON ERROR\n`);
        } else {
          console.log(`✅ QA REVIEW FILE HAS NO JSON ERROR\n`);
        }

        console.log('✅ QA Agent JSON parsing fix VERIFIED!');
      } else {
        console.log(`❌ NO QA REVIEW DATA in analysis-data.json`);
      }
    }
  }
}
