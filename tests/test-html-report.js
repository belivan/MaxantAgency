/**
 * Test HTML Report Generation
 */

import { generateReport, generateReportFilename } from '../analysis-engine/reports/report-generator.js';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function testHTMLReport() {
  console.log('🧪 Testing HTML Report Generation\n');
  console.log('═'.repeat(60));

  const mockAnalysisResult = {
    company_name: 'HTML Test Restaurant',
    url: 'https://html-test-restaurant.com',
    industry: 'restaurant',
    grade: 'B',
    overall_score: 75.5,
    design_score: 80,
    design_score_desktop: 82,
    design_score_mobile: 78,
    seo_score: 70,
    content_score: 75,
    social_score: 77,
    accessibility_score: 68,
    
    design_issues: ['Navigation needs improvement'],
    seo_issues: ['Missing meta descriptions'],
    content_issues: ['CTA not clear'],
    social_issues: ['Broken Instagram link'],
    
    one_liner: 'Good foundation, needs SEO work',
    analysis_summary: 'The website shows promise but needs technical improvements',
    
    analyzed_at: new Date().toISOString()
  };

  try {
    const reportsDir = join(__dirname, 'reports', 'local-test');
    await mkdir(reportsDir, { recursive: true });

    console.log('📝 Generating HTML report...\n');

    const htmlReport = await generateReport(mockAnalysisResult, {
      format: 'html',
      sections: ['all']
    });

    const htmlFilename = generateReportFilename(mockAnalysisResult, 'html');
    const htmlPath = join(reportsDir, htmlFilename);
    await writeFile(htmlPath, htmlReport.content, 'utf8');

    console.log('✅ HTML report generated successfully!');
    console.log(`   File: ${htmlFilename}`);
    console.log(`   Size: ${htmlReport.metadata.content_length} bytes`);
    console.log(`   Words: ${htmlReport.metadata.word_count}`);
    console.log(`   Time: ${htmlReport.metadata.generation_time_ms}ms`);
    console.log(`   Path: ${htmlPath}\n`);

    console.log('═'.repeat(60));
    console.log('✅ Test passed!\n');

  } catch (error) {
    console.error('❌ HTML report generation failed:');
    console.error('Error:', error.message);
    console.error('\nStack trace:');
    console.error(error.stack);
    process.exit(1);
  }
}

testHTMLReport().catch(console.error);
