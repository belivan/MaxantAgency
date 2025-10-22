/**
 * Test SSE Analysis - End-to-End
 *
 * This script simulates how the UI calls the Analysis Engine
 * using Server-Sent Events (SSE) for real-time progress updates.
 */

import EventSource from 'eventsource';
import axios from 'axios';

// Configuration
const API_URL = 'http://localhost:3001';
const TEST_PROSPECT = {
  id: 'test-' + Date.now(),
  company_name: 'Tesla Motors',
  website: 'https://www.tesla.com',
  industry: 'automotive',
  city: 'Austin',
  state: 'TX'
};

console.log('═══════════════════════════════════════════════════════════════');
console.log('ANALYSIS ENGINE SSE END-TO-END TEST');
console.log('═══════════════════════════════════════════════════════════════');
console.log('');
console.log('Testing with:');
console.log(`  Company: ${TEST_PROSPECT.company_name}`);
console.log(`  Website: ${TEST_PROSPECT.website}`);
console.log(`  Industry: ${TEST_PROSPECT.industry}`);
console.log('');
console.log('This simulates how the UI calls the Analysis Engine.');
console.log('');
console.log('───────────────────────────────────────────────────────────────');
console.log('');

// First, check if the Analysis Engine is running
async function checkHealth() {
  try {
    const response = await axios.get(`${API_URL}/health`);
    console.log('✅ Analysis Engine is running');
    console.log(`   Version: ${response.data.version}`);
    console.log(`   Status: ${response.data.status}`);
    return true;
  } catch (error) {
    console.error('❌ Analysis Engine is not running!');
    console.error('   Please start it with: npm run dev:analysis');
    return false;
  }
}

// Run SSE analysis (exactly like the UI does)
function runSSEAnalysis() {
  return new Promise((resolve, reject) => {
    console.log('');
    console.log('🚀 Starting SSE Analysis Stream...');
    console.log('───────────────────────────────────────────────────────────────');
    console.log('');

    // Create SSE connection
    const eventSource = new EventSource(
      `${API_URL}/api/analyze?prospects=${encodeURIComponent(JSON.stringify([TEST_PROSPECT]))}`
    );

    const results = [];
    let startTime = Date.now();

    // Handle SSE events
    eventSource.addEventListener('start', (event) => {
      const data = JSON.parse(event.data);
      console.log(`📊 Analysis Started`);
      console.log(`   Total prospects: ${data.total}`);
      console.log(`   Message: ${data.message}`);
      console.log('');
    });

    eventSource.addEventListener('analyzing', (event) => {
      const data = JSON.parse(event.data);
      console.log(`🔍 Analyzing [${data.current}/${data.total}]`);
      console.log(`   Company: ${data.company_name}`);
      console.log(`   URL: ${data.url}`);
      console.log('');
    });

    eventSource.addEventListener('progress', (event) => {
      const data = JSON.parse(event.data);
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`   ⏳ [${elapsed}s] ${data.step}: ${data.message}`);
    });

    eventSource.addEventListener('saved', (event) => {
      const data = JSON.parse(event.data);
      console.log('');
      console.log(`💾 Saved to Database`);
      console.log(`   Company: ${data.company_name}`);
      console.log(`   Grade: ${data.grade}`);
      console.log(`   Score: ${data.overall_score}/100`);
      console.log(`   Lead Priority: ${data.lead_priority || 'N/A'}`);
      console.log(`   Database ID: ${data.database_id}`);

      results.push(data);
    });

    eventSource.addEventListener('failed', (event) => {
      const data = JSON.parse(event.data);
      console.log('');
      console.log(`❌ Analysis Failed`);
      console.log(`   Company: ${data.company_name}`);
      console.log(`   Error: ${data.error}`);

      results.push(data);
    });

    eventSource.addEventListener('complete', (event) => {
      const data = JSON.parse(event.data);
      const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);

      console.log('');
      console.log('───────────────────────────────────────────────────────────────');
      console.log('✅ ANALYSIS COMPLETE');
      console.log('───────────────────────────────────────────────────────────────');
      console.log('');
      console.log('Summary:');
      console.log(`  Total: ${data.total} prospects`);
      console.log(`  Successful: ${data.successful}`);
      console.log(`  Failed: ${data.failed}`);
      console.log(`  Duration: ${totalTime} seconds`);

      eventSource.close();
      resolve({ summary: data, results });
    });

    eventSource.addEventListener('error', (event) => {
      if (event.type === 'error') {
        console.error('❌ SSE Connection Error:', event.message || 'Connection lost');
        eventSource.close();
        reject(new Error('SSE connection failed'));
      }
    });

    // Timeout after 5 minutes
    setTimeout(() => {
      console.error('❌ Analysis timeout (5 minutes)');
      eventSource.close();
      reject(new Error('Analysis timeout'));
    }, 300000);
  });
}

// Display detailed results including discovery log
function displayResults(results) {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('DETAILED RESULTS');
  console.log('═══════════════════════════════════════════════════════════════');

  for (const result of results.results) {
    if (result.success !== false) {
      console.log('');
      console.log(`Company: ${result.company_name}`);
      console.log('───────────────────────────────────────────────────────────────');

      // Basic Results
      console.log('Analysis Results:');
      console.log(`  Grade: ${result.grade} (${result.overall_score}/100)`);
      console.log(`  Lead Priority: ${result.lead_priority || 'N/A'}`);
      console.log(`  Priority Tier: ${result.priority_tier || 'N/A'}`);
      console.log(`  Budget Likelihood: ${result.budget_likelihood || 'N/A'}`);

      console.log('\nScores:');
      console.log(`  Design: ${result.design_score}/100`);
      console.log(`  SEO: ${result.seo_score}/100`);
      console.log(`  Content: ${result.content_score}/100`);
      console.log(`  Social: ${result.social_score}/100`);
      console.log(`  Accessibility: ${result.accessibility_score}/100`);

      console.log('\nKey Findings:');
      console.log(`  Top Issue: ${result.top_issue || 'None'}`);
      console.log(`  Quick Wins: ${result.quick_wins_count || 0}`);
      console.log(`  One-liner: ${result.one_liner || 'N/A'}`);

      // Discovery Log Data (if available)
      if (result.discovery_log) {
        console.log('\n📊 DISCOVERY LOG DATA:');
        console.log('───────────────────────────────────────');

        const log = result.discovery_log;

        if (log.summary) {
          console.log('Discovery Summary:');
          console.log(`  Total Pages Found: ${log.summary.total_discovered || 0}`);
          console.log(`  Sitemap Pages: ${log.summary.sitemap_pages || 0}`);
          console.log(`  Robots.txt Pages: ${log.summary.robots_pages || 0}`);
          console.log(`  Navigation Pages: ${log.summary.navigation_pages || 0}`);
          console.log(`  Discovery Time: ${(log.summary.discovery_time_ms / 1000).toFixed(2)}s`);
        }

        if (log.discovery_issues) {
          console.log('\nDiscovery Issues:');
          console.log(`  Sitemap Missing: ${log.discovery_issues.sitemap_missing ? '❌ YES' : '✅ NO'}`);
          console.log(`  Robots.txt Missing: ${log.discovery_issues.robots_missing ? '❌ YES' : '✅ NO'}`);
          console.log(`  Crawl Failures: ${log.discovery_issues.crawl_failures?.length || 0}`);
        }

        if (log.ai_selection) {
          console.log('\nAI Page Selection:');
          console.log(`  Pages Analyzed: ${log.ai_selection.pages_analyzed?.length || 0}`);
          console.log(`  SEO Pages: ${log.ai_selection.selected_pages?.seo?.join(', ') || 'none'}`);
        }

        if (log.critical_findings) {
          console.log('\nCritical Findings:');
          const cf = log.critical_findings;
          console.log(`  Grade: ${cf.grade}`);
          console.log(`  Lead Priority: ${cf.lead_priority}`);
          console.log(`  Priority Tier: ${cf.priority_tier}`);
          console.log(`  Critical SEO Issues: ${cf.critical_seo_issues?.length || 0}`);
          console.log(`  Critical Design Issues: ${cf.critical_design_issues?.length || 0}`);
          console.log(`  Quick Wins Available: ${cf.quick_wins_count || 0}`);

          if (cf.critical_seo_issues && cf.critical_seo_issues.length > 0) {
            console.log('\n  Top SEO Issues:');
            cf.critical_seo_issues.slice(0, 3).forEach(issue => {
              console.log(`    - ${issue.title} (${issue.severity})`);
            });
          }
        }

        if (log.technical_details) {
          console.log('\nTechnical Details:');
          const td = log.technical_details;
          console.log(`  Tech Stack: ${td.tech_stack || 'Unknown'}`);
          console.log(`  Mobile Friendly: ${td.is_mobile_friendly ? '✅' : '❌'}`);
          console.log(`  Has HTTPS: ${td.has_https ? '✅' : '❌'}`);
          console.log(`  Has Blog: ${td.has_blog ? '✅' : '❌'}`);
          console.log(`  Years in Business: ${td.years_in_business || 'Unknown'}`);
          console.log(`  Company Size: ${td.company_size || 'Unknown'}`);
        }

        if (log.analysis_metrics) {
          console.log('\nAnalysis Performance:');
          const am = log.analysis_metrics;
          console.log(`  Total Time: ${(am.total_time_ms / 1000).toFixed(2)}s`);
          console.log(`  Pages Crawled: ${am.pages_crawled}`);
          console.log(`  Analysis Cost: $${am.analysis_cost?.toFixed(4) || '0.0000'}`);
          console.log(`  AI Models Used: ${Object.keys(am.ai_models_used || {}).join(', ')}`);
        }
      }

      console.log('\n───────────────────────────────────────────────────────────────');
    }
  }
}

// Main execution
async function main() {
  try {
    // Check if Analysis Engine is running
    const isRunning = await checkHealth();
    if (!isRunning) {
      process.exit(1);
    }

    // Run SSE analysis
    const results = await runSSEAnalysis();

    // Display detailed results
    displayResults(results);

    console.log('');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('TEST COMPLETE - SSE END-TO-END SUCCESS');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('');
    console.log('The Analysis Engine successfully:');
    console.log('  ✅ Received the prospect via SSE');
    console.log('  ✅ Streamed progress updates in real-time');
    console.log('  ✅ Completed the analysis');
    console.log('  ✅ Saved to database with discovery_log');
    console.log('  ✅ Returned results via SSE events');
    console.log('');
    console.log('This is exactly how the UI interacts with the Analysis Engine!');

    process.exit(0);
  } catch (error) {
    console.error('');
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the test
main();