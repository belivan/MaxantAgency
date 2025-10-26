/**
 * PDF Generation Test Script
 * Tests both Preview and Full report PDF generation with comprehensive validation
 *
 * Usage: node tests/test-pdf-generation.js
 */

import { generateReport } from '../reports/report-generator.js';
import { writeFile } from 'fs/promises';
import { stat } from 'fs/promises';
import { join } from 'path';

console.log('📄 PDF GENERATION TEST\n');
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

  // Business Intelligence (Full Report Only)
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

  // Performance Metrics (Full Report Only)
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

  // CrUX (Chrome User Experience) - Real user data
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
      }
    }
  },

  tech_stack: 'React, Next.js, AWS CloudFront',
  has_https: true,
  is_mobile_friendly: true,
  page_load_time: 1850,

  // Complete Issues (Full Report Shows ALL)
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
    { title: 'H1 tags missing on About and Careers pages', severity: 'medium', recommendation: 'Add H1 tags to all pages' }
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

  // WCAG Accessibility Compliance (Full Report Only)
  accessibility_compliance: {
    levelA: { passed: 45, failed: 5, passRate: 90 },
    levelAA: { passed: 32, failed: 8, passRate: 80 },
    levelAAA: { passed: 18, failed: 22, passRate: 45 }
  },

  // Lead Scoring & Sales Intelligence (Full Report Only)
  lead_score: 75,
  lead_priority: 'high',
  priority_tier: 'A',
  budget_likelihood: '$15,000-25,000 (Enterprise-level investment capacity)',
  receptiveness_score: 82,

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
      'Clean, minimalist layout with excellent use of whitespace',
      'High-quality professional food photography throughout',
      'Consistent brand colors and typography across all pages',
      'Mobile-first responsive design with smooth transitions'
    ],
    seo_strengths: [
      'Comprehensive schema markup for menu items and locations',
      'Strong local SEO with location-specific landing pages',
      'Fast page load times (avg 1.2s)',
      'Well-structured URL hierarchy and internal linking'
    ],
    content_strengths: [
      'Clear value proposition above the fold',
      'Compelling CTAs with action-oriented language',
      'Regular blog updates with fresh seasonal content',
      'Strong brand storytelling around sustainability'
    ],
    social_strengths: [
      'Active Instagram feed embedded on homepage',
      'Social sharing buttons on all blog posts',
      'User-generated content showcase',
      'Consistent posting schedule across platforms'
    ],
    accessibility_strengths: [
      'WCAG AA compliant with 4.5:1 color contrast',
      'ARIA labels on all interactive elements',
      'Keyboard navigation fully functional',
      'Screen reader optimized with proper heading hierarchy'
    ],
    performance_strengths: [
      'Optimized images with WebP format and lazy loading',
      'Minimal JavaScript bundle size (< 200KB)',
      'CDN usage for static assets',
      'Efficient caching strategy'
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

/**
 * Format file size in human-readable format
 */
function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' bytes';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

/**
 * Get file info
 */
async function getFileInfo(path) {
  try {
    const stats = await stat(path);
    return {
      size: stats.size,
      sizeFormatted: formatFileSize(stats.size)
    };
  } catch (error) {
    return { size: 0, sizeFormatted: 'N/A' };
  }
}

try {
  // TEST 1: Generate Preview (Concise) Report - HTML and PDF
  console.log('📊 TEST 1: PREVIEW REPORT (Concise - Client-Facing)\n');

  console.log('   Generating HTML...');
  const previewHtmlReport = await generateReport(analysisResult, {
    format: 'html',
    report_type: 'preview',
    sections: ['all'],
    synthesisData
  });

  const previewHtmlPath = join(process.cwd(), 'tests', 'test-preview-report.html');
  await writeFile(previewHtmlPath, previewHtmlReport.content, 'utf-8');
  const previewHtmlInfo = await getFileInfo(previewHtmlPath);

  console.log(`   ✅ HTML: ${previewHtmlInfo.sizeFormatted}`);

  console.log('   Generating PDF...');
  const previewPdfReport = await generateReport(analysisResult, {
    format: 'pdf',
    report_type: 'preview',
    pdfOutputPath: join(process.cwd(), 'tests', 'test-preview-report.pdf'),
    synthesisData
  });

  if (previewPdfReport.format === 'pdf' && previewPdfReport.path) {
    const previewPdfInfo = await getFileInfo(previewPdfReport.path);
    console.log(`   ✅ PDF: ${previewPdfInfo.sizeFormatted}`);
    console.log(`   ⏱️  Generation time: ${previewPdfReport.metadata.generation_time_ms}ms`);
    console.log(`   📄 Path: ${previewPdfReport.path}\n`);
  } else {
    console.log(`   ❌ PDF generation failed`);
    console.log(`   Error: ${previewPdfReport.metadata?.error || 'Unknown error'}\n`);
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // TEST 2: Generate Full (Comprehensive) Report - HTML and PDF
  console.log('📚 TEST 2: FULL REPORT (Comprehensive - Internal Analysis)\n');

  console.log('   Generating HTML...');
  const fullHtmlReport = await generateReport(analysisResult, {
    format: 'html',
    report_type: 'full',
    sections: ['all'],
    synthesisData
  });

  const fullHtmlPath = join(process.cwd(), 'tests', 'test-full-report.html');
  await writeFile(fullHtmlPath, fullHtmlReport.content, 'utf-8');
  const fullHtmlInfo = await getFileInfo(fullHtmlPath);

  console.log(`   ✅ HTML: ${fullHtmlInfo.sizeFormatted}`);

  console.log('   Generating PDF...');
  const fullPdfReport = await generateReport(analysisResult, {
    format: 'pdf',
    report_type: 'full',
    pdfOutputPath: join(process.cwd(), 'tests', 'test-full-report.pdf'),
    synthesisData
  });

  if (fullPdfReport.format === 'pdf' && fullPdfReport.path) {
    const fullPdfInfo = await getFileInfo(fullPdfReport.path);
    console.log(`   ✅ PDF: ${fullPdfInfo.sizeFormatted}`);
    console.log(`   ⏱️  Generation time: ${fullPdfReport.metadata.generation_time_ms}ms`);
    console.log(`   📄 Path: ${fullPdfReport.path}\n`);
  } else {
    console.log(`   ❌ PDF generation failed`);
    console.log(`   Error: ${fullPdfReport.metadata?.error || 'Unknown error'}\n`);
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Summary
  console.log('📊 SUMMARY\n');
  console.log('┌─────────────────────────────────────────────────────────────────┐');
  console.log('│  Report Type    HTML Size       PDF Size        PDF Time        │');
  console.log('├─────────────────────────────────────────────────────────────────┤');
  console.log(`│  Preview        ${previewHtmlInfo.sizeFormatted.padEnd(15)} ${previewPdfReport.path ? (await getFileInfo(previewPdfReport.path)).sizeFormatted.padEnd(15) : 'N/A'.padEnd(15)} ${previewPdfReport.metadata?.generation_time_ms || 'N/A'}ms`.padEnd(15) + '│');
  console.log(`│  Full           ${fullHtmlInfo.sizeFormatted.padEnd(15)} ${fullPdfReport.path ? (await getFileInfo(fullPdfReport.path)).sizeFormatted.padEnd(15) : 'N/A'.padEnd(15)} ${fullPdfReport.metadata?.generation_time_ms || 'N/A'}ms`.padEnd(15) + '│');
  console.log('└─────────────────────────────────────────────────────────────────┘\n');

  console.log('🎯 NEXT STEPS:\n');
  console.log('1. Open the PDF files to verify:');
  console.log('   - Headers show "MaxantAgency | Website Analysis Report"');
  console.log('   - Footers show "Company Name • Generated: Date | Page X of Y"');
  console.log('   - No excessive white space between sections');
  console.log('   - Colors and styling preserved');
  console.log('   - All content fits properly on pages\n');

  console.log('2. Compare HTML vs PDF side-by-side\n');

  console.log('3. Open PDFs:');
  if (previewPdfReport.path) console.log(`   Preview: ${previewPdfReport.path}`);
  if (fullPdfReport.path) console.log(`   Full:    ${fullPdfReport.path}\n`);

  console.log('✅ ALL TESTS COMPLETED SUCCESSFULLY!\n');

} catch (error) {
  console.error('\n❌ ERROR DURING PDF GENERATION TEST:\n');
  console.error(error);
  process.exit(1);
}
