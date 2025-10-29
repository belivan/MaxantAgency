#!/usr/bin/env node
/**
 * QA Validator CLI Tool
 * ----------------------
 * Manually validate synthesis results or full analysis reports
 *
 * ⚠️ NOTE: This CLI tool is deprecated in the ReportEngine context.
 * The ReportEngine receives analysis data via API requests, not database queries.
 *
 * To use this tool, you would need to:
 * 1. Create a database client in report-engine
 * 2. Implement getAnalysisByUrl() and getLatestAnalysis() functions
 * 3. Or call the Analysis Engine API to fetch data
 *
 * Usage:
 *   node qa-cli.js --url https://example.com
 *   node qa-cli.js --company "Acme Corp"
 *   node qa-cli.js --latest
 */

import { validateReportQuality, generateQAReport } from './qa-validator.js';
// DEPRECATED: ReportEngine doesn't have direct database access
// import { getAnalysisByUrl, getLatestAnalysis } from '../../database/queries.js';

// Placeholder functions - these need to be implemented if you want to use this CLI
async function getAnalysisByUrl(url) {
  throw new Error('QA CLI is deprecated in ReportEngine. Use the Analysis Engine to query data.');
}

async function getLatestAnalysis() {
  throw new Error('QA CLI is deprecated in ReportEngine. Use the Analysis Engine to query data.');
}

const args = process.argv.slice(2);

function printUsage() {
  console.log(`
QA Validator CLI Tool
=====================

Usage:
  node qa-cli.js --url <website-url>       Validate analysis for specific URL
  node qa-cli.js --company <company-name>  Validate analysis for company
  node qa-cli.js --latest                  Validate most recent analysis
  node qa-cli.js --help                    Show this help message

Examples:
  node qa-cli.js --url https://example.com
  node qa-cli.js --company "Acme Corp"
  node qa-cli.js --latest
  `);
}

async function runQA() {
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    printUsage();
    process.exit(0);
  }

  let analysisResults = null;

  try {
    // Parse arguments
    if (args.includes('--url')) {
      const urlIndex = args.indexOf('--url');
      const url = args[urlIndex + 1];
      if (!url) {
        console.error('❌ Error: --url requires a value');
        process.exit(1);
      }
      console.log(`🔍 Loading analysis for URL: ${url}...`);
      analysisResults = await getAnalysisByUrl(url);
    } else if (args.includes('--company')) {
      const companyIndex = args.indexOf('--company');
      const company = args[companyIndex + 1];
      if (!company) {
        console.error('❌ Error: --company requires a value');
        process.exit(1);
      }
      console.log(`🔍 Loading analysis for company: ${company}...`);
      analysisResults = await getAnalysisByUrl(company); // Assuming query supports company lookup
    } else if (args.includes('--latest')) {
      console.log('🔍 Loading latest analysis...');
      analysisResults = await getLatestAnalysis();
    } else {
      console.error('❌ Error: Unknown argument. Use --help for usage information.');
      process.exit(1);
    }

    // Check if results found
    if (!analysisResults) {
      console.error('❌ Error: No analysis results found.');
      process.exit(1);
    }

    console.log('✓ Analysis loaded successfully\n');

    // Extract synthesis results
    const synthesisResults = {
      consolidatedIssues: analysisResults.consolidated_issues || [],
      mergeLog: analysisResults.consolidated_issue_merge_log || [],
      consolidationStatistics: analysisResults.consolidated_issue_stats || null,
      executiveSummary: analysisResults.executive_summary || null,
      executiveMetadata: analysisResults.executive_summary_metadata || null,
      screenshotReferences: analysisResults.screenshot_references || [],
      stageMetadata: analysisResults.synthesis_stage_metadata || {},
      errors: analysisResults.synthesis_errors || []
    };

    // Run QA validation
    console.log('🔬 Running QA validation...\n');
    const qaValidation = validateReportQuality(synthesisResults);

    // Generate and print report
    const qaReport = generateQAReport(qaValidation);
    console.log(qaReport);

    // Exit with appropriate code
    if (qaValidation.status === 'FAIL') {
      process.exit(1);
    } else if (qaValidation.status === 'WARN') {
      process.exit(2);
    } else {
      process.exit(0);
    }

  } catch (error) {
    console.error('❌ Error running QA validation:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run CLI
runQA();
