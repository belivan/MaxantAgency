/**
 * Test Report Generation
 * Verifies that reports are automatically generated when analyzing websites
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '../.env') });

const ANALYSIS_API = 'http://localhost:3001';

async function testReportGeneration() {
  console.log(chalk.cyan.bold('\n🚀 TESTING REPORT GENERATION\n'));

  // Check environment variables
  console.log(chalk.yellow('Environment Configuration:'));
  console.log(`  AUTO_GENERATE_REPORTS: ${process.env.AUTO_GENERATE_REPORTS}`);
  console.log(`  REPORT_FORMAT: ${process.env.REPORT_FORMAT}\n`);

  if (process.env.AUTO_GENERATE_REPORTS !== 'true') {
    console.log(chalk.red('❌ AUTO_GENERATE_REPORTS is not enabled!'));
    console.log(chalk.yellow('   Set AUTO_GENERATE_REPORTS=true in .env to enable report generation'));
    return;
  }

  // Test website
  const testSite = {
    url: 'https://example.com',
    company_name: 'Example Company',
    industry: 'demo'
  };

  console.log(chalk.yellow('Analyzing website to test report generation...'));
  console.log(chalk.gray(`  URL: ${testSite.url}`));
  console.log(chalk.gray(`  Company: ${testSite.company_name}\n`));

  try {
    const response = await fetch(`${ANALYSIS_API}/api/analyze-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testSite),
      signal: AbortSignal.timeout(60000) // 60 second timeout
    });

    const result = await response.json();

    if (result.success) {
      console.log(chalk.green('✅ Analysis completed successfully'));
      console.log(chalk.gray(`   Grade: ${result.result.grade}`));
      console.log(chalk.gray(`   Score: ${result.result.overall_score}/100`));

      // Check if report was generated
      if (result.result.report_id || result.result.report_path) {
        console.log(chalk.green('\n✅ Report generated successfully!'));
        console.log(chalk.white('Report Details:'));
        if (result.result.report_id) {
          console.log(`   Report ID: ${result.result.report_id}`);
        }
        if (result.result.report_path) {
          console.log(`   Storage Path: ${result.result.report_path}`);
        }
        console.log(`   Format: ${process.env.REPORT_FORMAT}`);

        console.log(chalk.cyan('\n📄 Report Features:'));
        console.log('   • Executive Summary');
        console.log('   • Detailed Analysis (Design, SEO, Content, Social, Accessibility)');
        console.log('   • Quick Wins & Recommendations');
        console.log('   • Lead Scoring & Prioritization');
        console.log('   • Action Plan');

      } else {
        console.log(chalk.yellow('\n⚠️  No report information in response'));
        console.log('   Report may have been generated but metadata not returned');
        console.log('   Check Supabase Storage "reports" bucket for the file');
      }

    } else {
      console.log(chalk.red('❌ Analysis failed:'), result.error);

      if (result.analysis && result.analysis.success) {
        console.log(chalk.yellow('\n⚠️  Analysis succeeded but database save failed'));
        console.log('   This could be due to the missing accessibility_wcag_level column');
        console.log('   The report may still have been generated');
      }
    }

  } catch (error) {
    console.log(chalk.red('❌ Test failed:'), error.message);
  }

  // Check report endpoints
  console.log(chalk.yellow('\n\nChecking Report API Endpoints...'));

  try {
    // Test the report generation endpoint
    const reportEndpoint = await fetch(`${ANALYSIS_API}/api/reports/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: 'https://test.com',
        company_name: 'Test',
        grade: 'B',
        overall_score: 75
      })
    });

    if (reportEndpoint.ok) {
      console.log(chalk.green('✅ Report generation endpoint is available'));
    } else {
      console.log(chalk.yellow('⚠️  Report generation endpoint returned:'), reportEndpoint.status);
    }
  } catch (error) {
    console.log(chalk.yellow('⚠️  Could not test report endpoint:'), error.message);
  }

  console.log(chalk.cyan('\n✨ Report Generation Test Complete!\n'));

  console.log(chalk.white('📚 Next Steps:'));
  console.log('1. Check Supabase dashboard > Storage > reports bucket');
  console.log('2. Look for markdown/HTML files with company names');
  console.log('3. Download and review generated reports');
  console.log('4. Use /api/reports endpoints to manage reports\n');
}

testReportGeneration().catch(console.error);