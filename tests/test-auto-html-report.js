/**
 * Test Auto HTML Report Generation
 * Tests the auto-report-generator with HTML format
 */

import { autoGenerateReport } from '../analysis-engine/reports/auto-report-generator.js';
import dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '../.env') });

async function testAutoHTMLReport() {
  console.log('🧪 Testing Auto HTML Report Generation\n');
  console.log('═'.repeat(60));

  const mockLead = {
    id: 'test-html-lead-123',
    company_name: 'Auto HTML Test Restaurant',
    url: 'https://auto-html-test.com',
    industry: 'restaurant',
    project_id: 'test-project-456',
    grade: 'B',
    overall_score: 76,
    website_grade: 'B',
    website_score: 76,
    design_score: 80,
    seo_score: 72,
    content_score: 75,
    social_score: 77,
    
    design_issues: ['Navigation needs improvement'],
    seo_issues: ['Missing meta descriptions'],
    content_issues: ['CTA not clear'],
    social_issues: ['Broken Instagram link'],
    
    one_liner: 'Good foundation, needs SEO work',
    analysis_summary: 'The website shows promise but needs technical improvements',
    
    analyzed_at: new Date().toISOString()
  };

  try {
    console.log(`📝 Generating auto HTML report for: ${mockLead.company_name}\n`);

    const result = await autoGenerateReport(mockLead, {
      format: 'html', // Explicitly testing HTML
      sections: ['all'],
      saveToDatabase: false,
      project_id: mockLead.project_id
    });

    if (result.success) {
      console.log('✅ Auto HTML report generated successfully!\n');
      console.log('Details:');
      console.log(`  • Storage Path: ${result.storage_path}`);
      console.log(`  • Local Path: ${result.local_path}`);
      console.log(`  • Format: ${result.format}`);
      console.log(`  • File Size: ${result.file_size} bytes`);
      console.log(`  • Generation Time: ${result.metadata.generation_time_ms}ms`);
      console.log(`  • Word Count: ${result.metadata.word_count}`);
    } else {
      console.error('❌ Auto HTML report generation failed:', result.error);
      return false;
    }

    console.log('\n' + '═'.repeat(60));
    console.log('✅ Test complete!\n');
    return true;

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    console.error('Message:', error.message);
    console.error('Stack:', error.stack);
    return false;
  }
}

testAutoHTMLReport()
  .then(success => {
    if (success) {
      console.log('HTML auto-report generation is working!');
      process.exit(0);
    } else {
      console.log('HTML auto-report generation failed');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('Test error:', error);
    process.exit(1);
  });
