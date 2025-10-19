/**
 * Dynamic AI Prompt Builder
 * Builds customized prompts based on detected website characteristics
 */

/**
 * Build a dynamic, context-aware prompt for AI analysis
 * @param {Object} data - Website data from scraping
 * @param {Object} industry - Detected industry info
 * @param {Object} seoResults - SEO audit results
 * @param {string} url - Website URL
 * @param {number} loadTime - Page load time in ms
 * @param {Object} visualResults - Visual analysis results (optional)
 * @returns {string} Fully constructed prompt
 */
export function buildAnalysisPrompt(data, industry, seoResults, url, loadTime, visualResults = null) {
  const builder = new PromptBuilder();
  const hasVisualAnalysis = !!(visualResults && visualResults.critiques && visualResults.critiques.length > 0);

  // 1. Base context - always included
  builder.addSection('base', buildBaseContext(url, data, loadTime));

  // 2. Industry-specific context - if detected
  if (industry) {
    builder.addSection('industry', buildIndustryContext(industry, data, hasVisualAnalysis));
  }

  // 3. Feature-based context - dynamic based on what we detect
  builder.addSection('features', buildFeatureContext(data));

  // 4. SEO context - if module enabled
  if (seoResults) {
    builder.addSection('seo', buildSEOContext(seoResults));
  }

  // 5. Business type context - e-commerce, local, service, etc.
  const businessType = detectBusinessType(data);
  builder.addSection('businessType', buildBusinessTypeContext(businessType, data));

  // 6. Mobile context - responsiveness issues
  if (data.viewport) {
    builder.addSection('mobile', buildMobileContext(data));
  }

  // 7. Instructions - tailored to what we detected
  builder.addSection('instructions', buildInstructions(industry, seoResults, businessType, data, hasVisualAnalysis));

  // 8. Output format
  builder.addSection('format', buildOutputFormat(industry, seoResults));

  return builder.build();
}

/**
 * Prompt builder class - assembles sections
 */
class PromptBuilder {
  constructor() {
    this.sections = {};
  }

  addSection(name, content) {
    if (content && content.trim()) {
      this.sections[name] = content;
    }
  }

  build() {
    return Object.values(this.sections).join('\n\n');
  }
}

/**
 * Build base context section
 */
function buildBaseContext(url, data, loadTime) {
  const pagesText = data.pagesAnalyzed > 1
    ? `${data.pagesAnalyzed} pages (homepage + ${data.pagesAnalyzed - 1} additional pages)`
    : '1 page (homepage only)';

  // Build data points array - put load time LAST to de-emphasize it
  const dataPoints = [
    `URL: ${url}`,
    `Pages Analyzed: ${pagesText}`,
    `Title: ${data.title}`,
    `Meta Description: ${data.metaDescription || 'Missing'}`,
    `H1 Tags: ${data.h1Tags.join(', ') || 'None found'}`,
    `Page Load Time: ${loadTime}ms  ← Performance metric (not always the #1 priority)`
  ];

  return `You are a professional web design consultant analyzing a website for potential improvements.

WEBSITE OVERVIEW:
${dataPoints.join('\n')}

CRITICAL INSTRUCTION: 
Load time is listed LAST for a reason - it's just ONE metric among many. Look at the FULL picture:
- What's the actual business goal? (conversions, trust, discovery, engagement?)
- What's hurting that goal the MOST? (maybe it's unclear messaging, not speed)
- What would a visitor notice FIRST? (maybe broken layout, not milliseconds)

Don't default to "slow page = problem #1" unless the data truly shows performance is the main barrier to success.`;
}

/**
 * Build industry-specific context
 */
function buildIndustryContext(industry, data, hasVisualAnalysis = false) {
  const industryName = industry.specific;
  const industryType = industry.broad;

  // Get industry-specific checkpoints
  const checkpoints = getIndustryCheckpoints(industryName, data, hasVisualAnalysis);

  return `INDUSTRY CONTEXT:
Detected Industry: ${industryName} (${industryType})
Confidence: ${industry.confidence}
Keywords Found: ${industry.keywords.join(', ')}

INDUSTRY-SPECIFIC ANALYSIS POINTS:
${checkpoints.map((point, i) => `${i + 1}. ${point}`).join('\n')}

Focus your critique on issues that would specifically hurt a ${industryName} business's ability to convert visitors.`;
}

/**
 * Get industry-specific checkpoints based on what we detected
 */
function getIndustryCheckpoints(industry, data, hasVisualAnalysis = false) {
  const checkpoints = [];

  const industryRules = {
    'Web Design Agency': [
      data.hasPortfolio ?
        (data.portfolioItemCount && data.portfolioItemCount > 0
          ? (hasVisualAnalysis 
              ? `Portfolio section with ${data.portfolioItemCount} clickable project links detected - evaluate if clicking into individual projects reveals full case studies with outcomes, screenshots, and technical details`
              : `Portfolio section with ${data.portfolioItemCount} clickable project links detected - assume individual projects likely contain case studies; focus on whether the OVERVIEW shows enough trust signals (client logos, brief results) to encourage clicks`
            )
          : (hasVisualAnalysis
              ? 'Portfolio section detected but no clickable project links found - verify if case studies exist or if section is just text/labels'
              : 'Portfolio section detected but structure unclear - check if individual projects are accessible via links'
            )
        ) :
        'CRITICAL: No portfolio section detected - essential for web design agencies',
      data.hasTestimonials ?
        'Testimonials section detected - check for specificity and credibility in the text' :
        'Missing testimonials - important for building trust in creative services',
      hasVisualAnalysis 
        ? 'Evaluate the sophistication of the site\'s own design (agencies are judged by their own site)'
        : 'Review the messaging and value proposition (visual design analysis not enabled)',
      'Check for clear service packages or pricing transparency',
      data.hasChat || data.hasPhoneNumber || data.hasContactForm ?
        'Contact methods available - evaluate accessibility and conversion flow' :
        'CRITICAL: Difficult to contact - major barrier for service businesses'
    ],

    'Restaurant': [
      hasVisualAnalysis 
        ? 'Menu visibility and food photography quality (critical for restaurants)'
        : 'Menu visibility and location in navigation (visual analysis not enabled - focus on menu text and organization)',
      'Hours and location prominence (check if they are in text)',
      'Online ordering or reservation system integration (look for links/forms)',
      'Mobile responsiveness indicators (viewport meta tag, responsive design patterns)',
      data.hasPhoneNumber ?
        'Phone number visible - verify it is a clickable tel: link for mobile users' :
        'CRITICAL: No phone number detected - essential for restaurants',
      'Check for Google Maps integration in HTML or links to directions'
    ],

    'Law Firm': [
      'Trust signals and credentials (bar associations, years in practice)',
      'Practice area clarity and specialization messaging',
      'Attorney profiles with photos and backgrounds',
      'ADA compliance (especially important for legal sites)',
      data.hasContactForm ?
        'Contact form exists - evaluate for confidentiality messaging' :
        'Missing contact form - standard for legal consultations',
      'Case results or client testimonials (if ethically permitted)'
    ],

    'E-commerce': [
      'Product photography quality and consistency',
      'Checkout flow and cart functionality',
      'Trust badges, security seals, and payment options',
      'Product search and filtering capabilities',
      'Shipping information clarity',
      data.hasChat ?
        'Live chat available - evaluate for support and sales assistance' :
        'No live chat - could help reduce cart abandonment',
      'Return policy visibility'
    ],

    'Healthcare/Dental': [
      'HIPAA compliance messaging and security',
      'Insurance and payment information clarity',
      'Online scheduling or appointment booking',
      data.hasPhoneNumber ?
        'Phone number visible - check for emergency contact prominence' :
        'CRITICAL: No phone number - essential for medical practices',
      'Provider credentials and specializations',
      'Patient testimonials and reviews',
      'New patient information and forms'
    ],

    'Home Services': [
      'Service area and coverage map',
      'Before/after photos or project gallery',
      data.hasPhoneNumber ?
        'Phone number visible - check for 24/7 emergency messaging if applicable' :
        'CRITICAL: No phone number - essential for service businesses',
      'Licensing, insurance, and credentials',
      'Pricing transparency or quote request form',
      'Customer reviews and ratings',
      'Response time expectations'
    ],

    'SaaS/Software': [
      'Product demo or free trial accessibility',
      'Pricing page clarity and plan comparison',
      'Feature benefits (not just feature lists)',
      'Use cases and customer success stories',
      data.hasChat ?
        'Live chat available - evaluate for sales and support' :
        'No live chat - important for SaaS visitor engagement',
      'Security and compliance badges',
      'Integration ecosystem or API documentation'
    ],

    'Real Estate': [
      'Property listings with high-quality photos',
      'Search and filter functionality',
      'Agent profiles and contact information',
      'Neighborhood or area information',
      'Virtual tours or video walkthroughs',
      data.hasContactForm ?
        'Contact form exists - evaluate for property inquiry flow' :
        'Missing inquiry form - critical for real estate',
      'Market data or recently sold properties'
    ]
  };

  // Get specific checkpoints or fall back to generic
  const specificCheckpoints = industryRules[industry] || [
    `Evaluate trust signals appropriate for ${industry} businesses`,
    `Check for industry-standard features expected by ${industry} customers`,
    `Assess whether the site builds credibility for a ${industry} provider`
  ];

  return specificCheckpoints;
}

/**
 * Build feature-based context (what we actually detected)
 */
function buildFeatureContext(data) {
  const features = [];

  // Contact methods
  const contactMethods = [];
  if (data.hasContactForm) contactMethods.push('contact form');
  if (data.hasPhoneNumber) contactMethods.push('phone number');
  if (data.hasChat) contactMethods.push('live chat');

  if (contactMethods.length > 0) {
    features.push(`Contact Methods: ${contactMethods.join(', ')}`);
  } else {
    features.push(`⚠️ Contact Methods: NONE DETECTED - critical conversion issue`);
  }

  // Portfolio/Work
  if (data.hasPortfolio) {
    features.push(`Portfolio/Work Section: Detected - evaluate quality and presentation`);
  }

  // Social Proof
  if (data.hasTestimonials) {
    features.push(`Testimonials: Present - check for specificity and credibility`);
  }

  // CTAs
  if (data.hasCTA) {
    features.push(`Call-to-Action: Detected - evaluate prominence and clarity`);
  } else {
    features.push(`⚠️ Call-to-Action: None detected - conversion optimization needed`);
  }

  // Images
  if (data.imageCount > 0) {
    features.push(`Images: ${data.imageCount} found across pages`);
  }

  return `DETECTED FEATURES:
${features.join('\n')}`;
}

/**
 * Build SEO context
 */
function buildSEOContext(seoResults) {
  const issues = [];

  if (!seoResults.sitemap.exists) {
    issues.push('⚠️ Missing sitemap.xml');
  }

  if (!seoResults.robotsTxt.exists) {
    issues.push('⚠️ Missing robots.txt');
  }

  if (!seoResults.structuredData.hasAny) {
    issues.push('⚠️ No structured data detected');
  }

  if (seoResults.imageAltTags.percentage < 50) {
    issues.push(`⚠️ ${seoResults.imageAltTags.percentage}% of images missing alt tags`);
  }

  if (!seoResults.canonicalTag.hasTag) {
    issues.push('⚠️ No canonical tag');
  }

  return `TECHNICAL SEO ANALYSIS:
${issues.length > 0 ? issues.join('\n') : '✓ No major technical SEO issues detected'}

Pay special attention to SEO issues when forming your critique.`;
}

/**
 * Detect business type from features
 */
function detectBusinessType(data) {
  const text = data.bodyText.toLowerCase();

  // E-commerce signals
  if (text.includes('add to cart') || text.includes('shop now') || text.includes('free shipping')) {
    return 'ecommerce';
  }

  // Local business signals
  if (text.includes('visit us') || text.includes('our location') || text.includes('directions') ||
      (data.hasPhoneNumber && (text.includes('call us') || text.includes('schedule')))) {
    return 'local';
  }

  // SaaS/Service signals
  if (text.includes('free trial') || text.includes('get started') || text.includes('pricing plans') ||
      text.includes('sign up')) {
    return 'saas';
  }

  // Portfolio/Agency signals
  if (data.hasPortfolio || text.includes('our work') || text.includes('case studies')) {
    return 'agency';
  }

  // Service business
  if (text.includes('book now') || text.includes('schedule appointment') || text.includes('consultation')) {
    return 'service';
  }

  return 'general';
}

/**
 * Build business type context
 */
function buildBusinessTypeContext(businessType, data) {
  const contexts = {
    'ecommerce': `BUSINESS TYPE: E-commerce
Key Focus Areas:
- Product presentation and photography quality
- Shopping experience and checkout friction
- Trust signals (security badges, payment options, reviews)
- Mobile shopping experience (critical for e-commerce)
- Cart abandonment prevention`,

    'local': `BUSINESS TYPE: Local Business
Key Focus Areas:
- Contact information prominence (phone, address, hours)
- Google Maps integration and directions
- Mobile experience (most local searches are mobile)
- Local SEO signals (NAP consistency, location keywords)
- Quick access to essential info (hours, phone, location)`,

    'saas': `BUSINESS TYPE: SaaS/Software
Key Focus Areas:
- Clear value proposition above the fold
- Demo or free trial accessibility
- Pricing transparency
- Feature benefits vs. feature lists
- Social proof (customer logos, testimonials, case studies)
- Sign-up flow friction`,

    'agency': `BUSINESS TYPE: Agency/Creative Services
Key Focus Areas:
- Portfolio quality and presentation (site is the best advertisement)
- Case studies with measurable results
- Credibility signals (client logos, testimonials, awards)
- Clear service packages or process
- Lead capture and consultation booking flow`,

    'service': `BUSINESS TYPE: Service Business
Key Focus Areas:
- Appointment/booking ease
- Service descriptions and pricing clarity
- Provider credentials and expertise
- Customer testimonials and reviews
- Contact methods and response time expectations`,

    'general': `BUSINESS TYPE: General/Informational
Key Focus Areas:
- Clear purpose and value proposition
- User journey and navigation
- Content quality and organization
- Conversion goals (whatever they may be)
- Professional appearance and credibility`
  };

  return contexts[businessType] || contexts['general'];
}

/**
 * Build mobile context - adaptive based on severity
 */
function buildMobileContext(data) {
  const mobile = data.mobile || {};
  
  // Check if there are actual critical issues (not just optimizations)
  const mobileIssues = buildMobileCriticalIssues(data, mobile);
  
  // If no CRITICAL mobile issues, show brief summary
  if (!mobileIssues.hasCritical) {
    return `MOBILE CHECK (375x667 iPhone):
${mobileIssues.message}
Note: Mobile is 60%+ of traffic, but if you find bigger issues (value prop, trust, errors, etc.) prioritize those first.`;
  }
  
  // If mobile HAS critical issues, show detailed analysis
  const differences = [];
  if (data.h1Tags?.join(',') !== mobile.h1Tags?.join(',')) {
    differences.push(`⚠️ H1 tags differ: Desktop shows "${data.h1Tags?.[0] || 'none'}" but mobile shows "${mobile.h1Tags?.[0] || 'none'}"`);
  }
  if (data.hasContactForm && !mobile.hasContactForm) {
    differences.push(`⚠️ Contact form visible on desktop but HIDDEN on mobile`);
  }
  if (data.portfolioItemCount > 0 && mobile.portfolioItemCount === 0) {
    differences.push(`⚠️ Portfolio items visible on desktop (${data.portfolioItemCount}) but HIDDEN on mobile`);
  }
  
  let context = `MOBILE ANALYSIS (375x667 iPhone):
⚠️ CRITICAL MOBILE ISSUES DETECTED - 60%+ of traffic is mobile, these problems are blocking conversions.

${differences.length > 0 ? `Desktop vs Mobile Differences:\n${differences.join('\n')}\n` : ''}
Mobile Features Detected:
- Phone numbers: ${mobile.phoneNumbers?.length || 0}${mobile.phoneNumbers?.length > 0 ? ` (${mobile.phoneNumbers.join(', ')})` : ''}
- Click-to-call links: ${mobile.hasClickToCallLinks ? '✅ YES' : '❌ NO'}
- Mobile menu: ${mobile.hasMobileMenu ? '✅ Detected' : '❌ Missing'}
- Primary CTA: ${mobile.primaryCTASize ? `${mobile.primaryCTASize.width}×${mobile.primaryCTASize.height}px ${mobile.primaryCTASize.isTappable ? '✅' : '⚠️ Too small'}` : 'Not found'}
- CTAs above fold: ${mobile.visibleContentAboveFold?.ctaCount || 0}

Issues Found:
${mobileIssues.message}

Note: Use BUSINESS LANGUAGE when writing mobile critiques (see Requirements section).`;

  return context;
}

/**
 * Build list of mobile issues - categorized by severity
 * Only CRITICAL issues trigger the full mobile section
 */
function buildMobileCriticalIssues(desktop, mobile) {
  const critical = [];
  const optimizations = [];
  
  // CRITICAL: Navigation broken
  if (!mobile.hasMobileMenu) {
    critical.push(`🚨 No mobile menu/navigation detected - mobile visitors likely can't find important pages (broken navigation on phones)`);
  }
  
  // CRITICAL: Contact form hidden
  if (desktop.hasContactForm && !mobile.hasContactForm) {
    critical.push(`🚨 Contact form is visible on computers but HIDDEN on phones - mobile visitors can't reach you (this kills mobile lead generation)`);
  }
  
  // CRITICAL: Portfolio hidden
  if (desktop.portfolioItemCount > 0 && mobile.portfolioItemCount === 0) {
    critical.push(`🚨 Portfolio/work examples show on computers (${desktop.portfolioItemCount} items) but are HIDDEN on phones - mobile visitors can't see your work (credibility problem)`);
  }
  
  // CRITICAL: No CTAs above fold
  if (mobile.visibleContentAboveFold?.ctaCount === 0) {
    critical.push(`🚨 No clear next step visible on mobile screens - visitors land on your site and don't know what to do (no buttons or calls-to-action visible without scrolling)`);
  }
  
  // OPTIMIZATION: Phone not tappable (annoying but not broken)
  if (mobile.phoneNumbers?.length > 0 && !mobile.hasClickToCallLinks) {
    optimizations.push(`⚠️ Phone number(s) found: ${mobile.phoneNumbers.join(', ')} - but not tappable (mobile users have to copy/paste to call)`);
  }
  
  // OPTIMIZATION: CTA too small (annoying but not broken)
  if (mobile.primaryCTASize && !mobile.primaryCTASize.isTappable) {
    optimizations.push(`⚠️ Primary CTA button is only ${mobile.primaryCTASize.height}px tall - smaller than ideal for comfortable tapping`);
  }
  
  // Return status based on what we found
  if (critical.length === 0 && optimizations.length === 0) {
    return { hasCritical: false, message: '✅ No critical mobile issues detected - mobile experience appears solid' };
  }
  
  if (critical.length === 0) {
    // Only optimizations, not critical
    return { 
      hasCritical: false, 
      message: `✅ No critical mobile issues. Minor optimizations available:\n${optimizations.join('\n')}` 
    };
  }
  
  // Has critical issues
  const allIssues = [...critical, ...optimizations];
  return { 
    hasCritical: true, 
    message: allIssues.join('\n') 
  };
}

/**
 * Build tailored instructions
 */
function buildInstructions(industry, seoResults, businessType, data, hasVisualAnalysis = false) {
  let critiqueCount = 3; // Base general critiques
  let instructions = [];

  // Add industry-specific critiques if we detected industry
  if (industry) {
    critiqueCount += 2;
    instructions.push(`2 INDUSTRY-SPECIFIC issues for ${industry.specific} businesses`);
  }

  // Add SEO critiques if SEO module enabled
  if (seoResults) {
    critiqueCount += 2;
    instructions.push(`2 TECHNICAL SEO issues from the audit results`);
  }

  const additionalInstructions = instructions.length > 0
    ? ` PLUS ${instructions.join(' PLUS ')}`
    : '';

  // Build hallucination prevention rules based on what's enabled
  const visionRules = hasVisualAnalysis
    ? `✅ VISUAL ANALYSIS ENABLED - You CAN comment on:
   - Image quality, screenshots, visual design elements
   - Color schemes, contrast, spacing, layout
   - Portfolio image presentation, food photography, etc.
   - Button sizes and visibility
   - "Above the fold" content placement
   - Use the visual analysis data to inform your critiques`
    : `🚨 VISUAL ANALYSIS DISABLED - STRICT BOUNDARIES:

   ❌ YOU ABSOLUTELY CANNOT COMMENT ON:
   - Button sizes or visibility ("button is too small", "hard to see", "not visible")
   - Colors, contrast ("text is too light", "poor contrast", "color scheme")
   - Spacing, layout, visual hierarchy ("elements too close", "cluttered layout")
   - "Above the fold" content ("CTA not visible without scrolling")
   - Image quality or presence ("no screenshots", "missing images", "blurry photos")
   - Font sizes or typography ("text too small", "font hard to read")
   - Visual presentation ("looks unprofessional", "design is dated")

   ✅ YOU CAN ONLY COMMENT ON (HTML/TEXT ANALYSIS):
   - Missing information in HTML (no email found in code, no phone in text)
   - Page load speed/performance ({{loadTime}}ms)
   - Content clarity and messaging (unclear value prop in text)
   - Missing pages or broken navigation structure
   - Missing CTAs in the HTML code (not whether they're visible)
   - Trust signals presence in text (no testimonials in content)
   - SEO metadata (title tags, meta descriptions, H1 structure)

   SAFE PHRASING EXAMPLES:
   ✓ "No email address found in the HTML code"
   ✓ "Contact form detected but not in an obvious location in the navigation"
   ✓ "Portfolio section detected - worth verifying it includes visuals"

   BANNED PHRASING (VISUAL CRITIQUES):
   ✗ "Button is too small to click"
   ✗ "Contact form isn't visible above the fold"
   ✗ "Portfolio images are low quality"
   ✗ "Text contrast is poor"

   REMEMBER: You are analyzing HTML/TEXT only, NOT screenshots. You cannot see the page!`;

  return `YOUR TASK:
Identify exactly 3 GENERAL, HIGH-IMPACT issues${additionalInstructions}.

CRITICAL RULES TO PREVENT HALLUCINATIONS:
${visionRules}

COMPLIMENT SANDWICH STRUCTURE (CRITICAL):
You MUST follow this psychological approach for cold outreach:

1. START WITH A GENUINE COMPLIMENT (1-2 sentences)
   - Find something legitimately good about their site
   - Be specific - reference actual design, content, or functionality you observed
   ✓ "Your service descriptions are really clear and the portfolio layout looks professional"
   ✓ "The site loads fast and the mobile experience is smooth"
   ✓ "Love the clean design and the testimonials add great credibility"
   ✗ "Your website exists" (too generic, insincere)

2. MIDDLE: CONSTRUCTIVE FEEDBACK (2-3 specific issues with business impact)
   - This is where your critique goes
   - Focus on opportunities, not failures
   - Frame as "here's what could make it even better"

3. END WITH ENCOURAGEMENT (1 sentence)
   - Reinforce their strengths or potential
   - Leave them feeling positive and curious
   ✓ "You're clearly doing great work - these tweaks would just help more people find and trust you"
   ✓ "The foundation is solid, these changes would help you stand out even more"
   ✓ "With a few quick wins, this site could be converting way more leads"

THINK LIKE A HUMAN - this is the most important instruction of all.

CROSS-INDUSTRY INTELLIGENCE:
Different businesses need different things - don't apply "web agency standards" to every site:

• Restaurants/Local: Menu, hours, location, online ordering (not blog/case studies)
• E-commerce: Product photos, pricing, checkout, reviews (not portfolio)
• Service businesses: Trust signals, contact info, service area, credentials
• Professional services: Case results, credentials, clear process, testimonials
• SaaS/Tech: Demo, pricing, integrations, free trial, customer logos

Ask: "What does THIS business type need to convert customers?"

CLICKABLE LINK INTELLIGENCE:
When you see sections with clickable links (portfolio items, blog posts, service pages, team profiles), understand that clicking these links typically reveals MORE CONTENT:
• Portfolio/work links → individual case studies with details, process, results
• Blog post links → full articles with insights, examples, data
• Service page links → detailed offerings, pricing, testimonials
• Team profile links → individual bios, credentials, specialties
• Product pages → detailed specs, reviews, pricing
• Property listings → photos, details, neighborhood info

Do NOT claim content is "missing" when clickable links suggest it exists one level deeper. Instead:
✓ Good: "Portfolio section has 12 project links - verify individual case studies include client results and process details"
✓ Good: "Blog section with 20+ articles - check if posts demonstrate industry expertise and include actionable insights"
✗ Bad: "No visible case studies or portfolio details found"
✗ Bad: "Blog section appears empty or lacks content"

This applies to ALL content types - think like a human: if there are clickable items in a section, assume content exists behind them.

REQUIREMENTS:
1. Be ULTRA-SPECIFIC - use exact numbers, measurements, and observations from the data
   ✓ Good: "Page loads in 5,794ms (~3× the 2s recommendation). Only 6 images detected — check server response, render-blocking resources."
   ✗ Bad: "Page load time is slow"
   
2. VARY your critique style - don't always follow the same pattern:
   - Sometimes lead with the problem, sometimes with the consequence
   - Mix technical details with business impact
   - Vary sentence structure and length
   - Don't always use the same phrases like "could be improved" or "is missing"

3. Be ACTIONABLE with SPECIFIC next steps - but use BUSINESS LANGUAGE:
   ✓ Good: "Make your phone number tappable on mobile so visitors can call with one tap"
   ✗ Bad: "Implement tel: links for click-to-call functionality"
   
   ✓ Good: "Your call-to-action button is too small to tap comfortably on phones - make it bigger"
   ✗ Bad: "Increase touch target size to 44px per Apple Human Interface Guidelines"
   
   ✓ Good: "Mobile visitors can't see your contact form - it's hidden on phones but visible on computers"
   ✗ Bad: "Contact form not detected in mobile viewport - implement responsive CSS"
   
   CRITICAL: You have detailed technical data (pixel sizes, viewport differences, etc.) but ALWAYS translate to business outcomes and user experience when writing critiques.

4. PRIORITIZE issues based on ACTUAL SEVERITY for this specific site:
   - Look at ALL the data first, then pick the 3 most impactful issues
   - Sometimes the biggest problem is missing trust signals, not performance
   - Sometimes it's unclear value proposition, not SEO
   - Sometimes it's mobile UX, not page speed
   - Sometimes mobile is FINE and desktop issues matter more
   - VARY your focus - don't default to the same category every time
   - If mobile section says "✅ looks solid", focus on OTHER problems
   
   Consider multiple impact factors:
   • Immediate conversion killers (broken CTAs, confusing navigation, poor mobile UX)
   • Trust & credibility issues (no testimonials, generic copy, unprofessional design)
   • Performance problems (slow load, render blocking)
   • SEO & discoverability (metadata, structure, content)
   • User experience gaps (accessibility, clarity, engagement)

5. Be HONEST - don't invent problems. If something is actually good, acknowledge it briefly then pivot to what needs work.

TONE & STYLE VARIATION:
- Mix casual and professional language
- Sometimes use questions: "Why is the title tag 100+ characters?"
- Sometimes use direct statements: "The H1 is too generic"
- Sometimes use stats: "Research shows 53% abandon sites over 3s"
- Vary your vocabulary - don't repeat the same words

CRITICAL: Use ACTUAL data from the analysis. Reference real numbers, real text from the site, real findings. Make it obvious you actually reviewed this specific website, not using a template.`;
}

/**
 * Build output format
 */
function buildOutputFormat(industry, seoResults) {
  const industryFields = industry ? `,
    "First industry-specific issue for ${industry.specific}",
    "Second industry-specific issue for ${industry.specific}"` : '';

  const seoFields = seoResults ? `,
    "First technical SEO issue from audit results",
    "Second technical SEO issue from audit results"` : '';

  return `Return your response in this EXACT JSON format (no markdown code fences, just pure JSON):
{
  "companyName": "Company Name",
  "critiques": [
    "First general issue with actual metrics or observations",
    "Second general issue with actual metrics or observations",
    "Third general issue with actual metrics or observations"${industryFields}${seoFields}
  ],
  "summary": "One sentence overall assessment"
}

CRITICAL: Return ONLY the JSON object. Do not wrap it in code fences or markdown.`;
}

/**
 * Build content section for the prompt
 */
export function buildContentSection(data) {
  return `WEBSITE CONTENT (first ${data.bodyText.length} characters from ${data.pagesAnalyzed || 1} page(s)):
${data.bodyText}

${data.pagesAnalyzed > 1 ? 'NOTE: This content combines multiple pages including homepage and key internal pages.' : ''}`;
}

/**
 * Build a concise prompt that asks only for a suggested subject line.
 * This request expects plain text output (one or several subject options, one per line).
 */
export function buildSubjectPrompt({domain, companyName, summary, humanSummary, toneHints}) {
  const tone = toneHints || 'polite, slightly informal, helpful';
  return `You are a concise outreach writer. Based on the following website and summary, produce ONE short subject line suitable for a friendly consultant outreach.

WEBSITE: ${domain}
COMPANY: ${companyName || domain}
SUMMARY: ${summary || humanSummary || ''}

TONE: ${tone}

Good subject line principles:
- Be specific and relevant to THIS site (not generic)
- Lead with value or curiosity, not "Hey" or "Quick question" every time
- If there's a notable strength, mention it ("Great portfolio work...")
- If there's a specific problem, hint at it ("Mobile visitors can't find...")
- Keep it natural and conversational, like you'd actually talk
- Under 70 characters, no emojis or marketing jargon
- Use {{firstName}} or {{domain}} placeholders where it feels natural

DON'T:
- Default to "Quick question about your homepage" unless it genuinely fits
- Sound like a template or mass email
- Be vague ("I have some thoughts...")
- Oversell ("URGENT: Your site is broken!")

DO:
- Match the subject to what you're actually going to talk about
- Be honest and direct
- Vary your approach — sometimes start with a compliment, sometimes with the issue, sometimes with curiosity

Return only the single subject line as plain text.`;}

/**
 * Build a prompt that asks only for the email body (short outreach message).
 * This request expects plain text output. Use placeholders like {{firstName}} and {{senderName}}.
 */
export function buildBodyPrompt({domain, companyName, critiquesSnippet, humanBullets, toneHints, maxLines = 12}) {
  const tone = toneHints || 'polite, slightly informal, helpful';
  return `You are a helpful outreach writer. Using the information below, write a short, natural email body (no subject) suitable for a consultant reaching out. Target length: ${maxLines} lines max. Use simple placeholders like {{firstName}}, {{senderName}}, and {{domain}}.

CONTEXT: ${domain} (${companyName || ''})

KEY POINTS (short):
${critiquesSnippet || humanBullets?.slice(0,3).map((b,i)=>`${i+1}. ${b}`).join('\n')}

TONE: ${tone}

Requirements:
- Keep it concise and non-salesy.
- Start with a short opening line addressing {{firstName}}.
- Include 1-3 short actionable bullets or observations woven naturally into the message.
- End with a short call-to-action (e.g., "Would you be open to a 15-minute call?").

Return only the email body as plain text.`;
}

/**
 * Build a small prompt that asks the model to humanize a provided subject + body.
 * Useful as an optional polishing step. Expect plain text JSON-like output is NOT required.
 */
export function buildHumanizePrompt({subject, body, toneHints}) {
  const tone = toneHints || 'polite, slightly informal, helpful';
  return `You are an outreach editor. Polishing task: rewrite the subject and body into a single, natural-sounding subject + body.

TONE: ${tone}

TEMPLATE SUBJECT: ${subject}

TEMPLATE BODY:
${body}

Instructions:
- Do not add new factual claims.
- Keep subject short (<=70 chars) and body brief (<=12 lines).
- Preserve placeholders like {{firstName}} and {{senderName}}.

Return two parts separated by a blank line: first the subject on its own line, then the body (plain text).`;
}
