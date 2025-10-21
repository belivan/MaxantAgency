/**
 * Test Report Generation
 *
 * Tests the report generator with mock analysis data
 */

import { generateReport, generateReportFilename, generateStoragePath } from '../reports/report-generator.js';

// Mock analysis result
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
  seo_analysis_model: 'Grok-4-fast',
  content_analysis_model: 'Grok-4-fast',
  desktop_visual_model: 'GPT-4o',
  mobile_visual_model: 'GPT-4o',
  social_analysis_model: 'Grok-4-fast',
  accessibility_analysis_model: 'Grok-4-fast'
};

async function runTests() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('Website Audit Report Generator - Test Suite');
  console.log('═══════════════════════════════════════════════════════════════\n');

  let passed = 0;
  let failed = 0;

  try {
    // Test 1: Generate report
    console.log('Test 1: Generate complete report...');
    const report = await generateReport(mockAnalysisResult, {
      format: 'markdown',
      sections: ['all']
    });

    if (report.content && report.content.length > 0) {
      console.log(`✅ Report generated (${report.content.length} chars, ${report.metadata.word_count} words)`);
      passed++;
    } else {
      console.log('❌ Report content is empty');
      failed++;
    }

    // Test 2: Check report metadata
    console.log('\nTest 2: Verify report metadata...');
    if (report.metadata.company_name === 'Example Restaurant' &&
        report.metadata.overall_score === 62 &&
        report.metadata.website_grade === 'C') {
      console.log('✅ Report metadata correct');
      passed++;
    } else {
      console.log('❌ Report metadata incorrect');
      failed++;
    }

    // Test 3: Check report sections
    console.log('\nTest 3: Verify report sections...');
    const requiredSections = [
      '# Website Audit Report:',
      '## 📊 At a Glance',
      '## ⚡ Quick Wins',
      '# 1. Desktop Experience',
      '# 2. Mobile Experience',
      '# 3. SEO & Technical',
      '# 4. Content Quality',
      '# 5. Social Media',
      '# 6. Accessibility',
      '# 7. Business Intelligence',
      '# 8. Lead Priority',
      '# 9. Recommended Action Plan',
      '# Appendix'
    ];

    const missingSections = requiredSections.filter(section =>
      !report.content.includes(section)
    );

    if (missingSections.length === 0) {
      console.log('✅ All required sections present');
      passed++;
    } else {
      console.log(`❌ Missing sections: ${missingSections.join(', ')}`);
      failed++;
    }

    // Test 4: Generate filename
    console.log('\nTest 4: Generate report filename...');
    const filename = generateReportFilename(mockAnalysisResult, 'markdown');
    if (filename.includes('example-restaurant') && filename.endsWith('.md')) {
      console.log(`✅ Filename generated: ${filename}`);
      passed++;
    } else {
      console.log(`❌ Invalid filename: ${filename}`);
      failed++;
    }

    // Test 5: Generate storage path
    console.log('\nTest 5: Generate storage path...');
    const storagePath = generateStoragePath(mockAnalysisResult, 'markdown');
    if (storagePath.startsWith('reports/') && storagePath.includes('/')) {
      console.log(`✅ Storage path generated: ${storagePath}`);
      passed++;
    } else {
      console.log(`❌ Invalid storage path: ${storagePath}`);
      failed++;
    }

    // Test 6: Generate partial report
    console.log('\nTest 6: Generate report with specific sections...');
    const partialReport = await generateReport(mockAnalysisResult, {
      sections: ['executive', 'action-plan']
    });

    if (partialReport.content.includes('# Website Audit Report:') &&
        partialReport.content.includes('# 9. Recommended Action Plan') &&
        !partialReport.content.includes('# 3. SEO & Technical')) {
      console.log('✅ Partial report generated correctly');
      passed++;
    } else {
      console.log('❌ Partial report incorrect');
      failed++;
    }

    // Save sample report to file
    console.log('\nSaving sample report to test-output.txt...');
    const fs = await import('fs/promises');
    await fs.writeFile('test-output.txt', report.content, 'utf-8');
    console.log('✅ Sample report saved to test-output.txt');

    // Summary
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('Test Summary:');
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log('═══════════════════════════════════════════════════════════════\n');

    if (failed === 0) {
      console.log('🎉 All tests passed!\n');
      console.log('Next steps:');
      console.log('1. Run database migration: cd database-tools && npm run db:setup');
      console.log('2. Create Supabase Storage bucket (see reports/README.md)');
      console.log('3. Test with real analysis data');
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
