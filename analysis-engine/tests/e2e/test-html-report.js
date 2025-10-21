/**
 * Test HTML Report Generation
 *
 * Tests the HTML report generator with mock analysis data
 */

import { generateReport, generateReportFilename } from '../reports/report-generator.js';
import { writeFile } from 'fs/promises';

// Mock analysis result (same as markdown test)
const mockAnalysisResult = {
  success: true,
  url: 'https://example.com',
  company_name: 'Example Restaurant',
  industry: 'Restaurant',
  city: 'Philadelphia',
  grade: 'C',
  overall_score: 62,
  grade_label: 'Needs Work',
  one_liner: 'Your mobile navigation menu is hidden behind an unlabeled hamburger icon - 40% of mobile users don\'t recognize it',

  // Scores
  design_score: 60,
  design_score_desktop: 65,
  design_score_mobile: 55,
  seo_score: 58,
  content_score: 65,
  social_score: 50,
  accessibility_score: 48,

  // Quick wins
  quick_wins: [
    {
      title: 'Add meta description',
      estimatedTime: '10 min',
      impact: 'High SEO impact'
    },
    {
      title: 'Fix missing alt text on 7 images',
      estimatedTime: '20 min',
      impact: 'Accessibility + SEO'
    },
    {
      title: 'Make "Contact Us" button 2x larger',
      estimatedTime: '15 min',
      impact: 'Conversion boost'
    },
    {
      title: 'Add "Menu" label to hamburger icon',
      estimatedTime: '10 min',
      impact: 'Mobile UX'
    },
    {
      title: 'Fix viewport meta tag',
      estimatedTime: '5 min',
      impact: 'Mobile-friendly'
    }
  ],

  // Desktop issues
  design_issues_desktop: [
    {
      title: 'No Clear Visual Hierarchy in Hero Section',
      description: 'Desktop hero section displays 4 competing elements with equal visual weight',
      impact: 'Desktop visitors spend 8-12 seconds scanning hero without understanding firm\'s specialty',
      fix: 'Increase hero headline font to 48-56px to establish clear hierarchy',
      difficulty: 'quick-win',
      priority: 'high',
      category: 'hierarchy'
    },
    {
      title: 'Primary CTA buried in navigation clutter',
      description: '"Free Consultation" button appears in top-right corner with same styling as secondary links',
      impact: 'Desktop users seeking consultation must hunt for action button',
      fix: 'Make CTA button 2-3x larger with high-contrast color',
      difficulty: 'quick-win',
      priority: 'high',
      category: 'cta'
    }
  ],

  // Mobile issues
  design_issues_mobile: [
    {
      title: 'Hamburger menu unlabeled',
      description: 'Mobile navigation uses hamburger icon with no text label',
      impact: '40% of mobile users don\'t recognize hamburger icons without labels',
      fix: 'Add "Menu" text label next to hamburger icon',
      difficulty: 'quick-win',
      priority: 'high',
      category: 'navigation',
      wcagCriterion: '1.1.1 Non-text Content (Level A)'
    },
    {
      title: 'Touch targets too small',
      description: 'Navigation links are 32px tall, below the 44px minimum for touchscreens',
      impact: 'Mobile users frequently mis-tap, causing frustration',
      fix: 'Increase touch target height to 44px minimum',
      difficulty: 'quick-win',
      priority: 'high',
      category: 'mobile'
    }
  ],

  // SEO issues
  seo_issues: [
    {
      title: 'Generic title tag "Home" with no keywords',
      description: 'Title tag is simply "Home" with no mention of business name or location',
      impact: 'Missing primary ranking signal for local search',
      fix: 'Change to: "Best Italian Restaurant in Philadelphia | Example Restaurant"',
      priority: 'high',
      category: 'meta'
    },
    {
      title: 'Meta description completely missing',
      description: 'No meta description tag exists',
      impact: 'Search engines will pull random text, reducing click-through rate',
      fix: 'Add 155-character description with target keyword and location',
      priority: 'high',
      category: 'meta'
    }
  ],

  // Content issues
  content_issues: [
    {
      title: 'Value proposition not clear above-the-fold',
      description: 'Homepage doesn\'t clearly state what makes the restaurant unique',
      impact: 'Visitors leave without understanding why they should choose you',
      fix: 'Add clear tagline above the fold: "Authentic Wood-Fired Pizza Since 2012"',
      priority: 'medium',
      category: 'messaging'
    }
  ],

  // Social issues
  social_issues: [
    {
      title: 'No Google Business Profile link',
      description: 'Website doesn\'t link to Google Business Profile',
      impact: 'Missing critical local SEO opportunity',
      fix: 'Add Google Business Profile link to footer',
      priority: 'high',
      category: 'local-seo'
    }
  ],

  // Accessibility issues
  accessibility_issues: [
    {
      title: '7 images missing alt text',
      description: '7 out of 12 images have empty or missing alt attributes',
      impact: 'Screen readers can\'t describe images, failing WCAG accessibility',
      fix: 'Add descriptive alt text to all images',
      priority: 'critical',
      wcagCriterion: '1.1.1 Non-text Content (Level A)',
      category: 'images'
    }
  ],

  // Technical metadata
  page_title: 'Home',
  meta_description: null,
  tech_stack: 'WordPress',
  page_load_time: 3200,
  has_https: true,
  is_mobile_friendly: false,
  has_blog: true,

  // Content insights
  content_insights: {
    wordCount: 1240,
    hasBlog: true,
    blogPostCount: 12,
    ctaCount: 2,
    completeness: '60%'
  },

  // Social
  social_platforms_present: ['Facebook', 'Instagram'],
  social_profiles: {
    'Facebook': 'https://facebook.com/example',
    'Instagram': 'https://instagram.com/example'
  },

  // Contact
  contact_email: 'info@example.com',
  contact_phone: '(215) 555-0123',

  // Business intelligence
  business_intelligence: {
    yearsInBusiness: 12,
    foundedYear: 2012,
    employeeCount: '8-15',
    locationCount: 1,
    pricingVisible: true,
    priceRange: '$12-$28',
    blogActive: false,
    contentLastUpdate: '3 months ago',
    ownerName: 'John Smith',
    premiumFeatures: [],
    budgetIndicator: 'Medium'
  },

  // Crawl metadata
  crawl_metadata: {
    pages_crawled: 12,
    links_found: 45,
    crawl_time: 8500,
    failed_pages: 1
  },

  // Lead priority
  lead_priority: 78,
  lead_priority_reasoning: 'High-quality lead with clear improvement opportunities and budget indicators. Website grade C suggests significant room for improvement. Pricing visibility and established business (12 years) indicate ability to invest in improvements.',
  priority_tier: 'High',
  budget_likelihood: 'Medium',
  fit_score: 82,
  quality_gap_score: 8,
  budget_score: 6,
  urgency_score: 7,
  industry_fit_score: 9,
  company_size_score: 7,
  engagement_score: 6,

  // Analysis metadata
  analyzed_at: new Date().toISOString(),
  analysis_cost: 0.042,
  analysis_time: 18500,
  seo_analysis_model: 'grok-beta',
  content_analysis_model: 'grok-beta',
  desktop_visual_model: 'gpt-4o',
  mobile_visual_model: 'gpt-4o',
  social_analysis_model: 'grok-beta',
  accessibility_analysis_model: 'grok-beta'
};

async function runTests() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('HTML Website Audit Report Generator - Test Suite');
  console.log('═══════════════════════════════════════════════════════════════\n');

  let passed = 0;
  let failed = 0;

  try {
    // Test 1: Generate HTML report
    console.log('Test 1: Generate HTML report...');
    const report = await generateReport(mockAnalysisResult, {
      format: 'html'
    });

    if (report.content && report.content.length > 0) {
      console.log(`✅ HTML report generated (${report.content.length} chars)`);
      passed++;
    } else {
      console.log('❌ HTML report content is empty');
      failed++;
    }

    // Test 2: Check report metadata
    console.log('\nTest 2: Verify report metadata...');
    if (report.metadata.company_name === 'Example Restaurant' &&
        report.metadata.overall_score === 62 &&
        report.metadata.website_grade === 'C' &&
        report.format === 'html') {
      console.log('✅ Report metadata correct');
      passed++;
    } else {
      console.log('❌ Report metadata incorrect');
      failed++;
    }

    // Test 3: Check HTML structure
    console.log('\nTest 3: Verify HTML structure...');
    const requiredElements = [
      '<!DOCTYPE html>',
      '<html lang="en">',
      '<head>',
      '<body>',
      'Example Restaurant',
      'Grade C',
      'Desktop Experience',
      'Mobile Experience',
      'SEO & Technical',
      'Accessibility',
      'Business Intelligence',
      'Lead Priority',
      'Action Plan',
      'Appendix'
    ];

    const missingElements = requiredElements.filter(element =>
      !report.content.includes(element)
    );

    if (missingElements.length === 0) {
      console.log('✅ All required HTML elements present');
      passed++;
    } else {
      console.log(`❌ Missing HTML elements: ${missingElements.join(', ')}`);
      failed++;
    }

    // Test 4: Check dark theme CSS
    console.log('\nTest 4: Verify dark theme CSS...');
    if (report.content.includes('--bg-primary: #0a0a0a') &&
        report.content.includes('--bg-secondary: #141414') &&
        report.content.includes('background: var(--bg-primary)')) {
      console.log('✅ Dark theme CSS variables present');
      passed++;
    } else {
      console.log('❌ Dark theme CSS missing');
      failed++;
    }

    // Test 5: Check score cards
    console.log('\nTest 5: Verify score cards...');
    if (report.content.includes('score-card') &&
        report.content.includes('score-bar') &&
        report.content.includes('Desktop Design') &&
        report.content.includes('Mobile Design')) {
      console.log('✅ Score cards present');
      passed++;
    } else {
      console.log('❌ Score cards missing');
      failed++;
    }

    // Test 6: Check issues formatting
    console.log('\nTest 6: Verify issues formatting...');
    if (report.content.includes('issue issue-high') &&
        report.content.includes('issue issue-critical') &&
        report.content.includes('badge-high') &&
        report.content.includes('Hamburger menu unlabeled')) {
      console.log('✅ Issues properly formatted with severity classes');
      passed++;
    } else {
      console.log('❌ Issue formatting incorrect');
      failed++;
    }

    // Test 7: Generate filename
    console.log('\nTest 7: Generate HTML filename...');
    const filename = generateReportFilename(mockAnalysisResult, 'html');
    if (filename.includes('example-restaurant') && filename.endsWith('.html')) {
      console.log(`✅ HTML filename generated: ${filename}`);
      passed++;
    } else {
      console.log(`❌ Invalid filename: ${filename}`);
      failed++;
    }

    // Save sample HTML report to file
    console.log('\nSaving sample HTML report to test-output.html...');
    await writeFile('test-output.html', report.content, 'utf-8');
    console.log('✅ Sample HTML report saved to test-output.html');
    console.log('   Open this file in your browser to preview the dark theme!');

    // Summary
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('Test Summary:');
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log('═══════════════════════════════════════════════════════════════\n');

    if (failed === 0) {
      console.log('🎉 All tests passed!\n');
      console.log('Next steps:');
      console.log('1. Open test-output.html in your browser');
      console.log('2. Verify the dark theme renders correctly');
      console.log('3. Test responsive design on mobile');
      console.log('4. Generate report via API: POST /api/reports/generate');
    } else {
      console.log('⚠️ Some tests failed. Please review.\n');
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ Test suite failed:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

runTests();
