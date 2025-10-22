/**
 * QUICK END-TO-END TEST FOR ANALYSIS ENGINE v2.0
 * Tests core functionality with simpler websites
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '../.env') });

const ANALYSIS_API = 'http://localhost:3001';

async function runQuickTest() {
  console.log(chalk.cyan.bold('\n🚀 QUICK ANALYSIS ENGINE TEST\n'));

  // Test 1: Health Check
  console.log(chalk.yellow('1. Testing Health Check...'));
  try {
    const health = await fetch(`${ANALYSIS_API}/health`);
    const data = await health.json();
    console.log(chalk.green('✅ Server is running:'), data.service, data.version);
  } catch (error) {
    console.log(chalk.red('❌ Server not responding'));
    process.exit(1);
  }

  // Test 2: Analyze a simple website
  console.log(chalk.yellow('\n2. Testing Single URL Analysis...'));
  const testSite = {
    url: 'https://example.com',
    company_name: 'Example Company',
    industry: 'demo'
  };

  try {
    console.log(chalk.gray(`   Analyzing ${testSite.url}...`));

    const response = await fetch(`${ANALYSIS_API}/api/analyze-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testSite),
      signal: AbortSignal.timeout(60000) // 60 second timeout
    });

    const result = await response.json();

    if (result.success) {
      const data = result.result;

      console.log(chalk.green('\n✅ Analysis Complete!'));
      console.log(chalk.white('\n📊 Results:'));
      console.log(`   Grade: ${chalk.bold(data.website_grade || 'N/A')} (${data.overall_score}/100)`);
      console.log(`   Pages Discovered: ${data.pages_discovered || 0}`);
      console.log(`   Pages Analyzed: ${data.pages_analyzed || 0}`);

      // Check modules
      console.log(chalk.white('\n🔍 Analysis Modules:'));
      console.log(`   Desktop Design: ${data.design_score_desktop || 'N/A'}/100`);
      console.log(`   Mobile Design: ${data.design_score_mobile || 'N/A'}/100`);
      console.log(`   SEO: ${data.seo_score || 'N/A'}/100`);
      console.log(`   Content: ${data.content_score || 'N/A'}/100`);
      console.log(`   Social: ${data.social_score || 'N/A'}/100`);
      console.log(`   Accessibility: ${data.accessibility_score || 'N/A'}/100`);

      // Check lead scoring
      if (data.lead_priority !== null) {
        console.log(chalk.white('\n🎯 Lead Scoring:'));
        console.log(`   Priority: ${data.lead_priority}/100 (${data.priority_tier || 'N/A'})`);
        console.log(`   Quality Gap: ${data.quality_gap_score || 0}`);
        console.log(`   Budget Score: ${data.budget_score || 0}`);
        console.log(`   Urgency: ${data.urgency_score || 0}`);
      }

      // Check discovery log
      if (data.discovery_log) {
        console.log(chalk.white('\n📝 Discovery Log:'));
        console.log(`   ✅ Audit trail captured`);

        const log = data.discovery_log;
        if (log.discovery) {
          console.log(`   - Discovery: ${log.discovery.total_discovered || 0} pages found`);
        }
        if (log.page_selection) {
          console.log(`   - AI Selection: ${Object.keys(log.page_selection.selected_pages || {}).length} pages selected`);
        }
      }

      // Check quick wins
      if (data.quick_wins && Array.isArray(data.quick_wins)) {
        console.log(chalk.white(`\n⚡ Quick Wins: ${data.quick_wins.length} opportunities found`));
      }

      // Cost and time
      console.log(chalk.white('\n💰 Performance:'));
      console.log(`   Cost: $${(data.analysis_cost || 0).toFixed(3)}`);
      console.log(`   Time: ${((data.analysis_time || 0) / 1000).toFixed(1)}s`);

    } else {
      console.log(chalk.red('❌ Analysis failed:'), result.error);
    }
  } catch (error) {
    console.log(chalk.red('❌ Test failed:'), error.message);
  }

  // Test 3: Get statistics
  console.log(chalk.yellow('\n3. Testing Statistics API...'));
  try {
    const stats = await fetch(`${ANALYSIS_API}/api/stats`);
    const data = await stats.json();

    if (data.success && data.stats) {
      console.log(chalk.green('✅ Statistics retrieved'));
      console.log(`   Total Leads: ${data.stats.totalLeads}`);
      console.log(`   Ready for Outreach: ${data.stats.readyForOutreach}`);

      if (data.stats.gradeDistribution) {
        console.log('\n   Grade Distribution:');
        Object.entries(data.stats.gradeDistribution).forEach(([grade, count]) => {
          console.log(`   ${grade}: ${count}`);
        });
      }
    }
  } catch (error) {
    console.log(chalk.yellow('⚠️  Stats API error:'), error.message);
  }

  // Test 4: Batch Analysis with multiple sites
  console.log(chalk.yellow('\n4. Testing Batch Analysis...'));
  const batchSites = [
    { url: 'https://httpbin.org', company_name: 'HTTPBin', industry: 'api-testing' },
    { url: 'https://jsonplaceholder.typicode.com', company_name: 'JSON Placeholder', industry: 'api-testing' }
  ];

  try {
    console.log(chalk.gray(`   Analyzing ${batchSites.length} sites...`));

    const response = await fetch(`${ANALYSIS_API}/api/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prospects: batchSites }),
      signal: AbortSignal.timeout(120000) // 2 minute timeout
    });

    const result = await response.json();

    if (result.success) {
      console.log(chalk.green(`✅ Batch analysis complete`));
      console.log(`   Successful: ${result.data.successful}/${result.data.total}`);
      console.log(`   Failed: ${result.data.failed}`);

      result.data.results.forEach(r => {
        if (r.success) {
          console.log(chalk.gray(`   ✓ ${r.company_name}: Grade ${r.grade} (${r.score}/100)`));
        } else {
          console.log(chalk.red(`   ✗ ${r.company_name}: ${r.error}`));
        }
      });
    } else {
      console.log(chalk.red('❌ Batch analysis failed:'), result.error);
    }
  } catch (error) {
    console.log(chalk.red('❌ Batch test failed:'), error.message);
  }

  console.log(chalk.cyan.bold('\n✨ Test Complete!\n'));
}

// Run the test
runQuickTest().catch(error => {
  console.error(chalk.red('Fatal error:'), error);
  process.exit(1);
});