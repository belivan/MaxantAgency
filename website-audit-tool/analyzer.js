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
import { extractFromPage, findBestContact } from './modules/contact.js';
import { callAI, MODELS } from './ai-providers.js';
import { validateJSON, formatValidationResult, validateQualityWithAI } from './modules/json-validator.js';
import { extractWithGrok, getBestContactEmail, getBestContactPerson, getMostRecentPost } from './modules/grok-extractor.js';
import { saveLeadToSupabase, getProspectsForAnalysis, linkProspectToLead } from './modules/supabase-client.js';
import { calculateTotalCost, formatCost, formatTime } from './modules/cost-tracker.js';
import { enrichSocialProfiles, analyzeSocialPresence, mergeSocialProfiles } from './modules/social-scraper.js';
import { extractSocialProfiles } from './modules/social-finder.js';
import { analyzeContentInsights } from './modules/content-analyzer.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * AI Call Tracker - tracks usage and estimates costs
 */
class AICallTracker {
  constructor() {
    this.calls = [];
    this.totalInputTokens = 0;
    this.totalOutputTokens = 0;
  }

  trackCall(model, inputTokens, outputTokens, purpose) {
    this.calls.push({ model, inputTokens, outputTokens, purpose, timestamp: Date.now() });
    this.totalInputTokens += inputTokens || 0;
    this.totalOutputTokens += outputTokens || 0;
  }

  estimateCost(model, estimatedInputTokens = 1000, estimatedOutputTokens = 500) {
    const modelConfig = MODELS[model] || MODELS['gpt-5-mini'];
    const inputCost = (estimatedInputTokens / 1_000_000) * modelConfig.inputCost;
    const outputCost = (estimatedOutputTokens / 1_000_000) * modelConfig.outputCost;
    return inputCost + outputCost;
  }

  getTotalCost() {
    let total = 0;
    for (const call of this.calls) {
      const modelConfig = MODELS[call.model] || MODELS['gpt-5-mini'];
      const inputCost = (call.inputTokens / 1_000_000) * modelConfig.inputCost;
      const outputCost = (call.outputTokens / 1_000_000) * modelConfig.outputCost;
      total += inputCost + outputCost;
    }
    return total;
  }

  getSummary() {
    return {
      totalCalls: this.calls.length,
      totalInputTokens: this.totalInputTokens,
      totalOutputTokens: this.totalOutputTokens,
      estimatedCost: this.getTotalCost(),
      breakdown: this.calls
    };
  }
}

/**
 * Save analysis results to a structured folder
 * Creates: analysis-results/{domain}/{timestamp}/
 */
async function saveAnalysisResults(result) {
  try {
    // Extract domain from URL (e.g., "maksant.com")
    const domain = new URL(result.url).hostname.replace('www.', '');

    // Create timestamp folder (e.g., "2025-10-18_14-30-45")
    const timestamp = new Date().toISOString()
      .replace(/:/g, '-')
      .replace(/\..+/, '')
      .replace('T', '_');

    // ═══════════════════════════════════════════════════════════════
    // FOLDER ORGANIZATION: Use LEAD GRADE (from QA Agent)
    // ═══════════════════════════════════════════════════════════════
    const leadGrade = result.emailQA?.leadGrade || result.emailQA?.grade || 'C'; // Default to C if QA failed
    const folderPath = path.join(__dirname, 'analysis-results', `lead-${leadGrade}`, domain, timestamp);
    await fs.mkdir(folderPath, { recursive: true });

    // ═══════════════════════════════════════════════════════════════
    // WEBSITE GRADE: Calculate based on ALL analysis modules
    // ═══════════════════════════════════════════════════════════════
    const grokData = result.grokData;

    // Check if we have contact info (EMAIL is most important!)
    const hasEmail = !!(grokData?.contactInfo?.email || result.contact?.email);
    const hasPhone = !!(grokData?.contactInfo?.phone || result.contact?.phone);
    const hasContact = hasEmail || hasPhone;

    let websiteScore = 0;
    let websiteGrade = 'F';

    // Base scoring: Data extraction (40 points max)
    if (hasEmail) websiteScore += 15;  // Email is CRITICAL
    if (hasPhone) websiteScore += 10;  // Phone is valuable
    if (grokData?.companyInfo?.name) websiteScore += 5;
    if (grokData?.companyInfo?.industry) websiteScore += 5;
    if (grokData?.companyInfo?.location) websiteScore += 5;

    // Analysis modules scoring (60 points max - based on what modules were run)
    const modulesUsed = result.modulesUsed || [];

    // Basic analysis always runs (15 points)
    if (modulesUsed.includes('basic')) {
      const basicCritiques = result.critiques?.basic || [];
      if (basicCritiques.length > 0) websiteScore += 15; // Found issues to analyze
    }

    // Industry analysis (15 points if enabled)
    if (modulesUsed.includes('industry')) {
      const industryCritiques = result.critiques?.industry || [];
      if (industryCritiques.length > 0) websiteScore += 15;
    }

    // SEO analysis (10 points if enabled)
    if (modulesUsed.includes('seo')) {
      if (result.seo) websiteScore += 10;
    }

    // Visual analysis (10 points if enabled)
    if (modulesUsed.includes('visual')) {
      const visualCritiques = result.critiques?.visual || [];
      if (visualCritiques.length > 0) websiteScore += 10;
    }

    // Competitor analysis (10 points if enabled)
    if (modulesUsed.includes('competitor')) {
      if (result.competitor) websiteScore += 10;
    }

    // Calculate website grade (based on comprehensiveness of analysis)
    if (!hasContact) {
      websiteGrade = 'F';  // No contact = F regardless of analysis
    } else if (websiteScore >= 70) {
      websiteGrade = 'A';  // Comprehensive analysis with contact info
    } else if (websiteScore >= 50) {
      websiteGrade = 'B';  // Good analysis with contact info
    } else if (websiteScore >= 30) {
      websiteGrade = 'C';  // Basic analysis or missing some modules
    } else if (websiteScore >= 10) {
      websiteGrade = 'D';  // Minimal analysis
    } else {
      websiteGrade = 'F';  // Almost no analysis
    }

    // Store both grades in result
    result.websiteScore = websiteScore;
    result.websiteGrade = websiteGrade;
    result.leadGrade = leadGrade; // From QA Agent

    // 1. Save full analysis data as JSON (now includes BOTH grades!)
    const analysisData = {
      url: result.url,
      companyName: result.companyName,
      industry: result.industry,
      timestamp: new Date().toISOString(),
      // TWO SEPARATE GRADES:
      websiteScore: websiteScore,      // How comprehensive the analysis was
      websiteGrade: websiteGrade,      // A-F based on modules run + data extracted
      leadGrade: leadGrade,            // A-F from QA Agent (email quality)
      contact: result.contact,
      extractedContact: result.extractedContact,
      grokData: result.grokData,
      critiques: result.critiques,
      seo: result.seo,
      visual: result.visual,
      competitor: result.competitor,
      summary: result.summary,
      loadTime: result.loadTime,
      pagesAnalyzed: result.pagesAnalyzed,
      modulesUsed: result.modulesUsed,
      emailQA: result.emailQA || null  // QA review data (NEW!)
    };

    await fs.writeFile(
      path.join(folderPath, 'analysis-data.json'),
      JSON.stringify(analysisData, null, 2),
      'utf8'
    );
    
    // 2. Save formatted critiques as readable text
    const critiquesText = formatCritiquesAsText(result);
    await fs.writeFile(
      path.join(folderPath, 'critiques.txt'),
      critiquesText,
      'utf8'
    );

    // 3. Save email content
    if (result.email) {
      const emailContent = `Subject: ${result.email.subject}\n\n${result.email.body}`;
      await fs.writeFile(
        path.join(folderPath, 'email.txt'),
        emailContent,
        'utf8'
      );

      // 3b. Save critique reasoning (explains WHY each critique was made)
      if (result.critiqueReasoning) {
        await fs.writeFile(
          path.join(folderPath, 'critique-reasoning.txt'),
          result.critiqueReasoning,
          'utf8'
        );
      }

      // 3c. Save QA review (lead quality assessment)
      if (result.emailQA) {
        const qaText = `LEAD QUALITY REVIEW (QA Agent)
═══════════════════════════════════════════════════════════════

LEAD GRADE: ${result.emailQA.leadGrade || result.emailQA.grade}
Ready to Contact: ${result.emailQA.passed ? 'YES' : 'NO'}

NOTE: Lead Grade is separate from Website Grade
- Website Grade (${websiteGrade}): How comprehensive the analysis was (modules run + data quality)
- Lead Grade (${result.emailQA.leadGrade || result.emailQA.grade}): How good the outreach email is (this grade)

═══════════════════════════════════════════════════════════════

Summary: ${result.emailQA.summary}

${result.emailQA.issues && result.emailQA.issues.length > 0 ? `
❌ CRITICAL ISSUES (Lead Grade F - DO NOT CONTACT):
${result.emailQA.issues.map((issue, i) => `   ${i + 1}. ${issue}`).join('\n')}
` : ''}
${result.emailQA.warnings && result.emailQA.warnings.length > 0 ? `
⚠️  WARNINGS (Lead Grade B/C - review before contacting):
${result.emailQA.warnings.map((warning, i) => `   ${i + 1}. ${warning}`).join('\n')}
` : ''}
${result.emailQA.suggestions && result.emailQA.suggestions.length > 0 ? `
💡 SUGGESTIONS (Lead Grade A - nice-to-haves):
${result.emailQA.suggestions.map((suggestion, i) => `   ${i + 1}. ${suggestion}`).join('\n')}
` : ''}`;

        await fs.writeFile(
          path.join(folderPath, 'qa-review.txt'),
          qaText,
          'utf8'
        );
      }
    }

    // 4. Save client info summary (including blog posts for outreach hooks)
    const latestPost = grokData?.contentInfo?.recentPosts?.[0];
    const clientInfo = {
      companyName: result.companyName,
      url: result.url,
      industry: result.industry?.specific || grokData?.companyInfo?.industry || 'Unknown',
      location: grokData?.companyInfo?.location || 'Unknown',
      websiteScore: websiteScore,
      websiteGrade: websiteGrade,
      leadGrade: leadGrade,
      contact: {
        name: result.contact?.name || 'Unknown',
        email: result.contact?.email || grokData?.contactInfo?.email || 'Not found',
        phone: result.contact?.phone || grokData?.contactInfo?.phone || 'Not found',
        title: result.contact?.title || ''
      },
      recentBlogPost: latestPost ? {
        title: latestPost.title,
        date: latestPost.date,
        url: latestPost.url,
        summary: latestPost.summary
      } : null,
      hasActiveBlog: grokData?.contentInfo?.hasActiveBlog || false,
      socialProfiles: grokData?.socialProfiles || {},
      analyzedDate: new Date().toISOString(),
      emailSent: result.draft ? 'Draft created in Gmail' : 'Not sent'
    };
    
    await fs.writeFile(
      path.join(folderPath, 'client-info.json'),
      JSON.stringify(clientInfo, null, 2),
      'utf8'
    );

    // 5. Copy screenshot if it exists
    if (result.screenshot) {
      const screenshotName = path.basename(result.screenshot);
      const destPath = path.join(folderPath, screenshotName);
      try {
        await fs.copyFile(result.screenshot, destPath);
      } catch (err) {
        console.log('⚠️ Could not copy screenshot:', err.message);
      }
    }

    // Supabase save removed from here - now handled in main analyzeWebsites function (line 1364)
    // This avoids duplicate saves and ensures the full result object with all data is saved

    console.log(`\n💾 Analysis saved to: ${folderPath}`);
    console.log(`   📁 Folder: lead-${leadGrade}/${domain}/${timestamp}`);
    console.log(`   🎯 Lead Grade: ${leadGrade} | Website Grade: ${websiteGrade}`);
    return folderPath;
    
  } catch (error) {
    console.error('❌ Error saving analysis results:', error);
    return null;
  }
}

/**
 * Format critiques as human-readable text
 */
function formatCritiquesAsText(result) {
  let text = `WEBSITE ANALYSIS RESULTS\n`;
  text += `${'='.repeat(80)}\n\n`;
  text += `Company: ${result.companyName}\n`;
  text += `URL: ${result.url}\n`;
  text += `Industry: ${result.industry?.specific || 'Unknown'}\n`;
  text += `Analysis Date: ${new Date().toLocaleString()}\n`;
  text += `Pages Analyzed: ${result.pagesAnalyzed}\n`;
  text += `Modules Used: ${result.modulesUsed.join(', ')}\n`;
  text += `\n${'='.repeat(80)}\n\n`;
  
  // General Issues
  if (result.critiques.basic && result.critiques.basic.length > 0) {
    text += `GENERAL ISSUES (${result.critiques.basic.length})\n`;
    text += `${'-'.repeat(80)}\n`;
    result.critiques.basic.forEach((critique, i) => {
      text += `${i + 1}. ${critique}\n\n`;
    });
  }
  
  // Industry-Specific Issues
  if (result.critiques.industry && result.critiques.industry.length > 0) {
    text += `INDUSTRY-SPECIFIC ISSUES (${result.critiques.industry.length})\n`;
    text += `${'-'.repeat(80)}\n`;
    result.critiques.industry.forEach((critique, i) => {
      text += `${i + 1}. ${critique}\n\n`;
    });
  }
  
  // SEO Issues
  if (result.critiques.seo && result.critiques.seo.length > 0) {
    text += `SEO ISSUES (${result.critiques.seo.length})\n`;
    text += `${'-'.repeat(80)}\n`;
    result.critiques.seo.forEach((critique, i) => {
      text += `${i + 1}. ${critique}\n\n`;
    });
  }
  
  // Visual Issues
  if (result.critiques.visual && result.critiques.visual.length > 0) {
    text += `VISUAL DESIGN ISSUES (${result.critiques.visual.length})\n`;
    text += `${'-'.repeat(80)}\n`;
    result.critiques.visual.forEach((critique, i) => {
      text += `${i + 1}. ${critique}\n\n`;
    });
  }
  
  // Competitor Analysis
  if (result.critiques.competitor && result.critiques.competitor.length > 0) {
    text += `COMPETITOR ANALYSIS (${result.critiques.competitor.length})\n`;
    text += `${'-'.repeat(80)}\n`;
    result.critiques.competitor.forEach((critique, i) => {
      text += `${i + 1}. ${critique}\n\n`;
    });
  }
  
  // Email
  if (result.email) {
    text += `${'='.repeat(80)}\n\n`;
    text += `OUTREACH EMAIL\n`;
    text += `${'-'.repeat(80)}\n`;
    text += `Subject: ${result.email.subject}\n\n`;
    text += `${result.email.body}\n`;
  }
  
  return text;
}

/**
 * Extract contact information from website content
 * Returns { firstName, fullName, email } or defaults
 */

/**
 * Optionally humanize a templated email with one AI call
 * Returns { subject, body } or the original email if humanization fails
 */

/**
 * Generate critique reasoning for the user to understand WHY each critique was made
 * This helps the user review and customize the email with full context
 * Uses a cheap model (GPT-4o-mini or Haiku) to save costs
 */

/**
 * QA Review Agent - Determines LEAD QUALITY (separate from website quality)
 *
 * TWO TYPES OF GRADES:
 * - Website Quality (A-F): How much data we extracted (email, phone, services, etc.)
 * - Lead Quality (A-F): How good the outreach email is ← THIS AGENT DECIDES
 *
 * This agent has the FINAL SAY on whether a lead is worth contacting.
 * Even if website has all data (Website Grade A), if email is generic/fake/bad → Lead Grade F
 *
 * Uses a cheap model (GPT-4o-mini or Haiku) to save costs
 *
 * @param {Object} email - The generated email {subject, body}
 * @param {Object} context - Context about the analysis {modulesUsed, hasVisualAnalysis, grokData, companyName}
 * @param {Object} options - Options {aiTracker}
 * @returns {Object} - QA result {leadGrade, passed, issues[], warnings[], suggestions[]}
 */

/**
 * Analyze a single website with progress updates
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

  // Create AI call tracker for cost estimation
  const aiTracker = new AICallTracker();
  
  // Estimate total AI calls
  const estimatedCallsPerSite = 1 + // critique generation
    (options.modules?.industry ? 0.5 : 0) + // industry detection (sometimes cached)
    (options.modules?.visual ? 1 : 0) + // visual analysis
    (options.modules?.competitor ? 2 : 0) + // competitor discovery + analysis
    (!options.skipHumanize ? 1 : 0); // email humanization
  
  const estimatedTotalCalls = Math.ceil(urls.length * estimatedCallsPerSite);
  const estimatedCostPerCall = aiTracker.estimateCost(options.textModel || 'gpt-5-mini');
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

        // If homepage analysis failed, check if we can do social outreach instead
        if (homepageAnalysis.error) {
          console.error(`❌ Website failed ${url}: ${homepageAnalysis.error}`);
          await page.close();
          await context.close();

          // NEW: Try to save partial lead with social profiles for social outreach
          // This recovers value from failed website analyses!
          let savedPartialLead = false;

          try {
            // Determine website error type
            const errorType = homepageAnalysis.error.includes('SSL') ? 'ssl_error' :
                             homepageAnalysis.error.includes('Timeout') ? 'timeout' :
                             homepageAnalysis.error.includes('DNS') ? 'dns_error' : 'failed';

            // Build minimal lead data
            const partialLeadData = {
              url,
              website_grade: 'F',
              website_score: 0,
              website_status: errorType,
              website_error: homepageAnalysis.error.substring(0, 500), // Limit error length
              requires_social_outreach: false, // Will be true if we have social profiles
              analyzed_at: new Date().toISOString()
            };

            // Save partial lead (will be updated by saveLeadToSupabase if it has company data)
            await saveLeadToSupabase(partialLeadData);
            savedPartialLead = true;

            sendProgress({
              type: 'partial_lead_saved',
              url,
              message: `💾 Saved partial lead (website failed)`,
              websiteStatus: errorType
            });

          } catch (saveError) {
            console.error(`Failed to save partial lead: ${saveError.message}`);
          }

          // Add error result and continue
          results.push({
            url,
            error: homepageAnalysis.error,
            companyName: null,
            skipped: true,
            partialLeadSaved: savedPartialLead
          });

          sendProgress({
            type: 'site_error',
            url,
            error: homepageAnalysis.error,
            message: `❌ Skipped ${url} (error: ${homepageAnalysis.error})`
          });

          continue; // Skip to next site
        }

        // Step 2: Discover additional pages based on depth tier
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await page.waitForTimeout(2000); // Wait for dynamic content
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
        const critique = await generateCritique(combinedAnalysis, industry, seoResults, visualResults, competitorResults, sendProgress, { ...options, aiTracker });

        // Step 10.5: Analyze blog/news content for personalization insights (optional)
        let contentInsights = null;
        if (options.analyzeContent !== false && homepageAnalysis.grokData) {
          try {
            sendProgress({
              type: 'step',
              step: 'analyzing_content',
              message: `🤖 Analyzing blog/news content for insights...`,
              url
            });

            contentInsights = await analyzeContentInsights(
              homepageAnalysis.grokData,
              critique.companyName || 'Unknown',
              industry?.specific || 'Unknown',
              options.contentModel || 'grok-4-fast' // Cheapest model
            );

            sendProgress({
              type: 'step',
              step: 'content_analyzed',
              message: `✓ Content insights extracted`,
              url
            });

          } catch (e) {
            console.error('Content analysis failed:', e.message);
            contentInsights = { analyzed: false, error: e.message };
          }
        }

        // Step 11: Generate email (optional - skip if options.skipEmail === true)
        let email = null;
        let qaReview = null;

        if (!options.skipEmail) {
          sendProgress({
            type: 'step',
            step: 'generating_email',
            message: `⏳ Generating email template...`,
            url
          });

          // Note: Email generation has been removed and moved to email-composer service
          // This section is skipped when options.skipEmail === true
          console.log('⏭️  Email generation skipped (handled by email-composer service)');
        }

        // Gmail Drafts integration removed (email generation moved to email-composer)
        let draftResult = null;

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
          emailWriting: true,    // Always runs
          critiqueReasoning: true,  // Always runs
          qaReview: true,        // Always runs

          pagesAnalyzed: allAnalyses.length,
        };

        const { totalCost, breakdown: costDetails } = calculateTotalCost(costBreakdown);

        const result = {
          url,
          companyName: critique.companyName,
          contact: bestContact || null,
          extractedContact: homepageAnalysis.contact || null, // Contact info from homepage analysis
          grokData: homepageAnalysis.grokData || null, // NEW: Include full Grok extraction data
          contentInsights: contentInsights || null, // NEW: Blog/news content analysis for personalization
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
          email: email,
          emailQA: qaReview || null, // QA review of email quality
          draft: draftResult,
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

        // Generate critique reasoning (using cheap model) for user reference
        // This must happen AFTER result object is created
        if (!options.skipHumanize && email) {
          try {
            const personalizationContext = {
              grokData: homepageAnalysis.grokData,
              industry: industry,
              hasVisualAnalysis: !!visualResults,
              hasSEOAnalysis: !!seoResults,
              hasCompetitorAnalysis: !!competitorResults,
              pagesAnalyzed: allAnalyses.length,
              depthTier: depthTier,
              qualityScore: qualityScore,
              qualityGrade: qualityGrade
            };

            const reasoning = await generateCritiqueReasoning(email, critique, personalizationContext, {
              ...options,
              aiTracker
            });
            result.critiqueReasoning = reasoning;
          } catch (e) {
            console.error('Critique reasoning generation failed:', e.message);
            result.critiqueReasoning = 'Reasoning generation failed';
          }
        }

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
    const costSummary = aiTracker.getSummary();
    sendProgress({
      type: 'cost_summary',
      totalCalls: costSummary.totalCalls,
      totalCost: costSummary.estimatedCost,
      totalInputTokens: costSummary.totalInputTokens,
      totalOutputTokens: costSummary.totalOutputTokens,
      message: `✅ Analysis complete: ${costSummary.totalCalls} AI calls, $${costSummary.estimatedCost.toFixed(4)} total cost`
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

/**
 * Analyze prospects from Supabase with social media enrichment
 * Fetches prospects → analyzes websites → scrapes social media → saves to leads table
 *
 * @param {Object} options - Analysis options
 * @param {number} options.limit - Max number of prospects to fetch (default: 10)
 * @param {string} options.industry - Filter by industry (optional)
 * @param {string} options.city - Filter by city (optional)
 * @param {string} options.runId - Filter by run_id (optional)
 * @param {boolean} options.enrichSocial - Whether to scrape social media (default: true)
 * @param {Function} sendProgress - Progress callback function
 * @returns {Promise<Object>} Analysis results
 */
export async function analyzeProspectsFromSupabase(options = {}, sendProgress = () => {}) {
  console.log('\n🔍 Starting prospect-driven analysis from Supabase...\n');

  try {
    // Fetch prospects from Supabase
    sendProgress({
      type: 'fetching_prospects',
      message: '📥 Fetching prospects from Supabase...'
    });

    const prospects = await getProspectsForAnalysis({
      limit: options.limit || 10,
      status: 'pending_analysis',
      industry: options.industry || null,
      city: options.city || null,
      runId: options.runId || null
    });

    if (prospects.length === 0) {
      console.log('ℹ️  No prospects found for analysis');
      return {
        success: true,
        prospectsFound: 0,
        analyzed: 0,
        results: []
      };
    }

    console.log(`✅ Found ${prospects.length} prospects to analyze`);

    sendProgress({
      type: 'prospects_found',
      count: prospects.length,
      message: `✅ Found ${prospects.length} prospects to analyze`
    });

    // Extract URLs from prospects
    const urls = prospects.map(p => p.website);

    // Analyze websites using existing analyzeWebsites function
    const analysisResults = await analyzeWebsites(urls, {
      ...options,
      // Disable email generation (moved to separate app)
      skipEmail: true,
      skipQA: true,
      // Add metadata for tracking
      metadata: {
        sourceApp: 'website-audit-tool',
        source: 'prospects-table'
      }
    }, sendProgress);

    // Enrich with social media data and link prospects to leads
    const browser = await chromium.launch({ headless: true });

    for (let i = 0; i < analysisResults.length; i++) {
      const result = analysisResults[i];
      const prospect = prospects[i];

      if (result.error) {
        console.log(`⚠️  Website failed for ${result.url}: ${result.error}`);

        // NEW: Even if website failed, try to save social profiles for social outreach!
        if (prospect.social_profiles) {
          try {
            console.log(`💡 Website broken, but prospect has social profiles → Flagging for social outreach`);

            // Update the partial lead with prospect data and social profiles
            await saveLeadToSupabase({
              url: result.url,
              company_name: prospect.company_name || 'Unknown',
              industry: prospect.industry,
              location: prospect.city || null,
              website_grade: 'F',
              website_score: 0,
              website_status: result.error.includes('SSL') ? 'ssl_error' :
                             result.error.includes('Timeout') ? 'timeout' :
                             result.error.includes('DNS') ? 'dns_error' : 'failed',
              website_error: result.error.substring(0, 500),
              requires_social_outreach: true, // ← FLAG FOR SOCIAL OUTREACH!
              social_profiles: prospect.social_profiles, // Save social profiles from prospects table
              analyzed_at: new Date().toISOString(),
              // Add prospect context
              metadata: {
                prospectId: prospect.id,
                runId: prospect.run_id,
                whyNow: prospect.why_now,
                teaser: prospect.teaser,
                sourceApp: 'website-audit-tool'
              }
            });

            // Link prospect to lead
            await linkProspectToLead(prospect.id, result.url);

            console.log(`✅ Saved for social outreach: ${prospect.company_name} (${Object.keys(prospect.social_profiles).filter(k => prospect.social_profiles[k]).join(', ')})`);

            sendProgress({
              type: 'social_outreach_flagged',
              url: result.url,
              companyName: prospect.company_name,
              message: `💡 ${prospect.company_name} → Flagged for social outreach (website broken)`,
              socialPlatforms: Object.keys(prospect.social_profiles).filter(k => prospect.social_profiles[k])
            });

          } catch (saveError) {
            console.error(`Failed to save for social outreach: ${saveError.message}`);
          }
        }

        continue; // Skip to next prospect
      }

      try {
        sendProgress({
          type: 'enriching_social',
          url: result.url,
          message: `🔗 Enriching social media data for ${prospect.company_name || result.url}...`
        });

        // Create new browser context for social scraping
        const context = await browser.newContext({
          viewport: { width: 1920, height: 1080 },
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        });
        const page = await context.newPage();

        // Navigate to website
        await page.goto(result.url, {
          waitUntil: 'domcontentloaded',
          timeout: 30000
        });

        // Extract social profiles from website
        const websiteProfiles = await extractSocialProfiles(page, result.url);

        // Enrich social profiles (scrape Instagram, Facebook, LinkedIn)
        let scrapedProfiles = null;
        if (options.enrichSocial !== false) {
          scrapedProfiles = await enrichSocialProfiles(page, prospect.social_profiles);

          // Optionally analyze social presence with cheap AI
          if (scrapedProfiles && (options.analyzeSocial !== false)) {
            const socialAnalysis = await analyzeSocialPresence(
              scrapedProfiles,
              prospect.company_name || result.companyName,
              prospect.industry,
              options.socialModel || 'grok-4-fast' // Cheapest model
            );
            result.socialAnalysis = socialAnalysis;
          }
        }

        // Merge all social profile data
        result.grokData.socialProfiles = mergeSocialProfiles(
          prospect.social_profiles,
          websiteProfiles?.profiles,
          scrapedProfiles
        );

        // Add prospect context to result
        result.metadata = {
          ...result.metadata,
          prospectId: prospect.id,
          runId: prospect.run_id,
          whyNow: prospect.why_now,
          teaser: prospect.teaser,
          briefSnapshot: prospect.brief_snapshot
        };

        // Save to Supabase
        await saveLeadToSupabase(result);

        // Link prospect to lead
        await linkProspectToLead(prospect.id, result.url);

        console.log(`✅ Enriched and saved: ${prospect.company_name || result.url}`);

        sendProgress({
          type: 'social_enriched',
          url: result.url,
          message: `✅ Social data enriched for ${prospect.company_name || result.url}`
        });

        await page.close();
        await context.close();

      } catch (error) {
        console.error(`❌ Social enrichment failed for ${result.url}:`, error.message);
        sendProgress({
          type: 'social_error',
          url: result.url,
          error: error.message,
          message: `⚠️  Social enrichment failed: ${error.message}`
        });
      }
    }

    await browser.close();

    console.log(`\n✅ Prospect analysis complete: ${analysisResults.length} prospects analyzed\n`);

    sendProgress({
      type: 'analysis_complete',
      count: analysisResults.length,
      message: `✅ Analysis complete: ${analysisResults.length} prospects analyzed`
    });

    return {
      success: true,
      prospectsFound: prospects.length,
      analyzed: analysisResults.length,
      results: analysisResults
    };

  } catch (error) {
    console.error('❌ Prospect analysis failed:', error);
    sendProgress({
      type: 'error',
      error: error.message,
      message: `❌ Analysis failed: ${error.message}`
    });
    throw error;
  }
}
