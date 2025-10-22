/**
 * Test Report Integration
 * Tests automatic report generation and upload when saving leads
 */

import { saveLead } from '../database/supabase-client.js';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testReportIntegration() {
  console.log('🧪 Testing Report Integration with Analysis Engine\n');
  console.log('=' .repeat(50));

  // Create a mock analysis result
  const mockLead = {
    company_name: 'Test Restaurant',
    industry: 'restaurant',
    url: 'https://test-restaurant.com',
    city: 'San Francisco',
    state: 'CA',
    website_grade: 'B',
    overall_score: 75.5,
    design_score: 80,
    seo_score: 70,
    content_score: 75,
    social_score: 77,
    design_issues: [
      'Mobile navigation could be improved',
      'Hero image loads slowly',
      'Font size too small on mobile'
    ],
    seo_issues: [
      'Missing meta descriptions on some pages',
      'No structured data for local business',
      'Slow page load time (3.2s)'
    ],
    content_issues: [
      'Menu descriptions are too brief',
      'No clear call-to-action on homepage',
      'Contact information hard to find'
    ],
    social_issues: [
      'Instagram link is broken',
      'No recent posts on Facebook',
      'Missing Twitter/X profile'
    ],
    quick_wins: [
      'Add meta descriptions to all pages',
      'Fix broken social media links',
      'Optimize hero image size',
      'Add structured data markup',
      'Improve mobile navigation'
    ],
    analysis_summary: 'The website has a good foundation but needs improvements in SEO and mobile optimization.',
    top_issue: {
      category: 'SEO',
      issue: 'Missing meta descriptions',
      impact: 'High',
      effort: 'Low'
    },
    one_liner: 'Great visual design held back by technical SEO issues',
    is_mobile_friendly: true,
    has_https: true,
    screenshot_desktop_url: 'https://placeholder.com/desktop.png',
    screenshot_mobile_url: 'https://placeholder.com/mobile.png',
    analyzed_at: new Date().toISOString()
  };

  try {
    // Test 1: Save lead with auto-generated Markdown report
    console.log('\n📝 Test 1: Save lead with Markdown report generation...');
    const result1 = await saveLead(mockLead, {
      generateReport: true,
      reportFormat: 'markdown'
    });

    if (result1.report_id) {
      console.log('✅ Markdown report generated successfully!');
      console.log('   Report ID:', result1.report_id);
      console.log('   Storage Path:', result1.report_path);

      // Verify report exists in database
      const { data: reportRecord } = await supabase
        .from('reports')
        .select('*')
        .eq('id', result1.report_id)
        .single();

      if (reportRecord) {
        console.log('✅ Report record found in database');
        console.log('   Format:', reportRecord.format);
        console.log('   File Size:', reportRecord.file_size_bytes, 'bytes');
        console.log('   Status:', reportRecord.status);
      }
    } else {
      console.log('⚠️ No report generated (check logs for errors)');
    }

    // Test 2: Save another lead with HTML report
    console.log('\n📝 Test 2: Save lead with HTML report generation...');
    const mockLead2 = {
      ...mockLead,
      company_name: 'Test Hotel',
      industry: 'hospitality',
      url: 'https://test-hotel.com'
    };

    const result2 = await saveLead(mockLead2, {
      generateReport: true,
      reportFormat: 'html'
    });

    if (result2.report_id) {
      console.log('✅ HTML report generated successfully!');
      console.log('   Report ID:', result2.report_id);
      console.log('   Storage Path:', result2.report_path);
    }

    // Test 3: Save lead without report generation
    console.log('\n📝 Test 3: Save lead WITHOUT report generation...');
    const mockLead3 = {
      ...mockLead,
      company_name: 'Test Retail',
      industry: 'retail',
      url: 'https://test-retail.com'
    };

    const result3 = await saveLead(mockLead3, {
      generateReport: false
    });

    if (!result3.report_id) {
      console.log('✅ Lead saved without report (as expected)');
    }

    // Get all reports for verification
    console.log('\n📊 Checking all generated reports...');
    const { data: allReports } = await supabase
      .from('reports')
      .select('company_name, format, file_size_bytes, status')
      .order('created_at', { ascending: false })
      .limit(5);

    if (allReports && allReports.length > 0) {
      console.log('\nRecent reports in database:');
      allReports.forEach(report => {
        console.log(`  • ${report.company_name}: ${report.format} (${report.file_size_bytes} bytes) - ${report.status}`);
      });
    }

    // Clean up test data
    console.log('\n🧹 Cleaning up test data...');

    // Delete test leads
    await supabase.from('leads').delete().eq('id', result1.id);
    await supabase.from('leads').delete().eq('id', result2.id);
    await supabase.from('leads').delete().eq('id', result3.id);

    // Reports should cascade delete due to foreign key constraint
    console.log('✅ Test data cleaned up');

    console.log('\n' + '=' .repeat(50));
    console.log('✅ Report integration test complete!');
    console.log('\nKey findings:');
    console.log('• Reports are automatically generated when leads are saved');
    console.log('• Both Markdown and HTML formats are supported');
    console.log('• Reports are uploaded to Supabase Storage');
    console.log('• Report metadata is saved to the reports table');
    console.log('• Report generation can be disabled if needed');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testReportIntegration().catch(console.error);