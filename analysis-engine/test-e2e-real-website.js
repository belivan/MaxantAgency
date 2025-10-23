/**
 * End-to-End Test with REAL Website
 * Tests the complete pipeline: Analysis → Synthesis → Report
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '../');
dotenv.config({ path: join(projectRoot, '.env') });

import { analyzeWebsiteIntelligent } from './orchestrator.js';

console.log('');
console.log('═'.repeat(80));
console.log('END-TO-END TEST: Real Website Analysis with AI Synthesis');
console.log('═'.repeat(80));
console.log('');

// Test with a simple, fast-loading website
const TEST_URL = 'https://example.com';
const TEST_COMPANY = 'Example Corporation';
const TEST_INDUSTRY = 'Technology';

console.log('📊 Test Configuration:');
console.log(`   URL: ${TEST_URL}`);
console.log(`   Company: ${TEST_COMPANY}`);
console.log(`   Industry: ${TEST_INDUSTRY}`);
console.log(`   USE_AI_SYNTHESIS: ${process.env.USE_AI_SYNTHESIS}`);
console.log(`   AUTO_GENERATE_REPORTS: ${process.env.AUTO_GENERATE_REPORTS}`);
console.log('');

if (process.env.USE_AI_SYNTHESIS !== 'true') {
  console.log('⚠️  WARNING: USE_AI_SYNTHESIS is not enabled!');
  console.log('   Set USE_AI_SYNTHESIS=true in .env to test synthesis');
  console.log('');
}

async function runE2ETest() {
  console.log('🚀 Starting full analysis pipeline...');
  console.log('⏱️  This will take 5-7 minutes (includes synthesis)');
  console.log('');

  const startTime = Date.now();

  try {
    // Run full analysis with auto-report generation
    const result = await analyzeWebsiteIntelligent(
      TEST_URL,
      {
        company_name: TEST_COMPANY,
        industry: TEST_INDUSTRY
      },
      {
        generate_report: true,
        save_to_database: false  // Don't save test data
      }
    );

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log('');
    console.log('═'.repeat(80));
    console.log('✅ ANALYSIS COMPLETE');
    console.log('═'.repeat(80));
    console.log('');

    // Display results
    console.log('📊 Analysis Results:');
    console.log(`   Company: ${result.company_name}`);
    console.log(`   Grade: ${result.grade} (${result.overall_score}/100)`);
    console.log(`   Lead Priority: ${result.lead_priority}/100 (${result.priority_tier})`);
    console.log(`   Duration: ${duration}s`);
    console.log('');

    console.log('🎨 Scores Breakdown:');
    console.log(`   Desktop Design: ${result.design_score_desktop}/100`);
    console.log(`   Mobile Design: ${result.design_score_mobile}/100`);
    console.log(`   SEO: ${result.seo_score}/100`);
    console.log(`   Content: ${result.content_score}/100`);
    console.log(`   Social: ${result.social_score}/100`);
    if (result.accessibility_score) {
      console.log(`   Accessibility: ${result.accessibility_score}/100`);
    }
    console.log('');

    console.log('🔍 Issues Found:');
    console.log(`   Desktop: ${result.design_issues_desktop?.length || 0} issues`);
    console.log(`   Mobile: ${result.design_issues_mobile?.length || 0} issues`);
    console.log(`   SEO: ${result.seo_issues?.length || 0} issues`);
    console.log(`   Content: ${result.content_issues?.length || 0} issues`);
    console.log(`   Social: ${result.social_issues?.length || 0} issues`);
    console.log(`   Total: ${(result.design_issues_desktop?.length || 0) +
                             (result.design_issues_mobile?.length || 0) +
                             (result.seo_issues?.length || 0) +
                             (result.content_issues?.length || 0) +
                             (result.social_issues?.length || 0)} issues`);
    console.log('');

    console.log('⚡ Quick Wins:');
    console.log(`   ${result.quick_wins?.length || 0} opportunities identified`);
    if (result.quick_wins && result.quick_wins.length > 0) {
      result.quick_wins.slice(0, 3).forEach((win, i) => {
        console.log(`   ${i + 1}. ${win.title || win}`);
      });
      if (result.quick_wins.length > 3) {
        console.log(`   ... and ${result.quick_wins.length - 3} more`);
      }
    }
    console.log('');

    // Check if report was generated
    if (result.report) {
      console.log('📝 Report Generated:');
      console.log(`   Success: ${result.report.success}`);
      console.log(`   Format: ${result.report.format}`);
      console.log(`   File Size: ${result.report.file_size} bytes`);
      console.log(`   Local Path: ${result.report.local_path}`);
      console.log('');

      // Check synthesis usage
      if (result.report.synthesis) {
        console.log('🤖 AI Synthesis:');
        console.log(`   Used: ${result.report.synthesis.used ? '✅ YES' : '❌ NO'}`);
        if (result.report.synthesis.used) {
          console.log(`   Consolidated Issues: ${result.report.synthesis.consolidatedIssuesCount}`);
          console.log(`   Errors: ${result.report.synthesis.errors.length}`);

          const originalCount = (result.design_issues_desktop?.length || 0) +
                               (result.design_issues_mobile?.length || 0) +
                               (result.seo_issues?.length || 0) +
                               (result.content_issues?.length || 0) +
                               (result.social_issues?.length || 0);

          if (originalCount > 0 && result.report.synthesis.consolidatedIssuesCount > 0) {
            const reduction = Math.round(((originalCount - result.report.synthesis.consolidatedIssuesCount) / originalCount) * 100);
            console.log(`   Redundancy Reduction: ${reduction}% (${originalCount} → ${result.report.synthesis.consolidatedIssuesCount} issues)`);
          }
        } else if (process.env.USE_AI_SYNTHESIS === 'true') {
          console.log(`   ⚠️  Synthesis was enabled but didn't run`);
          if (result.report.synthesis.errors.length > 0) {
            console.log(`   Errors: ${result.report.synthesis.errors.map(e => e.message).join(', ')}`);
          }
        }
        console.log('');
      }
    }

    // Analysis metadata
    if (result.crawl_metadata) {
      console.log('🌐 Crawl Metadata:');
      console.log(`   Pages Analyzed: ${result.crawl_metadata.pages_analyzed?.length || 0}`);
      console.log(`   Screenshots Captured: ${result.crawl_metadata.total_screenshots || 0}`);
      console.log('');
    }

    console.log('═'.repeat(80));
    console.log('✅ END-TO-END TEST PASSED');
    console.log('═'.repeat(80));
    console.log('');
    console.log('Next Steps:');
    console.log('1. Review the generated report at:');
    console.log(`   ${result.report?.local_path || 'local-backups/analysis-engine/reports/'}`);
    console.log('');
    console.log('2. Check for AI-generated sections:');
    console.log('   - Executive Summary with strategic roadmap');
    console.log('   - Consolidated issues (no duplicates)');
    console.log('   - Business-friendly language');
    console.log('');
    console.log('3. Compare with a report generated without synthesis');
    console.log('   (set USE_AI_SYNTHESIS=false and run again)');
    console.log('');

    process.exit(0);

  } catch (error) {
    console.error('');
    console.error('═'.repeat(80));
    console.error('❌ END-TO-END TEST FAILED');
    console.error('═'.repeat(80));
    console.error('');
    console.error('Error:', error.message);
    if (error.stack) {
      console.error('');
      console.error('Stack trace:');
      console.error(error.stack);
    }
    console.error('');
    process.exit(1);
  }
}

// Run the test
console.log('⚠️  Note: This will analyze a REAL website and generate a full report.');
console.log('Expected duration: 5-7 minutes (includes multi-page crawl + synthesis)');
console.log('');

runE2ETest();
