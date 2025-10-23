/**
 * Test HTML Report Generation with AI Synthesis on Maksant.com
 * 
 * This script runs a full analysis on maksant.com and generates an HTML report
 * with AI synthesis to verify screenshot references and consolidated issues work correctly.
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables from the root .env file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

import { analyzeWebsiteIntelligent } from './orchestrator-refactored.js';

const TEST_URL = 'https://maksant.com';
const TEST_COMPANY = 'Maksant';
const TEST_INDUSTRY = 'Digital Marketing Agency';

console.log('🧪 Testing HTML Report with AI Synthesis');
console.log('='.repeat(80));
console.log(`\n📍 Target: ${TEST_URL}`);
console.log(`🏢 Company: ${TEST_COMPANY}`);
console.log(`🏭 Industry: ${TEST_INDUSTRY}\n`);

async function testMaksantHTML() {
  try {
    const startTime = Date.now();
    
    console.log('🚀 Starting full analysis with AI synthesis...\n');
    
    // Run the analysis with HTML report generation
    const result = await analyzeWebsiteIntelligent(
      TEST_URL,
      {
        company_name: TEST_COMPANY,
        industry: TEST_INDUSTRY
      },
      {
        generate_report: true,
        report_format: 'html',
        save_to_database: false
      }
    );
    
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
    
    console.log('\n' + '='.repeat(80));
    console.log('✅ Analysis Complete!');
    console.log('='.repeat(80));
    
    console.log(`\n⏱️  Total Time: ${totalTime}s`);
    console.log(`\n📊 Results:`);
    console.log(`   Grade: ${result.grade}`);
    console.log(`   Overall Score: ${result.overall_score}/100`);
    console.log(`   Desktop Score: ${result.design_score_desktop}/100`);
    console.log(`   Mobile Score: ${result.design_score_mobile}/100`);
    console.log(`   SEO Score: ${result.seo_score}/100`);
    
    console.log(`\n📝 Reports Generated:`);
    if (result.report_markdown_path) {
      console.log(`   Markdown: ${result.report_markdown_path}`);
    }
    if (result.report_html_path) {
      console.log(`   HTML: ${result.report_html_path}`);
    }
    
    console.log(`\n🖼️  Screenshots:`);
    console.log(`   Desktop: ${result.screenshot_desktop_url ? '✅' : '❌'}`);
    console.log(`   Mobile: ${result.screenshot_mobile_url ? '✅' : '❌'}`);
    
    if (result.synthesis_metadata) {
      console.log(`\n🤖 AI Synthesis:`);
      console.log(`   Status: ${result.synthesis_metadata.success ? '✅ Success' : '❌ Failed'}`);
      console.log(`   Duration: ${result.synthesis_metadata.total_duration_seconds}s`);
      console.log(`   Tokens Used: ${result.synthesis_metadata.total_tokens_used.toLocaleString()}`);
      console.log(`   Cost: $${result.synthesis_metadata.total_cost.toFixed(3)}`);
      console.log(`   Original Issues: ${result.synthesis_metadata.original_issue_count}`);
      console.log(`   Consolidated Issues: ${result.synthesis_metadata.consolidated_issue_count}`);
      console.log(`   Reduction: ${result.synthesis_metadata.reduction_percentage}%`);
    }
    
    console.log('\n💡 Next Steps:');
    console.log('   1. Open the HTML report in a browser');
    console.log('   2. Check if screenshot references [SS-1], [SS-2] appear in issues');
    console.log('   3. Scroll to bottom to see screenshot appendix');
    console.log('   4. Verify consolidated issues show sources (desktop, mobile, seo)');
    console.log('   5. Review executive summary with 30/60/90 roadmap');
    
    if (result.report_html_path) {
      console.log(`\n🌐 Open in browser:`);
      console.log(`   file:///${result.report_html_path.replace(/\\/g, '/')}`);
    }
    
  } catch (error) {
    console.error('\n❌ Test failed:');
    console.error(error);
    process.exit(1);
  }
}

testMaksantHTML();
