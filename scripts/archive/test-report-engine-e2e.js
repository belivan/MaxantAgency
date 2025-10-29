/**
 * End-to-End Test for ReportEngine
 * Tests report generation with synthesis data storage
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const REPORT_ENGINE_URL = 'http://localhost:3003';

async function testReportGeneration() {
  console.log('\n🧪 REPORT ENGINE END-TO-END TEST');
  console.log('=' .repeat(60));

  try {
    // STEP 1: Fetch a test lead from database
    console.log('\n📋 Step 1: Fetching test lead from database...');

    const { data: leads, error: fetchError } = await supabase
      .from('leads')
      .select('*')
      .order('analyzed_at', { ascending: false })
      .limit(1);

    if (fetchError) {
      throw new Error(`Failed to fetch lead: ${fetchError.message}`);
    }

    if (!leads || leads.length === 0) {
      throw new Error('No leads found in database. Please run analysis first.');
    }

    const testLead = leads[0];
    console.log(`✅ Found lead: ${testLead.company_name} (${testLead.url})`);
    console.log(`   Grade: ${testLead.website_grade}`);
    console.log(`   Score: ${testLead.overall_score}`);
    console.log(`   Lead ID: ${testLead.id}`);

    // STEP 2: Generate report via ReportEngine API
    console.log('\n📊 Step 2: Generating report via ReportEngine API...');
    console.log(`   URL: POST ${REPORT_ENGINE_URL}/api/generate`);
    console.log(`   Synthesis: ${process.env.USE_AI_SYNTHESIS === 'true' ? 'ENABLED' : 'DISABLED'}`);

    const reportResponse = await fetch(`${REPORT_ENGINE_URL}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        analysisResult: testLead,
        options: {
          format: 'html',
          sections: ['all'],
          saveToDatabase: true,
          project_id: testLead.project_id,
          lead_id: testLead.id
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

    console.log(`✅ Report generated successfully!`);
    console.log(`   Report ID: ${reportResult.report.id}`);
    console.log(`   Format: ${reportResult.report.format}`);
    console.log(`   Storage Path: ${reportResult.report.storage_path}`);
    console.log(`   Local Path: ${reportResult.report.local_path}`);

    // STEP 3: Verify synthesis data was stored in database
    console.log('\n🔍 Step 3: Verifying synthesis data in database...');

    const { data: reportData, error: reportError } = await supabase
      .from('reports')
      .select('*')
      .eq('id', reportResult.report.id)
      .single();

    if (reportError) {
      throw new Error(`Failed to fetch report from database: ${reportError.message}`);
    }

    console.log(`✅ Report found in database`);
    console.log('\n📊 Synthesis Metrics:');
    console.log(`   Synthesis Used: ${reportData.synthesis_used}`);
    console.log(`   Synthesis Cost: $${reportData.synthesis_cost?.toFixed(4) || 'N/A'}`);
    console.log(`   Synthesis Tokens: ${reportData.synthesis_tokens || 'N/A'}`);
    console.log(`   Synthesis Duration: ${reportData.synthesis_duration_ms ? (reportData.synthesis_duration_ms / 1000).toFixed(2) + 's' : 'N/A'}`);
    console.log(`   Synthesis Errors: ${reportData.synthesis_errors}`);

    console.log('\n📊 Issue Statistics:');
    console.log(`   Original Issues: ${reportData.original_issues_count || 'N/A'}`);
    console.log(`   Consolidated Issues: ${reportData.consolidated_issues_count || 'N/A'}`);
    console.log(`   Reduction: ${reportData.issue_reduction_percentage || 0}%`);

    console.log('\n📊 Report Metadata:');
    console.log(`   Report Version: ${reportData.report_version}`);
    console.log(`   Report Subtype: ${reportData.report_subtype || 'N/A'}`);
    console.log(`   Generation Time: ${reportData.generation_time_ms ? (reportData.generation_time_ms / 1000).toFixed(2) + 's' : 'N/A'}`);
    console.log(`   Word Count: ${reportData.word_count || 'N/A'}`);
    console.log(`   File Size: ${reportData.file_size_bytes ? (reportData.file_size_bytes / 1024).toFixed(2) + ' KB' : 'N/A'}`);

    // Check if synthesis_data JSONB column has data
    console.log('\n📦 Synthesis Data (JSONB):');
    if (reportData.synthesis_data) {
      console.log(`   ✅ synthesis_data column populated`);
      console.log(`   - Consolidated Issues: ${reportData.synthesis_data.consolidatedIssues?.length || 0}`);
      console.log(`   - Executive Summary: ${reportData.synthesis_data.executiveSummary ? 'Present' : 'Missing'}`);
      console.log(`   - Screenshot References: ${reportData.synthesis_data.screenshotReferences?.length || 0}`);
      console.log(`   - Stage Metadata: ${reportData.synthesis_data.stageMetadata ? 'Present' : 'Missing'}`);

      if (reportData.synthesis_data.executiveSummary) {
        console.log(`\n📝 Executive Summary Preview:`);
        console.log(`   Headline: ${reportData.synthesis_data.executiveSummary.headline || 'N/A'}`);
        console.log(`   Critical Findings: ${reportData.synthesis_data.executiveSummary.criticalFindings?.length || 0}`);
      }
    } else {
      console.log(`   ⚠️  synthesis_data column is NULL (synthesis was disabled)`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ END-TO-END TEST PASSED!');
    console.log('='.repeat(60));
    console.log(`\n🎉 All synthesis data was successfully stored in the reports table!`);
    console.log(`📄 Report ID: ${reportData.id}`);
    console.log(`🔗 Download URL: ${reportResult.report.download_url || 'N/A'}\n`);

    return true;

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error(error.stack);
    return false;
  }
}

// Run the test
testReportGeneration()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
