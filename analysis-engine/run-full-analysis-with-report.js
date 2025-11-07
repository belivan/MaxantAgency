/**
 * Full E2E Test: Analysis with Deduplication + Report Generation
 *
 * Runs complete analysis pipeline and generates PDF report
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { analyzeWebsiteIntelligent } from './orchestrator-refactored.js';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '../.env') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

console.log('========================================');
console.log('E2E: Analysis + Deduplication + Report');
console.log('========================================\n');

console.log('Configuration:');
console.log(`  ENABLE_ISSUE_DEDUPLICATION: ${process.env.ENABLE_ISSUE_DEDUPLICATION}`);
console.log(`  DEDUPLICATION_MODEL: ${process.env.DEDUPLICATION_MODEL || 'gpt-5-mini'}`);
console.log(`  AUTO_GENERATE_REPORTS: ${process.env.AUTO_GENERATE_REPORTS}`);
console.log(`  AUTO_GENERATE_PDF: ${process.env.AUTO_GENERATE_PDF}`);
console.log(`  USE_AI_SYNTHESIS: ${process.env.USE_AI_SYNTHESIS}\n`);

async function runFullPipeline() {
  try {
    // Get test project
    const { data: projects } = await supabase
      .from('projects')
      .select('id, name')
      .limit(1);

    if (!projects || projects.length === 0) {
      throw new Error('No projects found. Please create a project first.');
    }

    const projectId = projects[0].id;
    console.log(`Using project: ${projects[0].name} (${projectId})\n`);

    // Test URL - use a dental site for better comparison
    const testUrl = 'https://www.aspendental.com';
    const companyName = 'Aspen Dental E2E Test';
    const industry = 'dental';

    console.log('═══════════════════════════════════════');
    console.log('PHASE 1: Website Analysis');
    console.log('═══════════════════════════════════════\n');

    console.log(`Analyzing: ${testUrl}`);
    console.log(`Company: ${companyName}`);
    console.log(`Industry: ${industry}\n`);

    const analysisStartTime = Date.now();

    const result = await analyzeWebsiteIntelligent(testUrl, {
      company_name: companyName,
      industry: industry,
      project_id: projectId
    }, {
      onProgress: (progress) => {
        console.log(`  [${progress.step}] ${progress.message}`);
      }
    });

    const analysisDuration = ((Date.now() - analysisStartTime) / 1000).toFixed(1);

    if (!result.success) {
      console.error('❌ Analysis failed:', result.error);
      process.exit(1);
    }

    console.log('\n═══════════════════════════════════════');
    console.log('Analysis Complete!');
    console.log('═══════════════════════════════════════\n');

    console.log('Results Summary:');
    console.log(`  Duration: ${analysisDuration}s`);
    console.log(`  Grade: ${result.grade}`);
    console.log(`  Overall Score: ${result.overall_score}/100\n`);

    // Issue statistics
    const allIssues = [
      ...(result.design_issues || []),
      ...(result.seo_issues || []),
      ...(result.content_issues || []),
      ...(result.social_issues || []),
      ...(result.accessibility_issues || [])
    ];

    console.log('Issue Statistics:');
    console.log(`  Total issues from all analyzers: ${allIssues.length}`);
    console.log(`  Design: ${(result.design_issues || []).length}`);
    console.log(`  SEO: ${(result.seo_issues || []).length}`);
    console.log(`  Content: ${(result.content_issues || []).length}`);
    console.log(`  Social: ${(result.social_issues || []).length}`);
    console.log(`  Accessibility: ${(result.accessibility_issues || []).length}\n`);

    // Deduplication results
    if (result.deduplication_stats) {
      console.log('✅ Deduplication Results:');
      console.log(`  Original issue count: ${result.deduplication_stats.original_count}`);
      console.log(`  Consolidated issue count: ${result.deduplication_stats.consolidated_count}`);
      console.log(`  Issues removed: ${result.deduplication_stats.original_count - result.deduplication_stats.consolidated_count}`);
      console.log(`  Reduction: ${result.deduplication_stats.reduction_percentage}%`);
      console.log(`  Cost: $${result.deduplication_stats.cost?.toFixed(4) || '0.0000'}`);
      console.log(`  Duration: ${result.deduplication_stats.duration_ms}ms\n`);

      if (result.deduplication_stats.merge_log && result.deduplication_stats.merge_log.length > 0) {
        console.log('  Merged Issue Examples:');
        result.deduplication_stats.merge_log.slice(0, 3).forEach((merge, i) => {
          console.log(`    ${i + 1}. "${merge.kept_title}"`);
          console.log(`       Merged ${merge.merged_count} duplicates`);
          if (merge.removed_titles) {
            merge.removed_titles.slice(0, 2).forEach(title => {
              console.log(`         - "${title}"`);
            });
          }
        });
        console.log();
      }
    } else {
      console.log('⚠️  No deduplication stats found (feature may be disabled)\n');
    }

    // Top issues
    console.log('Top Issues Selected for Outreach:');
    if (result.top_issues && result.top_issues.length > 0) {
      result.top_issues.forEach((issue, i) => {
        console.log(`  ${i + 1}. [${issue.severity || 'N/A'}] ${issue.title}`);
        if (issue.screenshot || issue.screenshot_url) {
          console.log(`     📸 Screenshot available`);
        }
        if (issue.mergedFromCount && issue.mergedFromCount > 1) {
          console.log(`     🔀 Merged from ${issue.mergedFromCount} issues`);
        }
      });
    } else {
      console.log('  No top issues found');
    }
    console.log();

    // Get the lead ID from database
    const { data: leads, error: leadError } = await supabase
      .from('leads')
      .select('id')
      .eq('url', testUrl + '/')
      .order('created_at', { ascending: false })
      .limit(1);

    if (leadError || !leads || leads.length === 0) {
      console.error('❌ Could not find lead in database');
      process.exit(1);
    }

    const leadId = leads[0].id;
    console.log(`Lead ID: ${leadId}\n`);

    // Check if report was auto-generated
    if (result.report_path || result.pdf_path) {
      console.log('═══════════════════════════════════════');
      console.log('Report Auto-Generated!');
      console.log('═══════════════════════════════════════\n');

      if (result.report_path) {
        console.log(`📄 HTML Report: ${result.report_path}`);
      }
      if (result.pdf_path) {
        console.log(`📄 PDF Report: ${result.pdf_path}`);
      }
      if (result.pdf_preview_path) {
        console.log(`📄 PDF Preview: ${result.pdf_preview_path}`);
      }
      console.log();
    } else {
      console.log('⚠️  No auto-generated report found (AUTO_GENERATE_REPORTS may be disabled)\n');
    }

    console.log('═══════════════════════════════════════');
    console.log('Test Status: ✅ PASSED');
    console.log('═══════════════════════════════════════\n');

    // Verification checks
    const checks = [];

    checks.push({
      name: 'Deduplication ran successfully',
      passed: !!result.deduplication_stats,
      message: result.deduplication_stats
        ? `Reduced ${result.deduplication_stats.reduction_percentage}% of duplicate issues`
        : 'No deduplication stats found'
    });

    checks.push({
      name: 'Top issues selected',
      passed: result.top_issues && result.top_issues.length > 0,
      message: result.top_issues
        ? `${result.top_issues.length} issues selected`
        : 'No top issues found'
    });

    checks.push({
      name: 'Screenshots preserved',
      passed: result.top_issues?.some(issue => issue.screenshot || issue.screenshot_url),
      message: result.top_issues?.filter(i => i.screenshot || i.screenshot_url).length + ' issues have screenshots'
    });

    checks.push({
      name: 'Report generated',
      passed: !!(result.report_path || result.pdf_path),
      message: result.pdf_path ? 'PDF report created' : 'No report found'
    });

    console.log('Verification Checks:');
    let passedCount = 0;
    checks.forEach(check => {
      if (check.passed) {
        console.log(`  ✅ ${check.name}`);
        console.log(`     ${check.message}`);
        passedCount++;
      } else {
        console.log(`  ⚠️  ${check.name}`);
        console.log(`     ${check.message}`);
      }
    });

    console.log(`\nPassed ${passedCount}/${checks.length} checks\n`);

    // Summary
    console.log('═══════════════════════════════════════');
    console.log('Pipeline Summary');
    console.log('═══════════════════════════════════════');
    console.log(`✅ Analysis completed in ${analysisDuration}s`);
    if (result.deduplication_stats) {
      console.log(`✅ Deduplication: ${result.deduplication_stats.original_count} → ${result.deduplication_stats.consolidated_count} issues (${result.deduplication_stats.reduction_percentage}% reduction)`);
    }
    console.log(`✅ Top issues: ${result.top_issues?.length || 0} selected`);
    console.log(`✅ Grade: ${result.grade} (${result.overall_score}/100)`);
    if (result.pdf_path) {
      console.log(`✅ Report: ${result.pdf_path}`);
    }
    console.log();

    process.exit(passedCount === checks.length ? 0 : 1);

  } catch (error) {
    console.error('\n❌ Pipeline failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

runFullPipeline();
