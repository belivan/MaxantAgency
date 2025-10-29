/**
 * Test HTML Export with Top Priority
 */

import { readFile } from 'fs/promises';
import { generateHTMLReportV3 } from './analysis-engine/reports/exporters/html-exporter-v3-concise.js';

async function testTopPriority() {
  console.log('\n🧪 Testing Top Priority HTML Export\n');

  // Load the backup data
  const backupPath = './local-backups/analysis-engine/leads/elmwood-dental-report-fixes-test-2025-10-27-1761583695218.json';
  const data = JSON.parse(await readFile(backupPath, 'utf8'));

  console.log('📊 Input data:');
  console.log('   top_issue:', JSON.stringify(data.top_issue, null, 2));

  // Generate HTML report
  console.log('\n🎨 Generating HTML report...\n');
  const html = await generateHTMLReportV3(data, {});

  // Extract the Top Priority section from HTML
  const priorityMatch = html.match(/🎯 Top Priority:<\/strong>\n\s+(.+?)\n/);
  if (priorityMatch) {
    console.log('✅ Top Priority in HTML:', priorityMatch[1]);
  } else {
    console.log('❌ Top Priority section not found in HTML');
  }
}

testTopPriority().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
