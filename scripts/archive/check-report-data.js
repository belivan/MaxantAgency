/**
 * Check the report data that was saved
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkReportData() {
  console.log('\n🔍 Checking most recent report in database...\n');

  const { data: reports, error } = await supabase
    .from('reports')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) {
    console.error('❌ Error:', error.message);
    return;
  }

  if (!reports || reports.length === 0) {
    console.log('⚠️  No reports found');
    return;
  }

  const report = reports[0];

  console.log('✅ Found report:', report.id);
  console.log('\n' + '='.repeat(60));
  console.log('BASIC INFO');
  console.log('='.repeat(60));
  console.log(`Company: ${report.company_name}`);
  console.log(`URL: ${report.website_url}`);
  console.log(`Grade: ${report.website_grade}`);
  console.log(`Score: ${report.overall_score}`);
  console.log(`Format: ${report.format}`);
  console.log(`Generated: ${report.generated_at}`);

  console.log('\n' + '='.repeat(60));
  console.log('SYNTHESIS METRICS');
  console.log('='.repeat(60));
  console.log(`Synthesis Used: ${report.synthesis_used}`);
  console.log(`Synthesis Cost: $${report.synthesis_cost?.toFixed(4) || 'N/A'}`);
  console.log(`Synthesis Tokens: ${report.synthesis_tokens || 'N/A'}`);
  console.log(`Synthesis Duration: ${report.synthesis_duration_ms ? (report.synthesis_duration_ms / 1000).toFixed(2) + 's' : 'N/A'}`);
  console.log(`Synthesis Errors: ${report.synthesis_errors}`);

  console.log('\n' + '='.repeat(60));
  console.log('ISSUE STATISTICS');
  console.log('='.repeat(60));
  console.log(`Original Issues: ${report.original_issues_count || 'N/A'}`);
  console.log(`Consolidated Issues: ${report.consolidated_issues_count || 'N/A'}`);
  console.log(`Reduction: ${report.issue_reduction_percentage || 0}%`);

  console.log('\n' + '='.repeat(60));
  console.log('REPORT METADATA');
  console.log('='.repeat(60));
  console.log(`Report Version: ${report.report_version || 'N/A'}`);
  console.log(`Report Subtype: ${report.report_subtype || 'N/A'}`);
  console.log(`Generation Time: ${report.generation_time_ms ? (report.generation_time_ms / 1000).toFixed(2) + 's' : 'N/A'}`);
  console.log(`Word Count: ${report.word_count || 'N/A'}`);
  console.log(`File Size: ${report.file_size_bytes ? (report.file_size_bytes / 1024).toFixed(2) + ' KB' : 'N/A'}`);

  console.log('\n' + '='.repeat(60));
  console.log('SYNTHESIS DATA (JSONB)');
  console.log('='.repeat(60));

  if (report.synthesis_data) {
    console.log('✅ synthesis_data column is populated!');
    console.log(`\nKeys: ${Object.keys(report.synthesis_data).join(', ')}`);

    if (report.synthesis_data.consolidatedIssues) {
      console.log(`\n📋 Consolidated Issues: ${report.synthesis_data.consolidatedIssues.length}`);
      report.synthesis_data.consolidatedIssues.forEach((issue, i) => {
        console.log(`   ${i + 1}. ${issue.title} (${issue.severity})`);
      });
    }

    if (report.synthesis_data.executiveSummary) {
      console.log(`\n📝 Executive Summary:`);
      console.log(`   Headline: ${report.synthesis_data.executiveSummary.headline}`);
      console.log(`   Overview: ${report.synthesis_data.executiveSummary.overview?.substring(0, 100)}...`);
      console.log(`   Critical Findings: ${report.synthesis_data.executiveSummary.criticalFindings?.length || 0}`);
      console.log(`   Has Roadmap: ${report.synthesis_data.executiveSummary.strategicRoadmap ? 'Yes' : 'No'}`);
      console.log(`   ROI Statement: ${report.synthesis_data.executiveSummary.roiStatement ? 'Yes' : 'No'}`);
    }

    if (report.synthesis_data.stageMetadata) {
      console.log(`\n🤖 AI Stage Metadata:`);
      Object.entries(report.synthesis_data.stageMetadata).forEach(([stage, meta]) => {
        console.log(`   ${stage}:`);
        console.log(`     - Model: ${meta.model || 'N/A'}`);
        console.log(`     - Tokens: ${meta.total_tokens || 'N/A'}`);
        console.log(`     - Cost: $${meta.estimated_cost?.toFixed(4) || 'N/A'}`);
        console.log(`     - Duration: ${meta.duration_ms ? (meta.duration_ms / 1000).toFixed(2) + 's' : 'N/A'}`);
      });
    }
  } else {
    console.log('⚠️  synthesis_data column is NULL');
  }

  console.log('\n' + '='.repeat(60));
  console.log('🎉 ALL SYNTHESIS DATA SUCCESSFULLY STORED!');
  console.log('='.repeat(60));
  console.log();
}

checkReportData().catch(console.error);
