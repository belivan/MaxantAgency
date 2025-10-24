/**
 * Comprehensive Test of V3 Report System
 * Tests the entire pipeline including synthesis and report generation
 */

import { analyzeWebsite } from './analysis-engine/orchestrator.js';
import { autoGenerateReport } from './analysis-engine/reports/auto-report-generator.js';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: './analysis-engine/.env' });

// Test configuration
const TEST_WEBSITES = [
  {
    url: 'https://www.apple.com',
    company_name: 'Apple Inc.',
    industry: 'Technology',
    city: 'Cupertino'
  },
  {
    url: 'https://www.tesla.com',
    company_name: 'Tesla',
    industry: 'Automotive',
    city: 'Austin'
  }
];

async function runComprehensiveTest() {
  console.log('🧪 COMPREHENSIVE V3 REPORT SYSTEM TEST');
  console.log('=====================================\n');

  // Set V3 as the report version
  process.env.REPORT_VERSION = 'v3';
  process.env.USE_AI_SYNTHESIS = 'true';
  process.env.REPORT_FORMAT = 'html';

  console.log('Configuration:');
  console.log(`  📄 Report Version: ${process.env.REPORT_VERSION}`);
  console.log(`  🤖 AI Synthesis: ${process.env.USE_AI_SYNTHESIS}`);
  console.log(`  📊 Report Format: ${process.env.REPORT_FORMAT}\n`);

  const results = [];

  for (const website of TEST_WEBSITES) {
    console.log(`\n🌐 Testing: ${website.company_name}`);
    console.log('─'.repeat(50));

    try {
      // Step 1: Analyze the website
      console.log('📍 Step 1: Analyzing website...');
      const startAnalysis = Date.now();

      const analysisResult = await analyzeWebsite(website.url, {
        company_name: website.company_name,
        industry: website.industry,
        city: website.city,
        crawl_depth: 1, // Shallow crawl for faster testing
        screenshot: true,
        mobile_screenshot: true
      });

      const analysisTime = ((Date.now() - startAnalysis) / 1000).toFixed(1);
      console.log(`✅ Analysis complete in ${analysisTime}s`);
      console.log(`   Grade: ${analysisResult.grade || analysisResult.website_grade}`);
      console.log(`   Score: ${analysisResult.overall_score || analysisResult.website_score}/100`);
      console.log(`   Issues Found: ${analysisResult.design_issues?.length || 0} design, ${analysisResult.seo_issues?.length || 0} SEO`);

      // Step 2: Generate V3 Report with Auto-Generator
      console.log('\n📍 Step 2: Generating V3 report...');
      const startReport = Date.now();

      const reportResult = await autoGenerateReport(analysisResult, {
        format: 'html',
        saveToDatabase: false // Don't save to DB for testing
      });

      const reportTime = ((Date.now() - startReport) / 1000).toFixed(1);
      console.log(`✅ Report generated in ${reportTime}s`);
      console.log(`   Format: ${reportResult.metadata.format}`);
      console.log(`   Size: ${(reportResult.content.length / 1024).toFixed(1)} KB`);
      console.log(`   Synthesis: ${reportResult.metadata.used_ai_synthesis ? 'Yes' : 'No'}`);

      // Step 3: Save the report
      const filename = `test-v3-${website.company_name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.html`;
      const outputPath = join(process.cwd(), filename);
      await writeFile(outputPath, reportResult.content);
      console.log(`✅ Report saved: ${filename}`);

      // Store result
      results.push({
        company: website.company_name,
        grade: analysisResult.grade || analysisResult.website_grade,
        score: analysisResult.overall_score || analysisResult.website_score,
        analysisTime,
        reportTime,
        fileSize: (reportResult.content.length / 1024).toFixed(1),
        filename,
        success: true
      });

    } catch (error) {
      console.error(`❌ Test failed for ${website.company_name}:`, error.message);
      results.push({
        company: website.company_name,
        success: false,
        error: error.message
      });
    }
  }

  // Print summary
  console.log('\n\n📊 TEST SUMMARY');
  console.log('═'.repeat(60));

  console.log('\n📈 Results:');
  results.forEach(result => {
    if (result.success) {
      console.log(`  ✅ ${result.company}: Grade ${result.grade} (${result.score}/100)`);
      console.log(`     Analysis: ${result.analysisTime}s | Report: ${result.reportTime}s | Size: ${result.fileSize} KB`);
      console.log(`     File: ${result.filename}`);
    } else {
      console.log(`  ❌ ${result.company}: ${result.error}`);
    }
  });

  const successCount = results.filter(r => r.success).length;
  console.log(`\n✨ Success Rate: ${successCount}/${results.length} tests passed`);

  console.log('\n📱 Mobile Testing Instructions:');
  console.log('1. Open the generated HTML files in Chrome/Edge');
  console.log('2. Press F12 to open DevTools');
  console.log('3. Click the device toggle (Ctrl+Shift+M)');
  console.log('4. Select different device sizes to test responsiveness');
  console.log('5. Check that all sections adapt properly to screen size');

  console.log('\n🎨 Key V3 Features to Verify:');
  console.log('✓ Light, professional color scheme');
  console.log('✓ Mobile-responsive layout (test at 320px, 768px, 1200px)');
  console.log('✓ No duplicate information between sections');
  console.log('✓ Concise action items without repetition');
  console.log('✓ Clean gradient hero section');
  console.log('✓ Interactive task checkboxes');
  console.log('✓ Smooth scrolling and animations');
  console.log('✓ Print-friendly layout (Ctrl+P)');
}

// Mock analysis function for testing without real API calls
async function mockAnalyzeWebsite(url, options) {
  console.log('  [MOCK] Simulating website analysis...');

  // Simulate processing time
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Generate mock data based on URL
  const score = Math.floor(Math.random() * 30) + 60; // 60-90 range
  const grade = score >= 85 ? 'A' : score >= 70 ? 'B' : score >= 55 ? 'C' : 'D';

  return {
    company_name: options.company_name,
    url: url,
    industry: options.industry,
    city: options.city,
    grade: grade,
    website_grade: grade,
    overall_score: score,
    website_score: score,

    // Component scores
    design_score: score + Math.floor(Math.random() * 10) - 5,
    seo_score: score + Math.floor(Math.random() * 10) - 5,
    content_score: score + Math.floor(Math.random() * 10) - 5,
    social_score: score + Math.floor(Math.random() * 10) - 5,

    // Issues
    top_issue: 'Page load speed needs improvement on mobile devices',
    one_liner: `A ${grade === 'A' ? 'excellent' : grade === 'B' ? 'solid' : 'developing'} website with opportunities for enhancement`,

    design_issues: [
      'Mobile navigation could be more intuitive',
      'Call-to-action buttons need better contrast',
      'Forms are not optimized for mobile input'
    ],

    seo_issues: [
      'Missing structured data markup',
      'Some images lack alt text',
      'Meta descriptions could be improved'
    ],

    quick_wins: [
      'Optimize image sizes for faster loading',
      'Add missing meta descriptions',
      'Implement lazy loading',
      'Fix broken internal links',
      'Add schema markup'
    ],
    quick_wins_count: 5,

    // Screenshots (placeholder)
    screenshot_desktop_url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    screenshot_mobile_url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',

    // Metadata
    analyzed_at: new Date().toISOString(),
    pages_analyzed: Math.floor(Math.random() * 10) + 5,
    analysis_time: Math.floor(Math.random() * 60) + 30
  };
}

// Run test
console.log('Starting comprehensive V3 report system test...\n');

// Check if we should use mock data
const useMock = process.argv.includes('--mock');

if (useMock) {
  console.log('🔧 Using MOCK data (no real API calls)\n');
  // Replace the real analyze function with mock
  global.analyzeWebsite = mockAnalyzeWebsite;
}

runComprehensiveTest().catch(error => {
  console.error('\n❌ Test suite failed:', error);
  console.error(error.stack);
  process.exit(1);
});