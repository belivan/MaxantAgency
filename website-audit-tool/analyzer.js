import { chromium } from 'playwright';
import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { discoverPages } from './modules/crawler.js';
import { detectIndustry, getIndustryBestPractices } from './modules/industry.js';
import { runSEOAudit, formatSEOResultsForAI } from './modules/seo.js';
import { analyzeVisualDesign, formatVisualResultsForAI } from './modules/visual.js';
import { discoverAndAnalyzeCompetitors } from './modules/competitor.js';
import { buildAnalysisPrompt, buildContentSection } from './modules/prompt-builder.js';
import { parseJSONFromText } from './modules/ai-utils.js';
import { createDraft } from './modules/drafts-gmail.js';
import { extractFromPage, findBestContact } from './modules/contact.js';
import { sanitizeHumanizedEmail, replacePlaceholders } from './modules/email-sanitizer.js';
import { callAI, MODELS } from './ai-providers.js';
import { validateJSON, formatValidationResult, validateQualityWithAI } from './modules/json-validator.js';
import { extractWithGrok, getBestContactEmail, getBestContactPerson, getMostRecentPost } from './modules/grok-extractor.js';
import { saveLeadToSupabase } from './modules/supabase-client.js';
import { calculateTotalCost, formatCost, formatTime } from './modules/cost-tracker.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// [REMOVED] generateEmail function - email generation moved to separate app


/**
 * Analyze multiple websites one at a time with progress updates
 */
async function analyzeWebsite(url, browser, sendProgress) {
  console.log(`Analyzing: ${url}`);

  sendProgress({
    type: 'step',
    step: 'loading_page',
    message: `⏳ Loading homepage...`,
    url
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  });

  const page = await context.newPage();

  try {
    // Navigate to the page
    const startTime = Date.now();
    await page.goto(url, {
      waitUntil: 'networkidle',
      timeout: 30000
    });
    const loadTime = Date.now() - startTime;

    sendProgress({
      type: 'step',
      step: 'page_loaded',
      message: `✓ Homepage loaded (${(loadTime / 1000).toFixed(1)}s)`,
      url
    });

    sendProgress({
      type: 'step',
      step: 'capturing_screenshot',
      message: `⏳ Capturing screenshots...`,
      url
    });

    // Capture screenshot
    const screenshotDir = './screenshots';
    await fs.mkdir(screenshotDir, { recursive: true });

    const domain = new URL(url).hostname.replace(/[^a-z0-9]/gi, '_');
    const timestamp = Date.now();
    const screenshotPath = path.join(screenshotDir, `${domain}_${timestamp}.png`);

    await page.screenshot({
      path: screenshotPath,
      fullPage: false
    });

    // Gather website data
    const websiteData = await page.evaluate(() => {
      const bodyText = document.body.innerText;
      const data = {
        title: document.title,
        metaDescription: document.querySelector('meta[name="description"]')?.content || '',
        h1Tags: Array.from(document.querySelectorAll('h1')).map(h => h.innerText).slice(0, 5),
        hasContactForm: !!document.querySelector('form'),
        hasCTA: !!(
          document.querySelector('button') ||
          document.querySelector('a[href*="contact"]') ||
          document.querySelector('a[href*="get-started"]') ||
          document.querySelector('a[href*="book"]')
        ),
        imageCount: document.querySelectorAll('img').length,
        linkCount: document.querySelectorAll('a').length,
        hasChat: !!(
          document.querySelector('[class*="chat"]') ||
          document.querySelector('[id*="chat"]')
        ),
        hasPhoneNumber: /\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/.test(bodyText),
        hasPortfolio: !!(
          document.querySelector('[class*="portfolio"]') ||
          document.querySelector('[class*="work"]') ||
          document.querySelector('[class*="project"]') ||
          bodyText.toLowerCase().includes('featured work') ||
          bodyText.toLowerCase().includes('our work') ||
          bodyText.toLowerCase().includes('case stud')
        ),
        // Check if portfolio items are CLICKABLE (likely link to detailed case studies)
        portfolioItemCount: (() => {
          const selectors = [
            '[class*="portfolio"] a[href]',
            '[class*="work"] a[href]',
            '[class*="project"] a[href]',
            '[class*="case-study"] a[href]',
            'a[href*="/portfolio/"]',
            'a[href*="/work/"]',
            'a[href*="/projects/"]',
            'a[href*="/case-studies/"]'
          ];
          let count = 0;
          for (const selector of selectors) {
            const items = document.querySelectorAll(selector);
            count = Math.max(count, items.length);
          }
          return count;
        })(),
        hasTestimonials: !!(
          document.querySelector('[class*="testimonial"]') ||
          document.querySelector('[class*="review"]') ||
          bodyText.toLowerCase().includes('what our clients say') ||
          bodyText.toLowerCase().includes('client testimonial')
        ),
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        },
        bodyText: bodyText.slice(0, 5000), // First 5000 chars (captures more content like portfolio, footer)
      };
      return data;
    });

    // FULL MOBILE SCRAPE - Switch to mobile viewport and re-scrape everything
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone size
    await page.waitForTimeout(1000); // Give time for mobile layout to render

    const mobileScreenshotPath = path.join(screenshotDir, `${domain}_${timestamp}_mobile.png`);
    await page.screenshot({
      path: mobileScreenshotPath,
      fullPage: false
    });

    // FULL mobile data scrape (same as desktop, but at mobile viewport)
    const mobileData = await page.evaluate(() => {
      const bodyText = document.body.innerText;
      const data = {
        title: document.title,
        metaDescription: document.querySelector('meta[name="description"]')?.content || '',
        h1Tags: Array.from(document.querySelectorAll('h1')).map(h => h.innerText).slice(0, 5),
        hasContactForm: !!document.querySelector('form'),
        hasCTA: !!(
          document.querySelector('button') ||
          document.querySelector('a[href*="contact"]') ||
          document.querySelector('a[href*="get-started"]') ||
          document.querySelector('a[href*="book"]')
        ),
        imageCount: document.querySelectorAll('img').length,
        linkCount: document.querySelectorAll('a').length,
        hasChat: !!(
          document.querySelector('[class*="chat"]') ||
          document.querySelector('[id*="chat"]')
        ),
        hasPhoneNumber: /\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/.test(bodyText),
        hasClickToCallLinks: document.querySelectorAll('a[href^="tel:"]').length > 0,
        phoneNumbers: Array.from(new Set(
          bodyText.match(/\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g) || []
        )),
        hasPortfolio: !!(
          document.querySelector('[class*="portfolio"]') ||
          document.querySelector('[class*="work"]') ||
          document.querySelector('[class*="project"]') ||
          bodyText.toLowerCase().includes('featured work') ||
          bodyText.toLowerCase().includes('our work') ||
          bodyText.toLowerCase().includes('case stud')
        ),
        portfolioItemCount: (() => {
          const selectors = [
            '[class*="portfolio"] a[href]',
            '[class*="work"] a[href]',
            '[class*="project"] a[href]',
            '[class*="case-study"] a[href]',
            'a[href*="/portfolio/"]',
            'a[href*="/work/"]',
            'a[href*="/projects/"]',
            'a[href*="/case-studies/"]'
          ];
          let count = 0;
          for (const selector of selectors) {
            const items = document.querySelectorAll(selector);
            count = Math.max(count, items.length);
          }
          return count;
        })(),
        hasTestimonials: !!(
          document.querySelector('[class*="testimonial"]') ||
          document.querySelector('[class*="review"]') ||
          bodyText.toLowerCase().includes('what our clients say') ||
          bodyText.toLowerCase().includes('client testimonial')
        ),
        hasMobileMenu: !!(
          document.querySelector('[class*="mobile-menu"]') ||
          document.querySelector('[class*="hamburger"]') ||
          document.querySelector('[id*="mobile-menu"]') ||
          document.querySelector('[class*="nav-toggle"]') ||
          document.querySelector('button[aria-label*="menu" i]')
        ),
        primaryCTASize: (() => {
          const ctas = document.querySelectorAll('a[href*="contact"], button, .cta, [class*="btn"]');
          if (ctas.length === 0) return null;
          const firstCTA = ctas[0];
          const rect = firstCTA.getBoundingClientRect();
          const isVisible = rect.width > 0 && rect.height > 0;
          return isVisible ? { 
            width: Math.round(rect.width), 
            height: Math.round(rect.height),
            isTappable: rect.height >= 44 && rect.width >= 44
          } : null;
        })(),
        visibleContentAboveFold: (() => {
          const viewportHeight = window.innerHeight;
          const elementsAboveFold = Array.from(document.querySelectorAll('h1, h2, p, button, a'))
            .filter(el => {
              const rect = el.getBoundingClientRect();
              return rect.top >= 0 && rect.top <= viewportHeight && rect.height > 0;
            });
          return {
            headlineCount: elementsAboveFold.filter(el => el.tagName === 'H1' || el.tagName === 'H2').length,
            ctaCount: elementsAboveFold.filter(el => el.tagName === 'BUTTON' || el.tagName === 'A').length,
            textLength: elementsAboveFold.map(el => el.innerText).join(' ').length
          };
        })(),
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        },
        bodyText: bodyText.slice(0, 5000)
      };
      return data;
    });

    // Store mobile data separately
    websiteData.mobile = mobileData;

    sendProgress({
      type: 'step',
      step: 'screenshots_captured',
      message: `✓ Full scrape complete (desktop + mobile data)`,
      url
    });

    // GROK EXTRACTION: Extract comprehensive data using AI
    sendProgress({
      type: 'step',
      step: 'grok_extraction',
      message: `🤖 Extracting company data with AI...`,
      url
    });

    let grokData = null;
    let contactInfo = null;

    try {
      const html = await page.content();
      grokData = await extractWithGrok(html, url, 'grok-4-fast', page);

      // Convert Grok data to legacy contactInfo format for compatibility
      contactInfo = {
        pageUrl: url,
        emails: grokData.contactInfo?.email ? [{ value: grokData.contactInfo.email, source: 'grok' }] : [],
        phones: grokData.contactInfo?.phone ? [{ value: grokData.contactInfo.phone, source: 'grok' }] : [],
        names: grokData.teamInfo?.founder?.name ? [grokData.teamInfo.founder.name] : [],
        contactPages: [],

        // NEW: Enhanced data from Grok
        companyName: grokData.companyInfo?.name,
        industry: grokData.companyInfo?.industry,
        location: grokData.companyInfo?.location,
        foundingYear: grokData.companyInfo?.foundingYear,
        services: grokData.businessIntel?.services,
        valueProposition: grokData.businessIntel?.valueProposition,
        socialProfiles: grokData.socialProfiles,
        recentContent: grokData.contentInfo?.recentPosts,
        hasActiveBlog: grokData.contentInfo?.hasActiveBlog
      };

      sendProgress({
        type: 'info',
        message: `✅ AI extraction complete (${grokData._meta.tokensUsed.input} tokens)`,
        url
      });
    } catch (e) {
      console.error('Grok extraction failed:', e.message);

      // Fallback to traditional extraction
      sendProgress({
        type: 'warning',
        message: `⚠️ AI extraction failed, using traditional scraper...`,
        url
      });

      try {
        contactInfo = await extractFromPage(page, url);
      } catch (fallbackError) {
        contactInfo = { pageUrl: url, emails: [], phones: [], names: [], contactPages: [] };
      }
    }

    await context.close();

    return {
      url,
      loadTime,
      screenshotPath,
      mobileScreenshotPath,
      data: websiteData,
      contact: contactInfo,
      grokData: grokData,  // NEW: Full Grok extraction data
      error: null
    };

  } catch (error) {
    await context.close();
    console.error(`Error analyzing ${url}:`, error.message);

    return {
      url,
      error: error.message,
      data: null
    };
  }
}

/**
 * Generate AI critique using Claude with progress updates
 */
async function generateCritique(websiteAnalysis, industry, seoResults, visualResults, competitorResults, sendProgress, options = {}) {
  if (websiteAnalysis.error) {
    return {
      critiques: [`Unable to analyze website: ${websiteAnalysis.error}`],
      industryCritiques: [],
      seoCritiques: [],
      visualCritiques: [],
      competitorCritiques: [],
      companyName: new URL(websiteAnalysis.url).hostname,
      summary: 'Analysis failed',
      industry: null,
      seo: null,
      visual: null,
      competitor: null
    };
  }

  const { url, loadTime, data } = websiteAnalysis;
  const tracker = options.aiTracker;
  const textModel = options.textModel || 'claude-sonnet-4-5';

  sendProgress({
    type: 'step',
    step: 'ai_analysis',
    message: `⏳ Running AI analysis with dynamic prompt builder...`,
    url
  });

  // Build dynamic, context-aware prompt using the new prompt builder
  // Pass visualResults so the prompt knows if visual analysis is available
  const basePrompt = buildAnalysisPrompt(data, industry, seoResults, url, loadTime, visualResults);
  const contentSection = buildContentSection(data);

  const prompt = `${basePrompt}

${contentSection}`;



  try {
    const aiResult = await callAI({
      model: textModel,
      prompt: prompt,
      systemPrompt: 'You are a website critique assistant. Return only valid JSON.'
    });

    console.log('AI result received:', aiResult ? 'Yes' : 'No', 'Has text:', aiResult?.text ? 'Yes' : 'No');

    // Track the AI call
    if (tracker && aiResult && aiResult.usage) {
      tracker.trackCall(textModel, aiResult.usage.inputTokens, aiResult.usage.outputTokens, 'website_critique');
    }

    // Check if we got a valid response
    if (!aiResult || !aiResult.text) {
      console.error('AI returned empty or invalid response. aiResult:', JSON.stringify(aiResult, null, 2));
      throw new Error('AI returned empty response');
    }

    let responseText = aiResult.text;

    // Validate JSON response using json-validator
    const validation = validateJSON(responseText, 'websiteAnalysis');

    // Log validation result if debug mode
    if (process.env.DEBUG_AI === 'true') {
      console.log('\n' + formatValidationResult(validation));
    }

    let result;

    if (validation.isValid) {
      // Validation passed - use validated data
      result = validation.data;
      sendProgress({
        type: 'info',
        message: '✅ AI response validated successfully',
        url
      });

      // LAYER 2: AI Quality Check (optional, cheap)
      if (process.env.ENABLE_AI_QUALITY_CHECK === 'true') {
        sendProgress({
          type: 'step',
          step: 'quality_check',
          message: '🔍 Running AI quality check...',
          url
        });

        const qualityCheck = await validateQualityWithAI(result, 'websiteAnalysis', {
          model: process.env.QUALITY_CHECK_MODEL || 'gpt-4o-mini',
          forceCheck: false // Only check if suspicious signals detected
        });

        if (qualityCheck.skipped) {
          sendProgress({
            type: 'info',
            message: '✅ Quality check skipped (no issues detected)',
            url
          });
        } else if (!qualityCheck.isQualityGood && qualityCheck.fixedVersion) {
          // Use AI-corrected version
          console.log('🔧 Using AI-corrected version');
          console.log('Issues found:', qualityCheck.issues.join(', '));
          result = qualityCheck.fixedVersion;
          sendProgress({
            type: 'warning',
            message: `⚠️ AI fixed ${qualityCheck.issues.length} quality issues ($${qualityCheck.cost.toFixed(4)})`,
            url
          });
        } else if (!qualityCheck.isQualityGood) {
          // Quality issues but no fix available
          console.warn('⚠️ Quality issues detected (no auto-fix):', qualityCheck.issues.join(', '));
          sendProgress({
            type: 'warning',
            message: `⚠️ ${qualityCheck.issues.length} quality issues detected ($${qualityCheck.cost.toFixed(4)})`,
            url
          });
        } else {
          sendProgress({
            type: 'info',
            message: `✅ Quality check passed ($${qualityCheck.cost.toFixed(4)})`,
            url
          });
        }
      }
    } else {
      // Validation failed - try fallback parsing
      console.warn('⚠️ AI response failed validation, attempting fallback parsing...');
      console.warn('Validation errors:', validation.errors.join(', '));

      // Try legacy parsing
      responseText = responseText.replace(/```(?:json)?\s*([\s\S]*?)```/gi, '$1').trim();
      result = parseJSONFromText(responseText);

      // If parsing completely failed, try heuristic extraction
      if (!result) {
        const { extractPartialResult } = await import('./modules/ai-utils.js');
        result = extractPartialResult(responseText);
      }

      // If we still have nothing, log the response and throw
      if (!result) {
        console.error('Failed to parse AI response. Raw text:', responseText.substring(0, 500));
        throw new Error('Failed to parse AI JSON response after validation and fallback attempts');
      }

      sendProgress({
        type: 'warning',
        message: '⚠️ Used fallback parsing (AI response format was unexpected)',
        url
      });
    }

    // Ensure critiques is always an array (defensive)
    if (!result.critiques || !Array.isArray(result.critiques)) {
      if (typeof result.critiques === 'string') {
        // Split string into array
        result.critiques = result.critiques.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
      } else {
        result.critiques = [];
      }
    }

    // Extract critique categories based on what modules were enabled
    const finalResult = {
      companyName: result.companyName || new URL(url).hostname,
      critiques: result.critiques.slice(0, 3),
      industryCritiques: industry ? result.critiques.slice(3, 5) : [],
      seoCritiques: seoResults ? (industry ? result.critiques.slice(5, 7) : result.critiques.slice(3, 5)) : [],
      visualCritiques: visualResults ? visualResults.critiques : [],
      competitorCritiques: competitorResults ? competitorResults.critiques : [],
      summary: result.summary || 'Website analysis complete',
      industry: industry,
      seo: seoResults,
      visual: visualResults,
      competitor: competitorResults
    };

    const critiqueCountMsg = `✓ Generated ${finalResult.critiques.length} general${finalResult.industryCritiques.length > 0 ? ` + ${finalResult.industryCritiques.length} industry` : ''}${finalResult.seoCritiques.length > 0 ? ` + ${finalResult.seoCritiques.length} SEO` : ''}${finalResult.visualCritiques.length > 0 ? ` + ${finalResult.visualCritiques.length} visual` : ''}${finalResult.competitorCritiques.length > 0 ? ` + ${finalResult.competitorCritiques.length} competitor` : ''} critiques`;

    sendProgress({
      type: 'step',
      step: 'ai_complete',
      message: critiqueCountMsg,
      url
    });

    return finalResult;

  } catch (error) {
    console.error('AI critique generation error:', error);

    const fallbackCritiques = [
      `Page load time of ${(loadTime / 1000).toFixed(1)} seconds may be impacting bounce rate`,
      data.metaDescription ? 'Meta description could be more compelling' : 'Missing meta description hurts SEO and click-through rates',
      data.hasCTA ? 'Call-to-action buttons could be more prominent' : 'No clear call-to-action to drive conversions'
    ];

    const fallbackIndustryCritiques = industry ? [
      `As a ${industry.specific} business, consider adding industry-specific trust signals`,
      `Review industry best practices for ${industry.specific} to improve conversions`
    ] : [];

    const fallbackSeoCritiques = seoResults ? [
      seoResults.sitemap.exists ? 'Consider submitting sitemap to Google Search Console' : 'Missing sitemap.xml - add one to help search engines discover pages',
      seoResults.imageAltTags.percentage > 50 ? `${seoResults.imageAltTags.percentage}% of images missing alt tags - hurts accessibility and SEO` : 'Review structured data markup for better search visibility'
    ] : [];

    const fallbackVisualCritiques = visualResults ? visualResults.critiques : [];
    const fallbackCompetitorCritiques = competitorResults ? competitorResults.critiques : [];

    return {
      companyName: new URL(url).hostname,
      critiques: fallbackCritiques,
      industryCritiques: fallbackIndustryCritiques,
      seoCritiques: fallbackSeoCritiques,
      visualCritiques: fallbackVisualCritiques,
      competitorCritiques: fallbackCompetitorCritiques,
      summary: 'Website has room for improvement in performance and conversion optimization',
      industry: industry,
      seo: seoResults,
      visual: visualResults,
      competitor: competitorResults
    };
  }
}

/**
 * Generate personalized email from critique
 */
function generateEmail(url, critique, emailType = 'local') {
  const { companyName, critiques, industryCritiques, seoCritiques, visualCritiques, competitorCritiques, summary, industry } = critique;
  const domain = new URL(url).hostname;

  // Simple templating helper - replace {{key}} with vars[key]
  function renderTemplate(template, vars = {}) {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
      return vars[key] !== undefined ? String(vars[key]) : '';
    });
  }

  // Build industry-specific section if available
  let industrySection = '';
  if (industry && industryCritiques && industryCritiques.length > 0) {
    industrySection = `\n\nINDUSTRY-SPECIFIC ISSUES (${industry.specific}):\n${industryCritiques.map((c, i) => `${i + 1}. ${c}`).join('\n')}\n`;
  }

  // Build SEO section if available
  let seoSection = '';
  if (seoCritiques && seoCritiques.length > 0) {
    seoSection = `\n\nTECHNICAL SEO ISSUES:\n${seoCritiques.map((c, i) => `${i + 1}. ${c}`).join('\n')}\n`;
  }

  // Build visual design section if available
  let visualSection = '';
  if (visualCritiques && visualCritiques.length > 0) {
    visualSection = `\n\nVISUAL DESIGN ISSUES:\n${visualCritiques.map((c, i) => `${i + 1}. ${c}`).join('\n')}\n`;
  }

  // Build competitive analysis section if available
  let competitorSection = '';
  if (competitorCritiques && competitorCritiques.length > 0) {
    competitorSection = `\n\nCOMPETITIVE ANALYSIS:\n${competitorCritiques.map((c, i) => `${i + 1}. ${c}`).join('\n')}\n`;
  }

  const issueCount = critiques.length + (industryCritiques?.length || 0) + (seoCritiques?.length || 0) + (visualCritiques?.length || 0) + (competitorCritiques?.length || 0);

  // Default templates (keep concise and templated)
  const templates = {
    local: {
      subject: `{{issueCount}} quick improvements for {{domain}}`,
      body: `Hi {{firstName}},

{{opening}}

I took a quick look at {{domain}} and noticed a few issues worth addressing:

GENERAL ISSUES:
1. {{critique1}}
2. {{critique2}}
3. {{critique3}}{{industrySection}}{{seoSection}}{{visualSection}}{{competitorSection}}

{{summary}} These are all fixable, and we've helped similar organizations make these exact improvements.

Would you be open to a short 15-minute call to review a few concrete fixes? No obligation—just useful feedback.

Best,
{{senderName}}
Co-Founder, Maksant
{{senderWebsite}}
{{senderPhone}}`
    },
    national: {
      subject: `Your website analysis — {{domain}}`,
      body: `Hi {{firstName}},

{{opening}}

I analyzed {{domain}} and found a few areas for quick improvement:

GENERAL ISSUES:
1. {{critique1}}
2. {{critique2}}
3. {{critique3}}{{industrySection}}{{seoSection}}{{visualSection}}{{competitorSection}}

We've helped organizations like yours improve load times, conversions, and search visibility.

Would you be open to a 15-minute call to discuss low-effort wins we could implement?

Best regards,
{{senderName}}
Maksant
{{senderWebsite}}`
    }
  };

  // Variables for rendering
  const vars = {
    issueCount,
    domain,
    firstName: '{{firstName}}', // Proper placeholder format
    opening: (critique.humanizedEmail && critique.humanizedEmail.body)
      ? // Use the AI-provided body as a short opening if it's short; otherwise fall back to a one-line hook
        (critique.humanizedEmail.body.length < 300 ? critique.humanizedEmail.body.split('\n')[0] : '')
      : '',
    critique1: critiques[0] || '',
    critique2: critiques[1] || '',
    critique3: critiques[2] || '',
    industrySection: industrySection ? `\n\nINDUSTRY-SPECIFIC ISSUES (${industry ? industry.specific : ''}):\n${industryCritiques.map((c, i) => `${i + 1}. ${c}`).join('\n')}` : '',
    seoSection: seoSection ? `\n\nTECHNICAL SEO ISSUES:\n${seoCritiques.map((c, i) => `${i + 1}. ${c}`).join('\n')}` : '',
    visualSection: visualSection ? `\n\nVISUAL DESIGN ISSUES:\n${visualCritiques.map((c, i) => `${i + 1}. ${c}`).join('\n')}` : '',
    competitorSection: competitorSection ? `\n\nCOMPETITIVE ANALYSIS:\n${competitorCritiques.map((c, i) => `${i + 1}. ${c}`).join('\n')}` : '',
    summary: summary || '',
    senderName: '[Your Name]',
    senderWebsite: 'https://maksant.com'
  };

  const chosenTemplate = (emailType === 'local') ? templates.local : templates.national;

  // Allow subject override from AI if provided (still keep templated default)
  const subject = (critique.humanizedEmail && critique.humanizedEmail.subject)
    ? critique.humanizedEmail.subject
    : renderTemplate(chosenTemplate.subject, vars);

  // Render body template and fall back to AI-provided body if template yields empty
  let body = renderTemplate(chosenTemplate.body, vars);

  // If AI provided a full humanized email and the template feels insufficient, we can append or prefer it.
  if (critique.humanizedEmail && critique.humanizedEmail.body) {
    // If AI body is longer than template opening, append it after the template's opening line to keep template structure
    const aiBody = critique.humanizedEmail.body;
    if (aiBody.length > 120) {
      // Insert AI body after the opening paragraph if present
      const openingLine = vars.opening || '';
      if (openingLine) {
        body = body.replace(openingLine, openingLine + '\n\n' + aiBody);
      } else {
        // Append AI body at the top
        body = aiBody + '\n\n' + body;
      }
    }
  }

  return { subject, body };
}

/**
 * Analyze multiple websites one at a time with progress updates
 */
export async function analyzeWebsites(urls, options, sendProgress) {
  const browser = await chromium.launch({
    headless: true
  });

  const results = [];
  const emailType = options.emailType || 'local';
  const depthTier = options.depthTier || 'tier1';
  // Whether to run programmatic sanitization on AI text. Disabled by default unless options.useSanitizer === true or env USE_SANITIZER=true
  const useSanitizer = (options && options.useSanitizer !== undefined)
    ? options.useSanitizer
    : (process.env.USE_SANITIZER === 'true');

  // Determine sanitizer mode. Default to 'minimal' when sanitizer is enabled but mode not set.
  const sanitizerMode = (process.env.SANITIZER_MODE && process.env.SANITIZER_MODE.trim())
    ? process.env.SANITIZER_MODE.trim()
    : (useSanitizer ? 'minimal' : 'off');

  // Sender vars for placeholder replacement
  const senderNameEnv = process.env.SENDER_NAME || (() => {
    const m = (process.env.MAIL_FROM || '').replace(/"/g, '');
    if (!m) return '';
    return m.split('<')[0].trim();
  })();
  const senderPhoneEnv = process.env.SENDER_PHONE || '';
  const senderWebsiteEnv = process.env.SENDER_WEBSITE || '';

  // Estimate total AI calls
  const estimatedCallsPerSite = 1 + // critique generation
    (options.modules?.industry ? 0.5 : 0) + // industry detection (sometimes cached)
    (options.modules?.visual ? 1 : 0) + // visual analysis
    (options.modules?.competitor ? 2 : 0) + // competitor discovery + analysis
    (!options.skipHumanize ? 1 : 0); // email humanization

  const estimatedTotalCalls = Math.ceil(urls.length * estimatedCallsPerSite);
  const estimatedCostPerCall = 0.01; // Approximate cost per AI call
  const estimatedTotalCost = estimatedTotalCalls * estimatedCostPerCall;
  
  // Send cost estimate before starting
  sendProgress({
    type: 'cost_estimate',
    estimatedCalls: estimatedTotalCalls,
    estimatedCost: estimatedTotalCost,
    message: `💰 Estimated: ${estimatedTotalCalls} AI calls (~$${estimatedTotalCost.toFixed(4)})`
  });

  try {
    // Process sites one at a time to show detailed progress
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      const siteNum = i + 1;

      // Send site start progress
      sendProgress({
        type: 'site_start',
        siteIndex: i,
        siteNum: siteNum,
        totalSites: urls.length,
        url,
        message: `🔍 Analyzing ${url} (Site ${siteNum} of ${urls.length})`
      });

      try {
        // Track analysis start time
        const analysisStartTime = Date.now();

        // Step 1: Analyze homepage first
        const context = await browser.newContext({
          viewport: { width: 1920, height: 1080 },
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        });

        const page = await context.newPage();
        const homepageAnalysis = await analyzeWebsite(url, browser, sendProgress);

        // If homepage analysis failed, stop everything
        if (homepageAnalysis.error) {
          await page.close();
          await context.close();
          await browser.close();
          throw new Error(`Failed to analyze ${url}: ${homepageAnalysis.error}`);
        }

        // Step 2: Discover additional pages based on depth tier
        await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
        const pagesToAnalyze = await discoverPages(url, depthTier, page, sendProgress);
        await page.close();
        await context.close();

        // Step 3: Analyze additional pages (if Tier II or III)
        const allAnalyses = [homepageAnalysis];

        if (pagesToAnalyze.length > 1) {
          for (let pageIndex = 1; pageIndex < pagesToAnalyze.length; pageIndex++) {
            const pageUrl = pagesToAnalyze[pageIndex];

            sendProgress({
              type: 'step',
              step: 'analyzing_page',
              message: `⏳ Analyzing page ${pageIndex + 1} of ${pagesToAnalyze.length}...`,
              url
            });

            const pageAnalysis = await analyzeWebsite(pageUrl, browser, sendProgress);

            if (pageAnalysis.error) {
              sendProgress({
                type: 'step',
                step: 'page_failed',
                message: `⚠️ Skipped page ${pageIndex + 1} (failed to load)`,
                url
              });
            } else {
              allAnalyses.push(pageAnalysis);

              sendProgress({
                type: 'step',
                step: 'page_analyzed',
                message: `✓ Page ${pageIndex + 1} of ${pagesToAnalyze.length} analyzed`,
                url
              });
            }
          }
        }

        // Step 4: Combine analyses from all pages
        const combinedAnalysis = combineMultiPageAnalyses(allAnalyses);

        // Step 4.1: Aggregate contact info from page-level extractions
        const pageContactResults = allAnalyses.map(a => a.contact || { pageUrl: a.url, emails: [], phones: [], names: [], contactPages: [] });
        const bestContact = findBestContact(url, pageContactResults);

        sendProgress({
          type: 'step',
          step: 'contact_discovery_complete',
          message: `✓ Contact discovery complete${bestContact ? ` (found ${bestContact.email})` : ' (no email found)'}`,
          url
        });

        // Step 5: Detect industry (if module enabled)
        let industry = null;
        if (options.modules?.industry) {
          industry = await detectIndustry(combinedAnalysis, options.textModel, sendProgress);
        }

        // Step 6: Run SEO audit (if module enabled)
        let seoResults = null;
        if (options.modules?.seo) {
          // Need to reopen page for SEO audit
          const seoContext = await browser.newContext({
            viewport: { width: 1920, height: 1080 },
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          });
          const seoPage = await seoContext.newPage();
          await seoPage.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
          seoResults = await runSEOAudit(seoPage, url, sendProgress);
          await seoPage.close();
          await seoContext.close();
        }

        // Step 7: Analyze visual design (if module enabled)
        let visualResults = null;
        if (options.modules?.visual) {
          // Collect all screenshot paths from all pages analyzed
          const allScreenshots = allAnalyses
            .filter(a => !a.error && a.screenshotPath)
            .map(a => ({
              url: a.url,
              screenshotPath: a.screenshotPath
            }));

          visualResults = await analyzeVisualDesign(
            allScreenshots,
            options.visionModel,
            sendProgress,
            url
          );
        }

        // Step 8: Discover and analyze competitors (if module enabled)
        let competitorResults = null;
        if (options.modules?.competitor && industry) {
          competitorResults = await discoverAndAnalyzeCompetitors(
            combinedAnalysis,
            industry,
            options.textModel,
            depthTier,
            browser,
            sendProgress,
            url
          );
        }

        // Step 9: Calculate quality grade (needed for email personalization)
        const grokData = homepageAnalysis.grokData;
        const hasEmail = !!(grokData?.contactInfo?.email || bestContact?.email);
        const hasPhone = !!(grokData?.contactInfo?.phone || bestContact?.phone);
        let qualityScore = 0;
        let qualityGrade = 'F';

        if (hasEmail || hasPhone) {
          if (hasEmail) qualityScore += 30;
          if (hasPhone) qualityScore += 20;
          if (grokData?.companyInfo?.name) qualityScore += 10;
          if (grokData?.companyInfo?.industry) qualityScore += 10;
          if (grokData?.companyInfo?.location) qualityScore += 5;
          if (grokData?.businessIntel?.services?.length > 0) qualityScore += 10;
          if (grokData?.businessIntel?.valueProposition) qualityScore += 5;

          const socialCount = [
            grokData?.socialProfiles?.linkedIn?.company,
            grokData?.socialProfiles?.instagram?.url,
            grokData?.socialProfiles?.twitter?.url,
            grokData?.socialProfiles?.facebook,
            grokData?.socialProfiles?.youtube
          ].filter(Boolean).length;
          if (socialCount > 0) qualityScore += 10;

          if (qualityScore >= 70) qualityGrade = 'A';
          else if (qualityScore >= 50) qualityGrade = 'B';
          else if (qualityScore >= 30) qualityGrade = 'C';
          else if (qualityScore >= 1) qualityGrade = 'D';
        }

        // Step 10: Generate critique (with all module context if available)
        const critique = await generateCritique(combinedAnalysis, industry, seoResults, visualResults, competitorResults, sendProgress, options);

        // Step 10: Generate email
        // [REMOVED] Email generation - moved to separate email app
        // Extract contact info from the main website analysis (for results)
        const contactInfo = extractContactInfo(combinedAnalysis);

        // Add result
        const modulesUsed = ['basic'];
        if (industry) {
          modulesUsed.push('industry');
        }
        if (seoResults) {
          modulesUsed.push('seo');
        }
        if (visualResults) {
          modulesUsed.push('visual');
        }
        if (competitorResults) {
          modulesUsed.push('competitor');
        }

        // Calculate elapsed time
        const analysisTime = Math.round((Date.now() - analysisStartTime) / 1000); // seconds

        // Calculate actual cost based on what ran
        const costBreakdown = {
          grokModel: 'grok-beta',
          textModel: options.textModel || 'gpt-5-mini',
          visionModel: options.visionModel || 'gpt-4o',
          cheapModel: 'gpt-4o-mini',

          grokExtraction: true,  // Always runs
          basicAnalysis: true,   // Always runs
          industryAnalysis: !!industry,
          seoAnalysis: !!seoResults,
          visualAnalysis: visualResults ? visualResults.screenshots?.length || 0 : 0,
          competitorAnalysis: !!competitorResults,
          // emailWriting removed
          // critiqueReasoning removed
          // qaReview removed

          pagesAnalyzed: allAnalyses.length,
        };

        const { totalCost, breakdown: costDetails } = calculateTotalCost(costBreakdown);

        const result = {
          url,
          companyName: critique.companyName,
          contact: bestContact || null,
          extractedContact: contactInfo, // Add extracted contact info
          grokData: homepageAnalysis.grokData || null, // NEW: Include full Grok extraction data
          critiques: {
            basic: critique.critiques,
            industry: critique.industryCritiques || [],
            seo: critique.seoCritiques || [],
            visual: critique.visualCritiques || [],
            competitor: critique.competitorCritiques || []
          },
          industry: critique.industry,
          seo: critique.seo,
          visual: critique.visual,
          competitor: critique.competitor,
          summary: critique.summary,
          // [REMOVED] email and draft fields - moved to separate email app
          loadTime: homepageAnalysis.loadTime,
          screenshot: homepageAnalysis.screenshotPath,
          pagesAnalyzed: allAnalyses.length,
          modulesUsed: modulesUsed,
          cost: totalCost,  // Actual cost in dollars
          costBreakdown: costDetails,  // Cost per operation
          analysisTime: analysisTime,  // Elapsed time in seconds
          metadata: options.metadata || null,  // Multi-tenant tracking (projectId, campaignId, clientName, sourceApp)
          error: null
        };

        // [REMOVED] Critique reasoning generation - moved to separate email app

        results.push(result);

        // Save analysis results to folder
        const savedPath = await saveAnalysisResults(result);
        if (savedPath) {
          result.savedPath = savedPath; // Add path to result object
        }

        // Save to Supabase database (if enabled and configured)
        if (options.saveToSupabase !== false) {  // Default true if not specified
          try {
            await saveLeadToSupabase(result);
          } catch (error) {
            console.error(`❌ Failed to save to Supabase:`, error.message);
            // Don't fail the whole analysis if Supabase is down
          }
        } else {
          console.log('⏭️  Supabase saving disabled by user');
        }

        // Send site complete progress
        sendProgress({
          type: 'site_complete',
          siteIndex: i,
          siteNum: siteNum,
          totalSites: urls.length,
          url,
          message: `✅ Site ${siteNum} complete! (${allAnalyses.length} pages analyzed)${savedPath ? ` | Saved to: ${savedPath}` : ''}`
        });

      } catch (siteError) {
        // If any site fails, stop everything
        await browser.close();
        throw siteError;
      }
    }

    // Send final cost summary
    // Cost summary handled by calculateTotalCost
    sendProgress({
      type: 'cost_summary',
      totalCalls: estimatedTotalCalls,
      totalCost: estimatedTotalCost,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      message: `✅ Analysis complete: ${estimatedTotalCalls} estimated AI calls, $${estimatedTotalCost.toFixed(4)} estimated cost`
    });

    await browser.close();
    return results;

  } catch (error) {
    await browser.close();
    throw error;
  }
}

/**
 * Combine analyses from multiple pages into one
 */
function combineMultiPageAnalyses(analyses) {
  // Use the first (homepage) analysis as base
  const combined = { ...analyses[0] };

  if (analyses.length === 1) {
    return combined;
  }

  // Aggregate data from all pages
  let totalLoadTime = 0;
  let allH1Tags = [];
  let totalImages = 0;
  let totalLinks = 0;
  let allBodyText = '';

  analyses.forEach((analysis, index) => {
    if (!analysis.error && analysis.data) {
      totalLoadTime += analysis.loadTime;
      allH1Tags.push(...(analysis.data.h1Tags || []));
      totalImages += analysis.data.imageCount || 0;
      totalLinks += analysis.data.linkCount || 0;
      allBodyText += analysis.data.bodyText || '';
    }
  });

  // Update combined data
  combined.loadTime = Math.round(totalLoadTime / analyses.length); // Average load time
  combined.data = {
    ...combined.data,
    h1Tags: allH1Tags.slice(0, 10), // Top 10 H1s from all pages
    imageCount: totalImages,
    linkCount: totalLinks,
    bodyText: allBodyText.slice(0, 8000), // More content from multiple pages (homepage + services + contact)
    pagesAnalyzed: analyses.length
  };

  return combined;
}
