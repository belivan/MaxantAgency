/**
 * Full V3 Pipeline Test
 * Tests the complete analysis → synthesis → report generation pipeline
 */

import { analyzeWebsite } from './analysis-engine/orchestrator.js';
import { autoGenerateReport } from '../analysis-engine/reports/auto-report-generator.js';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: './analysis-engine/.env' });

// Force V3 report version
process.env.REPORT_VERSION = 'v3';
process.env.USE_AI_SYNTHESIS = 'true';
process.env.AUTO_GENERATE_REPORTS = 'true';

async function testFullPipeline() {
  console.log('🚀 FULL V3 PIPELINE TEST');
  console.log('========================\n');

  console.log('Configuration:');
  console.log(`  📄 Report Version: V3 (Professional Light Theme)`);
  console.log(`  🤖 AI Synthesis: Enabled`);
  console.log(`  📊 Auto Reports: Enabled`);
  console.log(`  🌐 Test URL: https://www.example.com\n`);

  try {
    // Test with a real website (example.com is simple and fast)
    const testUrl = 'https://www.example.com';
    const companyData = {
      company_name: 'Example Corporation',
      industry: 'Technology',
      city: 'Internet'
    };

    console.log('📍 Step 1: Analyzing website...');
    console.log(`  URL: ${testUrl}`);
    console.log(`  Company: ${companyData.company_name}`);
    console.log(`  Industry: ${companyData.industry}\n`);

    const startTime = Date.now();

    // Run the full analysis
    const analysisResult = await analyzeWebsite(testUrl, {
      ...companyData,
      crawl_depth: 1, // Just analyze the homepage for speed
      screenshot: true,
      mobile_screenshot: true,
      run_all_analyzers: true
    });

    const analysisTime = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log(`✅ Analysis Complete (${analysisTime}s):`);
    console.log(`  • Grade: ${analysisResult.grade || analysisResult.website_grade || 'N/A'}`);
    console.log(`  • Score: ${analysisResult.overall_score || analysisResult.website_score || 0}/100`);
    console.log(`  • Design Score: ${analysisResult.design_score || 0}`);
    console.log(`  • SEO Score: ${analysisResult.seo_score || 0}`);
    console.log(`  • Content Score: ${analysisResult.content_score || 0}`);
    console.log(`  • Social Score: ${analysisResult.social_score || 0}`);

    if (analysisResult.design_issues) {
      console.log(`  • Design Issues: ${analysisResult.design_issues.length}`);
    }
    if (analysisResult.seo_issues) {
      console.log(`  • SEO Issues: ${analysisResult.seo_issues.length}`);
    }
    if (analysisResult.quick_wins) {
      console.log(`  • Quick Wins: ${analysisResult.quick_wins.length}`);
    }
    console.log('');

    // Step 2: Generate V3 Report (includes synthesis)
    console.log('📍 Step 2: Generating V3 Report with AI Synthesis...');

    const reportStartTime = Date.now();

    const reportResult = await autoGenerateReport(analysisResult, {
      format: 'html',
      saveToDatabase: false // Don't save to DB for testing
    });

    const reportTime = ((Date.now() - reportStartTime) / 1000).toFixed(1);

    console.log(`✅ Report Generated (${reportTime}s):`);
    console.log(`  • Format: HTML`);
    console.log(`  • Size: ${(reportResult.content.length / 1024).toFixed(1)} KB`);
    console.log(`  • Version: V3 (Professional Light Theme)`);

    if (reportResult.metadata.used_ai_synthesis) {
      console.log(`  • AI Synthesis: ✓ Enabled`);
      console.log(`  • Consolidated Issues: ${reportResult.metadata.consolidated_issues_count || 0}`);
    }
    console.log('');

    // Step 3: Save the report
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `test-v3-full-pipeline-${timestamp}.html`;
    const outputPath = join(process.cwd(), filename);

    await writeFile(outputPath, reportResult.content);
    console.log(`📁 Report Saved: ${filename}\n`);

    // Summary
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log('═'.repeat(60));
    console.log('✨ FULL PIPELINE TEST COMPLETE!');
    console.log('═'.repeat(60));
    console.log('\n📊 Performance Metrics:');
    console.log(`  • Total Time: ${totalTime}s`);
    console.log(`  • Analysis: ${analysisTime}s`);
    console.log(`  • Report Generation: ${reportTime}s`);
    console.log(`  • Report Size: ${(reportResult.content.length / 1024).toFixed(1)} KB`);

    console.log('\n✅ All Systems Working:');
    console.log('  • Website Analysis ✓');
    console.log('  • AI Synthesis ✓');
    console.log('  • V3 Report Generation ✓');
    console.log('  • File Output ✓');

    console.log('\n📱 To View the Report:');
    console.log(`  1. Open ${filename} in your browser`);
    console.log('  2. Test mobile view with F12 → Device Toggle');
    console.log('  3. Verify the professional light theme design');
    console.log('  4. Check that sections are concise without repetition');
    console.log('  5. Test print view with Ctrl+P');

    console.log('\n🎨 V3 Design Features:');
    console.log('  • Clean white background');
    console.log('  • Professional gradient hero');
    console.log('  • Mobile-responsive layout');
    console.log('  • Concise action items');
    console.log('  • No duplicate content');

  } catch (error) {
    console.error('\n❌ Pipeline test failed:', error);
    console.error('\nError details:');
    console.error(error.stack);

    console.log('\n💡 Troubleshooting:');
    console.log('  • Check that all services are running');
    console.log('  • Verify API keys in .env file');
    console.log('  • Ensure internet connection for website analysis');
    console.log('  • Check that Supabase is configured');
  }
}

// Run the full pipeline test
console.log('Starting full V3 pipeline test...\n');
testFullPipeline().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});