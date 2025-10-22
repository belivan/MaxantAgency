/**
 * Test Local Report Generation
 * Tests local report generation without uploading to Supabase
 */

import { generateReport, generateReportFilename } from '../analysis-engine/reports/report-generator.js';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function testLocalReportGeneration() {
  console.log('🧪 Testing Local Report Generation\n');
  console.log('═'.repeat(60));

  // Create a mock analysis result
  const mockAnalysisResult = {
    company_name: 'Test Restaurant',
    url: 'https://test-restaurant.com',
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
    
    // Issues
    design_issues: [
      'Mobile navigation could be improved',
      'Hero image loads slowly',
      'Font size too small on mobile'
    ],
    design_issues_desktop: [
      'Hero image loads slowly on desktop'
    ],
    design_issues_mobile: [
      'Mobile navigation could be improved',
      'Font size too small on mobile'
    ],
    desktop_critical_issues: 1,
    mobile_critical_issues: 2,
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
    accessibility_issues: [
      'Images missing alt text',
      'Low color contrast on buttons'
    ],
    accessibility_compliance: {
      wcag_a: true,
      wcag_aa: false,
      wcag_aaa: false
    },
    accessibility_wcag_level: 'A',
    
    // Quick wins
    quick_wins: [
      'Add meta descriptions to all pages',
      'Fix broken social media links',
      'Optimize hero image size',
      'Add structured data markup',
      'Improve mobile navigation'
    ],
    
    // Insights
    analysis_summary: 'The website has a good foundation but needs improvements in SEO and mobile optimization.',
    top_issue: {
      category: 'SEO',
      issue: 'Missing meta descriptions',
      impact: 'High',
      effort: 'Low'
    },
    one_liner: 'Great visual design held back by technical SEO issues',
    call_to_action: 'Let us help you improve your SEO and mobile experience',
    outreach_angle: 'Quick SEO wins that could increase traffic by 30%',
    
    // Lead scoring
    lead_priority: 'high',
    lead_priority_reasoning: 'High-quality website with clear improvement opportunities',
    priority_tier: 'A',
    budget_likelihood: 'medium',
    fit_score: 85,
    quality_gap_score: 70,
    budget_score: 75,
    urgency_score: 60,
    
    // Technical details
    is_mobile_friendly: true,
    has_https: true,
    has_blog: false,
    page_load_time: 3.2,
    page_title: 'Test Restaurant - Best Food in Town',
    meta_description: 'Experience amazing dining at Test Restaurant',
    
    // Contact info
    contact_email: 'info@test-restaurant.com',
    contact_phone: '(555) 123-4567',
    
    // Social
    social_profiles: {
      facebook: 'https://facebook.com/testrestaurant',
      instagram: 'https://instagram.com/testrestaurant'
    },
    social_platforms_present: ['facebook', 'instagram'],
    social_metadata: {
      og_title: 'Test Restaurant',
      og_description: 'Best food in town'
    },
    
    // Business intelligence
    business_intelligence: {
      business_type: 'Restaurant',
      service_areas: ['Dine-in', 'Takeout', 'Delivery'],
      unique_selling_points: ['Farm-to-table', 'Local ingredients']
    },
    
    // Content insights
    content_insights: {
      word_count: 1200,
      headings_count: 8,
      links_count: 15
    },
    
    // Crawl metadata
    pages_discovered: 15,
    pages_crawled: 8,
    pages_analyzed: 8,
    crawl_metadata: {
      pages_crawled: 8,
      crawl_time: 5.2,
      failed_pages: []
    },
    
    // AI models used
    seo_analysis_model: 'gpt-4o-mini',
    content_analysis_model: 'gpt-4o-mini',
    desktop_visual_model: 'gpt-4o',
    mobile_visual_model: 'gpt-4o',
    
    // Timestamps
    analyzed_at: new Date().toISOString(),
    analysis_time: 45.5,
    analysis_cost: 0.15
  };

  try {
    // Create reports directory
    const reportsDir = join(__dirname, 'reports', 'local-test');
    await mkdir(reportsDir, { recursive: true });
    console.log(`📁 Reports directory: ${reportsDir}\n`);

    // Test 1: Generate Markdown report
    console.log('📝 Test 1: Generating Markdown report...');
    const markdownReport = await generateReport(mockAnalysisResult, {
      format: 'markdown',
      sections: ['all']
    });

    const markdownFilename = generateReportFilename(mockAnalysisResult, 'markdown');
    const markdownPath = join(reportsDir, markdownFilename);
    await writeFile(markdownPath, markdownReport.content, 'utf8');

    console.log('✅ Markdown report generated successfully!');
    console.log(`   File: ${markdownFilename}`);
    console.log(`   Size: ${markdownReport.metadata.content_length} bytes`);
    console.log(`   Words: ${markdownReport.metadata.word_count}`);
    console.log(`   Time: ${markdownReport.metadata.generation_time_ms}ms`);
    console.log(`   Path: ${markdownPath}\n`);

    // Test 2: Generate HTML report
    console.log('📝 Test 2: Generating HTML report...');
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

    // Test 3: Generate report with specific sections only
    console.log('📝 Test 3: Generating report with specific sections...');
    const partialReport = await generateReport(mockAnalysisResult, {
      format: 'markdown',
      sections: ['executive', 'seo', 'content']
    });

    const partialFilename = 'test-restaurant-partial-' + Date.now() + '.md';
    const partialPath = join(reportsDir, partialFilename);
    await writeFile(partialPath, partialReport.content, 'utf8');

    console.log('✅ Partial report generated successfully!');
    console.log(`   File: ${partialFilename}`);
    console.log(`   Sections: executive, seo, content`);
    console.log(`   Size: ${partialReport.metadata.content_length} bytes`);
    console.log(`   Path: ${partialPath}\n`);

    console.log('═'.repeat(60));
    console.log('✅ All tests passed!\n');
    console.log('Summary:');
    console.log('• Local report generation is working correctly');
    console.log('• Both Markdown and HTML formats are supported');
    console.log('• Partial reports with specific sections work');
    console.log(`• Reports saved to: ${reportsDir}\n`);

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    console.error('\nError details:');
    console.error('Message:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Run the test
testLocalReportGeneration().catch(console.error);
