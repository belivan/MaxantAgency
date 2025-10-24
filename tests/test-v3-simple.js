/**
 * Simple V3 Report Test
 * Tests report generation with mock data
 */

import { generateHTMLReportV3 } from '../analysis-engine/reports/exporters/html-exporter-v3-concise.js';
import { runReportSynthesis } from '../analysis-engine/reports/synthesis/report-synthesis.js';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: './analysis-engine/.env' });

// Mock analysis data for a realistic website
const mockAnalysisData = {
  // Company info
  company_name: 'TechStart Solutions',
  url: 'https://www.techstart-demo.com',
  industry: 'Technology Services',
  city: 'San Francisco',

  // Scores and grades
  grade: 'B',
  overall_score: 74,
  design_score: 78,
  seo_score: 70,
  content_score: 76,
  social_score: 72,

  // Key findings
  top_issue: 'Mobile page speed is 40% slower than desktop, affecting 65% of users',
  one_liner: 'A well-designed website with strong content but needs performance optimization',

  // Design issues
  design_issues: [
    'Mobile navigation menu is difficult to access on smaller screens',
    'CTA buttons lack sufficient contrast (3.5:1 instead of recommended 4.5:1)',
    'Form validation errors are not clearly visible to users',
    'Image carousels auto-advance too quickly (2 seconds)',
    'Footer links are too small for mobile touch targets'
  ],

  // SEO issues
  seo_issues: [
    'Missing meta descriptions on 12 out of 30 pages',
    'No structured data markup for products or services',
    'Images over 500KB slowing page load (found 8)',
    'Missing H1 tags on 5 pages',
    'No XML sitemap found'
  ],

  // Content issues
  content_issues: [
    'Homepage lacks clear value proposition',
    'Service pages have thin content (under 300 words)',
    'No customer testimonials or case studies'
  ],

  // Quick wins
  quick_wins: [
    'Compress all images using modern formats (WebP) - 50% size reduction',
    'Add missing meta descriptions to improve CTR',
    'Implement lazy loading for images below the fold',
    'Fix 15 broken internal links detected',
    'Add Google Analytics 4 tracking',
    'Enable browser caching headers',
    'Minify CSS and JavaScript files'
  ],
  quick_wins_count: 7,

  // Additional metadata
  analyzed_at: new Date().toISOString(),
  pages_analyzed: 15,
  analysis_time: 124,
  is_mobile_friendly: true,
  has_https: true,
  page_load_time: 3.8,

  // Placeholder screenshots
  screenshot_desktop_url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
  screenshot_mobile_url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
};

async function testV3WithSynthesis() {
  console.log('🧪 V3 REPORT TEST WITH SYNTHESIS');
  console.log('=================================\n');

  try {
    // Test 1: Generate report WITHOUT synthesis
    console.log('📝 Test 1: Generating report WITHOUT synthesis...');
    const reportWithoutSynthesis = await generateHTMLReportV3(mockAnalysisData, {});

    const outputPath1 = join(process.cwd(), 'test-v3-no-synthesis.html');
    await writeFile(outputPath1, reportWithoutSynthesis);
    console.log(`✅ Saved: test-v3-no-synthesis.html (${(reportWithoutSynthesis.length / 1024).toFixed(1)} KB)\n`);

    // Test 2: Run synthesis and generate report WITH synthesis
    console.log('📝 Test 2: Running AI synthesis and generating report...');
    console.log('  ⏳ Running synthesis (this may take 30-60 seconds)...');

    let synthesisData;
    try {
      // Only run if API keys are configured
      if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'sk-proj-your-openai-api-key-here') {
        synthesisData = await runReportSynthesis({
          analysisResult: mockAnalysisData,
          design: {
            overallDesignScore: mockAnalysisData.design_score,
            issues: mockAnalysisData.design_issues,
            positives: ['Clean layout', 'Good typography', 'Consistent branding']
          },
          seo: {
            overallScore: mockAnalysisData.seo_score,
            issues: mockAnalysisData.seo_issues,
            positives: ['HTTPS enabled', 'Mobile-friendly', 'Fast server response']
          },
          content: {
            overallScore: mockAnalysisData.content_score,
            issues: mockAnalysisData.content_issues,
            positives: ['Clear messaging', 'Professional tone', 'Good readability']
          },
          quickWins: mockAnalysisData.quick_wins
        });
        console.log('  ✅ Synthesis complete!');
      } else {
        console.log('  ⚠️ No API keys configured, using mock synthesis data');
        synthesisData = getMockSynthesisData();
      }
    } catch (error) {
      console.log('  ⚠️ Synthesis failed, using mock data:', error.message);
      synthesisData = getMockSynthesisData();
    }

    const reportWithSynthesis = await generateHTMLReportV3(mockAnalysisData, synthesisData);

    const outputPath2 = join(process.cwd(), 'test-v3-with-synthesis.html');
    await writeFile(outputPath2, reportWithSynthesis);
    console.log(`✅ Saved: test-v3-with-synthesis.html (${(reportWithSynthesis.length / 1024).toFixed(1)} KB)\n`);

    // Test 3: Different grades
    console.log('📝 Test 3: Testing different grade presentations...');
    const grades = [
      { grade: 'A', score: 92, label: 'excellent' },
      { grade: 'C', score: 58, label: 'needs-improvement' },
      { grade: 'F', score: 35, label: 'critical' }
    ];

    for (const gradeTest of grades) {
      const gradeData = {
        ...mockAnalysisData,
        grade: gradeTest.grade,
        overall_score: gradeTest.score
      };

      const gradeReport = await generateHTMLReportV3(gradeData, {});
      const gradePath = join(process.cwd(), `test-v3-grade-${gradeTest.grade}-${gradeTest.label}.html`);
      await writeFile(gradePath, gradeReport);
      console.log(`  ✅ Grade ${gradeTest.grade}: test-v3-grade-${gradeTest.grade}-${gradeTest.label}.html`);
    }

    // Success summary
    console.log('\n✨ SUCCESS! All test reports generated.\n');
    console.log('📋 Generated Files:');
    console.log('  1. test-v3-no-synthesis.html - Basic report without AI insights');
    console.log('  2. test-v3-with-synthesis.html - Enhanced report with AI synthesis');
    console.log('  3. test-v3-grade-A-excellent.html - Grade A presentation');
    console.log('  4. test-v3-grade-C-needs-improvement.html - Grade C presentation');
    console.log('  5. test-v3-grade-F-critical.html - Grade F presentation');

    console.log('\n📱 Testing Instructions:');
    console.log('1. Open any HTML file in your browser');
    console.log('2. Check desktop view for professional layout');
    console.log('3. Press F12 → Toggle device (Ctrl+Shift+M) for mobile view');
    console.log('4. Test at these breakpoints:');
    console.log('   • 320px (Mobile S)');
    console.log('   • 768px (Tablet)');
    console.log('   • 1920px (Desktop)');
    console.log('5. Try printing (Ctrl+P) to verify print layout');

    console.log('\n✅ Features to Verify:');
    console.log('• Clean, light background design');
    console.log('• Professional gradient hero section');
    console.log('• Mobile-responsive cards and grids');
    console.log('• No duplicate information');
    console.log('• Clear action priorities');
    console.log('• Smooth animations and transitions');

  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error(error.stack);
  }
}

function getMockSynthesisData() {
  return {
    consolidatedIssues: [
      {
        title: 'Mobile Performance Optimization Required',
        severity: 'critical',
        businessImpact: 'Mobile users (65% of traffic) experience 40% slower load times, directly impacting conversion rates',
        recommendation: 'Implement image optimization, lazy loading, and code minification',
        evidence: ['Mobile speed score: 45/100', 'Desktop speed: 78/100'],
        effort: 'medium'
      },
      {
        title: 'SEO Foundation Incomplete',
        severity: 'high',
        businessImpact: 'Missing 30% potential organic traffic due to poor search optimization',
        recommendation: 'Add meta descriptions, structured data, and XML sitemap',
        evidence: ['40% pages missing meta descriptions', 'No schema markup'],
        effort: 'low'
      },
      {
        title: 'Conversion Path Needs Enhancement',
        severity: 'high',
        businessImpact: 'Low CTA visibility reduces conversion rate by estimated 15-20%',
        recommendation: 'Improve CTA contrast, placement, and mobile touch targets',
        evidence: ['CTA contrast ratio 3.5:1', 'Touch targets < 44px'],
        effort: 'low'
      }
    ],
    executiveSummary: {
      overview: 'TechStart Solutions has a well-designed website with strong brand presentation. The primary opportunity lies in performance optimization and SEO implementation, which could increase traffic by 30% and improve conversion rates by 20%.',
      topPriority: 'Address mobile performance issues affecting 65% of visitors',
      businessImpact: [
        {
          area: 'User Experience',
          current: '40% slower mobile load times',
          potential: 'Sub-3 second load times across all devices'
        },
        {
          area: 'Search Visibility',
          current: 'Limited organic reach (ranking page 2-3)',
          potential: 'First page rankings for target keywords'
        },
        {
          area: 'Conversion Rate',
          current: '1.8% conversion rate',
          potential: '2.5-3% with optimizations'
        }
      ]
    }
  };
}

// Run the test
testV3WithSynthesis().catch(console.error);