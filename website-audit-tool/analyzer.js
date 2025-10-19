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
        const critique = await generateCritique(combinedAnalysis, industry, seoResults, visualResults, competitorResults, sendProgress, { ...options, aiTracker });

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
