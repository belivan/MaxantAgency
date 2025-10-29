/**
 * Test Full Report Generation with Real Data
 * Uses JP Dental Hartford (fully populated) to verify our report changes
 */

import { readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { generateHTMLReportV3, generateHTMLReportV3Full } from './analysis-engine/reports/exporters/html-exporter-v3.js';

async function testFullReport() {
  console.log('\n🔬 Testing Full Report with Real Data\n');

  // Load JP Dental Hartford data (fully populated with all sections)
  const backupPath = './local-backups/analysis-engine/leads/jp-dental-hartford-2025-10-27-1761577779693.json';
  const backupData = JSON.parse(await readFile(backupPath, 'utf8'));

  // CRITICAL FIX: Extract the full analysis result from nested structure
  const analysisData = backupData.data?.analysis_result || backupData;

  console.log('📊 Test Company:', analysisData.company_name);
  console.log('   Grade:', analysisData.grade || analysisData.website_grade);
  console.log('   Score:', analysisData.overall_score);
  console.log('   Data fields available:', Object.keys(analysisData).length);
  console.log('   Pages Crawled:', analysisData.crawl_metadata?.pages_crawled || 0);
  console.log('   Has Business Intel:', !!analysisData.business_intelligence);
  console.log('   Accessibility Issues:', analysisData.accessibility_issues?.length || 0);

  // Ensure reports directory exists
  const reportsDir = './local-backups/analysis-engine/reports';
  await mkdir(reportsDir, { recursive: true });

  // Generate PREVIEW report
  console.log('\n🎨 Generating PREVIEW report...');
  const previewHtml = await generateHTMLReportV3(analysisData, {});
  const previewPath = join(reportsDir, 'jp-dental-hartford-TEST-PREVIEW.html');
  await writeFile(previewPath, previewHtml, 'utf8');
  console.log('✅ Preview report saved:', previewPath);

  // Generate FULL report (with our new changes)
  console.log('\n📊 Generating FULL report with our changes...');
  const fullHtml = await generateHTMLReportV3Full(analysisData, {});
  const fullPath = join(reportsDir, 'jp-dental-hartford-TEST-FULL.html');
  await writeFile(fullPath, fullHtml, 'utf8');
  console.log('✅ Full report saved:', fullPath);

  // Count sections in both reports
  const previewSections = (previewHtml.match(/section-title-icon/g) || []).length;
  const fullSections = (fullHtml.match(/section-title-icon/g) || []).length;

  console.log('\n📈 Report Comparison:');
  console.log('   Preview Sections:', previewSections);
  console.log('   Full Sections:', fullSections);
  console.log('   Preview Lines:', previewHtml.split('\n').length);
  console.log('   Full Lines:', fullHtml.split('\n').length);

  // Check for our new sections in FULL report
  console.log('\n✅ Section Verification (FULL Report):');
  console.log('   Business Intelligence:', fullHtml.includes('Business Intelligence') ? '✅ Present' : '❌ Missing');
  console.log('   WCAG Accessibility:', fullHtml.includes('WCAG Accessibility Compliance') ? '✅ Present' : '❌ Missing');
  console.log('   Visual Evidence:', fullHtml.includes('Visual Evidence Gallery') || fullHtml.includes('Multi-Page Screenshot') ? '✅ Present' : '❌ Missing');
  console.log('   Technical Deep Dive:', fullHtml.includes('Technical Deep Dive') ? '✅ Present' : '❌ Missing');
  console.log('   Complete Issue Breakdown:', fullHtml.includes('Complete Issue Breakdown') ? '✅ Present' : '❌ Missing');

  // Check if sections show real data or fallback
  const hasBIData = fullHtml.includes('Company Size') || fullHtml.includes('Years in Business');
  const hasWCAGData = fullHtml.includes('Level A (Basic)') && fullHtml.includes('Level AA (Standard)');
  const hasScreenshots = fullHtml.includes('crawled pages');

  console.log('\n📊 Data Population Check:');
  console.log('   Business Intelligence:', hasBIData ? '✅ Real Data' : '⚠️  Fallback');
  console.log('   WCAG Compliance:', hasWCAGData ? '✅ Real Data' : '⚠️  Fallback');
  console.log('   Screenshot Gallery:', hasScreenshots ? '✅ Multi-Page' : '⚠️  Homepage Only');

  console.log('\n🎉 Report generation complete!\n');
  console.log('📄 Compare these files:');
  console.log('   OLD: local-backups/analysis-engine/reports/jp-dental-hartford-FULL.html');
  console.log('   NEW: local-backups/analysis-engine/reports/jp-dental-hartford-TEST-FULL.html');
  console.log('\nOpen both in browser to compare side-by-side!');
}

testFullReport().catch(err => {
  console.error('❌ Error:', err.message);
  console.error(err.stack);
  process.exit(1);
});
