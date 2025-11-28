/**
 * Prospecting Pipeline Orchestrator
 *
 * Coordinates all 7 steps of the prospecting pipeline:
 * 1. Query Understanding (LLM)
 * 2. Google Maps Discovery
 * 3. Website Verification
 * 4. Website Data Extraction (Playwright + Grok)
 * 5. Social Profile Discovery
 * 6. Social Media Scraping
 * 7. ICP Relevance Check
 *
 * Phase 2: Steps 1-3 ✅ COMPLETE
 * Phase 3: Steps 4-6 ✅ COMPLETE
 * Phase 4: Steps 1 & 7 ✅ COMPLETE (AI-powered)
 */

import { v4 as uuidv4 } from 'uuid';
import { discoverCompanies } from './discoverers/google-maps.js';
import { runIterativeDiscovery } from './services/iterative-discovery.js';
import { verifyWebsite, understandQuery, checkRelevance } from './validators/index.js';
import { scrapeWebsite, closeBrowser as closeScraperBrowser } from './extractors/website-scraper.js';
import { extractWebsiteData } from './extractors/grok-extractor.js';
import { extractFromDOM } from './extractors/dom-scraper.js';
import { findSocialProfiles } from './enrichers/social-finder.js';
import { scrapeSocialMetadata, closeBrowser as closeSocialBrowser } from './enrichers/social-scraper.js';
import { saveOrLinkProspect, prospectExistsInProject, getProjectIcpBrief, saveProjectIcpAndPrompts } from './database/supabase-client.js';
import { logInfo, logError, logWarn, logStepStart, logStepComplete } from './shared/logger.js';
import { costTracker } from './shared/cost-tracker.js';
import { loadAllProspectingPrompts } from './shared/prompt-loader.js';
import { saveLocalBackup, markAsUploaded, markAsFailed } from './utils/local-backup.js';
import { classifyError } from './shared/error-classifier.js';
import {
  buildProspectData,
  calculateDaysSinceReview,
  shouldFilterAsInactive,
  buildModelsUsed,
  buildFinalProspect
} from './pipeline/pipeline-helpers.js';

/**
 * Run the full prospecting pipeline
 *
 * @param {object} brief - ICP brief
 * @param {object} options - Pipeline options
 * @param {string} options.model - AI model to use for text-based AI steps (optional)
 * @param {string} options.visionModel - AI model to use for vision-based extraction (optional)
 * @param {object} options.customPrompts - Custom prompts for AI steps (optional)
 * @param {function} onProgress - Progress callback for SSE
 * @returns {Promise<object>} Results summary
 */
export async function runProspectingPipeline(brief, options = {}, onProgress = null) {
  const { customPrompts } = options;
  const startTime = Date.now();
  const runId = uuidv4();

  // Reset cost tracker for this run
  costTracker.reset();

  const results = {
    runId,
    found: 0,
    verified: 0,
    saved: 0,
    skipped: 0,
    filteredInactive: 0, // Count of prospects skipped due to being inactive/closed
    failed: 0,
    cost: 0,
    timeMs: 0,
    prospects: []
  };

  // Fetch project's ICP brief if projectId is provided (for snapshot locking)
  let projectIcpBrief = null;
  if (options.projectId) {
    try {
      projectIcpBrief = await getProjectIcpBrief(options.projectId);
      if (projectIcpBrief) {
        logInfo('Fetched project ICP brief for snapshot', {
          projectId: options.projectId,
          industry: projectIcpBrief.industry
        });
      } else {
        logInfo('Project ICP brief not found, saving provided brief to project', {
          projectId: options.projectId
        });

        // Save the ICP brief AND prompts to the project BEFORE linking any prospects
        // This ensures the ICP is saved while the project still has 0 prospects (unlocked)
        try {
          // Load all prospecting prompts
          const prospectingPrompts = loadAllProspectingPrompts();

          // Save both ICP brief and prompts
          await saveProjectIcpAndPrompts(options.projectId, brief, prospectingPrompts);
          logInfo('Successfully saved ICP brief and prompts to project', {
            projectId: options.projectId,
            industry: brief.industry,
            promptCount: Object.keys(prospectingPrompts).length
          });
        } catch (saveError) {
          logWarn('Failed to save ICP brief and prompts to project (continuing with generation)', {
            projectId: options.projectId,
            error: saveError.message
          });
        }

        projectIcpBrief = brief; // Use provided brief for snapshots
      }
    } catch (error) {
      logWarn('Failed to fetch project ICP brief, using provided brief', {
        projectId: options.projectId,
        error: error.message
      });
      projectIcpBrief = brief; // Fallback to provided brief
    }
  } else {
    // No project specified, use the brief parameter as snapshot
    projectIcpBrief = brief;
  }

  try {
    logInfo('Starting prospecting pipeline', {
      runId,
      city: brief.city,
      industry: brief.industry,
      count: brief.count
    });

    // ═════════════════════════════════════════════════════════════
    // STEP 1: Query Understanding (AI-Powered)
    // ═════════════════════════════════════════════════════════════

    logStepStart(1, 'Query Understanding');
    const step1Start = Date.now();
    const query = await understandQuery(brief, {
      modelOverride: options.model,
      customPrompt: customPrompts?.queryUnderstanding
    });
    logStepComplete(1, 'Query Understanding', Date.now() - step1Start, { query });

    // Store AI metadata for later (will be saved with each prospect)
    const aiMetadata = {
      discoveryQuery: query,
      queryGenerationModel: options.model || customPrompts?.queryUnderstanding?.model || 'grok-4-fast',
      icpBriefSnapshot: projectIcpBrief,
      promptsSnapshot: customPrompts || loadAllProspectingPrompts(),
      modelSelectionsSnapshot: options.modelSelections || null
    };

    if (onProgress) {
      onProgress({
        type: 'step',
        step: 1,
        name: 'query-understanding',
        status: 'completed',
        query
      });
    }

    // ═════════════════════════════════════════════════════════════
    // STEP 2: Google Maps Discovery
    // ═════════════════════════════════════════════════════════════

    logStepStart(2, 'Google Maps Discovery');
    const step2Start = Date.now();

    if (onProgress) {
      onProgress({
        type: 'step',
        step: 2,
        name: 'google-maps-discovery',
        status: 'started'
      });
    }

    let companies = [];

    // Use iterative discovery if enabled and projectId is provided
    if (options.useIterativeDiscovery && options.projectId) {
      logInfo('Using iterative multi-query discovery', {
        targetCount: brief.count || 50,
        projectId: options.projectId
      });

      const discoveryResult = await runIterativeDiscovery(query, {
        projectId: options.projectId,
        targetCount: brief.count || 50,
        maxIterations: options.maxIterations || 5,
        maxVariationsPerIteration: options.maxVariationsPerIteration || 7,
        minRating: options.minRating || 3.5,
        onProgress: (progressData) => {
          if (onProgress) {
            onProgress({
              type: 'discovery_progress',
              step: 2,
              ...progressData
            });
          }
        }
      });

      companies = discoveryResult.prospects;
      logInfo('Iterative discovery complete', {
        found: companies.length,
        iterations: discoveryResult.iterations,
        queriesExecuted: discoveryResult.queriesExecuted,
        success: discoveryResult.success
      });
    } else {
      // Use single-query discovery (backward compatible)
      companies = await discoverCompanies(query, {
        minRating: options.minRating || 3.5,
        maxResults: brief.count || 20,
        projectId: options.projectId // Pass project ID for smart filtering
      });
    }

    results.found = companies.length;
    logStepComplete(2, 'Google Maps Discovery', Date.now() - step2Start, {
      found: companies.length
    });

    if (onProgress) {
      onProgress({
        type: 'step',
        step: 2,
        status: 'completed',
        found: companies.length
      });
    }

    if (companies.length === 0) {
      logInfo('No companies found, ending pipeline', { query });
      results.timeMs = Date.now() - startTime;
      return results;
    }

    // ═════════════════════════════════════════════════════════════
    // STEP 3: Process Each Company
    // ═════════════════════════════════════════════════════════════

    logInfo('Starting STEP 3: Process Each Company', {
      totalCompanies: companies.length,
      options: {
        verifyWebsites: options.verifyWebsites !== false,
        scrapeWebsites: options.scrapeWebsites !== false,
        findSocialProfiles: options.findSocialProfiles !== false,
        scrapeSocialData: options.scrapeSocialData !== false,
        checkRelevance: options.checkRelevance !== false,
        filterIrrelevant: options.filterIrrelevant === true
      }
    });

    for (let i = 0; i < companies.length; i++) {
      const company = companies[i];

      try {
        if (onProgress) {
          onProgress({
            type: 'progress',
            current: i + 1,
            total: companies.length,
            company: company.name,
            step: 'processing'
          });
        }

        logInfo('Processing company', {
          company: company.name,
          progress: `${i + 1}/${companies.length}`
        });

        // Check if prospect already exists in THIS project
        if (company.googlePlaceId) {
          const existsInProject = await prospectExistsInProject(
            company.googlePlaceId,
            options.projectId // Will check globally if no projectId provided
          );
          if (existsInProject) {
            logInfo('Prospect already exists in this project, skipping', {
              company: company.name,
              projectId: options.projectId || 'global'
            });
            results.skipped++;
            continue;
          }
        }

        // STEP 3: Verify Website
        let websiteStatus = 'no_website';
        let websiteData = null;
        let extractedData = null;
        let crawlErrorDetails = null;

        if (company.website && options.verifyWebsites !== false) {
          const verification = await verifyWebsite(company.website);
          websiteStatus = verification.status;

          if (!verification.accessible) {
            logInfo('Website not accessible', {
              company: company.name,
              status: websiteStatus
            });
          } else {
            results.verified++;

            // STEP 4: Scrape & Extract Website Data (if accessible and enabled)
            if (options.scrapeWebsites !== false) {
              try {
                logInfo('Scraping website', { company: company.name, url: company.website });

                // Scrape website with Playwright (get screenshot + page object)
                websiteData = await scrapeWebsite(company.website, {
                  timeout: 30000,
                  screenshotDir: './screenshots',
                  fullPage: options.fullPageScreenshots !== false  // Default true, can opt-out
                });

                if (websiteData.status === 'success') {
                  // HYBRID APPROACH: DOM Scraper (Primary) + Grok Vision (Fallback)

                  // Step 4a: Try DOM scraping first (fast, free, reliable)
                  logInfo('Extracting data with DOM scraper', { company: company.name });

                  extractedData = await extractFromDOM(
                    websiteData.page,
                    company.website,
                    company.name,
                    company.industry || 'general'
                  );

                  logInfo('DOM extraction complete', {
                    company: company.name,
                    confidence: extractedData.confidence,
                    hasEmail: !!extractedData.contact_email,
                    hasPhone: !!extractedData.contact_phone,
                    servicesCount: extractedData.services?.length || 0,
                    pagesVisited: extractedData.pages_visited?.length || 1
                  });

                  // Step 4b: Use Vision AI as fallback (only if very low confidence)
                  if (extractedData.confidence < 40 && options.useGrokFallback !== false) {
                    logInfo('Very low confidence, using Vision AI fallback', {
                      company: company.name,
                      confidence: extractedData.confidence
                    });

                    const grokData = await extractWebsiteData(
                      company.website,
                      websiteData.screenshot,
                      company.name,
                      {
                        modelOverride: options.visionModel,
                        customPrompt: customPrompts?.websiteExtraction
                      }
                    );

                    if (grokData.extractionStatus === 'success') {
                      // Merge Grok data with DOM data (fill in gaps)
                      extractedData.contact_email = extractedData.contact_email || grokData.contact_email;
                      extractedData.contact_phone = extractedData.contact_phone || grokData.contact_phone;
                      extractedData.description = extractedData.description || grokData.description;

                      if (extractedData.services.length === 0 && grokData.services?.length > 0) {
                        extractedData.services = grokData.services;
                      }

                      // Recalculate confidence after merge
                      extractedData.confidence = Math.min(
                        extractedData.confidence + 20,
                        100
                      );

                      logInfo('Vision AI fallback applied', {
                        company: company.name,
                        newConfidence: extractedData.confidence
                      });
                    }
                  }

                  extractedData.extractionStatus = 'success';

                  logInfo('Data extraction complete', {
                    company: company.name,
                    method: extractedData.confidence >= 40 ? 'DOM only' : 'DOM + Vision AI',
                    hasEmail: !!extractedData.contact_email,
                    hasPhone: !!extractedData.contact_phone,
                    services: extractedData.services?.length || 0
                  });

                  results.websitesScraped++;

                  // Close the page now that we're done with it
                  if (websiteData.page) {
                    await websiteData.page.close();
                  }
                } else {
                  // Website scraping failed - classify error and save details
                  const errorDetails = classifyError(websiteData.error || 'Unknown error');

                  logWarn('Website scraping failed - saving error details', {
                    company: company.name,
                    error_type: errorDetails.error_type,
                    website_status: errorDetails.website_status
                  });

                  // Update websiteStatus to reflect the error
                  websiteStatus = errorDetails.website_status;

                  // Save error details to be included in prospect data
                  crawlErrorDetails = {
                    error_type: errorDetails.error_type,
                    error_message: errorDetails.error_message,
                    failed_at: new Date().toISOString(),
                    retry_count: 0
                  };
                }
              } catch (error) {
                logError('Website scraping/extraction failed', error, {
                  company: company.name
                });

                // Classify the exception error
                const errorDetails = classifyError(error.message);
                websiteStatus = errorDetails.website_status;

                crawlErrorDetails = {
                  error_type: errorDetails.error_type,
                  error_message: errorDetails.error_message,
                  failed_at: new Date().toISOString(),
                  retry_count: 0
                };

                // Close page on error too
                if (websiteData?.page) {
                  try {
                    await websiteData.page.close();
                  } catch (e) {
                    // Ignore close errors
                  }
                }
              }
            }
          }
        }

        // STEP 5: Find Social Profiles
        let socialProfiles = {};
        if (options.findSocial !== false) {
          try {
            logInfo('Finding social profiles', { company: company.name });

            socialProfiles = await findSocialProfiles(company, {
              socialLinks: websiteData?.socialLinks,
              social_links: extractedData?.social_links
            });

            const foundCount = Object.keys(socialProfiles).filter(k => socialProfiles[k]).length;
            if (foundCount > 0) {
              logInfo('Social profiles found', {
                company: company.name,
                count: foundCount,
                platforms: Object.keys(socialProfiles).filter(k => socialProfiles[k])
              });
            }
          } catch (error) {
            logError('Social profile discovery failed', error, {
              company: company.name
            });
          }
        }

        // Merge social profiles from Google Maps (if any)
        if (company.social_profiles_from_google) {
          Object.assign(socialProfiles, company.social_profiles_from_google);
          logInfo('Merged social profiles from Google Maps', {
            company: company.name,
            platforms: Object.keys(company.social_profiles_from_google)
          });
        }

        // STEP 6: Scrape Social Metadata (if enabled)
        let socialMetadata = {};
        if (options.scrapeSocial !== false && Object.values(socialProfiles).some(Boolean)) {
          try {
            logInfo('Scraping social metadata', { company: company.name });

            socialMetadata = await scrapeSocialMetadata(socialProfiles);

            const scrapedCount = Object.keys(socialMetadata).length;
            if (scrapedCount > 0) {
              logInfo('Social metadata scraped', {
                company: company.name,
                count: scrapedCount
              });
            }
          } catch (error) {
            logError('Social scraping failed', error, {
              company: company.name
            });
          }
        }

        // Build prospect object (before relevance check)
        const prospectData = buildProspectData(
          company,
          websiteStatus,
          extractedData,
          socialProfiles,
          socialMetadata,
          crawlErrorDetails
        );

        // STEP 7: ICP Relevance Check (AI-powered)
        let icpScore = null;
        let isRelevant = true;
        let relevanceReasoning = null;

        if (options.checkRelevance !== false) {
          try {
            logInfo('Checking ICP relevance', { company: company.name });

            const relevanceResult = await checkRelevance(prospectData, brief, {
              modelOverride: options.model,
              customPrompt: customPrompts?.relevanceCheck
            });

            icpScore = relevanceResult.score;
            isRelevant = relevanceResult.isRelevant;
            relevanceReasoning = relevanceResult.reasoning; // Capture AI's explanation

            logInfo('ICP relevance determined', {
              company: company.name,
              score: icpScore,
              is_relevant: isRelevant,
              reasoning: relevanceReasoning
            });

            // If not relevant and filtering is enabled, skip this prospect
            if (!isRelevant && options.filterIrrelevant === true) {
              logInfo('Skipping irrelevant prospect', {
                company: company.name,
                score: icpScore
              });
              results.skipped++;
              continue;
            }
          } catch (error) {
            logError('Relevance check failed', error, {
              company: company.name
            });
            // Continue saving prospect even if relevance check fails
          }
        }

        // ========================================
        // QUALITY FILTER: Skip inactive/closed businesses
        // ========================================
        const daysSinceLastReview = calculateDaysSinceReview(company.mostRecentReviewDate, company.name);
        const filterResult = shouldFilterAsInactive(websiteStatus, daysSinceLastReview, company.rating);

        if (filterResult) {
          logInfo(`Skipping inactive prospect (${filterResult.filter})`, {
            company: company.name,
            websiteStatus,
            daysSinceLastReview: daysSinceLastReview === null ? 'never' : daysSinceLastReview,
            rating: company.rating || 'none',
            reason: filterResult.reason
          });
          results.skipped++;
          results.filteredInactive = (results.filteredInactive || 0) + 1;
          continue;
        }

        // Track actual models used for this prospect
        const modelsUsed = buildModelsUsed(options, customPrompts);

        // Add relevance data to prospect
        const prospect = buildFinalProspect(
          prospectData,
          { icpScore, isRelevant },
          {
            projectIcpBrief,
            modelsUsed,
            customPrompts,
            runId,
            startTime,
            source: 'prospecting-engine'
          }
        );

        // BACKUP WORKFLOW: Save locally FIRST, then upload to database
        let backupPath = null;
        try {
          // Step 1: Save local backup BEFORE attempting database upload
          logInfo('Saving local backup', { company: prospect.company_name });
          backupPath = await saveLocalBackup(prospect);

          if (backupPath) {
            logInfo('Local backup saved', {
              company: prospect.company_name,
              backupPath: backupPath.split(/[\\/]/).pop()
            });
          }

          // Step 2: Upload to database (or link to project if exists globally)
          // Include AI metadata so it's saved in project_prospects table
          const savedProspect = await saveOrLinkProspect(
            prospect,
            options.projectId, // Link to project if specified
            {
              run_id: runId,
              discovery_query: aiMetadata.discoveryQuery,
              query_generation_model: aiMetadata.queryGenerationModel,
              icp_brief_snapshot: aiMetadata.icpBriefSnapshot,
              prompts_snapshot: aiMetadata.promptsSnapshot,
              model_selections_snapshot: aiMetadata.modelSelectionsSnapshot,
              relevance_reasoning: relevanceReasoning,
              discovery_cost_usd: 0, // Will calculate per-prospect cost later
              discovery_time_ms: Date.now() - startTime
            }
          );

          results.saved++;
          results.prospects.push(savedProspect);

          // Step 3: Mark backup as successfully uploaded
          if (backupPath) {
            await markAsUploaded(backupPath, savedProspect.id);
          }

          logInfo('Prospect saved/linked', {
            id: savedProspect.id,
            company: savedProspect.company_name,
            projectId: options.projectId || 'none',
            hasBackup: !!backupPath
          });

        } catch (dbError) {
          // Step 4: If database save fails, mark backup as failed
          if (backupPath) {
            await markAsFailed(backupPath, dbError);
            logError('Prospect saved to backup but failed to upload to database', dbError, {
              company: prospect.company_name,
              backupPath: backupPath.split(/[\\/]/).pop()
            });
          } else {
            logError('Failed to save prospect (no backup created)', dbError, {
              company: prospect.company_name
            });
          }

          // Re-throw to count as failed
          throw dbError;
        }

      } catch (error) {
        logError('Failed to process company', error, { company: company.name });
        results.failed++;
      }
    }

    // ═════════════════════════════════════════════════════════════
    // FINALIZE
    // ═════════════════════════════════════════════════════════════

    // Close browser instances
    try {
      await closeScraperBrowser();
      await closeSocialBrowser();
    } catch (error) {
      logWarn('Failed to close browsers', { error: error.message });
    }

    results.timeMs = Date.now() - startTime;
    results.cost = parseFloat(costTracker.getSummary().costs.total);

    // Update discovery cost for each prospect
    if (results.saved > 0) {
      const costPerProspect = results.cost / results.saved;
      // Note: In production, we'd update each prospect's discovery_cost field here
    }

    logInfo('Prospecting pipeline complete', results);

    if (onProgress) {
      onProgress({
        type: 'complete',
        data: results,
        timestamp: new Date().toISOString()
      });
    }

    // Print cost summary
    costTracker.printSummary();

    return results;

  } catch (error) {
    logError('Prospecting pipeline failed', error);
    throw error;
  }
}

/**
 * Build search query from ICP brief
 * (Simple template-based for Phase 2, will be LLM-powered in Phase 4)
 *
 * @param {object} brief - ICP brief
 * @returns {string} Search query
 */
function buildSearchQuery(brief) {
  const { industry, city, target } = brief;

  // If target is provided, use it directly
  if (target) {
    return city ? `${target} in ${city}` : target;
  }

  // Otherwise build from industry and city
  if (city) {
    return `${industry} in ${city}`;
  }

  return industry;
}

/**
 * Look up a single business without requiring an ICP
 *
 * @param {string} query - Business name, website URL, or Google Place ID
 * @param {object} options - Lookup options
 * @param {string} options.projectId - Optional project ID to link prospect to
 * @param {boolean} options.scrapeWebsite - Whether to scrape website (default: true)
 * @param {boolean} options.findSocial - Whether to find social profiles (default: true)
 * @param {boolean} options.scrapeSocial - Whether to scrape social metadata (default: false for speed)
 * @param {boolean} options.fullPageScreenshots - Whether to take full page screenshots (default: false for speed)
 * @param {string} options.visionModel - AI model to use for vision-based extraction (optional)
 * @returns {Promise<object>} Enriched prospect data
 */
export async function lookupSingleBusiness(query, options = {}) {
  const startTime = Date.now();
  const runId = uuidv4();

  // Reset cost tracker for this run
  costTracker.reset();

  logInfo('Starting single business lookup', {
    runId,
    query,
    projectId: options.projectId || 'none'
  });

  try {
    // ═════════════════════════════════════════════════════════════
    // STEP 1: SKIPPED (No ICP query understanding needed)
    // ═════════════════════════════════════════════════════════════

    // ═════════════════════════════════════════════════════════════
    // STEP 2: Google Maps Discovery (Direct Query)
    // ═════════════════════════════════════════════════════════════

    logStepStart(2, 'Google Maps Discovery');
    const step2Start = Date.now();

    const companies = await discoverCompanies(query, {
      minRating: 0, // No rating filter for single lookup
      maxResults: 1, // Only find one business
      projectId: options.projectId
    });

    logStepComplete(2, 'Google Maps Discovery', Date.now() - step2Start, {
      found: companies.length
    });

    if (companies.length === 0) {
      throw new Error('Business not found in Google Maps');
    }

    const company = companies[0];
    logInfo('Business found', {
      company: company.name,
      city: company.city,
      rating: company.rating
    });

    // ═════════════════════════════════════════════════════════════
    // STEP 3: Website Verification
    // ═════════════════════════════════════════════════════════════

    let websiteStatus = 'no_website';
    let websiteData = null;
    let extractedData = null;
    let crawlErrorDetails = null;

    if (company.website && options.scrapeWebsite !== false) {
      const verification = await verifyWebsite(company.website);
      websiteStatus = verification.status;

      if (verification.accessible) {
        logInfo('Website accessible', {
          company: company.name,
          url: company.website
        });

        // ═════════════════════════════════════════════════════════════
        // STEP 4: Website Scraping & Extraction
        // ═════════════════════════════════════════════════════════════

        try {
          logInfo('Scraping website', { company: company.name, url: company.website });

          websiteData = await scrapeWebsite(company.website, {
            timeout: 30000,
            screenshotDir: './screenshots',
            fullPage: options.fullPageScreenshots !== false
          });

          if (websiteData.status === 'success') {
            // Try DOM scraping first (fast, free, reliable)
            logInfo('Extracting data with DOM scraper', { company: company.name });

            extractedData = await extractFromDOM(
              websiteData.page,
              company.website,
              company.name,
              company.industry || 'general'
            );

            logInfo('DOM extraction complete', {
              company: company.name,
              confidence: extractedData.confidence,
              hasEmail: !!extractedData.contact_email,
              hasPhone: !!extractedData.contact_phone,
              servicesCount: extractedData.services?.length || 0
            });

            // Use Vision AI as fallback if confidence is very low
            if (extractedData.confidence < 40 && options.useGrokFallback !== false) {
              logInfo('Very low confidence, using Vision AI fallback', {
                company: company.name,
                confidence: extractedData.confidence
              });

              const grokData = await extractWebsiteData(
                company.website,
                websiteData.screenshot,
                company.name,
                {
                  modelOverride: options.visionModel
                }
              );

              if (grokData.extractionStatus === 'success') {
                // Merge Grok data with DOM data
                extractedData.contact_email = extractedData.contact_email || grokData.contact_email;
                extractedData.contact_phone = extractedData.contact_phone || grokData.contact_phone;
                extractedData.description = extractedData.description || grokData.description;

                if (extractedData.services.length === 0 && grokData.services?.length > 0) {
                  extractedData.services = grokData.services;
                }

                extractedData.confidence = Math.min(extractedData.confidence + 20, 100);

                logInfo('Vision AI fallback applied', {
                  company: company.name,
                  newConfidence: extractedData.confidence
                });
              }
            }

            extractedData.extractionStatus = 'success';

            // Close the page
            if (websiteData.page) {
              await websiteData.page.close();
            }
          } else {
            // Website scraping failed - classify error and save details
            const errorDetails = classifyError(websiteData.error || 'Unknown error');

            logWarn('Website scraping failed - saving error details', {
              company: company.name,
              error_type: errorDetails.error_type,
              website_status: errorDetails.website_status
            });

            // Update websiteStatus to reflect the error
            websiteStatus = errorDetails.website_status;

            // Save error details
            crawlErrorDetails = {
              error_type: errorDetails.error_type,
              error_message: errorDetails.error_message,
              failed_at: new Date().toISOString(),
              retry_count: 0
            };
          }
        } catch (error) {
          logError('Website scraping/extraction failed', error, {
            company: company.name
          });

          // Classify the exception error
          const errorDetails = classifyError(error.message);
          websiteStatus = errorDetails.website_status;

          crawlErrorDetails = {
            error_type: errorDetails.error_type,
            error_message: errorDetails.error_message,
            failed_at: new Date().toISOString(),
            retry_count: 0
          };

          if (websiteData?.page) {
            try {
              await websiteData.page.close();
            } catch (e) {
              // Ignore close errors
            }
          }
        }
      } else {
        logInfo('Website not accessible', {
          company: company.name,
          status: websiteStatus
        });
      }
    }

    // ═════════════════════════════════════════════════════════════
    // STEP 5: Find Social Profiles
    // ═════════════════════════════════════════════════════════════

    let socialProfiles = {};
    if (options.findSocial !== false) {
      try {
        logInfo('Finding social profiles', { company: company.name });

        socialProfiles = await findSocialProfiles(company, {
          socialLinks: websiteData?.socialLinks,
          social_links: extractedData?.social_links
        });

        const foundCount = Object.keys(socialProfiles).filter(k => socialProfiles[k]).length;
        if (foundCount > 0) {
          logInfo('Social profiles found', {
            company: company.name,
            count: foundCount,
            platforms: Object.keys(socialProfiles).filter(k => socialProfiles[k])
          });
        }
      } catch (error) {
        logError('Social profile discovery failed', error, {
          company: company.name
        });
      }
    }

    // Merge social profiles from Google Maps (if any)
    if (company.social_profiles_from_google) {
      Object.assign(socialProfiles, company.social_profiles_from_google);
      logInfo('Merged social profiles from Google Maps', {
        company: company.name,
        platforms: Object.keys(company.social_profiles_from_google)
      });
    }

    // ═════════════════════════════════════════════════════════════
    // STEP 6: Scrape Social Metadata
    // ═════════════════════════════════════════════════════════════

    let socialMetadata = {};
    if (options.scrapeSocial === true && Object.values(socialProfiles).some(Boolean)) {
      try {
        logInfo('Scraping social metadata', { company: company.name });

        socialMetadata = await scrapeSocialMetadata(socialProfiles);

        const scrapedCount = Object.keys(socialMetadata).length;
        if (scrapedCount > 0) {
          logInfo('Social metadata scraped', {
            company: company.name,
            count: scrapedCount
          });
        }
      } catch (error) {
        logError('Social scraping failed', error, {
          company: company.name
        });
      }
    }

    // ═════════════════════════════════════════════════════════════
    // STEP 7: SKIPPED (No ICP relevance check)
    // ═════════════════════════════════════════════════════════════

    // Build prospect object using helpers
    const baseProspectData = buildProspectData(
      company,
      websiteStatus,
      extractedData,
      socialProfiles,
      socialMetadata,
      crawlErrorDetails
    );

    const prospectData = buildFinalProspect(
      baseProspectData,
      { icpScore: null, isRelevant: true }, // No ICP filtering for single lookup
      {
        projectIcpBrief: null,
        modelsUsed: null,
        customPrompts: null,
        runId,
        startTime,
        source: 'single-lookup'
      }
    );

    // Save to database
    let backupPath = null;
    try {
      // Save local backup first
      logInfo('Saving local backup', { company: prospectData.company_name });
      backupPath = await saveLocalBackup(prospectData);

      if (backupPath) {
        logInfo('Local backup saved', {
          company: prospectData.company_name,
          backupPath: backupPath.split(/[\\/]/).pop()
        });
      }

      // Upload to database (or link to project if exists)
      const savedProspect = await saveOrLinkProspect(
        prospectData,
        options.projectId,
        {
          run_id: runId,
          discovery_query: query,
          query_generation_model: null,
          icp_brief_snapshot: null,
          prompts_snapshot: null,
          model_selections_snapshot: null,
          relevance_reasoning: null,
          discovery_cost_usd: 0,
          discovery_time_ms: Date.now() - startTime
        }
      );

      // Mark backup as uploaded
      if (backupPath) {
        await markAsUploaded(backupPath, savedProspect.id);
      }

      logInfo('Prospect saved', {
        id: savedProspect.id,
        company: savedProspect.company_name,
        projectId: options.projectId || 'none'
      });

      // Close browser instances
      try {
        await closeScraperBrowser();
        await closeSocialBrowser();
      } catch (error) {
        logWarn('Failed to close browsers', { error: error.message });
      }

      const totalTime = Date.now() - startTime;
      const totalCost = parseFloat(costTracker.getSummary().costs.total);

      logInfo('Single business lookup complete', {
        company: savedProspect.company_name,
        timeMs: totalTime,
        cost: totalCost
      });

      // Print cost summary
      costTracker.printSummary();

      return {
        success: true,
        prospect: savedProspect,
        metadata: {
          discovery_cost_usd: totalCost,
          discovery_time_ms: totalTime,
          steps_completed: '2-6 (skipped 1 & 7)',
          source: 'single-lookup'
        }
      };

    } catch (dbError) {
      if (backupPath) {
        await markAsFailed(backupPath, dbError);
        logError('Prospect saved to backup but failed to upload to database', dbError, {
          company: prospectData.company_name,
          backupPath: backupPath.split(/[\\/]/).pop()
        });
      } else {
        logError('Failed to save prospect (no backup created)', dbError, {
          company: prospectData.company_name
        });
      }

      throw dbError;
    }

  } catch (error) {
    logError('Single business lookup failed', error, { query });

    // Clean up browsers on error
    try {
      await closeScraperBrowser();
      await closeSocialBrowser();
    } catch (closeError) {
      // Ignore cleanup errors
    }

    throw error;
  }
}

export default { runProspectingPipeline, lookupSingleBusiness };
