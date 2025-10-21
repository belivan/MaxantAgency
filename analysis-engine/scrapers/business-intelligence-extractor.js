/**
 * Business Intelligence Extractor
 *
 * Intelligently parses HTML from multiple crawled pages to extract business signals
 * including company size, years in business, pricing visibility, content freshness,
 * decision maker accessibility, and premium features.
 *
 * This module aggregates signals from ALL crawled pages (homepage, about, services, etc.)
 * to build a comprehensive business profile for lead qualification.
 */

import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load scraper configuration
let config;
try {
  const configPath = path.join(__dirname, '..', 'config', 'scraper-config.json');
  config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
} catch (error) {
  console.error('Failed to load scraper-config.json:', error.message);
  // Fallback to defaults if config missing
  config = {
    business_intelligence: {
      enabled: true,
      page_type_detection: {
        patterns: {
          about: ["about", "about-us", "who-we-are", "our-story", "company"],
          services: ["services", "what-we-do", "solutions", "offerings"],
          team: ["team", "staff", "employees", "our-team", "meet-the-team", "people"],
          contact: ["contact", "contact-us", "get-in-touch", "reach-us"],
          pricing: ["pricing", "plans", "packages", "rates"],
          portfolio: ["portfolio", "work", "projects", "case-studies", "gallery"],
          blog: ["blog", "news", "articles", "insights"],
          locations: ["locations", "offices", "branches", "stores"],
          testimonials: ["testimonials", "reviews", "clients", "success-stories"]
        }
      }
    }
  };
}

/**
 * Main extraction function
 *
 * @param {Array} crawledPages - Array of page objects with { url, html, isHomepage }
 * @returns {object} Comprehensive business intelligence profile
 */
export function extractBusinessIntelligence(crawledPages) {
  if (!crawledPages || crawledPages.length === 0) {
    return getEmptyProfile();
  }

  // Analyze each page and detect type
  const analyzedPages = crawledPages.map(page => {
    const $ = cheerio.load(page.html);
    const pageType = detectPageType(page.url, $);

    return {
      url: page.url,
      $: $,
      type: pageType,
      isHomepage: page.isHomepage || false
    };
  });

  // Extract signals from all pages
  const companySize = extractCompanySize(analyzedPages);
  const yearsInBusiness = extractYearsInBusiness(analyzedPages);
  const pricingVisibility = extractPricingVisibility(analyzedPages);
  const contentFreshness = extractContentFreshness(analyzedPages);
  const decisionMakerAccessibility = extractDecisionMakerAccessibility(analyzedPages);
  const premiumFeatures = extractPremiumFeatures(analyzedPages);
  const pageTypes = countPageTypes(analyzedPages);

  return {
    companySize,
    yearsInBusiness,
    pricingVisibility,
    contentFreshness,
    decisionMakerAccessibility,
    premiumFeatures,
    pageTypes,
    metadata: {
      totalPagesAnalyzed: crawledPages.length,
      homepageFound: analyzedPages.some(p => p.isHomepage),
      timestamp: new Date().toISOString()
    }
  };
}

/**
 * Detect page type from URL and content
 */
function detectPageType(url, $) {
  const patterns = config.business_intelligence.page_type_detection.patterns;
  const urlLower = url.toLowerCase();

  // Check URL patterns first
  for (const [type, keywords] of Object.entries(patterns)) {
    for (const keyword of keywords) {
      if (urlLower.includes(`/${keyword}`) ||
          urlLower.includes(`-${keyword}`) ||
          urlLower.includes(`_${keyword}`)) {
        return type;
      }
    }
  }

  // Check page title and headings as fallback
  const title = $('title').text().toLowerCase();
  const h1 = $('h1').first().text().toLowerCase();
  const combinedText = `${title} ${h1}`;

  for (const [type, keywords] of Object.entries(patterns)) {
    for (const keyword of keywords) {
      if (combinedText.includes(keyword)) {
        return type;
      }
    }
  }

  return 'other';
}

/**
 * Extract company size signals
 */
function extractCompanySize(pages) {
  const signals = [];
  let employeeCount = null;
  let locationCount = null;

  // Look for team pages AND about pages for employee mentions
  const teamAndAboutPages = pages.filter(p => p.type === 'team' || p.type === 'about');
  teamAndAboutPages.forEach(page => {
    const $ = page.$;
    const bodyText = $('body').text();

    // Count team member cards/sections (for team pages)
    if (page.type === 'team') {
      const teamMemberSelectors = [
        '.team-member',
        '.employee',
        '.staff-member',
        '[class*="team-card"]',
        '[class*="employee-card"]',
        'article.person',
        '.bio'
      ];

      let maxCount = 0;
      teamMemberSelectors.forEach(selector => {
        const count = $(selector).length;
        if (count > maxCount) maxCount = count;
      });

      if (maxCount > 0) {
        employeeCount = Math.max(employeeCount || 0, maxCount);
        signals.push(`Team page shows ${maxCount} member${maxCount > 1 ? 's' : ''}`);
      }
    }

    // Look for explicit employee count mentions (all pages)
    const employeePatterns = [
      /(\d+)\s*\+?\s*(employees?|team members?|staff|professionals)/gi,
      /team of (\d+)/gi,
      /(\d+)\s*person team/gi
    ];

    employeePatterns.forEach(pattern => {
      const matches = bodyText.matchAll(pattern);
      for (const match of matches) {
        const count = parseInt(match[1]);
        if (count > 0 && count < 10000) { // Sanity check
          employeeCount = Math.max(employeeCount || 0, count);
          signals.push(`Mentions "${match[0].trim()}"`);
        }
      }
    });
  });

  // Look for location pages
  const locationPages = pages.filter(p => p.type === 'locations');
  locationPages.forEach(page => {
    const $ = page.$;

    const locationSelectors = [
      '.location',
      '.office',
      '.branch',
      '.store',
      '[class*="location-card"]',
      'article.location'
    ];

    let maxCount = 0;
    locationSelectors.forEach(selector => {
      const count = $(selector).length;
      if (count > maxCount) maxCount = count;
    });

    if (maxCount > 0) {
      locationCount = Math.max(locationCount || 0, maxCount);
      signals.push(`${maxCount} location${maxCount > 1 ? 's' : ''} found on Locations page`);
    }
  });

  // Check About page for size mentions
  const aboutPages = pages.filter(p => p.type === 'about');
  aboutPages.forEach(page => {
    const $ = page.$;
    const bodyText = $('body').text();

    // Location mentions
    const locationPatterns = [
      /(\d+)\s*locations?/gi,
      /(\d+)\s*offices?/gi,
      /(\d+)\s*branches?/gi
    ];

    locationPatterns.forEach(pattern => {
      const matches = bodyText.matchAll(pattern);
      for (const match of matches) {
        const count = parseInt(match[1]);
        if (count > 0 && count < 1000) {
          locationCount = Math.max(locationCount || 0, count);
          signals.push(`About page: "${match[0].trim()}"`);
        }
      }
    });
  });

  // Determine confidence
  let confidence = 'low';
  if ((employeeCount && employeeCount > 0) || (locationCount && locationCount > 0)) {
    confidence = teamAndAboutPages.some(p => p.type === 'team') ? 'high' : 'medium';
  }

  return {
    employeeCount,
    locationCount,
    signals,
    confidence
  };
}

/**
 * Extract years in business
 */
function extractYearsInBusiness(pages) {
  const signals = [];
  let foundedYear = null;
  const currentYear = new Date().getFullYear();

  pages.forEach(page => {
    const $ = page.$;
    const bodyText = $('body').text();

    // Copyright year (most reliable)
    const copyrightPatterns = [
      /©\s*(\d{4})\s*-\s*(\d{4})/g,  // © 2015-2024
      /copyright\s*©?\s*(\d{4})\s*-\s*(\d{4})/gi,
      /©\s*(\d{4})/g,  // © 2024
      /copyright\s*©?\s*(\d{4})/gi
    ];

    copyrightPatterns.forEach(pattern => {
      const matches = bodyText.matchAll(pattern);
      for (const match of matches) {
        const year1 = parseInt(match[1]);
        const year2 = match[2] ? parseInt(match[2]) : null;

        // If range, use start year
        if (year2 && year1 < year2 && year1 >= 1900 && year1 <= currentYear) {
          if (!foundedYear || year1 < foundedYear) {
            foundedYear = year1;
            signals.push(`Copyright © ${year1}-${year2}`);
          }
        } else if (year1 >= 1900 && year1 <= currentYear) {
          // Single year - could be founded or just current
          signals.push(`Copyright © ${year1}`);
        }
      }
    });

    // "Since XXXX", "Established XXXX", "Founded in XXXX"
    const establishedPatterns = [
      /(?:since|est\.?|established|founded in?)\s*(\d{4})/gi,
      /(\d{4})\s*-\s*present/gi,
      /serving (?:since|for over)\s*(\d{4})/gi
    ];

    establishedPatterns.forEach(pattern => {
      const matches = bodyText.matchAll(pattern);
      for (const match of matches) {
        const year = parseInt(match[1]);
        if (year >= 1900 && year <= currentYear) {
          if (!foundedYear || year < foundedYear) {
            foundedYear = year;
            signals.push(`Found: "${match[0].trim()}"`);
          } else {
            signals.push(`Mentions: "${match[0].trim()}"`);
          }
        }
      }
    });

    // "X years of experience"
    const experiencePatterns = [
      /(\d+)\s*\+?\s*years?\s*(?:of\s*)?(?:experience|in business)/gi,
      /over\s*(\d+)\s*years?/gi
    ];

    experiencePatterns.forEach(pattern => {
      const matches = bodyText.matchAll(pattern);
      for (const match of matches) {
        const years = parseInt(match[1]);
        if (years > 0 && years < 200) {
          const estimatedYear = currentYear - years;
          if (!foundedYear || estimatedYear < foundedYear) {
            foundedYear = estimatedYear;
            signals.push(`"${match[0].trim()}" (estimated ${estimatedYear})`);
          }
        }
      }
    });
  });

  const estimatedYears = foundedYear ? currentYear - foundedYear : null;

  // Determine confidence
  let confidence = 'low';
  if (signals.length >= 2) confidence = 'high';
  else if (signals.length === 1) confidence = 'medium';

  return {
    estimatedYears,
    foundedYear,
    signals,
    confidence
  };
}

/**
 * Extract pricing visibility
 */
function extractPricingVisibility(pages) {
  const signals = [];
  let visible = false;
  let priceRange = { min: null, max: null };
  const detectedPrices = [];

  pages.forEach(page => {
    const $ = page.$;
    const bodyText = $('body').text();

    // Price patterns (various formats)
    const pricePatterns = [
      /\$(\d{1,3}(?:,\d{3})*)\s*-\s*\$(\d{1,3}(?:,\d{3})*)/g,  // $2,000 - $10,000 (range) - check first!
      /\$\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/g,  // $1,000.00 or $50
      /(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*dollars?/gi,  // 50 dollars
      /pricing?:\s*\$?(\d+)/gi,  // Price: $50 or Price: 50
      /starting\s*(?:at|from)\s*\$(\d+)/gi  // Starting at $50
    ];

    pricePatterns.forEach(pattern => {
      const matches = bodyText.matchAll(pattern);
      for (const match of matches) {
        let price1 = parseFloat(match[1].replace(/,/g, ''));
        let price2 = match[2] ? parseFloat(match[2].replace(/,/g, '')) : null;

        // Filter out unrealistic prices (like years: $2024)
        // Also filter out single year-like numbers without context
        const isYear = !price2 && price1 >= 1900 && price1 <= 2100 && Number.isInteger(price1);

        if (!isYear && price1 >= 1 && price1 <= 1000000) {
          detectedPrices.push(price1);
          visible = true;

          if (price2 && price2 >= 1 && price2 <= 1000000) {
            detectedPrices.push(price2);
            signals.push(`Price range: $${price1.toLocaleString()} - $${price2.toLocaleString()} on ${page.type || 'page'}`);
          } else if (!price2) {
            signals.push(`Price found: $${price1.toLocaleString()} on ${page.type || 'page'}`);
          }
        }
      }
    });

    // Check for pricing tables/packages
    const pricingIndicators = [
      '.pricing-table',
      '.price-card',
      '.package',
      '[class*="pricing"]',
      '[class*="price-"]',
      'table.pricing'
    ];

    pricingIndicators.forEach(selector => {
      const elements = $(selector);
      if (elements.length > 0) {
        visible = true;
        signals.push(`${elements.length} pricing element(s) found on ${page.type || 'page'}`);
      }
    });
  });

  // Calculate price range
  if (detectedPrices.length > 0) {
    priceRange.min = Math.min(...detectedPrices);
    priceRange.max = Math.max(...detectedPrices);
  }

  // Determine confidence
  let confidence = 'low';
  if (detectedPrices.length >= 3) confidence = 'high';
  else if (detectedPrices.length >= 1) confidence = 'medium';

  return {
    visible,
    priceRange,
    signals: signals.slice(0, 10), // Limit to avoid spam
    confidence
  };
}

/**
 * Extract content freshness signals
 */
function extractContentFreshness(pages) {
  const signals = [];
  let lastUpdate = null;
  let blogActive = false;
  let postCount = 0;
  const detectedDates = [];

  const currentYear = new Date().getFullYear();

  pages.forEach(page => {
    const $ = page.$;
    const bodyText = $('body').text();

    // Blog post dates
    if (page.type === 'blog') {
      blogActive = true;

      // Common date selectors
      const dateSelectors = [
        'time[datetime]',
        '.date',
        '.post-date',
        '.published',
        '[class*="date"]',
        'article time'
      ];

      dateSelectors.forEach(selector => {
        $(selector).each((i, el) => {
          const datetime = $(el).attr('datetime');
          const text = $(el).text().trim();

          if (datetime) {
            detectedDates.push(new Date(datetime));
            postCount++;
          } else if (text) {
            // Try to parse date from text
            const date = parseDate(text);
            if (date) {
              detectedDates.push(date);
              postCount++;
            }
          }
        });
      });

      // Count articles
      const articles = $('article').length;
      if (articles > postCount) postCount = articles;
    }

    // Copyright year (indicates site maintenance)
    const copyrightMatch = bodyText.match(/©\s*(\d{4})|copyright\s*©?\s*(\d{4})/i);
    if (copyrightMatch) {
      const year = parseInt(copyrightMatch[1] || copyrightMatch[2]);
      if (year === currentYear) {
        signals.push(`Copyright updated to ${currentYear}`);
      } else if (year === currentYear - 1) {
        signals.push(`Copyright year is ${year} (recent)`);
      } else {
        signals.push(`Copyright year is ${year} (outdated)`);
      }
    }

    // "Last updated" mentions
    const updatePatterns = [
      /(?:last\s*)?updated?:?\s*([A-Za-z]+\s+\d{1,2},?\s+\d{4})/gi,
      /(?:last\s*)?updated?:?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/gi
    ];

    updatePatterns.forEach(pattern => {
      const matches = bodyText.matchAll(pattern);
      for (const match of matches) {
        const date = parseDate(match[1]);
        if (date) {
          detectedDates.push(date);
          signals.push(`Last updated: ${match[1]}`);
        }
      }
    });
  });

  // Find most recent date
  if (detectedDates.length > 0) {
    detectedDates.sort((a, b) => b - a); // Sort descending
    lastUpdate = detectedDates[0].toISOString().split('T')[0];

    const daysSinceUpdate = Math.floor((new Date() - detectedDates[0]) / (1000 * 60 * 60 * 24));
    if (daysSinceUpdate < 30) {
      signals.push(`Most recent content: ${daysSinceUpdate} days ago`);
    } else if (daysSinceUpdate < 365) {
      const monthsSince = Math.floor(daysSinceUpdate / 30);
      signals.push(`Most recent content: ${monthsSince} month${monthsSince > 1 ? 's' : ''} ago`);
    }
  }

  // Determine confidence
  let confidence = 'low';
  if (detectedDates.length >= 3) confidence = 'high';
  else if (detectedDates.length >= 1) confidence = 'medium';

  return {
    lastUpdate,
    blogActive,
    postCount,
    signals,
    confidence
  };
}

/**
 * Extract decision maker accessibility
 */
function extractDecisionMakerAccessibility(pages) {
  const signals = [];
  let hasDirectEmail = false;
  let hasDirectPhone = false;
  let ownerName = null;
  const detectedEmails = [];
  const detectedPhones = [];

  pages.forEach(page => {
    const $ = page.$;
    const bodyText = $('body').text();
    const htmlContent = $.html().toLowerCase();

    // Email extraction - check both visible text and HTML
    const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi;
    const textEmails = bodyText.match(emailRegex) || [];
    const htmlEmails = htmlContent.match(emailRegex) || [];
    const emails = [...new Set([...textEmails, ...htmlEmails])];

    emails.forEach(email => {
      email = email.toLowerCase().trim();

      // Filter out common generic/spam emails (but keep example.com for testing)
      const isSpam = /no-?reply|donotreply|wordpress/i.test(email);
      if (!isSpam && !detectedEmails.includes(email)) {
        detectedEmails.push(email);
        hasDirectEmail = true;

        // Check if it's an owner/founder email
        const localPart = email.split('@')[0];
        if (/owner|ceo|founder|president|director/i.test(localPart)) {
          signals.push(`Decision maker email found: ${email}`);
          ownerName = ownerName || extractNameFromEmail(localPart);
        } else if (!/info|contact|hello|support|sales|admin/i.test(localPart)) {
          signals.push(`Direct email found: ${email}`);
        } else {
          signals.push(`Generic email: ${email}`);
        }
      }
    });

    // Phone extraction
    const phoneRegex = /(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
    const phones = bodyText.match(phoneRegex) || [];

    phones.forEach(phone => {
      phone = phone.trim();
      if (!detectedPhones.includes(phone)) {
        detectedPhones.push(phone);
        hasDirectPhone = true;
      }
    });

    if (detectedPhones.length > 0 && !signals.some(s => s.includes('phone'))) {
      signals.push(`${detectedPhones.length} phone number${detectedPhones.length > 1 ? 's' : ''} found`);
    }

    // Owner/CEO name extraction (from About or Team pages)
    if (page.type === 'about' || page.type === 'team') {
      const ownerPatterns = [
        /(?:owner|ceo|founder|president|director):\s*([A-Z][a-z]+\s+[A-Z][a-z]+)/gi,
        /(?:founded by|started by)\s+([A-Z][a-z]+\s+[A-Z][a-z]+)/gi,
        /<h[1-6][^>]*>\s*([A-Z][a-z]+\s+[A-Z][a-z]+)\s*<\/h[1-6]>/gi
      ];

      ownerPatterns.forEach(pattern => {
        const matches = bodyText.matchAll(pattern);
        for (const match of matches) {
          const name = match[1].trim();
          if (name.split(' ').length >= 2) { // At least first and last name
            ownerName = name;
            signals.push(`${page.type === 'team' ? 'Team' : 'About'} page mentions: ${name}`);
            break;
          }
        }
      });

      // Look for owner bio sections
      const bioSelectors = [
        '.owner-bio',
        '.founder-bio',
        '.ceo-bio',
        '[class*="owner"]',
        '[class*="founder"]'
      ];

      bioSelectors.forEach(selector => {
        const bio = $(selector).first().text();
        if (bio.length > 50) {
          signals.push('Owner/founder bio section found');
        }
      });
    }

    // Check for contact form (less direct)
    const contactForm = $('form').filter((i, el) => {
      const formText = $(el).text().toLowerCase();
      return formText.includes('contact') ||
             formText.includes('message') ||
             formText.includes('inquiry');
    }).length > 0;

    if (contactForm && page.type === 'contact') {
      signals.push('Contact form found (less direct access)');
    }
  });

  // Determine confidence
  let confidence = 'low';
  if ((hasDirectEmail || hasDirectPhone) && ownerName) confidence = 'high';
  else if (hasDirectEmail || hasDirectPhone) confidence = 'medium';

  return {
    hasDirectEmail,
    hasDirectPhone,
    ownerName,
    signals,
    confidence
  };
}

/**
 * Extract premium features
 */
function extractPremiumFeatures(pages) {
  const signals = [];
  const detected = [];

  // Feature detection patterns
  const featurePatterns = {
    live_chat: [
      'intercom',
      'drift',
      'tawk.to',
      'crisp.chat',
      'zendesk',
      'livechat',
      'olark',
      'chatra',
      'tidio',
      '.live-chat',
      '#live-chat'
    ],
    booking_system: [
      'calendly',
      'acuity',
      'schedulicity',
      'booksy',
      'setmore',
      'simplybook',
      'appointlet',
      'youcanbook',
      'schedule',
      '.booking-widget'
    ],
    ecommerce: [
      'shopify',
      'woocommerce',
      'magento',
      'bigcommerce',
      'add-to-cart',
      'shopping-cart',
      '.product-card',
      '.cart-icon',
      'buy-now'
    ],
    member_portal: [
      'member-login',
      'client-portal',
      'dashboard',
      'my-account',
      '.member-area',
      'memberstack',
      'memberspace'
    ],
    crm_integration: [
      'hubspot',
      'salesforce',
      'pipedrive',
      'zoho',
      'activecampaign'
    ],
    email_marketing: [
      'mailchimp',
      'convertkit',
      'klaviyo',
      'constant-contact',
      'newsletter-signup',
      '.email-signup'
    ],
    payment_processor: [
      'stripe',
      'paypal',
      'square',
      'braintree',
      'authorize.net'
    ]
  };

  pages.forEach(page => {
    const $ = page.$;
    const html = $.html().toLowerCase();
    const bodyText = $('body').text().toLowerCase();

    // Check scripts and embeds
    $('script[src], iframe[src], link[href]').each((i, el) => {
      const src = ($(el).attr('src') || $(el).attr('href') || '').toLowerCase();

      Object.entries(featurePatterns).forEach(([feature, patterns]) => {
        patterns.forEach(pattern => {
          if (src.includes(pattern)) {
            if (!detected.includes(feature)) {
              detected.push(feature);
              signals.push(`${feature.replace('_', ' ')} detected: ${pattern}`);
            }
          }
        });
      });
    });

    // Check HTML content
    Object.entries(featurePatterns).forEach(([feature, patterns]) => {
      patterns.forEach(pattern => {
        if (pattern.startsWith('.') || pattern.startsWith('#')) {
          // CSS selector
          if ($(pattern).length > 0 && !detected.includes(feature)) {
            detected.push(feature);
            signals.push(`${feature.replace('_', ' ')} element found`);
          }
        } else {
          // Text/attribute search
          if ((html.includes(pattern) || bodyText.includes(pattern)) && !detected.includes(feature)) {
            detected.push(feature);
            signals.push(`${feature.replace('_', ' ')} detected: ${pattern}`);
          }
        }
      });
    });
  });

  // Determine budget indicator
  let budgetIndicator = 'low';
  if (detected.length >= 4) budgetIndicator = 'high';
  else if (detected.length >= 2) budgetIndicator = 'medium';
  else if (detected.length >= 1) budgetIndicator = 'medium'; // Any premium feature indicates medium budget

  return {
    detected,
    signals,
    budgetIndicator
  };
}

/**
 * Count page types analyzed
 */
function countPageTypes(pages) {
  const counts = {
    about: 0,
    services: 0,
    team: 0,
    contact: 0,
    pricing: 0,
    portfolio: 0,
    blog: 0,
    locations: 0,
    testimonials: 0,
    other: 0
  };

  pages.forEach(page => {
    const type = page.type || 'other';
    if (counts.hasOwnProperty(type)) {
      counts[type]++;
    } else {
      counts.other++;
    }
  });

  return counts;
}

/**
 * Helper: Parse date from various formats
 */
function parseDate(dateStr) {
  try {
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      const year = date.getFullYear();
      // Sanity check: reasonable year range
      if (year >= 2000 && year <= new Date().getFullYear()) {
        return date;
      }
    }
  } catch (e) {
    // Ignore parse errors
  }
  return null;
}

/**
 * Helper: Extract name from email local part
 */
function extractNameFromEmail(localPart) {
  // Split by common separators
  const parts = localPart.split(/[._-]/);

  // Capitalize each part
  const capitalized = parts
    .filter(p => p.length > 1)
    .map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase());

  if (capitalized.length >= 2) {
    return capitalized.slice(0, 2).join(' '); // First and last name
  }

  return null;
}

/**
 * Get empty profile (when no pages provided)
 */
function getEmptyProfile() {
  return {
    companySize: {
      employeeCount: null,
      locationCount: null,
      signals: [],
      confidence: 'none'
    },
    yearsInBusiness: {
      estimatedYears: null,
      foundedYear: null,
      signals: [],
      confidence: 'none'
    },
    pricingVisibility: {
      visible: false,
      priceRange: { min: null, max: null },
      signals: [],
      confidence: 'none'
    },
    contentFreshness: {
      lastUpdate: null,
      blogActive: false,
      postCount: 0,
      signals: [],
      confidence: 'none'
    },
    decisionMakerAccessibility: {
      hasDirectEmail: false,
      hasDirectPhone: false,
      ownerName: null,
      signals: [],
      confidence: 'none'
    },
    premiumFeatures: {
      detected: [],
      signals: [],
      budgetIndicator: 'unknown'
    },
    pageTypes: {
      about: 0,
      services: 0,
      team: 0,
      contact: 0,
      pricing: 0,
      portfolio: 0,
      blog: 0,
      locations: 0,
      testimonials: 0,
      other: 0
    },
    metadata: {
      totalPagesAnalyzed: 0,
      homepageFound: false,
      timestamp: new Date().toISOString()
    }
  };
}

/**
 * Export individual extraction functions for testing
 */
export {
  detectPageType,
  extractCompanySize,
  extractYearsInBusiness,
  extractPricingVisibility,
  extractContentFreshness,
  extractDecisionMakerAccessibility,
  extractPremiumFeatures
};
