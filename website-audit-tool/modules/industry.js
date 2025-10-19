/**
 * Industry Detection Module
 * Automatically detects business industry and provides tailored recommendations
 */

import { callAI } from '../ai-providers.js';
import { parseJSONFromText } from './ai-utils.js';

/**
 * Detect industry from website data
 */
export async function detectIndustry(websiteData, textModel, sendProgress) {
  sendProgress({
    type: 'step',
    step: 'detecting_industry',
    message: `⏳ Detecting industry...`,
    url: websiteData.url
  });

  // Build detection prompt with prioritized data
  const detectionData = buildDetectionData(websiteData);

  const prompt = `Analyze this website and determine the business industry.

${detectionData}

Determine:
1. BROAD CATEGORY (choose from): Professional Services, Technology & Software, E-commerce & Retail, Healthcare & Medical, Food & Hospitality, Real Estate & Property, Education & Training, Finance & Insurance, Home Services, Creative & Media, Fitness & Wellness, Automotive, Non-Profit & Advocacy, Manufacturing & Industrial, Entertainment & Events

2. SPECIFIC NICHE (be precise, e.g., "Web Design & Development", "Pediatric Dentistry", "B2B SaaS", "Italian Restaurant")

3. CONFIDENCE (high/medium/low) based on clarity of evidence

4. KEY KEYWORDS that led to this conclusion

Return ONLY valid JSON (no markdown):
{
  "broad": "Broad Category Name",
  "specific": "Specific Niche Name",
  "confidence": "high",
  "keywords": ["keyword1", "keyword2", "keyword3"],
  "reasoning": "Brief explanation of why this industry"
}`;

  try {
    const result = await callAI({
      model: textModel,
      prompt: prompt,
      systemPrompt: 'You are an expert business analyst specializing in industry classification. Always return valid JSON.'
    });

    // Parse response robustly
    const industry = parseJSONFromText(result.text);
    if (!industry) throw new Error('Failed to parse industry JSON from AI response');

    sendProgress({
      type: 'step',
      step: 'industry_detected',
      message: `✓ Industry identified: ${industry.specific}`,
      url: websiteData.url
    });

    return industry;

  } catch (error) {
    console.error('Industry detection error:', error);

    // Fallback: make best guess from keywords
    const fallback = makeFallbackGuess(websiteData);

    sendProgress({
      type: 'step',
      step: 'industry_detected',
      message: `✓ Industry estimated: ${fallback.specific}`,
      url: websiteData.url
    });

    return fallback;
  }
}

/**
 * Build detection data prioritizing services/products and about content
 */
function buildDetectionData(websiteData) {
  const data = websiteData.data;
  const parts = [];

  // Priority 1: Services/Products (highest signal)
  if (data.bodyText) {
    const servicesMatch = data.bodyText.match(/(services|products|offerings|solutions|what we do).{0,500}/i);
    if (servicesMatch) {
      parts.push(`SERVICES/PRODUCTS:\n${servicesMatch[0]}`);
    }
  }

  // Priority 2: About page content (high signal)
  const aboutMatch = data.bodyText?.match(/(about us|who we are|our story|our company).{0,500}/i);
  if (aboutMatch) {
    parts.push(`\nABOUT:\n${aboutMatch[0]}`);
  }

  // Priority 3: H1 tags (medium signal)
  if (data.h1Tags && data.h1Tags.length > 0) {
    parts.push(`\nH1 TAGS:\n${data.h1Tags.slice(0, 5).join(', ')}`);
  }

  // Priority 4: Page title (medium signal)
  if (data.title) {
    parts.push(`\nPAGE TITLE:\n${data.title}`);
  }

  // Priority 5: Meta description (medium signal)
  if (websiteData.data.metaDescription) {
    parts.push(`\nMETA DESCRIPTION:\n${websiteData.data.metaDescription}`);
  }

  // Priority 6: General body text (low signal, fallback)
  if (parts.length < 2 && data.bodyText) {
    parts.push(`\nCONTENT SAMPLE:\n${data.bodyText.slice(0, 1000)}`);
  }

  return parts.join('\n');
}

/**
 * Fallback: Simple keyword-based detection
 */
function makeFallbackGuess(websiteData) {
  const text = (websiteData.data.bodyText + ' ' + websiteData.data.title + ' ' + websiteData.data.h1Tags.join(' ')).toLowerCase();

  // Check for common industry keywords
  if (text.match(/web design|website|developer|web development|wordpress|shopify/i)) {
    return {
      broad: 'Technology & Software',
      specific: 'Web Design & Development',
      confidence: 'medium',
      keywords: ['web', 'design', 'website'],
      reasoning: 'Keyword-based detection (fallback)'
    };
  }

  if (text.match(/lawyer|attorney|legal|law firm/i)) {
    return { broad: 'Professional Services', specific: 'Law Firm', confidence: 'medium', keywords: ['legal', 'lawyer'], reasoning: 'Fallback' };
  }

  if (text.match(/restaurant|cafe|food|dining|menu/i)) {
    return { broad: 'Food & Hospitality', specific: 'Restaurant', confidence: 'medium', keywords: ['food', 'dining'], reasoning: 'Fallback' };
  }

  if (text.match(/dentist|dental|orthodontic|teeth/i)) {
    return { broad: 'Healthcare & Medical', specific: 'Dental Practice', confidence: 'medium', keywords: ['dental'], reasoning: 'Fallback' };
  }

  if (text.match(/e-commerce|shop|store|buy|cart|checkout/i)) {
    return { broad: 'E-commerce & Retail', specific: 'Online Store', confidence: 'medium', keywords: ['shop', 'store'], reasoning: 'Fallback' };
  }

  // Default fallback
  return {
    broad: 'Professional Services',
    specific: 'Business Services',
    confidence: 'low',
    keywords: [],
    reasoning: 'Unable to determine specific industry'
  };
}

/**
 * Get industry-specific best practices and recommendations
 */
export function getIndustryBestPractices(industry) {
  const specific = industry.specific.toLowerCase();
  const broad = industry.broad.toLowerCase();

  // Match specific industry first, then fall back to broad category
  return INDUSTRY_DATABASE[specific] ||
         INDUSTRY_DATABASE[broad] ||
         INDUSTRY_DATABASE['default'];
}

/**
 * Industry Best Practices Database
 */
const INDUSTRY_DATABASE = {
  // Technology & Software
  'web design & development': {
    critical: [
      'Portfolio with case studies showing before/after metrics (conversion rates, traffic growth, ROI)',
      'Clear service packages with starting prices - 68% of prospects won\'t inquire without pricing indication',
      'Client testimonials with project specifics and measurable results achieved',
      'Transparent process and timeline (discovery, design, development, launch phases)',
      'Tech stack and platform expertise clearly stated (WordPress, Shopify, React, etc.)'
    ],
    recommended: [
      'Live chat or instant contact form above the fold on services page',
      'Response time commitment prominently displayed (e.g., "We respond within 24 hours")',
      'Maintenance and support options explained for post-launch',
      'Design philosophy or unique approach that differentiates from competitors'
    ]
  },

  'saas': {
    critical: [
      'Clear pricing page with plan comparison table - 82% of SaaS visitors check pricing',
      'Free trial or demo CTA above the fold - reduces friction in sign-up process',
      'Product screenshots or video demo on homepage showing actual interface',
      'Customer logos and testimonials with specific use cases and results',
      'Security and compliance badges (SOC 2, GDPR, etc.) for enterprise trust'
    ],
    recommended: [
      'Live chat for immediate sales questions',
      'Resources section with guides and documentation',
      'Integrations page showing compatible tools',
      'Case studies with measurable ROI metrics'
    ]
  },

  // Professional Services
  'law firm': {
    critical: [
      'Practice areas clearly listed with descriptions - visitors need to know specializations',
      'Attorney bios with credentials, experience, and case results',
      'Contact information including phone number prominently displayed',
      'Free consultation offer clearly stated - reduces barrier to contact',
      'Client testimonials and case results (anonymized if needed)'
    ],
    recommended: [
      'Blog with legal insights establishes thought leadership',
      'FAQ section addressing common legal questions',
      'Awards and recognitions prominently displayed',
      'After-hours contact options for urgent matters'
    ]
  },

  'accounting': {
    critical: [
      'Services clearly categorized (tax prep, bookkeeping, audit, consulting)',
      'Professional credentials (CPA, EA) prominently displayed',
      'Pricing structure or at least starting rates - reduces inquiry friction',
      'Secure client portal mentioned for document sharing',
      'Industry specializations listed (if applicable: real estate, medical, etc.)'
    ],
    recommended: [
      'Tax deadline reminders and resources',
      'Financial calculators or tools',
      'Newsletter signup for tax tips',
      'Client testimonials with specific problems solved'
    ]
  },

  // E-commerce & Retail
  'online store': {
    critical: [
      'Trust badges above the fold (secure checkout, SSL, money-back guarantee)',
      'Clear shipping information and costs - #1 reason for cart abandonment',
      'Product search functionality prominently displayed',
      'Customer reviews visible on product pages - 93% read reviews before buying',
      'Multiple payment options clearly shown (cards, PayPal, etc.)'
    ],
    recommended: [
      'Live chat for product questions during shopping',
      'Size guides and product comparison tools',
      'Email capture with discount offer (10% off first order)',
      'Recently viewed items and recommendations'
    ]
  },

  // Healthcare & Medical
  'dental practice': {
    critical: [
      'Online appointment booking - 67% of patients prefer online scheduling',
      'Insurance providers accepted clearly listed',
      'Services with procedure descriptions and costs',
      'New patient forms downloadable or fillable online',
      'Emergency contact information prominently displayed'
    ],
    recommended: [
      'Before/after photos for cosmetic procedures',
      'Patient testimonials and reviews',
      'Meet the dentist video or bio',
      'COVID-19 safety protocols clearly stated'
    ]
  },

  'medical clinic': {
    critical: [
      'Online appointment scheduling system',
      'Insurance and payment information clearly stated',
      'Provider bios with credentials and specialties',
      'Patient portal access for medical records',
      'Emergency and after-hours contact information'
    ],
    recommended: [
      'Telehealth options if available',
      'New patient intake forms online',
      'Health resources and blog',
      'Directions and parking information'
    ]
  },

  // Food & Hospitality
  'restaurant': {
    critical: [
      'Menu with prices easily accessible - don\'t hide behind PDF or "see in-store"',
      'Online ordering or reservation system if available',
      'Hours of operation prominently displayed',
      'Location with embedded map and parking information',
      'High-quality food photography - visual appeal drives dining decisions'
    ],
    recommended: [
      'Dietary options clearly marked (vegan, gluten-free, etc.)',
      'Chef bio or restaurant story',
      'Customer reviews from Google/Yelp embedded',
      'Special events or live music schedule'
    ]
  },

  // Real Estate & Property
  'real estate': {
    critical: [
      'Property search with filters (price, beds, location) above the fold',
      'High-quality property photos and virtual tours',
      'Agent contact information with photo and credentials',
      'Mortgage calculator or buyer/seller resources',
      'Recent sales or testimonials from clients'
    ],
    recommended: [
      'Neighborhood guides and local market data',
      'Blog with buying/selling tips',
      'Home valuation tool',
      'Schedule showing button on listings'
    ]
  },

  // Fitness & Wellness
  'gym': {
    critical: [
      'Membership pricing and class schedule clearly displayed',
      'Free trial or first class offer prominently featured',
      'Facility photos and equipment list',
      'Trainer bios with certifications',
      'Hours of operation and location with parking info'
    ],
    recommended: [
      'Success stories with before/after photos',
      'Class descriptions for beginners',
      'Member app or online class booking',
      'COVID-19 safety measures'
    ]
  },

  // Default fallback for any industry
  'default': {
    critical: [
      'Clear value proposition on homepage - visitors should understand what you do in 5 seconds',
      'Contact information easily accessible (phone, email, form)',
      'Services or products clearly described with benefits',
      'Social proof (testimonials, reviews, client logos)',
      'Mobile-friendly design - 60% of traffic is mobile'
    ],
    recommended: [
      'About page with company story and team',
      'Case studies or portfolio of work',
      'Blog or resources section',
      'Clear call-to-action on every page'
    ]
  }
};
