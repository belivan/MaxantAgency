/**
 * Sample Report Generation Test
 *
 * Generate sample HTML and Markdown reports for a real website
 * WITHOUT running the actual analysis engine
 */

import { generateReport } from './reports/report-generator.js';
import { writeFile } from 'fs/promises';

// Mock analysis data for a real restaurant website
// Let's use "Joe's Pizza" - a fictional but realistic restaurant
const mockAnalysisData = {
  success: true,
  url: 'https://www.joespizzanyc.com',
  company_name: "Joe's Pizza NYC",
  industry: 'Restaurant',
  city: 'New York, NY',
  grade: 'C',
  overall_score: 58,
  grade_label: 'Needs Work',
  one_liner: 'Your mobile menu is hidden behind an unlabeled hamburger icon, and 40% of mobile users don\'t recognize it without a label',

  // Individual scores
  design_score: 55,
  design_score_desktop: 60,
  design_score_mobile: 50,
  seo_score: 52,
  content_score: 62,
  social_score: 48,
  accessibility_score: 45,

  // Quick wins
  quick_wins: [
    {
      title: 'Add "Menu" label to hamburger icon',
      estimatedTime: '5 min',
      impact: 'Mobile navigation clarity',
      difficulty: 'quick-win'
    },
    {
      title: 'Fix missing meta description',
      estimatedTime: '10 min',
      impact: 'SEO & click-through rate',
      difficulty: 'quick-win'
    },
    {
      title: 'Increase "Order Online" button size by 2x',
      estimatedTime: '10 min',
      impact: 'Mobile conversion boost',
      difficulty: 'quick-win'
    },
    {
      title: 'Add alt text to 12 food images',
      estimatedTime: '30 min',
      impact: 'Accessibility + SEO',
      difficulty: 'quick-win'
    },
    {
      title: 'Fix viewport meta tag for mobile',
      estimatedTime: '5 min',
      impact: 'Mobile-friendly test',
      difficulty: 'quick-win'
    }
  ],

  // Desktop issues
  design_issues_desktop: [
    {
      title: 'Hero section has competing visual elements',
      description: 'Desktop hero displays 5 different CTAs with equal visual weight - "Order Now", "View Menu", "Call Us", "Directions", "Catering"',
      impact: 'Desktop visitors spend 10-15 seconds scanning without clear next action',
      fix: 'Make "Order Now" primary CTA 2-3x larger, move others to secondary navigation',
      difficulty: 'quick-win',
      priority: 'high',
      category: 'hierarchy'
    },
    {
      title: 'Menu page has poor visual hierarchy',
      description: 'All menu items displayed with same font size, no visual distinction between categories',
      impact: 'Users have difficulty finding specific items',
      fix: 'Increase category headers to 24-28px, add subtle background colors',
      difficulty: 'medium',
      priority: 'medium',
      category: 'hierarchy'
    },
    {
      title: 'Contact information buried in footer',
      description: 'Phone number only appears in small footer text, not prominently displayed',
      impact: 'Desktop users seeking to call must scroll and search',
      fix: 'Add sticky "Call Us" button or prominent phone display in header',
      difficulty: 'medium',
      priority: 'medium',
      category: 'cta'
    }
  ],

  // Mobile issues
  design_issues_mobile: [
    {
      title: 'Hamburger menu icon has no label',
      description: 'Mobile navigation uses hamburger icon without "Menu" text',
      impact: '40% of mobile users don\'t recognize hamburger icons without labels',
      fix: 'Add "Menu" text label next to hamburger icon',
      difficulty: 'quick-win',
      priority: 'critical',
      category: 'navigation',
      wcagCriterion: '1.1.1 Non-text Content (Level A)'
    },
    {
      title: 'Touch targets below minimum size',
      description: 'Menu item buttons are 36px tall, below 44px minimum for touchscreens',
      impact: 'Mobile users frequently mis-tap menu items',
      fix: 'Increase button height to 48px minimum',
      difficulty: 'quick-win',
      priority: 'high',
      category: 'mobile',
      wcagCriterion: '2.5.5 Target Size (Level AAA)'
    },
    {
      title: 'Text too small on mobile',
      description: 'Body text is 12px, requiring users to zoom',
      impact: 'Poor readability, high bounce rate on mobile',
      fix: 'Increase base font size to 16px',
      difficulty: 'quick-win',
      priority: 'high',
      category: 'mobile'
    },
    {
      title: 'Images not optimized for mobile',
      description: 'Desktop-sized images (2000px+) served to mobile devices',
      impact: 'Slow page load on mobile networks (8-12 seconds)',
      fix: 'Implement responsive images with srcset',
      difficulty: 'medium',
      priority: 'medium',
      category: 'performance'
    }
  ],

  // SEO issues
  seo_issues: [
    {
      title: 'Generic title tag "Home | Joe\'s Pizza"',
      description: 'Title tag missing location and keywords',
      impact: 'Missing critical ranking signal for local search',
      fix: 'Change to: "Joe\'s Pizza NYC | Best New York Style Pizza in Manhattan"',
      priority: 'critical',
      category: 'meta',
      difficulty: 'quick-win'
    },
    {
      title: 'Meta description completely missing',
      description: 'No meta description tag exists',
      impact: 'Search engines pull random text, reducing click-through rate by 30-40%',
      fix: 'Add 155-character description: "Authentic New York style pizza since 1975. Fresh ingredients, coal-fired oven. Order online for pickup or delivery in Manhattan."',
      priority: 'critical',
      category: 'meta',
      difficulty: 'quick-win'
    },
    {
      title: 'Missing H1 heading',
      description: 'Homepage has no H1 tag',
      impact: 'Search engines can\'t identify page topic',
      fix: 'Add H1: "Authentic New York Style Pizza Since 1975"',
      priority: 'high',
      category: 'structure',
      difficulty: 'quick-win'
    },
    {
      title: 'Images missing alt text',
      description: '12 out of 15 images have empty alt attributes',
      impact: 'Missing image search traffic and accessibility issues',
      fix: 'Add descriptive alt text to all images',
      priority: 'high',
      category: 'images',
      difficulty: 'quick-win'
    },
    {
      title: 'No schema.org markup',
      description: 'No structured data for restaurant information',
      impact: 'Not eligible for rich snippets in search results',
      fix: 'Add LocalBusiness schema with address, hours, menu',
      priority: 'medium',
      category: 'structured-data',
      difficulty: 'medium'
    }
  ],

  // Content issues
  content_issues: [
    {
      title: 'Value proposition not clear above fold',
      description: 'Homepage doesn\'t clearly state what makes Joe\'s Pizza unique',
      impact: 'Visitors leave without understanding why to choose Joe\'s',
      fix: 'Add clear tagline: "NYC\'s Original Coal-Fired Pizza Since 1975"',
      priority: 'high',
      category: 'messaging',
      difficulty: 'quick-win'
    },
    {
      title: 'Menu lacks descriptions',
      description: 'Menu items listed with names and prices only, no descriptions',
      impact: 'Customers unclear on ingredients, leading to phone calls',
      fix: 'Add 1-2 sentence description for each specialty pizza',
      priority: 'medium',
      category: 'content',
      difficulty: 'medium'
    },
    {
      title: 'No about/story section',
      description: 'Website lacks any information about restaurant history or values',
      impact: 'Missed opportunity to build emotional connection',
      fix: 'Add "Our Story" section on homepage',
      priority: 'low',
      category: 'content',
      difficulty: 'medium'
    }
  ],

  // Social issues
  social_issues: [
    {
      title: 'No Instagram link despite active account',
      description: 'Restaurant has 15K Instagram followers but no link on website',
      impact: 'Missing social proof and engagement opportunity',
      fix: 'Add Instagram icon in header and footer linking to @joespizzanyc',
      priority: 'high',
      category: 'social-proof',
      difficulty: 'quick-win'
    },
    {
      title: 'No social media icons visible',
      description: 'Facebook and Instagram links buried in footer as text',
      impact: 'Low social media traffic from website',
      fix: 'Add prominent social media icons in header',
      priority: 'medium',
      category: 'social-proof',
      difficulty: 'quick-win'
    },
    {
      title: 'No customer reviews displayed',
      description: 'Website doesn\'t showcase Yelp or Google reviews',
      impact: 'Missing social proof that builds trust',
      fix: 'Add review widget showing recent 5-star reviews',
      priority: 'medium',
      category: 'social-proof',
      difficulty: 'medium'
    }
  ],

  // Accessibility issues
  accessibility_issues: [
    {
      title: '12 images missing alt text',
      description: '12 out of 15 images have empty or missing alt attributes',
      impact: 'Screen readers can\'t describe images, failing WCAG 2.1 Level A',
      fix: 'Add descriptive alt text to all images (e.g., "Margherita pizza with fresh basil")',
      priority: 'critical',
      wcagCriterion: '1.1.1 Non-text Content (Level A)',
      category: 'images',
      difficulty: 'quick-win'
    },
    {
      title: 'Low color contrast on CTA buttons',
      description: 'White text on light orange background (2.8:1 ratio, needs 4.5:1)',
      impact: 'Users with visual impairments can\'t read button text',
      fix: 'Change to darker orange (#D2691E) or add text shadow',
      priority: 'high',
      wcagCriterion: '1.4.3 Contrast (Minimum) (Level AA)',
      category: 'color',
      difficulty: 'quick-win'
    },
    {
      title: 'Forms missing labels',
      description: 'Contact form inputs have placeholder text but no proper labels',
      impact: 'Screen reader users can\'t identify form fields',
      fix: 'Add visible labels or aria-label attributes',
      priority: 'high',
      wcagCriterion: '3.3.2 Labels or Instructions (Level A)',
      category: 'forms',
      difficulty: 'quick-win'
    },
    {
      title: 'Keyboard navigation broken',
      description: 'Can\'t tab through menu items, focus states missing',
      impact: 'Keyboard-only users can\'t navigate site',
      fix: 'Add proper focus states and tabindex where needed',
      priority: 'medium',
      wcagCriterion: '2.1.1 Keyboard (Level A)',
      category: 'keyboard',
      difficulty: 'medium'
    }
  ],

  // Technical metadata
  page_title: 'Home | Joe\'s Pizza',
  meta_description: null,
  tech_stack: 'WordPress',
  page_load_time: 4200,
  has_https: true,
  is_mobile_friendly: false,
  has_blog: false,

  // Content insights
  content_insights: {
    wordCount: 850,
    hasBlog: false,
    blogPostCount: 0,
    ctaCount: 5,
    completeness: '45%'
  },

  // Social platforms
  social_platforms_present: ['Facebook', 'Instagram'],
  social_profiles: {
    'Facebook': 'https://facebook.com/joespizzanyc',
    'Instagram': 'https://instagram.com/joespizzanyc'
  },

  // Contact
  contact_email: 'info@joespizzanyc.com',
  contact_phone: '(212) 555-0123',

  // Business intelligence
  business_intelligence: {
    yearsInBusiness: 49,
    foundedYear: 1975,
    employeeCount: '10-20',
    locationCount: 2,
    pricingVisible: true,
    priceRange: '$8-$18',
    blogActive: false,
    contentLastUpdate: '6 months ago',
    ownerName: 'Joe Marino',
    premiumFeatures: ['Online Ordering', 'Delivery'],
    budgetIndicator: 'Medium'
  },

  // Crawl metadata
  crawl_metadata: {
    pages_crawled: 8,
    links_found: 32,
    crawl_time: 6200,
    failed_pages: 0
  },

  // Lead priority
  lead_priority: 72,
  lead_priority_reasoning: 'Strong lead with clear improvement opportunities. Grade C indicates significant room for improvement. Active social media presence (15K followers) shows marketing awareness. Established business (49 years) with visible pricing suggests ability to invest. Quick wins available that could improve conversion rate immediately.',
  priority_tier: 'Warm',
  budget_likelihood: 'medium',
  fit_score: 78,
  quality_gap_score: 7,
  budget_score: 6,
  urgency_score: 7,
  industry_fit_score: 9,
  company_size_score: 6,
  engagement_score: 7,

  // Analysis metadata
  analyzed_at: new Date().toISOString(),
  analysis_cost: 0.038,
  analysis_time: 16200,
  seo_analysis_model: 'grok-beta',
  content_analysis_model: 'grok-beta',
  desktop_visual_model: 'gpt-4o',
  mobile_visual_model: 'gpt-4o',
  social_analysis_model: 'grok-beta',
  accessibility_analysis_model: 'grok-beta'
};

async function generateSampleReports() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('Sample Report Generation Test');
  console.log('═══════════════════════════════════════════════════════════════\n');

  console.log(`Generating reports for: ${mockAnalysisData.company_name}`);
  console.log(`Website: ${mockAnalysisData.url}`);
  console.log(`Grade: ${mockAnalysisData.grade} (${mockAnalysisData.overall_score}/100)`);
  console.log(`Industry: ${mockAnalysisData.industry}`);
  console.log(`Location: ${mockAnalysisData.city}\n`);

  try {
    // Generate HTML report
    console.log('📄 Generating HTML report (dark theme)...');
    const htmlReport = await generateReport(mockAnalysisData, {
      format: 'html'
    });

    console.log(`✅ HTML report generated:`);
    console.log(`   - Size: ${(htmlReport.content.length / 1024).toFixed(1)} KB`);
    console.log(`   - Word count: ${htmlReport.metadata.word_count}`);
    console.log(`   - Generation time: ${htmlReport.metadata.generation_time_ms}ms\n`);

    // Save HTML report
    await writeFile('sample-report.html', htmlReport.content, 'utf-8');
    console.log('💾 Saved to: sample-report.html\n');

    // Generate Markdown report
    console.log('📝 Generating Markdown report...');
    const markdownReport = await generateReport(mockAnalysisData, {
      format: 'markdown',
      sections: ['all']
    });

    console.log(`✅ Markdown report generated:`);
    console.log(`   - Size: ${(markdownReport.content.length / 1024).toFixed(1)} KB`);
    console.log(`   - Word count: ${markdownReport.metadata.word_count}`);
    console.log(`   - Generation time: ${markdownReport.metadata.generation_time_ms}ms\n`);

    // Save Markdown report
    await writeFile('sample-report.md', markdownReport.content, 'utf-8');
    console.log('💾 Saved to: sample-report.md\n');

    // Summary
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('✅ Sample Reports Generated Successfully!');
    console.log('═══════════════════════════════════════════════════════════════\n');

    console.log('📊 Report Summary:');
    console.log(`   Company: ${mockAnalysisData.company_name}`);
    console.log(`   Overall Score: ${mockAnalysisData.overall_score}/100 (Grade ${mockAnalysisData.grade})`);
    console.log(`   Desktop Score: ${mockAnalysisData.design_score_desktop}/100`);
    console.log(`   Mobile Score: ${mockAnalysisData.design_score_mobile}/100`);
    console.log(`   SEO Score: ${mockAnalysisData.seo_score}/100`);
    console.log(`   Accessibility Score: ${mockAnalysisData.accessibility_score}/100`);
    console.log(`   Quick Wins: ${mockAnalysisData.quick_wins.length}`);
    console.log(`   Total Issues: ${
      mockAnalysisData.design_issues_desktop.length +
      mockAnalysisData.design_issues_mobile.length +
      mockAnalysisData.seo_issues.length +
      mockAnalysisData.content_issues.length +
      mockAnalysisData.social_issues.length +
      mockAnalysisData.accessibility_issues.length
    }\n`);

    console.log('📂 Next Steps:');
    console.log('   1. Open sample-report.html in your browser to see the dark theme');
    console.log('   2. Open sample-report.md in your editor to see the Markdown format');
    console.log('   3. Both files are in the analysis-engine directory\n');

  } catch (error) {
    console.error('❌ Error generating reports:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the test
generateSampleReports();