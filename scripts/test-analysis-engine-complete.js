/**
 * COMPREHENSIVE END-TO-END TEST FOR ANALYSIS ENGINE v2.0
 * Tests ALL features including:
 * - Intelligent multi-page discovery
 * - 6 analysis modules (desktop, mobile, SEO, content, social, accessibility)
 * - Lead scoring and prioritization
 * - Discovery audit trail
 * - Grading system (A-F)
 * - Database field population
 * - Backup system
 * - Cost tracking
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import chalk from 'chalk';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '../.env') });

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Test configuration
const TEST_WEBSITES = [
  { url: 'https://www.apple.com', company_name: 'Apple Inc.', industry: 'technology' },
  { url: 'https://www.tesla.com', company_name: 'Tesla', industry: 'automotive' },
  { url: 'https://www.netflix.com', company_name: 'Netflix', industry: 'entertainment' },
  { url: 'https://www.airbnb.com', company_name: 'Airbnb', industry: 'hospitality' },
  { url: 'https://www.stripe.com', company_name: 'Stripe', industry: 'fintech' }
];

const ANALYSIS_API = 'http://localhost:3001';

// Test results
const testResults = {
  passed: [],
  failed: [],
  warnings: []
};

// Helper functions
function logSection(title) {
  console.log('\n' + chalk.cyan('═'.repeat(80)));
  console.log(chalk.cyan.bold(`  ${title}`));
  console.log(chalk.cyan('═'.repeat(80)));
}

function logTest(name, status, details = '') {
  const icon = status === 'pass' ? '✅' : status === 'fail' ? '❌' : '⚠️';
  const color = status === 'pass' ? 'green' : status === 'fail' ? 'red' : 'yellow';
  console.log(`${icon} ${chalk[color](name)} ${details ? chalk.gray(details) : ''}`);

  if (status === 'pass') testResults.passed.push(name);
  else if (status === 'fail') testResults.failed.push({ name, details });
  else testResults.warnings.push({ name, details });
}

async function testHealthCheck() {
  try {
    const response = await fetch(`${ANALYSIS_API}/health`);
    const data = await response.json();

    if (data.status === 'ok' && data.service === 'analysis-engine') {
      logTest('Health Check', 'pass', `v${data.version}`);
      return true;
    }
    logTest('Health Check', 'fail', 'Invalid response');
    return false;
  } catch (error) {
    logTest('Health Check', 'fail', error.message);
    return false;
  }
}

async function testSingleUrlAnalysis() {
  logSection('Testing Single URL Analysis (Intelligent Multi-Page)');

  const testSite = {
    url: 'https://www.shopify.com',
    company_name: 'Shopify',
    industry: 'e-commerce'
  };

  try {
    console.log(chalk.gray(`Analyzing ${testSite.url}...`));

    const response = await fetch(`${ANALYSIS_API}/api/analyze-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testSite)
    });

    const result = await response.json();

    if (!result.success) {
      logTest('Single URL Analysis', 'fail', result.error);
      return null;
    }

    const data = result.result;

    // Test 1: Intelligent Multi-Page Discovery
    if (data.pages_discovered > 0) {
      logTest('Multi-Page Discovery', 'pass', `Found ${data.pages_discovered} pages`);
    } else {
      logTest('Multi-Page Discovery', 'fail', 'No pages discovered');
    }

    // Test 2: AI Page Selection
    if (data.ai_page_selection && Object.keys(data.ai_page_selection).length > 0) {
      logTest('AI Page Selection', 'pass', `Selected ${data.pages_analyzed || 0} pages for analysis`);
    } else {
      logTest('AI Page Selection', 'warning', 'No AI page selection data');
    }

    // Test 3: Discovery Audit Trail
    if (data.discovery_log) {
      const log = data.discovery_log;
      if (log.discovery && log.page_selection && log.crawl_results) {
        logTest('Discovery Audit Trail', 'pass', 'Complete audit trail captured');
      } else {
        logTest('Discovery Audit Trail', 'warning', 'Partial audit trail');
      }
    } else {
      logTest('Discovery Audit Trail', 'fail', 'No discovery log');
    }

    // Test 4: All 6 Analysis Modules
    const modules = {
      'Desktop Visual Analysis': data.design_score_desktop,
      'Mobile Visual Analysis': data.design_score_mobile,
      'SEO Analysis': data.seo_score,
      'Content Analysis': data.content_score,
      'Social Media Analysis': data.social_score,
      'Accessibility Analysis': data.accessibility_score
    };

    console.log('\n' + chalk.yellow('Analysis Modules:'));
    for (const [module, score] of Object.entries(modules)) {
      if (score !== null && score !== undefined) {
        logTest(`  ${module}`, 'pass', `Score: ${score}/100`);
      } else {
        logTest(`  ${module}`, 'fail', 'No score');
      }
    }

    // Test 5: Lead Scoring & Prioritization
    if (data.lead_priority !== null && data.priority_tier) {
      logTest('Lead Scoring', 'pass',
        `Priority: ${data.lead_priority}/100 (${data.priority_tier.toUpperCase()})`);

      // Check scoring dimensions
      const dimensions = {
        'Quality Gap': data.quality_gap_score,
        'Budget Signals': data.budget_score,
        'Urgency': data.urgency_score,
        'Industry Fit': data.industry_fit_score,
        'Company Size': data.company_size_score,
        'Engagement': data.engagement_score
      };

      console.log(chalk.gray('  Scoring Dimensions:'));
      for (const [dim, score] of Object.entries(dimensions)) {
        if (score !== null && score !== undefined) {
          console.log(chalk.gray(`    - ${dim}: ${score}`));
        }
      }
    } else {
      logTest('Lead Scoring', 'fail', 'No lead scoring data');
    }

    // Test 6: Grading System
    if (data.website_grade && data.overall_score !== null) {
      logTest('Grading System', 'pass',
        `Grade: ${data.website_grade} (${data.overall_score}/100)`);
    } else {
      logTest('Grading System', 'fail', 'No grade assigned');
    }

    // Test 7: Business Intelligence
    if (data.business_intelligence) {
      const intel = data.business_intelligence;
      const hasData = Object.keys(intel).length > 0;
      logTest('Business Intelligence', hasData ? 'pass' : 'warning',
        hasData ? `${Object.keys(intel).length} data points` : 'No data extracted');
    } else {
      logTest('Business Intelligence', 'warning', 'No business intelligence data');
    }

    // Test 8: Quick Wins & Top Issue
    if (data.quick_wins && Array.isArray(data.quick_wins)) {
      logTest('Quick Wins Detection', 'pass', `${data.quick_wins.length} quick wins found`);
    } else {
      logTest('Quick Wins Detection', 'fail', 'No quick wins data');
    }

    if (data.top_issue) {
      logTest('Top Issue Identification', 'pass', data.top_issue.title || 'Issue identified');
    } else {
      logTest('Top Issue Identification', 'warning', 'No top issue identified');
    }

    // Test 9: Cost Tracking
    if (data.analysis_cost !== null && data.analysis_cost !== undefined) {
      logTest('Cost Tracking', 'pass', `$${data.analysis_cost.toFixed(3)}`);
    } else {
      logTest('Cost Tracking', 'warning', 'No cost data');
    }

    // Test 10: Analysis Time
    if (data.analysis_time) {
      const seconds = (data.analysis_time / 1000).toFixed(1);
      logTest('Analysis Time', 'pass', `${seconds}s`);
    } else {
      logTest('Analysis Time', 'warning', 'No timing data');
    }

    return data;

  } catch (error) {
    logTest('Single URL Analysis', 'fail', error.message);
    return null;
  }
}

async function testBatchAnalysis() {
  logSection('Testing Batch Analysis');

  try {
    const response = await fetch(`${ANALYSIS_API}/api/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prospects: TEST_WEBSITES.slice(0, 3) // Test with 3 sites
      })
    });

    if (!response.ok) {
      logTest('Batch Analysis', 'fail', `HTTP ${response.status}`);
      return;
    }

    const result = await response.json();

    if (result.success && result.data) {
      const { successful, failed, total } = result.data;

      if (successful > 0) {
        logTest('Batch Analysis', 'pass',
          `${successful}/${total} successful, ${failed} failed`);

        // Check each result
        result.data.results.forEach(r => {
          if (r.success) {
            console.log(chalk.gray(
              `  ✓ ${r.company_name}: Grade ${r.grade} (${r.score}/100)`
            ));
          } else {
            console.log(chalk.red(`  ✗ ${r.company_name}: ${r.error}`));
          }
        });
      } else {
        logTest('Batch Analysis', 'fail', 'All analyses failed');
      }
    } else {
      logTest('Batch Analysis', 'fail', 'Invalid response format');
    }
  } catch (error) {
    logTest('Batch Analysis', 'fail', error.message);
  }
}

async function testDatabaseIntegration() {
  logSection('Testing Database Integration');

  try {
    // Get recent leads
    const { data: leads, error } = await supabase
      .from('leads')
      .select('*')
      .order('analyzed_at', { ascending: false })
      .limit(5);

    if (error) {
      logTest('Database Query', 'fail', error.message);
      return;
    }

    logTest('Database Query', 'pass', `Found ${leads.length} recent leads`);

    if (leads.length > 0) {
      const lead = leads[0];

      // Check critical fields
      const criticalFields = [
        'id', 'company_name', 'url', 'website_grade', 'overall_score',
        'design_score_desktop', 'design_score_mobile', 'seo_score',
        'content_score', 'social_score', 'accessibility_score',
        'lead_priority', 'priority_tier', 'discovery_log',
        'pages_discovered', 'pages_analyzed', 'ai_page_selection'
      ];

      const missingFields = criticalFields.filter(field =>
        lead[field] === null || lead[field] === undefined
      );

      if (missingFields.length === 0) {
        logTest('Field Population', 'pass', 'All critical fields populated');
      } else {
        logTest('Field Population', 'warning',
          `Missing: ${missingFields.join(', ')}`);
      }

      // Check discovery log structure
      if (lead.discovery_log) {
        const hasRequiredSections =
          lead.discovery_log.discovery &&
          lead.discovery_log.page_selection &&
          lead.discovery_log.crawl_results;

        logTest('Discovery Log Structure',
          hasRequiredSections ? 'pass' : 'warning',
          hasRequiredSections ? 'Complete' : 'Incomplete');
      }
    }
  } catch (error) {
    logTest('Database Integration', 'fail', error.message);
  }
}

async function testGradingDistribution() {
  logSection('Testing Grade Distribution');

  try {
    const response = await fetch(`${ANALYSIS_API}/api/stats`);
    const result = await response.json();

    if (result.success && result.stats) {
      const { gradeDistribution, averageScores } = result.stats;

      logTest('Statistics API', 'pass');

      if (gradeDistribution) {
        console.log(chalk.yellow('\nGrade Distribution:'));
        ['A', 'B', 'C', 'D', 'F'].forEach(grade => {
          const count = gradeDistribution[grade] || 0;
          const bar = '█'.repeat(Math.min(count, 20));
          console.log(`  ${grade}: ${bar} ${count}`);
        });
      }

      if (averageScores) {
        console.log(chalk.yellow('\nAverage Scores:'));
        Object.entries(averageScores).forEach(([metric, score]) => {
          console.log(`  ${metric}: ${score?.toFixed(1) || 'N/A'}`);
        });
      }
    } else {
      logTest('Statistics API', 'fail', 'Invalid response');
    }
  } catch (error) {
    logTest('Statistics API', 'fail', error.message);
  }
}

async function testBackupSystem() {
  logSection('Testing Backup System');

  try {
    const backupPath = resolve(__dirname, '../analysis-engine/backups');
    const fs = await import('fs').then(m => m.promises);

    // Check if backup directory exists
    const exists = await fs.access(backupPath).then(() => true).catch(() => false);

    if (exists) {
      const files = await fs.readdir(backupPath);
      const backupFiles = files.filter(f => f.startsWith('lead_') && f.endsWith('.json'));

      logTest('Backup Directory', 'pass', `${backupFiles.length} backup files`);

      // Check a recent backup file
      if (backupFiles.length > 0) {
        const latestBackup = backupFiles.sort().reverse()[0];
        const backupContent = await fs.readFile(
          resolve(backupPath, latestBackup),
          'utf-8'
        );
        const backup = JSON.parse(backupContent);

        // Check if buffers are cleaned
        const hasBuffer = JSON.stringify(backup).includes('Buffer');
        if (!hasBuffer) {
          logTest('Buffer Cleaning', 'pass', 'No image buffers in backup');
        } else {
          logTest('Buffer Cleaning', 'fail', 'Found uncleaned buffers');
        }

        // Check backup size
        const stats = await fs.stat(resolve(backupPath, latestBackup));
        const sizeMB = (stats.size / 1024 / 1024).toFixed(2);

        if (stats.size < 5 * 1024 * 1024) { // Less than 5MB
          logTest('Backup Size', 'pass', `${sizeMB}MB`);
        } else {
          logTest('Backup Size', 'warning', `${sizeMB}MB (large file)`);
        }
      }
    } else {
      logTest('Backup System', 'warning', 'No backup directory');
    }
  } catch (error) {
    logTest('Backup System', 'fail', error.message);
  }
}

async function runAllTests() {
  console.log(chalk.magenta.bold('\n🚀 COMPREHENSIVE ANALYSIS ENGINE v2.0 TEST SUITE\n'));

  // Test 1: Health Check
  const isHealthy = await testHealthCheck();
  if (!isHealthy) {
    console.log(chalk.red('\n❌ Analysis Engine is not running. Start it first!'));
    process.exit(1);
  }

  // Test 2: Single URL Analysis (Full Feature Test)
  const analysisResult = await testSingleUrlAnalysis();

  // Test 3: Batch Analysis
  await testBatchAnalysis();

  // Test 4: Database Integration
  await testDatabaseIntegration();

  // Test 5: Grading Distribution
  await testGradingDistribution();

  // Test 6: Backup System
  await testBackupSystem();

  // Summary
  logSection('TEST SUMMARY');

  const totalTests = testResults.passed.length + testResults.failed.length;
  const passRate = ((testResults.passed.length / totalTests) * 100).toFixed(1);

  console.log(chalk.green(`\n✅ Passed: ${testResults.passed.length}`));
  console.log(chalk.red(`❌ Failed: ${testResults.failed.length}`));
  console.log(chalk.yellow(`⚠️  Warnings: ${testResults.warnings.length}`));
  console.log(chalk.blue(`\n📊 Pass Rate: ${passRate}%`));

  if (testResults.failed.length > 0) {
    console.log(chalk.red('\nFailed Tests:'));
    testResults.failed.forEach(({ name, details }) => {
      console.log(chalk.red(`  • ${name}: ${details}`));
    });
  }

  if (testResults.warnings.length > 0) {
    console.log(chalk.yellow('\nWarnings:'));
    testResults.warnings.forEach(({ name, details }) => {
      console.log(chalk.yellow(`  • ${name}: ${details}`));
    });
  }

  // Feature Coverage Report
  logSection('FEATURE COVERAGE REPORT');

  const features = {
    '✅ Intelligent Multi-Page Discovery': analysisResult?.pages_discovered > 0,
    '✅ AI Page Selection': analysisResult?.ai_page_selection,
    '✅ Discovery Audit Trail': analysisResult?.discovery_log,
    '✅ 6 Analysis Modules': analysisResult?.accessibility_score !== undefined,
    '✅ Lead Scoring & Prioritization': analysisResult?.lead_priority !== null,
    '✅ Business Intelligence': analysisResult?.business_intelligence,
    '✅ Grading System (A-F)': analysisResult?.website_grade,
    '✅ Quick Wins Detection': analysisResult?.quick_wins,
    '✅ Cost Tracking': analysisResult?.analysis_cost !== null,
    '✅ Database Integration': testResults.passed.includes('Database Query'),
    '✅ Backup System': testResults.passed.includes('Backup Directory')
  };

  Object.entries(features).forEach(([feature, working]) => {
    console.log(`${working ? '✅' : '❌'} ${feature}`);
  });

  // Exit code
  process.exit(testResults.failed.length > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch(error => {
  console.error(chalk.red('Fatal error:'), error);
  process.exit(1);
});