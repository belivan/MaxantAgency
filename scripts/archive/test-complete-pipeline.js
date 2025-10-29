/**
 * COMPREHENSIVE PIPELINE TEST
 *
 * Validates the complete flow:
 * 1. Analysis Engine analyzes a website and saves to database
 * 2. Verify all lead data is saved correctly
 * 3. ReportEngine generates report from that lead
 * 4. Verify report quality
 * 5. Verify report data is saved correctly
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const ANALYSIS_ENGINE_URL = 'http://localhost:3001';
const REPORT_ENGINE_URL = 'http://localhost:3003';
const TEST_URL = 'https://elmwooddental.com';
const TEST_COMPANY = 'Elmwood Dental';
const TEST_PROJECT_ID = 'ffd7afd1-5ebe-4ad3-8aff-ec9b9547b409'; // Anton's Picks

// ANSI colors for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bold: '\x1b[1m'
};

const testResults = {
  phase1: { passed: false, errors: [] },
  phase2: { passed: false, errors: [] },
  phase3: { passed: false, errors: [] },
  phase4: { passed: false, errors: [] },
  phase5: { passed: false, errors: [] }
};

let leadId = null;
let reportId = null;
let reportPath = null;
let startTime = Date.now();

function log(message, color = 'white') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(80));
  log(title, 'bold');
  console.log('='.repeat(80) + '\n');
}

function logError(error) {
  log(`❌ ${error}`, 'red');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'cyan');
}

async function checkServerHealth(url, name) {
  try {
    const response = await fetch(`${url}/health`);
    if (!response.ok) throw new Error(`Server returned ${response.status}`);
    const data = await response.json();
    logSuccess(`${name} is healthy (${data.status})`);
    return true;
  } catch (error) {
    logError(`${name} is not responding: ${error.message}`);
    return false;
  }
}

// PHASE 1: ANALYSIS ENGINE TEST
async function phase1_analyzeWebsite() {
  logSection('PHASE 1: ANALYSIS ENGINE TEST');

  try {
    // Check server health
    logInfo('Checking Analysis Engine health...');
    const isHealthy = await checkServerHealth(ANALYSIS_ENGINE_URL, 'Analysis Engine');
    if (!isHealthy) {
      testResults.phase1.errors.push('Analysis Engine is not running');
      return false;
    }

    // Start analysis
    logInfo(`Analyzing ${TEST_URL}...`);
    logInfo('This will take approximately 3-5 minutes...');

    const analysisResponse = await fetch(`${ANALYSIS_ENGINE_URL}/api/analyze-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: TEST_URL,
        company_name: TEST_COMPANY,
        save_to_database: true,
        project_id: TEST_PROJECT_ID
      })
    });

    if (!analysisResponse.ok) {
      const errorData = await analysisResponse.json();
      throw new Error(`Analysis failed: ${errorData.error || 'Unknown error'}`);
    }

    const analysisResult = await analysisResponse.json();

    if (!analysisResult.success) {
      throw new Error(`Analysis failed: ${analysisResult.error}`);
    }

    // Extract lead ID
    if (analysisResult.data?.id) {
      leadId = analysisResult.data.id;
      logSuccess(`Analysis completed! Lead ID: ${leadId}`);
    } else if (analysisResult.id) {
      leadId = analysisResult.id;
      logSuccess(`Analysis completed! Lead ID: ${leadId}`);
    } else {
      throw new Error('No lead ID in analysis response');
    }

    // Basic validation
    const data = analysisResult.data || analysisResult;
    logInfo('\n📊 Analysis Results:');
    console.log(`   Company: ${data.company_name}`);
    console.log(`   URL: ${data.url}`);
    console.log(`   Grade: ${data.website_grade}`);
    console.log(`   Overall Score: ${data.overall_score}/100`);
    console.log(`   Design Score: ${data.design_score}/100`);
    console.log(`   SEO Score: ${data.seo_score}/100`);
    console.log(`   Content Score: ${data.content_score}/100`);
    console.log(`   Social Score: ${data.social_score}/100`);
    console.log(`   Lead Quality: ${data.lead_quality_score}`);
    console.log(`   Lead Status: ${data.lead_status}`);

    testResults.phase1.passed = true;
    return true;

  } catch (error) {
    logError(`Phase 1 failed: ${error.message}`);
    testResults.phase1.errors.push(error.message);
    return false;
  }
}

// PHASE 2: DATABASE VERIFICATION (ANALYSIS DATA)
async function phase2_verifyAnalysisData() {
  logSection('PHASE 2: DATABASE VERIFICATION (ANALYSIS DATA)');

  if (!leadId) {
    logError('No lead ID from Phase 1, skipping database verification');
    testResults.phase2.errors.push('Missing lead ID');
    return false;
  }

  try {
    logInfo(`Fetching lead data for ID: ${leadId}...`);

    const { data: lead, error } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single();

    if (error) {
      throw new Error(`Database query failed: ${error.message}`);
    }

    if (!lead) {
      throw new Error('Lead not found in database');
    }

    logSuccess('Lead found in database');

    // Comprehensive data validation
    const checks = {
      'Basic Info': {
        'company_name': lead.company_name,
        'url': lead.url,
        'website_grade': lead.website_grade,
        'analyzed_at': lead.analyzed_at
      },
      'Scores': {
        'overall_score': lead.overall_score,
        'design_score': lead.design_score,
        'seo_score': lead.seo_score,
        'content_score': lead.content_score,
        'social_score': lead.social_score
      },
      'Issues': {
        'design_issues (desktop)': lead.design_issues_desktop?.length || 0,
        'design_issues (mobile)': lead.design_issues_mobile?.length || 0,
        'seo_issues': lead.seo_issues?.length || 0,
        'content_issues': lead.content_issues?.length || 0,
        'social_issues': lead.social_issues?.length || 0,
        'accessibility_issues': lead.accessibility_issues?.length || 0
      },
      'Screenshots': {
        'desktop_screenshot': lead.desktop_screenshot ? '✓' : '✗',
        'mobile_screenshot': lead.mobile_screenshot ? '✓' : '✗'
      },
      'Business Intelligence': {
        'lead_quality_score': lead.lead_quality_score,
        'lead_status': lead.lead_status,
        'one_liner': lead.one_liner ? '✓' : '✗',
        'top_issue': lead.top_issue ? '✓' : '✗',
        'estimated_project_value': lead.estimated_project_value
      },
      'Crawl Data': {
        'pages_crawled': lead.pages_crawled,
        'crawl_duration': lead.crawl_duration,
        'crawl_status': lead.crawl_status
      }
    };

    let hasErrors = false;

    for (const [category, fields] of Object.entries(checks)) {
      console.log(`\n📋 ${category}:`);
      for (const [field, value] of Object.entries(fields)) {
        const displayValue = value ?? 'NULL';
        if (value === null || value === undefined || value === 0 || value === '✗') {
          logWarning(`   ${field}: ${displayValue}`);
          if (['company_name', 'url', 'website_grade', 'overall_score'].includes(field)) {
            hasErrors = true;
            testResults.phase2.errors.push(`Critical field missing: ${field}`);
          }
        } else {
          console.log(`   ${field}: ${displayValue}`);
        }
      }
    }

    // Calculate total issues
    const totalIssues = (
      (lead.design_issues_desktop?.length || 0) +
      (lead.design_issues_mobile?.length || 0) +
      (lead.seo_issues?.length || 0) +
      (lead.content_issues?.length || 0) +
      (lead.social_issues?.length || 0) +
      (lead.accessibility_issues?.length || 0)
    );

    logInfo(`\n📊 Total Issues Found: ${totalIssues}`);

    if (totalIssues === 0) {
      logWarning('No issues found - this might indicate an analysis problem');
    }

    if (!hasErrors) {
      testResults.phase2.passed = true;
      logSuccess('\n✅ All critical analysis data verified in database');
      return true;
    } else {
      logWarning('\n⚠️  Some critical fields are missing');
      return false;
    }

  } catch (error) {
    logError(`Phase 2 failed: ${error.message}`);
    testResults.phase2.errors.push(error.message);
    return false;
  }
}

// PHASE 3: REPORT ENGINE TEST
async function phase3_generateReport() {
  logSection('PHASE 3: REPORT ENGINE TEST');

  if (!leadId) {
    logError('No lead ID from Phase 1, cannot generate report');
    testResults.phase3.errors.push('Missing lead ID');
    return false;
  }

  try {
    // Check server health
    logInfo('Checking ReportEngine health...');
    const isHealthy = await checkServerHealth(REPORT_ENGINE_URL, 'ReportEngine');
    if (!isHealthy) {
      testResults.phase3.errors.push('ReportEngine is not running');
      return false;
    }

    // Fetch complete lead data
    logInfo('Fetching lead data from database...');
    const { data: lead, error: fetchError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single();

    if (fetchError || !lead) {
      throw new Error('Failed to fetch lead data');
    }

    logSuccess('Lead data fetched');

    // Generate report
    logInfo('Generating report with AI synthesis...');
    logInfo('This will take approximately 3-4 minutes...');

    const reportResponse = await fetch(`${REPORT_ENGINE_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        analysisResult: lead,
        options: {
          format: 'html',
          sections: ['all'],
          saveToDatabase: true,
          project_id: lead.project_id,
          lead_id: lead.id
        }
      })
    });

    if (!reportResponse.ok) {
      const errorData = await reportResponse.json();
      throw new Error(`Report generation failed: ${errorData.error || 'Unknown error'}`);
    }

    const reportResult = await reportResponse.json();

    if (!reportResult.success) {
      throw new Error(`Report generation failed: ${reportResult.error}`);
    }

    reportId = reportResult.report?.id;
    reportPath = reportResult.report?.local_path;

    logSuccess(`Report generated! Report ID: ${reportId}`);
    logInfo(`\n📄 Report Details:`);
    console.log(`   Format: ${reportResult.report?.format}`);
    console.log(`   Local Path: ${reportPath}`);
    console.log(`   Storage Path: ${reportResult.report?.storage_path || 'N/A'}`);

    if (reportPath && fs.existsSync(reportPath)) {
      const stats = fs.statSync(reportPath);
      console.log(`   File Size: ${(stats.size / 1024).toFixed(2)} KB`);
      logSuccess('   Report file exists on disk');
    } else {
      logWarning('   Report file not found on disk');
    }

    testResults.phase3.passed = true;
    return true;

  } catch (error) {
    logError(`Phase 3 failed: ${error.message}`);
    testResults.phase3.errors.push(error.message);
    return false;
  }
}

// PHASE 4: REPORT QUALITY REVIEW
async function phase4_reviewReportQuality() {
  logSection('PHASE 4: REPORT QUALITY REVIEW');

  if (!reportPath) {
    logError('No report path from Phase 3, cannot review quality');
    testResults.phase4.errors.push('Missing report path');
    return false;
  }

  try {
    logInfo('Checking report file...');

    if (!fs.existsSync(reportPath)) {
      throw new Error('Report file does not exist');
    }

    const content = fs.readFileSync(reportPath, 'utf-8');
    const contentLength = content.length;

    logSuccess(`Report file found: ${(contentLength / 1024).toFixed(2)} KB`);

    // Quality checks
    const qualityChecks = {
      'Has content': contentLength > 1000,
      'Contains company name': content.includes(TEST_COMPANY),
      'Contains website URL': content.includes(TEST_URL),
      'Contains Executive Summary': content.includes('Executive Summary'),
      'Contains scores': content.includes('Overall Score') || content.includes('overall_score'),
      'Contains Desktop Analysis': content.includes('Desktop Analysis'),
      'Contains Mobile Analysis': content.includes('Mobile Analysis'),
      'Contains Action Plan': content.includes('Action Plan') || content.includes('Recommendations'),
      'HTML structure valid': content.includes('<!DOCTYPE html>') && content.includes('</html>')
    };

    logInfo('\n📊 Quality Checks:');
    let allPassed = true;
    for (const [check, passed] of Object.entries(qualityChecks)) {
      if (passed) {
        logSuccess(`   ${check}`);
      } else {
        logWarning(`   ${check}`);
        allPassed = false;
        testResults.phase4.errors.push(`Quality check failed: ${check}`);
      }
    }

    // Word count
    const wordCount = content.split(/\s+/).length;
    logInfo(`\n📝 Word Count: ${wordCount.toLocaleString()}`);

    // Issue count in report
    const issueMatches = content.match(/class="issue"|<li class="critique"/g);
    const issueCount = issueMatches ? issueMatches.length : 0;
    logInfo(`📋 Issues Rendered: ${issueCount}`);

    logInfo(`\n🔗 Open report in browser:`);
    log(`   file:///${reportPath.replace(/\\/g, '/')}`, 'cyan');

    if (allPassed) {
      testResults.phase4.passed = true;
      logSuccess('\n✅ Report quality checks passed');
      return true;
    } else {
      logWarning('\n⚠️  Some quality checks failed');
      return false;
    }

  } catch (error) {
    logError(`Phase 4 failed: ${error.message}`);
    testResults.phase4.errors.push(error.message);
    return false;
  }
}

// PHASE 5: DATABASE VERIFICATION (REPORT DATA)
async function phase5_verifyReportData() {
  logSection('PHASE 5: DATABASE VERIFICATION (REPORT DATA)');

  if (!reportId) {
    logError('No report ID from Phase 3, cannot verify report data');
    testResults.phase5.errors.push('Missing report ID');
    return false;
  }

  try {
    logInfo(`Fetching report data for ID: ${reportId}...`);

    const { data: report, error } = await supabase
      .from('reports')
      .select('*')
      .eq('id', reportId)
      .single();

    if (error) {
      throw new Error(`Database query failed: ${error.message}`);
    }

    if (!report) {
      throw new Error('Report not found in database');
    }

    logSuccess('Report found in database');

    // Display all report metadata
    logInfo('\n📊 Synthesis Metrics:');
    console.log(`   Synthesis Used: ${report.synthesis_used}`);
    console.log(`   Synthesis Cost: $${report.synthesis_cost?.toFixed(4) || 'N/A'}`);
    console.log(`   Synthesis Tokens: ${report.synthesis_tokens || 'N/A'}`);
    console.log(`   Synthesis Duration: ${report.synthesis_duration_ms ? (report.synthesis_duration_ms / 1000).toFixed(2) + 's' : 'N/A'}`);
    console.log(`   Synthesis Errors: ${report.synthesis_errors}`);

    logInfo('\n📊 Issue Statistics:');
    console.log(`   Original Issues: ${report.original_issues_count || 'N/A'}`);
    console.log(`   Consolidated Issues: ${report.consolidated_issues_count || 'N/A'}`);
    console.log(`   Reduction: ${report.issue_reduction_percentage || 0}%`);

    logInfo('\n📊 Report Metadata:');
    console.log(`   Report Version: ${report.report_version}`);
    console.log(`   Report Subtype: ${report.report_subtype || 'N/A'}`);
    console.log(`   Generation Time: ${report.generation_time_ms ? (report.generation_time_ms / 1000).toFixed(2) + 's' : 'N/A'}`);
    console.log(`   Word Count: ${report.word_count || 'N/A'}`);
    console.log(`   File Size: ${report.file_size_bytes ? (report.file_size_bytes / 1024).toFixed(2) + ' KB' : 'N/A'}`);

    // Validate synthesis_data JSONB
    logInfo('\n📦 Synthesis Data (JSONB):');
    if (report.synthesis_data) {
      logSuccess('   synthesis_data column is populated');

      const consolidatedIssues = report.synthesis_data.consolidatedIssues?.length || 0;
      const hasExecutiveSummary = !!report.synthesis_data.executiveSummary;
      const screenshotRefs = report.synthesis_data.screenshotReferences?.length || 0;
      const hasStageMetadata = !!report.synthesis_data.stageMetadata;

      console.log(`   - Consolidated Issues: ${consolidatedIssues}`);
      console.log(`   - Executive Summary: ${hasExecutiveSummary ? 'Present' : 'Missing'}`);
      console.log(`   - Screenshot References: ${screenshotRefs}`);
      console.log(`   - Stage Metadata: ${hasStageMetadata ? 'Present' : 'Missing'}`);

      if (hasExecutiveSummary) {
        logInfo('\n📝 Executive Summary Preview:');
        console.log(`   Headline: ${report.synthesis_data.executiveSummary.headline || 'N/A'}`);
        console.log(`   Overview: ${report.synthesis_data.executiveSummary.overview?.substring(0, 150) || 'N/A'}...`);
        console.log(`   Critical Findings: ${report.synthesis_data.executiveSummary.criticalFindings?.length || 0}`);
        console.log(`   Has Roadmap: ${report.synthesis_data.executiveSummary.strategicRoadmap ? 'Yes' : 'No'}`);
        console.log(`   ROI Statement: ${report.synthesis_data.executiveSummary.roiStatement ? 'Yes' : 'No'}`);
      }

      // Validation checks
      const validationChecks = {
        'Consolidated Issues': consolidatedIssues > 0,
        'Executive Summary': hasExecutiveSummary,
        'Stage Metadata': hasStageMetadata,
        'Synthesis Cost Tracked': report.synthesis_cost > 0,
        'Issue Reduction Calculated': report.issue_reduction_percentage >= 0
      };

      logInfo('\n✓ Validation Checks:');
      let allPassed = true;
      for (const [check, passed] of Object.entries(validationChecks)) {
        if (passed) {
          logSuccess(`   ${check}`);
        } else {
          logWarning(`   ${check}`);
          allPassed = false;
        }
      }

      if (allPassed) {
        testResults.phase5.passed = true;
        logSuccess('\n✅ All report data verified in database');
        return true;
      } else {
        logWarning('\n⚠️  Some validation checks failed');
        return false;
      }

    } else {
      logWarning('   synthesis_data column is NULL');
      if (report.synthesis_used) {
        logError('   ERROR: synthesis_used is true but synthesis_data is NULL');
        testResults.phase5.errors.push('Missing synthesis_data despite synthesis_used=true');
        return false;
      } else {
        logInfo('   This is expected when synthesis is disabled');
        testResults.phase5.passed = true;
        return true;
      }
    }

  } catch (error) {
    logError(`Phase 5 failed: ${error.message}`);
    testResults.phase5.errors.push(error.message);
    return false;
  }
}

// PHASE 6: SUMMARY REPORT
function phase6_summaryReport() {
  logSection('PHASE 6: SUMMARY REPORT');

  const totalTime = ((Date.now() - startTime) / 1000 / 60).toFixed(2);
  const totalPhases = 5;
  const passedPhases = Object.values(testResults).filter(r => r.passed).length;

  logInfo(`Test Duration: ${totalTime} minutes`);
  logInfo(`Phases Passed: ${passedPhases}/${totalPhases}`);

  console.log('\n📋 Phase Results:');
  const phases = [
    ['Phase 1', 'Analysis Engine Test', testResults.phase1],
    ['Phase 2', 'Database Verification (Analysis)', testResults.phase2],
    ['Phase 3', 'ReportEngine Test', testResults.phase3],
    ['Phase 4', 'Report Quality Review', testResults.phase4],
    ['Phase 5', 'Database Verification (Report)', testResults.phase5]
  ];

  for (const [name, description, result] of phases) {
    if (result.passed) {
      logSuccess(`   ${name}: ${description} - PASSED`);
    } else {
      logError(`   ${name}: ${description} - FAILED`);
      if (result.errors.length > 0) {
        result.errors.forEach(error => {
          log(`      └─ ${error}`, 'red');
        });
      }
    }
  }

  if (passedPhases === totalPhases) {
    logSuccess('\n🎉 ALL PHASES PASSED!');
    logSuccess('The pipeline is working correctly end-to-end.');
    console.log('\n📊 Test Artifacts:');
    console.log(`   Lead ID: ${leadId}`);
    console.log(`   Report ID: ${reportId}`);
    console.log(`   Report Path: ${reportPath}`);
    return true;
  } else {
    logError('\n❌ SOME PHASES FAILED');
    logError('Please review the errors above and fix the issues.');
    return false;
  }
}

// MAIN TEST RUNNER
async function runPipelineTest() {
  log('\n🧪 COMPREHENSIVE PIPELINE TEST', 'bold');
  log('Testing: Analysis Engine → Database → ReportEngine → Report Quality → Report Data\n', 'cyan');

  try {
    // Run all phases sequentially
    const phase1Success = await phase1_analyzeWebsite();
    if (!phase1Success) {
      logError('\n⚠️  Phase 1 failed, stopping test');
      phase6_summaryReport();
      return false;
    }

    const phase2Success = await phase2_verifyAnalysisData();
    if (!phase2Success) {
      logWarning('\n⚠️  Phase 2 had issues, but continuing...');
    }

    const phase3Success = await phase3_generateReport();
    if (!phase3Success) {
      logError('\n⚠️  Phase 3 failed, stopping test');
      phase6_summaryReport();
      return false;
    }

    const phase4Success = await phase4_reviewReportQuality();
    if (!phase4Success) {
      logWarning('\n⚠️  Phase 4 had issues, but continuing...');
    }

    const phase5Success = await phase5_verifyReportData();
    if (!phase5Success) {
      logWarning('\n⚠️  Phase 5 had issues, but continuing...');
    }

    // Generate summary
    const overallSuccess = phase6_summaryReport();
    return overallSuccess;

  } catch (error) {
    logError(`\n❌ FATAL ERROR: ${error.message}`);
    console.error(error.stack);
    return false;
  }
}

// Run the test
runPipelineTest()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
