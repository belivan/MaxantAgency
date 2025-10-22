/**
 * Test Auto Report Generation with Local Backups
 */

import { autoGenerateReport } from '../analysis-engine/reports/auto-report-generator.js';
import dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../.env') });

async function testAutoReport() {
  console.log('🧪 Testing Auto Report Generation with Local Backups\n');
  console.log('═'.repeat(60));

  // Mock analysis result (simulating what comes from the database)
  const mockLead = {
    id: 'test-lead-123',
    company_name: 'Auto Test Restaurant',
    url: 'https://auto-test-restaurant.com',
    industry: 'restaurant',
    project_id: 'test-project-456',
    grade: 'B',
    overall_score: 76,
    website_grade: 'B',
    website_score: 76,
    design_score: 80,
    design_score_desktop: 82,
    design_score_mobile: 78,
    seo_score: 72,
    content_score: 75,
    social_score: 77,
    accessibility_score: 70,
    
    design_issues: ['Navigation needs improvement'],
    seo_issues: ['Missing meta descriptions'],
    content_issues: ['CTA not clear'],
    social_issues: ['Broken Instagram link'],
    
    one_liner: 'Good foundation, needs SEO work',
    analysis_summary: 'The website shows promise but needs technical improvements',
    
    analyzed_at: new Date().toISOString()
  };

  try {
    console.log(`📝 Generating auto report for: ${mockLead.company_name}\n`);

    const result = await autoGenerateReport(mockLead, {
      format: 'markdown',
      sections: ['all'],
      saveToDatabase: false, // Don't save to DB during test
      project_id: mockLead.project_id
    });

    if (result.success) {
      console.log('✅ Auto report generated successfully!\n');
      console.log('Details:');
      console.log(`  • Storage Path: ${result.storage_path}`);
      console.log(`  • Local Path: ${result.local_path}`);
      console.log(`  • Format: ${result.format}`);
      console.log(`  • File Size: ${result.file_size} bytes`);
      console.log(`  • Generation Time: ${result.metadata.generation_time_ms}ms`);
      console.log(`  • Word Count: ${result.metadata.word_count}`);
    } else {
      console.error('❌ Auto report generation failed:', result.error);
    }

    console.log('\n' + '═'.repeat(60));
    console.log('✅ Test complete!\n');
    console.log('Check the local-backups/analysis-engine/reports directory');
    console.log('for the generated report file.');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

testAutoReport().catch(console.error);
