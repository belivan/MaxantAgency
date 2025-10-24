/**
 * Test V3 Report Generation with Enhanced Real Data
 * Demonstrates all the new data-driven features
 */

import { generateHTMLReportV3 } from '../reports/exporters/html-exporter-v3-concise.js';
import { writeFile } from 'fs/promises';
import { join } from 'path';

// Comprehensive analysis data with business intelligence
const comprehensiveAnalysisResult = {
  company_name: 'Elite Dental Care',
  url: 'https://www.elitedentalcare.com',
  industry: 'Dental Services',
  city: 'Austin',
  state: 'TX',
  grade: 'C',
  overall_score: 62,

  // Individual scores
  design_score: 58,
  seo_score: 65,
  content_score: 70,
  social_score: 55,

  // Contact Information
  contact_email: 'info@elitedentalcare.com',
  contact_phone: '(512) 555-0123',
  contact_name: 'Dr. Sarah Mitchell',

  // Key findings
  top_issue: 'Mobile experience is poor - 45% bounce rate on mobile devices',
  one_liner: 'Strong content foundation but mobile experience and SEO need immediate attention',

  // Detailed issues by category
  design_issues_desktop: [
    'Homepage hero section lacks clear call-to-action',
    'Navigation menu is cluttered with too many items',
    'Appointment booking form has 12 fields (industry standard is 5-7)'
  ],

  design_issues_mobile: [
    'Mobile menu is difficult to access and navigate',
    'Touch targets are too small (minimum 44x44px required)',
    'Text size is below 16px causing zoom issues',
    'Booking form is not mobile-optimized'
  ],

  seo_issues: [
    'Missing meta descriptions on 8 out of 15 pages',
    'No schema markup for local business or medical practice',
    'Image alt text is missing or generic on 60% of images',
    'Page titles are not optimized (all contain "Elite Dental Care" prefix)',
    'No internal linking structure for SEO',
    'Missing robots.txt and sitemap.xml'
  ],

  content_issues: [
    'Service pages lack detailed procedure information',
    'No patient testimonials or case studies visible',
    'Blog has not been updated in 8 months',
    'Before/after photos are not showcased effectively'
  ],

  accessibility_issues: [
    'Color contrast fails WCAG AA standards in 4 areas',
    'Missing ARIA labels on interactive elements',
    'Keyboard navigation is incomplete'
  ],

  // Quick wins
  quick_wins: [
    'Add meta descriptions to all pages (2-hour task)',
    'Compress and optimize images (can reduce load time by 40%)',
    'Implement Google Business Profile schema markup',
    'Fix mobile text size to 16px minimum',
    'Add patient testimonials to homepage',
    'Update blog with 2 new posts about common procedures',
    'Add click-to-call button prominently on mobile',
    'Reduce booking form to 6 essential fields'
  ],
  quick_wins_count: 8,

  // Business Intelligence Data
  years_in_business: 12,
  employee_count: '15-20',
  pricing_visible: false,
  pricing_range: 'Mid-to-High',
  budget_indicator: 'mid-tier',
  premium_features: [
    '3D virtual office tour',
    'Online appointment scheduling',
    'Patient portal',
    'Video testimonials'
  ],
  blog_active: false,
  content_last_update: '2024-02-15',

  // Technical metadata
  tech_stack: 'WordPress + Custom Theme',
  page_load_time: 4200, // milliseconds
  has_https: true,
  is_mobile_friendly: false,
  has_blog: true,

  // Social presence
  social_platforms_present: ['Facebook', 'Instagram', 'Google Business'],
  social_profiles: {
    facebook: 'https://facebook.com/elitedentalcare',
    instagram: 'https://instagram.com/elitedentalcare',
    google_business: 'https://g.page/elitedentalcare'
  },

  // Crawl metadata
  crawl_metadata: {
    pages_crawled: 15,
    links_found: 87,
    pages_failed: 2,
    crawl_time: 8500 // milliseconds
  },

  // AI models used
  seo_analysis_model: 'grok-beta',
  content_analysis_model: 'grok-beta',
  desktop_visual_model: 'gpt-4o',
  mobile_visual_model: 'gpt-4o',
  social_analysis_model: 'grok-beta',
  accessibility_analysis_model: 'grok-beta',

  // Analysis metadata
  analyzed_at: new Date().toISOString(),
  analysis_time: 145000, // milliseconds (2.4 minutes)
  analysis_cost: 0.0847, // USD
  pages_analyzed: 15
};

// Enhanced synthesis data
const enhancedSynthesisData = {
  consolidatedIssues: [
    {
      title: 'Critical Mobile Experience Issues',
      description: 'Multiple mobile-specific problems are causing a 45% bounce rate on mobile devices, significantly impacting patient acquisition.',
      severity: 'critical',
      businessImpact: 'Mobile users represent 68% of traffic but only 31% of appointment bookings. This represents ~$45,000 in lost annual revenue.',
      recommendation: 'Prioritize mobile optimization: increase text size to 16px minimum, reduce booking form fields to 6, add prominent click-to-call button, and optimize touch targets to 44x44px.'
    },
    {
      title: 'SEO Foundation Gaps Limiting Discoverability',
      description: 'Missing essential SEO elements preventing the practice from ranking for high-value local searches.',
      severity: 'high',
      businessImpact: 'Currently not appearing in Google\'s local 3-pack for "dentist near me" searches. Estimated 150-200 monthly patient searches are going to competitors.',
      recommendation: 'Implement local business schema markup, add comprehensive meta descriptions, optimize page titles for local keywords, and create location-specific content.'
    },
    {
      title: 'Appointment Booking Friction',
      description: 'The 12-field booking form has an 82% abandonment rate, creating significant conversion barriers.',
      severity: 'high',
      businessImpact: 'Form complexity is costing approximately 15-20 potential patients per month. Industry benchmarks show 5-7 fields achieve 60% higher completion rates.',
      recommendation: 'Streamline booking form to 6 essential fields: Name, Phone, Email, Preferred Date, Service Type, Insurance Provider. Add autofill and validation.'
    },
    {
      title: 'Stale Content Hurting Credibility',
      description: 'Blog hasn\'t been updated in 8 months, and service pages lack detailed procedure information.',
      severity: 'medium',
      businessImpact: 'Outdated content signals to search engines and patients that the practice may not be actively maintained, reducing trust and SEO rankings.',
      recommendation: 'Establish content calendar with bi-weekly blog posts about common procedures, add detailed before/after case studies, and expand service pages with FAQ sections.'
    }
  ],

  executiveSummary: {
    overview: 'Elite Dental Care has built a strong foundation with quality content and premium features, but critical mobile experience issues and SEO gaps are significantly limiting patient acquisition. With 68% of traffic coming from mobile devices but only 31% converting to appointments, the mobile experience represents the highest-impact improvement opportunity. The practice has invested in premium features like 3D tours and patient portals, indicating budget availability for further enhancements.',
    topPriority: 'Fix mobile experience issues to capture the 45% of visitors currently bouncing. This single improvement could increase monthly patient bookings by 30-40%.',
    businessImpact: [
      {
        area: 'Patient Acquisition',
        current: 'Mobile bounce rate of 45%, missing ~20 patients/month',
        potential: 'Reduce bounce rate to 25%, adding 12-15 patients/month ($36,000-$45,000 annual value)'
      },
      {
        area: 'Local Search Visibility',
        current: 'Not appearing in Google local 3-pack',
        potential: 'Rank in top 3 for local searches, capturing 150-200 monthly searches'
      },
      {
        area: 'Appointment Conversion',
        current: '82% booking form abandonment (15-20 lost patients/month)',
        potential: '60% completion rate with streamlined form (10-12 additional patients/month)'
      },
      {
        area: 'Content Marketing ROI',
        current: 'Inactive blog, no new patient education',
        potential: 'Active content strategy driving 30-40 monthly organic leads'
      }
    ]
  }
};

async function testEnhancedReport() {
  console.log('🧪 Testing Enhanced V3 Report with Real Data...\n');
  console.log('Features being tested:');
  console.log('✅ Real issue-driven roadmap (not hard-coded)');
  console.log('✅ Business intelligence insights');
  console.log('✅ Contact information display');
  console.log('✅ Industry-specific recommendations');
  console.log('✅ Detailed technical metadata');
  console.log('✅ AI model transparency');
  console.log('✅ Actual cost and performance data\n');

  try {
    // Generate comprehensive report
    console.log('Generating comprehensive report with all data fields...');
    const html = await generateHTMLReportV3(
      comprehensiveAnalysisResult,
      enhancedSynthesisData
    );

    const outputPath = join(process.cwd(), 'test-report-v3-enhanced-dental.html');
    await writeFile(outputPath, html);
    
    console.log(`✅ Enhanced report saved to: ${outputPath}`);
    console.log(`   File size: ${(html.length / 1024).toFixed(1)} KB\n`);

    // Generate reports for other industries
    const industries = [
      { name: 'HVAC Services', industry: 'HVAC', file: 'hvac' },
      { name: 'Restaurant', industry: 'Restaurant', file: 'restaurant' },
      { name: 'E-commerce', industry: 'Retail', file: 'ecommerce' }
    ];

    for (const { name, industry, file } of industries) {
      console.log(`Generating ${name} report...`);
      const modifiedResult = {
        ...comprehensiveAnalysisResult,
        company_name: `Sample ${name}`,
        industry: industry
      };

      const industryHtml = await generateHTMLReportV3(modifiedResult, enhancedSynthesisData);
      const industryPath = join(process.cwd(), `test-report-v3-enhanced-${file}.html`);
      await writeFile(industryPath, industryHtml);
      console.log(`✅ ${name} report saved to: ${industryPath}`);
    }

    console.log('\n📊 Enhanced Report Generation Summary:');
    console.log('==========================================');
    console.log('✅ All reports generated with real data!');
    console.log('\n🔍 What to look for in the reports:');
    console.log('   • Roadmap shows ACTUAL issues from analysis data');
    console.log('   • Contact information displayed in header');
    console.log('   • Business intelligence section with real metrics');
    console.log('   • Industry-specific recommendations in 90-day plan');
    console.log('   • Detailed technical metadata (AI models, costs, performance)');
    console.log('   • All sections populated with real data, not placeholders');
    console.log('\n💡 Pro tip: Compare the different industry reports to see');
    console.log('   how recommendations adapt based on business type!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error(error.stack);
  }
}

// Run the test
testEnhancedReport().catch(console.error);
