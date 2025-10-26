/**
 * Test Full Report Generation
 * Generates both Preview and Full reports side-by-side for comparison
 */

import { generateReport } from '../reports/report-generator.js';
import { writeFile } from 'fs/promises';
import { join } from 'path';

console.log('🧪 TESTING PREVIEW vs FULL REPORT GENERATION\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Comprehensive mock analysis result with ALL data fields
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

  // Quick wins
  quick_wins_count: 8,
  quick_wins: [
    'Enlarge CTA buttons to 18px',
    'Add meta descriptions to 5 pages',
    'Implement schema markup',
    'Optimize image file sizes (reduce by 40%)',
    'Fix mobile navigation complexity',
    'Add social sharing buttons',
    'Improve color contrast on buttons',
    'Enable HTTPS redirect'
  ],

  one_liner: 'Your website has strong content but opportunities exist in mobile UX and SEO optimization.',
  top_issue: 'Mobile CTA buttons are 33% smaller than industry standard, likely impacting mobile conversions',

  // Business Intelligence (NEW - Full Report Only)
  business_intelligence: {
    companySize: {
      employeeCount: '250-500 employees',
      locationCount: '3,000+ locations'
    },
    yearsInBusiness: {
      foundedYear: '1993',
      estimatedYears: 31
    },
    pricingVisibility: {
      visible: true,
      priceRange: '$8-15 per meal'
    },
    contentFreshness: {
      blogActive: true,
      lastUpdate: 'March 2024'
    },
    decisionMakerAccessibility: {
      hasDirectEmail: false,
      hasDirectPhone: true,
      ownerName: 'Brian Niccol (CEO)'
    },
    premiumFeatures: {
      detected: ['Online Ordering System', 'Mobile App', 'Loyalty Program', 'Catering Platform'],
      budgetIndicator: 'High - Enterprise-level digital infrastructure'
    }
  },

  // Performance Metrics (NEW - Full Report Only)
  performance_metrics_pagespeed: {
    mobile: {
      performanceScore: 68,
      metrics: {
        firstContentfulPaint: 1.8,
        largestContentfulPaint: 3.2,
        totalBlockingTime: 320,
        cumulativeLayoutShift: 0.15
      }
    },
    desktop: {
      performanceScore: 85,
      metrics: {
        firstContentfulPaint: 0.9,
        largestContentfulPaint: 1.5,
        totalBlockingTime: 120,
        cumulativeLayoutShift: 0.08
      }
    }
  },

  // CrUX (Chrome User Experience) - Real user data from Chrome browsers
  performance_metrics_crux: {
    origin: 'https://www.chipotle.com',
    formFactor: 'ALL_FORM_FACTORS',
    metrics: {
      largestContentfulPaint: {
        good: 0.65,
        needsImprovement: 0.25,
        poor: 0.10,
        percentiles: { p75: 2800 }
      },
      firstInputDelay: {
        good: 0.88,
        needsImprovement: 0.08,
        poor: 0.04,
        percentiles: { p75: 45 }
      },
      cumulativeLayoutShift: {
        good: 0.72,
        needsImprovement: 0.18,
        poor: 0.10,
        percentiles: { p75: 0.12 }
      },
      firstContentfulPaint: {
        good: 0.75,
        needsImprovement: 0.15,
        poor: 0.10,
        percentiles: { p75: 1600 }
      },
      interactionToNextPaint: {
        good: 0.68,
        needsImprovement: 0.22,
        poor: 0.10,
        percentiles: { p75: 280 }
      }
    },
    collectionPeriod: {
      firstDate: { year: 2024, month: 2, day: 1 },
      lastDate: { year: 2024, month: 3, day: 1 }
    }
  },

  tech_stack: 'React, Next.js, AWS CloudFront',
  has_https: true,
  is_mobile_friendly: true,
  page_load_time: 1850,

  // Complete Issues (NEW - Full Report Shows ALL)
  design_issues_desktop: [
    { title: 'CTA buttons too small (14px instead of 18px)', severity: 'high', recommendation: 'Increase button font size to 18px minimum' },
    { title: 'Inconsistent spacing between sections', severity: 'medium', recommendation: 'Use 80px vertical spacing consistently' },
    { title: 'Header navigation has 9 items (too many)', severity: 'low', recommendation: 'Reduce to 5-7 main navigation items' }
  ],

  design_issues_mobile: [
    { title: 'Mobile navigation too complex (3-level deep)', severity: 'high', recommendation: 'Simplify to 2-level maximum' },
    { title: 'Images not optimized for mobile (loading 4K images on phones)', severity: 'high', recommendation: 'Use responsive images with srcset' },
    { title: 'Touch targets smaller than 44px minimum', severity: 'medium', recommendation: 'Increase all touch targets to 48px minimum' }
  ],

  seo_issues: [
    { title: 'Missing meta descriptions on 5 pages', severity: 'high', recommendation: 'Add unique meta descriptions to all pages' },
    { title: 'No schema markup implemented', severity: 'high', recommendation: 'Add Restaurant schema markup to homepage' },
    { title: 'H1 tags missing on About and Careers pages', severity: 'medium', recommendation: 'Add H1 tags to all pages' },
    { title: 'Image alt tags missing on 12 images', severity: 'medium', recommendation: 'Add descriptive alt text to all images' }
  ],

  content_issues: [
    { title: 'About page lacks compelling story (only 2 paragraphs)', severity: 'medium', recommendation: 'Expand to 4-5 paragraphs with brand story' },
    { title: 'Blog posts are not categorized', severity: 'low', recommendation: 'Add category taxonomy to blog' }
  ],

  social_issues: [
    { title: 'No social sharing buttons on blog posts', severity: 'medium', recommendation: 'Add share buttons to all blog posts' },
    { title: 'Instagram feed not embedded on homepage', severity: 'low', recommendation: 'Embed latest Instagram posts in footer' }
  ],

  accessibility_issues: [
    { title: 'Color contrast ratio 3.5:1 on buttons (fails WCAG AA)', severity: 'high', recommendation: 'Increase to 4.5:1 minimum' },
    { title: 'No ARIA labels on icon-only buttons', severity: 'medium', recommendation: 'Add aria-label to all icon buttons' }
  ],

  performance_issues: [
    { title: 'Largest Contentful Paint 3.2s on mobile (should be <2.5s)', severity: 'high', recommendation: 'Optimize hero image loading' },
    { title: 'Total Blocking Time 320ms (should be <200ms)', severity: 'medium', recommendation: 'Defer non-critical JavaScript' }
  ],

  // WCAG Accessibility Compliance (NEW - Full Report Only)
  accessibility_compliance: {
    levelA: { passed: 45, failed: 5, passRate: 90 },
    levelAA: { passed: 32, failed: 8, passRate: 80 },
    levelAAA: { passed: 18, failed: 22, passRate: 45 }
  },

  // Lead Scoring & Sales Intelligence (NEW - Full Report Only)
  lead_score: 75,
  lead_priority: 'high',
  priority_tier: 'A',
  budget_likelihood: '$15,000-25,000 (Enterprise-level investment capacity)',
  receptiveness_score: 82,
  key_pain_points: [
    'Mobile conversion rate 22% lower than industry average',
    'High bounce rate on mobile (58% vs 45% benchmark)',
    'No accessibility certification despite large customer base',
    'Missing critical SEO opportunities for local search'
  ],
  value_proposition: 'Professional website optimization with proven mobile conversion improvements (avg. 35% lift)',
  urgency_factors: [
    'Increasing mobile traffic (now 68% of total)',
    'Competitor (Sweetgreen) recently redesigned and gaining market share',
    'Upcoming ADA compliance audit scheduled for Q2 2024'
  ],

  // Crawl Metadata (NEW - Full Report Only)
  crawl_metadata: {
    pages_discovered: 15,
    pages_crawled: 12,
    pages_analyzed: 12,
    failed_pages: [
      { url: '/legacy-menu', error: '404 Not Found' },
      { url: '/old-locations', error: '301 Redirect Loop' }
    ],
    pages: [
      { url: '/', fullUrl: 'https://www.chipotle.com/', success: true, screenshot_paths: { desktop: '/screenshots/home-desktop.png', mobile: '/screenshots/home-mobile.png' } },
      { url: '/menu', fullUrl: 'https://www.chipotle.com/menu', success: true, screenshot_paths: { desktop: '/screenshots/menu-desktop.png', mobile: '/screenshots/menu-mobile.png' } },
      { url: '/locations', fullUrl: 'https://www.chipotle.com/locations', success: true, screenshot_paths: { desktop: '/screenshots/locations-desktop.png', mobile: '/screenshots/locations-mobile.png' } }
    ]
  },

  // QA Validation (NEW - Full Report Appendix)
  qa_validation: {
    status: 'PASS',
    qualityScore: 92,
    recommendations: [
      'Consider adding more screenshot evidence for visual issues',
      'Executive summary could be more specific about ROI projections'
    ]
  },

  synthesis_stage_metadata: {
    issue_deduplication: {
      original_count: 28,
      deduplicated_count: 16,
      reduction_percentage: 43
    },
    executive_insights: {
      generated: true,
      word_count: 485
    }
  },

  // Benchmark data
  matched_benchmark: {
    id: '18032591-4fc1-4ba1-a94f-3791dc5c02f8',
    company_name: 'Sweetgreen',
    website_url: 'https://www.sweetgreen.com',
    industry: 'restaurant',
    benchmark_tier: 'manual',
    comparison_tier: 'competitive',
    match_score: 90,
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
      'Consistent brand colors across all pages'
    ],
    seo_strengths: [
      'Schema markup for menu items and locations',
      'Strong local SEO with location-specific pages'
    ],
    content_strengths: [
      'Clear value proposition above the fold',
      'Compelling CTAs with action-oriented language'
    ],
    social_strengths: [
      'Active social media integration on website',
      'Instagram feed showcased on homepage'
    ],
    accessibility_strengths: [
      'ARIA labels on interactive elements',
      'High color contrast ratios'
    ]
  },

  analyzed_at: new Date().toISOString()
};

// Mock synthesis data (required for report generation)
const synthesisData = {
  consolidatedIssues: [],
  executiveSummary: null,
  screenshotReferences: [],
  quickWinStrategy: {},
  errors: []
};

try {
  console.log('📊 GENERATING PREVIEW REPORT (Concise - Client-Facing)...\n');

  const previewReport = await generateReport(analysisResult, {
    format: 'html',
    report_type: 'preview',  // NEW: Preview mode
    sections: ['all'],
    synthesisData  // Pass mock synthesis data
  });

  const previewPath = join(process.cwd(), 'tests', 'test-preview-report.html');
  await writeFile(previewPath, previewReport.content, 'utf-8');

  console.log('✅ PREVIEW REPORT GENERATED!\n');
  console.log(`📄 Saved to: ${previewPath}\n`);
  console.log('   Sections: Executive Dashboard, Summary, Benchmark Comparison,');
  console.log('             Top 5-7 Priority Actions, 30-60-90 Roadmap\n');
  console.log(`   File: ${previewPath.replace(/\\/g, '/')}\n`);

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('📚 GENERATING FULL REPORT (Comprehensive - Internal Analysis)...\n');

  const fullReport = await generateReport(analysisResult, {
    format: 'html',
    report_type: 'full',  // NEW: Full mode
    sections: ['all'],
    synthesisData  // Pass mock synthesis data
  });

  const fullPath = join(process.cwd(), 'tests', 'test-full-report.html');
  await writeFile(fullPath, fullReport.content, 'utf-8');

  console.log('✅ FULL REPORT GENERATED!\n');
  console.log(`📄 Saved to: ${fullPath}\n`);
  console.log('   Sections: Everything in Preview PLUS:');
  console.log('   - 📊 Business Intelligence (company size, years, pricing, etc.)');
  console.log('   - ⚙️  Technical Deep Dive (PageSpeed, CrUX, tech stack)');
  console.log('   - 🔍 Complete Issue Breakdown (ALL issues, not just top 5-7)');
  console.log('   - ♿ WCAG Accessibility Compliance (Level A, AA, AAA)');
  console.log('   - 📸 Multi-Page Screenshot Gallery');
  console.log('   - 🎯 Lead Scoring & Sales Intelligence');
  console.log('   - 📚 Appendix (QA validation, synthesis metadata, crawl data)\n');
  console.log(`   File: ${fullPath.replace(/\\/g, '/')}\n`);

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('📊 COMPARISON SUMMARY:\n');
  console.log('┌─────────────────────────────────────────────────────────────────┐');
  console.log('│  PREVIEW REPORT                    FULL REPORT                  │');
  console.log('├─────────────────────────────────────────────────────────────────┤');
  console.log('│  Client-facing                     Internal analysis            │');
  console.log('│  Concise (4-6 pages)               Comprehensive (12-20 pages)  │');
  console.log('│  Top 5-7 issues                    ALL issues                    │');
  console.log('│  Sales-focused                     Technical deep dive           │');
  console.log('│  Perfect for outreach              Perfect for dev handoff       │');
  console.log('└─────────────────────────────────────────────────────────────────┘\n');

  console.log('🎯 USAGE:\n');
  console.log('   Preview: Send to prospects, initial presentations');
  console.log('   Full:    Internal analysis, developer handoff, audits\n');

  console.log(`\n🌐 Open reports in browser:\n`);
  console.log(`   Preview: file:///${previewPath.replace(/\\/g, '/')}`);
  console.log(`   Full:    file:///${fullPath.replace(/\\/g, '/')}\n`);

} catch (error) {
  console.error('\n❌ ERROR GENERATING REPORTS:\n');
  console.error(error);
  process.exit(1);
}
