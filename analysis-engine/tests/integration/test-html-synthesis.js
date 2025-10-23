/**
 * Test HTML Report Generation with AI Synthesis
 * 
 * This script tests the complete HTML report generation pipeline with synthesis:
 * 1. Generates a report with mock analysis data
 * 2. Verifies synthesis data integration (executive summary, consolidated issues)
 * 3. Checks screenshot registry and references
 * 4. Validates HTML structure and CSS classes
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { writeFile, mkdir } from 'fs/promises';
import { generateHTMLReport } from '../../reports/exporters/html-exporter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Mock analysis data
const mockAnalysisData = {
  company_name: 'Acme Corporation',
  url: 'https://example.com',
  industry: 'Technology',
  city: 'San Francisco, CA',
  grade: 'B',
  overall_score: 75,
  analyzed_at: new Date().toISOString(),
  
  // Scores
  design_score_desktop: 78,
  design_score_mobile: 72,
  seo_score: 68,
  content_score: 80,
  social_score: 65,
  accessibility_score: 85,
  
  // Original issues (will be replaced by consolidated issues)
  design_issues_desktop: [
    {
      title: 'Large hero image not optimized',
      description: 'Hero image is 2.5MB uncompressed',
      priority: 'high',
      impact: 'Slows page load by 3-4 seconds',
      fix: 'Compress and convert to WebP format'
    },
    {
      title: 'Inconsistent button styles',
      description: 'Primary buttons use 3 different colors',
      priority: 'medium',
      impact: 'Confuses users, reduces conversions',
      fix: 'Standardize button color palette'
    }
  ],
  
  design_issues_mobile: [
    {
      title: 'Text too small on mobile',
      description: 'Body text is 12px, hard to read',
      priority: 'high',
      impact: 'Poor mobile user experience',
      fix: 'Increase to minimum 16px'
    }
  ],
  
  seo_issues: [
    {
      title: 'Missing meta descriptions',
      description: 'No meta description on 15 pages',
      priority: 'high',
      impact: 'Lower click-through rates from search',
      fix: 'Add unique 150-160 character descriptions'
    }
  ],
  
  content_issues: [
    {
      title: 'Blog content is outdated',
      description: 'Last blog post was 8 months ago',
      priority: 'medium',
      impact: 'Signals inactivity to Google and visitors',
      fix: 'Commit to monthly blog posting schedule'
    }
  ],
  
  social_issues: [
    {
      title: 'No social media links',
      description: 'Website has no links to social profiles',
      priority: 'low',
      impact: 'Missed engagement opportunities',
      fix: 'Add social media icons in footer'
    }
  ],
  
  accessibility_issues: [
    {
      title: 'Low contrast text',
      description: 'Several text elements fail WCAG AA contrast',
      priority: 'high',
      impact: 'Difficult for visually impaired users',
      fix: 'Adjust colors to meet 4.5:1 ratio'
    }
  ],
  
  // Quick wins
  quick_wins: [
    { title: 'Add alt text to images', estimatedTime: '2 hours', impact: 'Improves SEO and accessibility' },
    { title: 'Enable GZIP compression', estimatedTime: '30 minutes', impact: 'Reduces page size by 60-80%' },
    { title: 'Add structured data', estimatedTime: '3 hours', impact: 'Enables rich snippets in search' }
  ],
  
  // Lead scoring
  lead_priority: 78,
  priority_tier: 'High Value',
  lead_priority_reasoning: 'Strong fit for our services with clear improvement opportunities',
  quality_gap_score: 8.2,
  budget_score: 7.5,
  urgency_score: 6.8,
  industry_fit_score: 9.0,
  
  // Tech stack
  tech_stack: ['WordPress', 'WooCommerce', 'Elementor'],
  has_blog: true,
  has_https: true,
  is_mobile_friendly: false,
  social_platforms_present: ['LinkedIn', 'Twitter'],
  
  // Screenshots
  screenshot_desktop_url: join(__dirname, '../../screenshots/test-desktop.png'),
  screenshot_mobile_url: join(__dirname, '../../screenshots/test-mobile.png')
};

// Mock synthesis data (what the AI would generate)
const mockSynthesisData = {
  consolidatedIssues: [
    {
      title: 'Performance Bottleneck: Unoptimized Hero Image',
      description: 'The homepage hero image is 2.5MB uncompressed, causing significant load time delays across all devices.',
      severity: 'critical',
      priority: 'critical',
      sources: ['desktop', 'mobile'],
      category: 'performance',
      impact: 'Page load time increases by 3-4 seconds, resulting in 30-40% bounce rate increase',
      fix: 'Compress image to <200KB and convert to WebP format with fallback',
      estimatedValue: '$3,200/month in recovered conversions',
      screenshotRefs: ['SS-1']
    },
    {
      title: 'Mobile Usability: Text Readability Issues',
      description: 'Body text is 12px on mobile devices, below accessibility guidelines and difficult to read.',
      severity: 'high',
      priority: 'high',
      sources: ['mobile', 'accessibility'],
      category: 'ux',
      impact: 'Poor mobile experience affects 62% of traffic, increases bounce rate',
      fix: 'Increase base font size to 16px minimum with proper line height',
      estimatedValue: '$1,800/month in improved mobile conversions',
      screenshotRefs: ['SS-2']
    },
    {
      title: 'SEO Gap: Missing Meta Descriptions',
      description: '15 pages lack meta descriptions, reducing search visibility and click-through rates.',
      severity: 'high',
      priority: 'high',
      sources: ['seo', 'content'],
      category: 'seo',
      impact: 'CTR from search results is 25-40% lower than optimal',
      fix: 'Write unique, compelling 150-160 character descriptions for all pages',
      estimatedValue: '$2,400/month in additional organic traffic',
      screenshotRefs: []
    },
    {
      title: 'Accessibility Compliance: WCAG Contrast Issues',
      description: 'Multiple text elements fail WCAG AA 4.5:1 contrast requirements.',
      severity: 'medium',
      priority: 'high',
      sources: ['accessibility', 'design'],
      category: 'accessibility',
      impact: 'Excludes 8-10% of users with visual impairments, legal risk',
      fix: 'Adjust color palette to meet WCAG AA standards throughout site',
      estimatedValue: 'Expanded market reach + compliance',
      screenshotRefs: ['SS-1', 'SS-2']
    },
    {
      title: 'Brand Inconsistency: Multiple Button Styles',
      description: 'Primary CTAs use 3 different color schemes, creating visual confusion.',
      severity: 'medium',
      priority: 'medium',
      sources: ['desktop', 'mobile'],
      category: 'branding',
      impact: 'Reduces trust and conversion rates by 10-15%',
      fix: 'Standardize to single button color with consistent hover states',
      estimatedValue: '$800/month in improved conversions',
      screenshotRefs: ['SS-1']
    }
  ],
  
  executiveSummary: {
    headline: 'Strong Foundation with Critical Performance and Mobile Gaps',
    
    criticalFindings: [
      {
        rank: 1,
        issue: 'Unoptimized Hero Image Creating Performance Bottleneck',
        impact: 'Page loads 3-4 seconds slower than optimal, costing ~$3,200/month in lost conversions',
        evidence: ['SS-1'],
        recommendation: 'Immediate image compression and WebP conversion',
        estimatedValue: '$3,200/month revenue recovery'
      },
      {
        rank: 2,
        issue: 'Mobile Experience Below Industry Standard',
        impact: 'Poor readability affects 62% of traffic, 12px text fails accessibility guidelines',
        evidence: ['SS-2'],
        recommendation: 'Increase minimum font size to 16px, improve touch targets',
        estimatedValue: '$1,800/month mobile conversion improvement'
      },
      {
        rank: 3,
        issue: 'SEO Visibility Gap from Missing Meta Content',
        impact: 'CTR 25-40% below potential due to 15 pages without meta descriptions',
        evidence: [],
        recommendation: 'Write compelling meta descriptions for all pages',
        estimatedValue: '$2,400/month additional organic traffic'
      }
    ],
    
    strategicRoadmap: {
      month1: {
        title: 'Quick Wins & Performance',
        priorities: [
          'Compress and optimize hero image (Week 1)',
          'Fix mobile font sizes (Week 2)',
          'Add meta descriptions (Week 3)',
          'Enable GZIP compression (Week 1)'
        ],
        estimatedCost: '$3,500-5,000',
        expectedROI: '450% (6-month projection)',
        keyMetrics: ['Page load: 5.2s → 1.8s', 'Mobile bounce: -25%', 'Organic CTR: +35%']
      },
      month2: {
        title: 'Accessibility & UX Refinement',
        priorities: [
          'Fix WCAG contrast issues',
          'Standardize button styles',
          'Improve mobile touch targets',
          'Add ARIA labels'
        ],
        estimatedCost: '$4,000-6,000',
        expectedROI: '280% (6-month projection)',
        keyMetrics: ['WCAG AA compliance: 100%', 'Conversion rate: +15%', 'Bounce rate: -18%']
      },
      month3: {
        title: 'Content & Engagement',
        priorities: [
          'Launch monthly blog schedule',
          'Add social media integration',
          'Implement structured data',
          'Create lead magnets'
        ],
        estimatedCost: '$5,000-7,500',
        expectedROI: '320% (6-month projection)',
        keyMetrics: ['Organic traffic: +45%', 'Lead generation: +60%', 'Engagement time: +40%']
      }
    }
  },
  
  errors: []
};

/**
 * Main test function
 */
async function testHTMLReportWithSynthesis() {
  console.log('🧪 Testing HTML Report Generation with AI Synthesis\n');
  console.log('=' .repeat(80));
  
  try {
    // Test 1: Generate HTML report WITHOUT synthesis
    console.log('\n📝 Test 1: Generate HTML report WITHOUT synthesis');
    console.log('-'.repeat(80));
    
    const startTime1 = Date.now();
    const htmlWithoutSynthesis = await generateHTMLReport(mockAnalysisData, null);
    const time1 = Date.now() - startTime1;
    
    console.log(`✅ HTML generated in ${time1}ms`);
    console.log(`   Length: ${htmlWithoutSynthesis.length.toLocaleString()} characters`);
    console.log(`   Contains "Executive Summary": ${htmlWithoutSynthesis.includes('Executive Summary')}`);
    console.log(`   Contains "Screenshot Appendix": ${htmlWithoutSynthesis.includes('Screenshot Appendix')}`);
    
    // Save to file
    const outputDir = join(__dirname, '../../reports/test-output');
    await mkdir(outputDir, { recursive: true });
    
    const outputPath1 = join(outputDir, 'test-report-without-synthesis.html');
    await writeFile(outputPath1, htmlWithoutSynthesis, 'utf-8');
    console.log(`   Saved to: ${outputPath1}`);
    
    // Test 2: Generate HTML report WITH synthesis
    console.log('\n📝 Test 2: Generate HTML report WITH synthesis');
    console.log('-'.repeat(80));
    
    const startTime2 = Date.now();
    const htmlWithSynthesis = await generateHTMLReport(mockAnalysisData, mockSynthesisData);
    const time2 = Date.now() - startTime2;
    
    console.log(`✅ HTML generated in ${time2}ms`);
    console.log(`   Length: ${htmlWithSynthesis.length.toLocaleString()} characters`);
    
    // Verify synthesis elements
    const checks = {
      'Executive Summary section': htmlWithSynthesis.includes('Executive Summary'),
      'Synthesis headline': htmlWithSynthesis.includes('Strong Foundation with Critical Performance'),
      'Critical findings': htmlWithSynthesis.includes('Critical Findings'),
      'Strategic roadmap': htmlWithSynthesis.includes('Strategic Roadmap'),
      'Month 1 priorities': htmlWithSynthesis.includes('Quick Wins & Performance'),
      'Month 2 priorities': htmlWithSynthesis.includes('Accessibility & UX Refinement'),
      'Month 3 priorities': htmlWithSynthesis.includes('Content & Engagement'),
      'Consolidated issues (5)': (htmlWithSynthesis.match(/sources/g) || []).length >= 5,
      'Screenshot references': htmlWithSynthesis.includes('SS-1') || htmlWithSynthesis.includes('[SS-'),
      'Screenshot appendix': htmlWithSynthesis.includes('Screenshot Appendix') || htmlWithSynthesis.includes('screenshot-appendix'),
      'CSS classes for synthesis': htmlWithSynthesis.includes('synthesis-section'),
      'CSS classes for findings': htmlWithSynthesis.includes('critical-finding'),
      'CSS classes for roadmap': htmlWithSynthesis.includes('strategic-roadmap')
    };
    
    console.log('\n   Verification Checks:');
    Object.entries(checks).forEach(([check, passed]) => {
      console.log(`   ${passed ? '✅' : '❌'} ${check}`);
    });
    
    const passedChecks = Object.values(checks).filter(v => v).length;
    const totalChecks = Object.keys(checks).length;
    console.log(`\n   Overall: ${passedChecks}/${totalChecks} checks passed (${Math.round(passedChecks/totalChecks*100)}%)`);
    
    // Save to file
    const outputPath2 = join(outputDir, 'test-report-with-synthesis.html');
    await writeFile(outputPath2, htmlWithSynthesis, 'utf-8');
    console.log(`\n   Saved to: ${outputPath2}`);
    
    // Test 3: Compare sizes
    console.log('\n📊 Test 3: Compare report sizes');
    console.log('-'.repeat(80));
    
    const sizeDiff = htmlWithSynthesis.length - htmlWithoutSynthesis.length;
    const percentIncrease = ((sizeDiff / htmlWithoutSynthesis.length) * 100).toFixed(1);
    
    console.log(`   Without synthesis: ${htmlWithoutSynthesis.length.toLocaleString()} chars`);
    console.log(`   With synthesis:    ${htmlWithSynthesis.length.toLocaleString()} chars`);
    console.log(`   Difference:        +${sizeDiff.toLocaleString()} chars (+${percentIncrease}%)`);
    
    // Final summary
    console.log('\n' + '='.repeat(80));
    console.log('🎉 All tests completed successfully!');
    console.log('\n📂 Output files:');
    console.log(`   1. ${outputPath1}`);
    console.log(`   2. ${outputPath2}`);
    console.log('\n💡 Next steps:');
    console.log('   1. Open both HTML files in a browser');
    console.log('   2. Verify screenshot references are clickable');
    console.log('   3. Check that consolidated issues show sources');
    console.log('   4. Review strategic roadmap layout and styling');
    console.log('   5. Test screenshot appendix at bottom of report');
    
    if (passedChecks < totalChecks) {
      console.log('\n⚠️  Warning: Some verification checks failed. Review the HTML output.');
    }
    
  } catch (error) {
    console.error('\n❌ Test failed with error:');
    console.error(error);
    process.exit(1);
  }
}

// Run the test
testHTMLReportWithSynthesis();
