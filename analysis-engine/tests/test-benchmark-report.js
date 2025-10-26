/**
 * Test Benchmark Report Generation
 * Generates HTML report with benchmark data to verify new sections
 */

import { generateHTMLReportV3 } from '../reports/exporters/html-exporter-v3-concise.js';
import { writeFile } from 'fs/promises';
import { join } from 'path';

console.log('🧪 TESTING BENCHMARK REPORT GENERATION\n');

// Mock analysis result with benchmark data
const analysisResult = {
  company_name: 'Chipotle Mexican Grill',
  industry: 'restaurant',
  city: 'Denver',
  state: 'CO',
  url: 'https://www.chipotle.com',
  grade: 'B',
  overall_score: 72,
  design_score: 65,
  seo_score: 68,
  performance_score: 70,
  content_score: 80,
  accessibility_score: 65,
  social_score: 62,

  quick_wins_count: 8,
  one_liner: 'Your website has strong content but opportunities exist in mobile UX and SEO optimization.',
  top_issue: 'Mobile CTA buttons are 33% smaller than industry standard, likely impacting mobile conversions',

  // Matched benchmark data
  matched_benchmark: {
    id: '18032591-4fc1-4ba1-a94f-3791dc5c02f8',
    company_name: 'Sweetgreen',
    website_url: 'https://www.sweetgreen.com',
    industry: 'restaurant',
    benchmark_tier: 'manual',
    comparison_tier: 'competitive',
    match_score: 90,
    match_reasoning: 'Sweetgreen is an exact industry match (fast-casual restaurant chain) with a similar business model focused on quick, customizable meals and strong digital ordering presence. Both brands target comparable demographics and require similar website features.',
    key_similarities: [
      'Industry match (fast-casual restaurant chain)',
      'Similar business model (quick, customizable meals)',
      'Multi-location/national chain profile',
      'Comparable website feature needs (menu, ordering, pickup/loyalty)'
    ],
    key_differences: [
      'Chipotle is larger in scale and has a broader menu offering',
      'Sweetgreen is more niche (salad/health positioning)',
      'Different loyalty/mobile app feature parity'
    ],
    scores: {
      overall: 78,
      grade: 'B',
      design: 71,
      seo: 74,
      content: 80,
      performance: 70,
      social: 78,
      accessibility: 72
    },
    design_strengths: [
      'Modern minimalist layout with ample whitespace',
      'High-quality food photography with professional shots',
      'Consistent brand colors across all pages',
      'Clear visual hierarchy and navigation'
    ],
    seo_strengths: [
      'Schema markup for menu items and locations',
      'Strong local SEO with location-specific pages',
      'Fast page load times (<2s average)',
      'Mobile-optimized content and metadata'
    ],
    content_strengths: [
      'Clear value proposition above the fold',
      'Compelling CTAs with action-oriented language',
      'Customer testimonials prominently featured',
      'Engaging storytelling about brand mission'
    ],
    social_strengths: [
      'Active social media integration on website',
      'Instagram feed showcased on homepage',
      'Social sharing buttons on all pages'
    ],
    accessibility_strengths: [
      'ARIA labels on interactive elements',
      'Keyboard navigation support',
      'High color contrast ratios'
    ]
  },

  // Mock issues
  design_issues_desktop: [
    { title: 'CTA buttons too small', severity: 'high' },
    { title: 'Inconsistent spacing between sections', severity: 'medium' }
  ],
  design_issues_mobile: [
    { title: 'Mobile navigation too complex', severity: 'high' },
    { title: 'Images not optimized for mobile', severity: 'medium' }
  ],
  seo_issues: [
    { title: 'Missing meta descriptions on 5 pages', severity: 'high' },
    { title: 'No schema markup implemented', severity: 'high' }
  ],
  content_issues: [
    { title: 'About page lacks compelling story', severity: 'low' }
  ],
  quick_wins: [
    'Enlarge CTA buttons to 18px',
    'Add meta descriptions',
    'Implement schema markup',
    'Optimize image file sizes',
    'Fix mobile navigation',
    'Add social sharing buttons',
    'Improve color contrast',
    'Enable HTTPS redirect'
  ],

  analyzed_at: new Date().toISOString(),

  // Mock screenshots
  screenshots: {
    desktop: {
      homepage: '/path/to/desktop-homepage.png'
    },
    mobile: {
      homepage: '/path/to/mobile-homepage.png'
    }
  }
};

try {
  console.log('📝 Generating HTML report with benchmark data...\n');

  const htmlReport = await generateHTMLReportV3(analysisResult, {});

  // Save to file
  const outputPath = join(process.cwd(), 'tests', 'test-benchmark-report.html');
  await writeFile(outputPath, htmlReport, 'utf-8');

  console.log('✅ REPORT GENERATED SUCCESSFULLY!\n');
  console.log(`📄 Saved to: ${outputPath}\n`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('SECTIONS INCLUDED:\n');
  console.log('✓ Executive Dashboard (with side-by-side benchmark comparison)');
  console.log('✓ Executive Summary (3-paragraph narrative with benchmark context)');
  console.log('✓ Benchmark Comparison Chart (score bars + strengths)');
  console.log('✓ 30-60-90 Day Roadmap');
  console.log('✓ Visual Evidence (placeholder)');
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log(`\nOpen in browser to view: file:///${outputPath.replace(/\\/g, '/')}\n`);

} catch (error) {
  console.error('\n❌ ERROR GENERATING REPORT:\n');
  console.error(error);
  process.exit(1);
}
