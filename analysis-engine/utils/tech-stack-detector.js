/**
 * Enhanced Tech Stack Detection Module
 * Combines pattern-based detection with AI-powered analysis
 * for comprehensive technology identification
 */

import { callAI, parseJSONResponse } from '../../database-tools/shared/ai-client.js';

/**
 * Detect tech stack using both pattern matching and AI analysis
 * @param {Object} page - Playwright page object
 * @param {string} html - HTML content of the page
 * @param {Object} headers - Response headers
 * @returns {Object} Detected technologies with confidence scores
 */
export async function detectTechStack(page, html = null, headers = {}) {
  try {
    // Get HTML if not provided
    if (!html) {
      html = await page.content();
    }

    // Phase 1: Pattern-based detection
    const patternDetection = await detectWithPatterns(page, html, headers);

    // Phase 2: Extract unknown scripts and resources
    const unknownResources = await extractUnknownResources(page, html, patternDetection);

    // Phase 3: AI-powered analysis for unknowns
    let aiDetection = { identified: [], guesses: [] };
    if (unknownResources.scripts.length > 0 || unknownResources.meta.length > 0) {
      aiDetection = await detectWithAI(unknownResources, html.substring(0, 5000)); // First 5KB of HTML
    }

    // Phase 4: Combine results
    return combineResults(patternDetection, aiDetection);

  } catch (error) {
    console.error('Tech stack detection error:', error);
    return {
      cms: 'Unknown',
      frameworks: [],
      analytics: [],
      libraries: [],
      payments: [],
      cdn: null,
      aiGuesses: [],
      error: error.message
    };
  }
}

/**
 * Pattern-based detection for known technologies
 */
async function detectWithPatterns(page, html, headers) {
  const detected = {
    cms: null,
    frameworks: [],
    analytics: [],
    libraries: [],
    payments: [],
    cdn: null,
    hosting: null,
    ecommerce: [],
    marketing: [],
    widgets: []
  };

  // CMS Detection
  if (html.includes('wp-content') || html.includes('wordpress')) {
    detected.cms = { name: 'WordPress', confidence: 100 };
  } else if (html.includes('shopify')) {
    detected.cms = { name: 'Shopify', confidence: 100 };
    detected.ecommerce.push({ name: 'Shopify', confidence: 100 });
  } else if (html.includes('squarespace')) {
    detected.cms = { name: 'Squarespace', confidence: 100 };
  } else if (html.includes('wix.com') || html.includes('wixsite')) {
    detected.cms = { name: 'Wix', confidence: 100 };
  } else if (html.includes('webflow')) {
    detected.cms = { name: 'Webflow', confidence: 100 };
  } else if (html.includes('hubspot')) {
    detected.cms = { name: 'HubSpot CMS', confidence: 95 };
  } else if (html.includes('/ghost/')) {
    detected.cms = { name: 'Ghost', confidence: 95 };
  } else if (html.includes('drupal')) {
    detected.cms = { name: 'Drupal', confidence: 95 };
  } else if (html.includes('joomla')) {
    detected.cms = { name: 'Joomla', confidence: 95 };
  }

  // JavaScript Frameworks Detection
  const jsDetection = await page.evaluate(() => {
    const frameworks = [];

    // React
    if (window.React || document.querySelector('[data-reactroot]') ||
        window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
      frameworks.push({ name: 'React', confidence: 100 });
    }

    // Vue
    if (window.Vue || document.querySelector('[data-v-]') ||
        window.__VUE__ || window.__VUE_DEVTOOLS_GLOBAL_HOOK__) {
      frameworks.push({ name: 'Vue.js', confidence: 100 });
    }

    // Angular
    if (window.angular || document.querySelector('[ng-app]') ||
        window.ng || document.querySelector('.ng-binding')) {
      frameworks.push({ name: 'Angular', confidence: 100 });
    }

    // jQuery
    if (window.jQuery || window.$) {
      frameworks.push({ name: 'jQuery', confidence: 100 });
    }

    // Next.js
    if (window.__NEXT_DATA__ || document.querySelector('[data-nextjs]')) {
      frameworks.push({ name: 'Next.js', confidence: 100 });
    }

    // Gatsby
    if (document.querySelector('[data-gatsby]') || window.___gatsby) {
      frameworks.push({ name: 'Gatsby', confidence: 100 });
    }

    // Nuxt
    if (window.__NUXT__ || window.$nuxt) {
      frameworks.push({ name: 'Nuxt.js', confidence: 100 });
    }

    return frameworks;
  });

  detected.frameworks = jsDetection;

  // Analytics Detection
  if (html.includes('google-analytics.com') || html.includes('gtag(') || html.includes('ga.js')) {
    detected.analytics.push({ name: 'Google Analytics', confidence: 100 });
  }
  if (html.includes('googletagmanager.com') || html.includes('gtm.js')) {
    detected.analytics.push({ name: 'Google Tag Manager', confidence: 100 });
  }
  if (html.includes('facebook.com/tr') || html.includes('fbevents.js')) {
    detected.analytics.push({ name: 'Facebook Pixel', confidence: 100 });
  }
  if (html.includes('hotjar.com') || html.includes('_hjSettings')) {
    detected.analytics.push({ name: 'Hotjar', confidence: 100 });
  }
  if (html.includes('segment.com') || html.includes('analytics.js')) {
    detected.analytics.push({ name: 'Segment', confidence: 90 });
  }
  if (html.includes('matomo') || html.includes('piwik')) {
    detected.analytics.push({ name: 'Matomo', confidence: 95 });
  }
  if (html.includes('clarity.ms') || html.includes('microsoft clarity')) {
    detected.analytics.push({ name: 'Microsoft Clarity', confidence: 100 });
  }

  // Payment Processing Detection
  if (html.includes('stripe.com') || html.includes('stripe.js')) {
    detected.payments.push({ name: 'Stripe', confidence: 100 });
  }
  if (html.includes('paypal.com') || html.includes('paypalobjects')) {
    detected.payments.push({ name: 'PayPal', confidence: 100 });
  }
  if (html.includes('square') || html.includes('squarecdn.com')) {
    detected.payments.push({ name: 'Square', confidence: 95 });
  }
  if (html.includes('razorpay')) {
    detected.payments.push({ name: 'Razorpay', confidence: 95 });
  }

  // CDN Detection from headers
  if (headers['x-powered-by']) {
    const powered = headers['x-powered-by'].toLowerCase();
    if (powered.includes('express')) {
      detected.frameworks.push({ name: 'Express.js', confidence: 100 });
    }
  }
  if (headers['server']) {
    const server = headers['server'].toLowerCase();
    if (server.includes('cloudflare')) {
      detected.cdn = { name: 'Cloudflare', confidence: 100 };
    } else if (server.includes('cloudfront')) {
      detected.cdn = { name: 'AWS CloudFront', confidence: 100 };
    } else if (server.includes('fastly')) {
      detected.cdn = { name: 'Fastly', confidence: 100 };
    } else if (server.includes('akamai')) {
      detected.cdn = { name: 'Akamai', confidence: 100 };
    } else if (server.includes('nginx')) {
      detected.hosting = { name: 'Nginx', confidence: 90 };
    } else if (server.includes('apache')) {
      detected.hosting = { name: 'Apache', confidence: 90 };
    }
  }

  // E-commerce platforms
  if (html.includes('woocommerce')) {
    detected.ecommerce.push({ name: 'WooCommerce', confidence: 100 });
  }
  if (html.includes('bigcommerce')) {
    detected.ecommerce.push({ name: 'BigCommerce', confidence: 95 });
  }
  if (html.includes('magento')) {
    detected.ecommerce.push({ name: 'Magento', confidence: 95 });
  }

  // Marketing & CRM Tools
  if (html.includes('hubspot')) {
    detected.marketing.push({ name: 'HubSpot', confidence: 95 });
  }
  if (html.includes('marketo')) {
    detected.marketing.push({ name: 'Marketo', confidence: 95 });
  }
  if (html.includes('mailchimp')) {
    detected.marketing.push({ name: 'Mailchimp', confidence: 95 });
  }
  if (html.includes('klaviyo')) {
    detected.marketing.push({ name: 'Klaviyo', confidence: 95 });
  }

  // Chat & Support Widgets
  if (html.includes('intercom')) {
    detected.widgets.push({ name: 'Intercom', confidence: 95 });
  }
  if (html.includes('drift.com')) {
    detected.widgets.push({ name: 'Drift', confidence: 95 });
  }
  if (html.includes('zendesk')) {
    detected.widgets.push({ name: 'Zendesk', confidence: 95 });
  }
  if (html.includes('tawk.to')) {
    detected.widgets.push({ name: 'Tawk.to', confidence: 95 });
  }
  if (html.includes('livechat')) {
    detected.widgets.push({ name: 'LiveChat', confidence: 95 });
  }

  // CSS Frameworks
  if (html.includes('bootstrap')) {
    detected.libraries.push({ name: 'Bootstrap', confidence: 90 });
  }
  if (html.includes('tailwind')) {
    detected.libraries.push({ name: 'Tailwind CSS', confidence: 95 });
  }
  if (html.includes('bulma')) {
    detected.libraries.push({ name: 'Bulma', confidence: 90 });
  }

  return detected;
}

/**
 * Extract unknown scripts and resources that weren't identified
 */
async function extractUnknownResources(page, html, knownTech) {
  const unknowns = {
    scripts: [],
    meta: [],
    headers: []
  };

  // Extract all script sources
  const scripts = await page.evaluate(() => {
    return Array.from(document.scripts)
      .map(s => s.src)
      .filter(src => src && !src.startsWith('data:'));
  });

  // Filter out known scripts
  const knownDomains = [
    'google', 'facebook', 'stripe', 'paypal', 'hotjar',
    'segment', 'cloudflare', 'jquery', 'bootstrap',
    'googleapis', 'gstatic', 'jsdelivr', 'unpkg'
  ];

  scripts.forEach(src => {
    const isKnown = knownDomains.some(domain => src.toLowerCase().includes(domain));
    if (!isKnown) {
      // Extract just the domain/path for privacy
      try {
        const url = new URL(src);
        unknowns.scripts.push({
          domain: url.hostname,
          path: url.pathname.substring(0, 50) // First 50 chars of path
        });
      } catch (e) {
        // Invalid URL, skip
      }
    }
  });

  // Extract meta tags
  const metaTags = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('meta'))
      .filter(m => m.name || m.property)
      .map(m => ({
        name: m.name || m.property,
        content: (m.content || '').substring(0, 100)
      }))
      .filter(m => m.name && !['viewport', 'description', 'keywords'].includes(m.name.toLowerCase()));
  });

  unknowns.meta = metaTags.slice(0, 10); // Limit to 10 meta tags

  return unknowns;
}

/**
 * Use AI to analyze unknown technologies
 */
async function detectWithAI(unknownResources, htmlSnippet) {
  if (unknownResources.scripts.length === 0 && unknownResources.meta.length === 0) {
    return { identified: [], guesses: [] };
  }

  try {
    const response = await callAI({
      model: 'gpt-5',
      systemPrompt: `You are a web technology expert. Analyze these unidentified web resources and provide your best assessment of what technologies they represent.

Return a JSON object with this structure:
{
  "identified": [
    {
      "name": "Technology Name",
      "category": "analytics|payment|crm|widget|framework|library|cdn|monitoring|security|other",
      "confidence": 85,
      "reasoning": "Brief explanation"
    }
  ],
  "guesses": [
    {
      "name": "Possible Technology",
      "category": "category",
      "confidence": 50,
      "reasoning": "Why this might be the technology"
    }
  ]
}

Categories:
- analytics: tracking, analytics tools
- payment: payment processors
- crm: customer relationship management
- widget: chat, support, booking widgets
- framework: JavaScript/CSS frameworks
- library: code libraries
- cdn: content delivery networks
- monitoring: error tracking, performance monitoring
- security: security tools, captcha
- other: anything else

Only return technologies you can identify with reasonable confidence (>40%).`,
      userPrompt: `Analyze these unidentified web resources:

Scripts: ${JSON.stringify(unknownResources.scripts.slice(0, 10))}

Meta tags: ${JSON.stringify(unknownResources.meta.slice(0, 10))}

HTML indicators (first 5KB):
${htmlSnippet}

Identify the technologies being used.`,
      jsonMode: true,
      temperature: 0.3
    });

    const parsed = await parseJSONResponse(response.content);

    // Return parsed result with cost metadata
    return {
      identified: parsed.identified || [],
      guesses: parsed.guesses || [],
      _meta: {
        cost: response.cost || 0,
        tokens: response.total_tokens || response.tokens || 0,
        prompt_tokens: response.prompt_tokens || 0,
        completion_tokens: response.completion_tokens || 0,
        model: response.model || 'gpt-5',
        provider: response.provider || 'openai'
      }
    };
  } catch (error) {
    console.error('AI tech detection failed:', error);
    return { identified: [], guesses: [], _meta: { cost: 0, tokens: 0 } };
  }
}

/**
 * Combine pattern-based and AI detection results
 */
function combineResults(patternDetection, aiDetection) {
  const combined = {
    cms: patternDetection.cms?.name || 'Unknown',
    frameworks: [],
    analytics: [],
    libraries: [],
    payments: [],
    ecommerce: [],
    marketing: [],
    widgets: [],
    cdn: patternDetection.cdn?.name || null,
    hosting: patternDetection.hosting?.name || null,
    aiIdentified: [],
    aiGuesses: [],
    summary: {}
  };

  // Add pattern-detected technologies
  combined.frameworks = patternDetection.frameworks.map(f => f.name);
  combined.analytics = patternDetection.analytics.map(a => a.name);
  combined.libraries = patternDetection.libraries.map(l => l.name);
  combined.payments = patternDetection.payments.map(p => p.name);
  combined.ecommerce = patternDetection.ecommerce.map(e => e.name);
  combined.marketing = patternDetection.marketing.map(m => m.name);
  combined.widgets = patternDetection.widgets.map(w => w.name);

  // Add AI-identified technologies
  if (aiDetection.identified) {
    aiDetection.identified.forEach(tech => {
      if (tech.confidence >= 70) {
        // High confidence - add to appropriate category
        switch (tech.category) {
          case 'analytics':
            if (!combined.analytics.includes(tech.name)) {
              combined.analytics.push(tech.name);
            }
            break;
          case 'payment':
            if (!combined.payments.includes(tech.name)) {
              combined.payments.push(tech.name);
            }
            break;
          case 'widget':
            if (!combined.widgets.includes(tech.name)) {
              combined.widgets.push(tech.name);
            }
            break;
          case 'framework':
            if (!combined.frameworks.includes(tech.name)) {
              combined.frameworks.push(tech.name);
            }
            break;
          case 'library':
            if (!combined.libraries.includes(tech.name)) {
              combined.libraries.push(tech.name);
            }
            break;
          case 'crm':
          case 'marketing':
            if (!combined.marketing.includes(tech.name)) {
              combined.marketing.push(tech.name);
            }
            break;
        }
      }
      combined.aiIdentified.push(tech);
    });
  }

  // Add AI guesses for transparency
  if (aiDetection.guesses) {
    combined.aiGuesses = aiDetection.guesses;
  }

  // Create summary
  combined.summary = {
    totalTechnologies: combined.frameworks.length + combined.analytics.length +
                      combined.libraries.length + combined.payments.length +
                      combined.ecommerce.length + combined.marketing.length +
                      combined.widgets.length,
    hasAnalytics: combined.analytics.length > 0,
    hasPaymentProcessing: combined.payments.length > 0,
    hasEcommerce: combined.ecommerce.length > 0,
    hasChatWidget: combined.widgets.length > 0,
    hasMarketing: combined.marketing.length > 0,
    isModernStack: combined.frameworks.some(f => ['React', 'Vue.js', 'Angular', 'Next.js'].includes(f)),
    techComplexity: combined.frameworks.length + combined.libraries.length > 5 ? 'High' :
                   combined.frameworks.length + combined.libraries.length > 2 ? 'Medium' : 'Low'
  };

  return combined;
}

/**
 * Format tech stack for display
 */
export function formatTechStack(techStack) {
  if (!techStack) return 'Unknown';

  const parts = [];

  if (techStack.cms && techStack.cms !== 'Unknown') {
    parts.push(`Platform: ${techStack.cms}`);
  }

  if (techStack.frameworks && techStack.frameworks.length > 0) {
    parts.push(`Frameworks: ${techStack.frameworks.join(', ')}`);
  }

  if (techStack.analytics && techStack.analytics.length > 0) {
    parts.push(`Analytics: ${techStack.analytics.join(', ')}`);
  }

  if (techStack.payments && techStack.payments.length > 0) {
    parts.push(`Payments: ${techStack.payments.join(', ')}`);
  }

  if (techStack.cdn) {
    parts.push(`CDN: ${techStack.cdn}`);
  }

  return parts.length > 0 ? parts.join(' | ') : 'Unknown';
}

export default detectTechStack;