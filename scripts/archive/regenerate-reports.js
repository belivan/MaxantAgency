/**
 * Regenerate HTML Reports from Existing Lead Data
 */

import { readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { generateHTMLReportV3, generateHTMLReportV3Full } from './analysis-engine/reports/exporters/html-exporter-v3.js';

async function regenerateReports() {
  console.log('\n🔄 Regenerating HTML Reports\n');

  // Load the backup data
  const backupPath = './local-backups/analysis-engine/leads/elmwood-dental-report-fixes-test-2025-10-27-1761583695218.json';
  const backupData = JSON.parse(await readFile(backupPath, 'utf8'));

  // CRITICAL FIX: The backup file has data nested in data.analysis_result
  // We need to pass the FULL analysis result, not the summary wrapper
  const analysisData = backupData.data?.analysis_result || backupData;

  console.log('📊 Company:', analysisData.company_name);
  console.log('   Grade:', analysisData.grade || analysisData.website_grade);
  console.log('   Score:', analysisData.overall_score);
  console.log('   Top Issue:', analysisData.top_issue?.title, '-', analysisData.top_issue?.impact);
  console.log('   Data fields available:', Object.keys(analysisData).length);

  // Ensure reports directory exists
  const reportsDir = './local-backups/analysis-engine/reports';
  await mkdir(reportsDir, { recursive: true });

  // Generate PREVIEW report
  console.log('\n🎨 Generating PREVIEW report...');
  const previewHtml = await generateHTMLReportV3(analysisData, {});
  const previewPath = join(reportsDir, 'elmwood-dental-LATEST-PREVIEW.html');
  await writeFile(previewPath, previewHtml, 'utf8');
  console.log('✅ Preview report saved:', previewPath);

  // Generate FULL report
  console.log('\n📊 Generating FULL report...');
  const fullHtml = await generateHTMLReportV3Full(analysisData, {});
  const fullPath = join(reportsDir, 'elmwood-dental-LATEST-FULL.html');
  await writeFile(fullPath, fullHtml, 'utf8');
  console.log('✅ Full report saved:', fullPath);

  console.log('\n🎉 Reports regenerated successfully!\n');
  console.log('Preview:', previewPath);
  console.log('Full:', fullPath);
}

regenerateReports().catch(err => {
  console.error('❌ Error:', err.message);
  console.error(err.stack);
  process.exit(1);
});
