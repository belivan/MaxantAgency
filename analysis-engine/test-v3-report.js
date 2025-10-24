/**
 * Test V3 Report Generation
 * Tests the new concise, professional, mobile-responsive report design
 */

import { generateHTMLReportV3 } from './reports/exporters/html-exporter-v3-concise.js';
import { writeFile } from 'fs/promises';
import { join } from 'path';

// Sample analysis data for testing
const sampleAnalysisResult = {
  company_name: 'Acme Corporation',
  url: 'https://www.acme-corp.com',
  industry: 'Technology',
  city: 'San Francisco',
  grade: 'B',
  overall_score: 72,

  // Individual scores
  design_score: 75,
  seo_score: 68,
  content_score: 78,
  social_score: 65,

  // Key findings
  top_issue: 'Page load speed exceeds 3 seconds on mobile devices',
  one_liner: 'A solid website with opportunities to enhance performance and user engagement',

  // Issues
  design_issues: [
    'Mobile navigation menu is difficult to access',
    'Call-to-action buttons lack visual prominence',
    'Form fields are not optimized for mobile input'
  ],

  seo_issues: [
    'Missing meta descriptions on 40% of pages',
    'No structured data markup implementation',
    'Image alt text missing or generic'
  ],

  // Quick wins
  quick_wins: [
    'Compress and optimize images (can reduce load time by 30%)',
    'Add meta descriptions to all pages',
    'Implement lazy loading for below-fold images',
    'Fix broken internal links (found 12)',
    'Add Google Analytics tracking'
  ],
  quick_wins_count: 5,

  // Screenshots (placeholder paths)
  screenshot_desktop_url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  screenshot_mobile_url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',

  // Metadata
  analyzed_at: new Date().toISOString(),
  pages_analyzed: 15,
  analysis_time: 180, // 3 minutes
};

// Sample synthesis data (if AI synthesis is enabled)
const sampleSynthesisData = {
  consolidatedIssues: [
    {
      title: 'Mobile Performance Issues',
      description: 'Multiple mobile-specific problems affecting user experience',
      severity: 'critical',
      businessImpact: 'Mobile users represent 60% of traffic but have 40% higher bounce rate',
      recommendation: 'Prioritize mobile optimization to capture lost conversions'
    },
    {
      title: 'SEO Foundation Gaps',
      description: 'Missing basic SEO elements limiting search visibility',
      severity: 'high',
      businessImpact: 'Reducing potential organic traffic by an estimated 25-30%',
      recommendation: 'Implement SEO best practices to improve search rankings'
    },
    {
      title: 'Conversion Path Optimization',
      description: 'CTAs and forms need improvement for better conversion',
      severity: 'high',
      businessImpact: 'Current conversion rate is below industry average',
      recommendation: 'Redesign CTAs and simplify form fields'
    }
  ],

  executiveSummary: {
    overview: 'Acme Corporation\'s website demonstrates solid fundamentals with clear opportunities for improvement. The site performs well in content quality but needs attention to mobile optimization and SEO implementation to maximize its potential.',
    topPriority: 'Address mobile performance issues to improve experience for 60% of visitors',
    businessImpact: [
      {
        area: 'User Engagement',
        current: 'High bounce rate on mobile (45%)',
        potential: 'Reduce bounce rate to 30% with optimization'
      },
      {
        area: 'Search Visibility',
        current: 'Limited organic reach',
        potential: 'Increase organic traffic by 30%'
      },
      {
        area: 'Conversion Rate',
        current: 'Below industry average',
        potential: 'Match or exceed industry benchmarks'
      }
    ]
  }
};

async function testV3Report() {
  console.log('🧪 Testing V3 Report Generation...\n');
  console.log('Features being tested:');
  console.log('✅ Professional light theme design');
  console.log('✅ Mobile-responsive layout');
  console.log('✅ Concise structure without repetition');
  console.log('✅ Clear visual hierarchy');
  console.log('✅ Actionable insights focus\n');

  try {
    // Test 1: Generate report with synthesis data
    console.log('Test 1: Generating report WITH synthesis data...');
    const htmlWithSynthesis = await generateHTMLReportV3(
      sampleAnalysisResult,
      sampleSynthesisData
    );

    const outputPath1 = join(process.cwd(), 'test-report-v3-with-synthesis.html');
    await writeFile(outputPath1, htmlWithSynthesis);
    console.log(`✅ Report saved to: ${outputPath1}`);
    console.log(`   File size: ${(htmlWithSynthesis.length / 1024).toFixed(1)} KB\n`);

    // Test 2: Generate report without synthesis data (fallback mode)
    console.log('Test 2: Generating report WITHOUT synthesis data (fallback mode)...');
    const htmlWithoutSynthesis = await generateHTMLReportV3(
      sampleAnalysisResult,
      {} // Empty synthesis data
    );

    const outputPath2 = join(process.cwd(), 'test-report-v3-without-synthesis.html');
    await writeFile(outputPath2, htmlWithoutSynthesis);
    console.log(`✅ Report saved to: ${outputPath2}`);
    console.log(`   File size: ${(htmlWithoutSynthesis.length / 1024).toFixed(1)} KB\n`);

    // Test 3: Generate report with different grades
    const grades = ['A', 'C', 'F'];
    for (const grade of grades) {
      console.log(`Test 3.${grades.indexOf(grade) + 1}: Generating Grade ${grade} report...`);
      const modifiedResult = {
        ...sampleAnalysisResult,
        grade,
        overall_score: grade === 'A' ? 92 : grade === 'C' ? 58 : 35
      };

      const htmlGrade = await generateHTMLReportV3(modifiedResult, {});
      const outputPathGrade = join(process.cwd(), `test-report-v3-grade-${grade}.html`);
      await writeFile(outputPathGrade, htmlGrade);
      console.log(`✅ Grade ${grade} report saved to: ${outputPathGrade}`);
    }

    console.log('\n📊 Report Generation Summary:');
    console.log('================================');
    console.log('✅ All test reports generated successfully!');
    console.log('\nTo view the reports:');
    console.log('1. Open the HTML files in your browser');
    console.log('2. Test mobile view using browser dev tools (F12 > Toggle device)');
    console.log('3. Try printing (Ctrl+P) to test print optimization');
    console.log('\nKey features to verify:');
    console.log('• Light, professional color scheme');
    console.log('• Responsive layout on mobile devices');
    console.log('• No repetitive information between sections');
    console.log('• Clear action items without redundancy');
    console.log('• Smooth scrolling and interactive elements');

  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error(error.stack);
  }
}

// Run the test
testV3Report().catch(console.error);