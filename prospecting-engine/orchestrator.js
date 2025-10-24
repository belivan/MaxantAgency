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

    const companies = await discoverCompanies(query, {
      minRating: options.minRating || 3.5,
      maxResults: brief.count || 20,
      projectId: options.projectId // Pass project ID for smart filtering
    });

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
                    company.name
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
                }
              } catch (error) {
                logError('Website scraping/extraction failed', error, {
                  company: company.name
                });

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
        const prospectData = {
          company_name: company.name,
          industry: company.industry,
          website: company.website,
          website_status: websiteStatus,
          city: company.city,
          state: company.state,
          address: company.address,
          contact_phone: company.phone,
          contact_email: extractedData?.contact_email || null,
          contact_name: extractedData?.contact_name || null,
          description: extractedData?.description || null,
          services: extractedData?.services || null,
          google_place_id: company.googlePlaceId,
          google_rating: company.rating,
          google_review_count: company.reviewCount,
          most_recent_review_date: company.mostRecentReviewDate,
          social_profiles: socialProfiles,
          social_metadata: socialMetadata
        };

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
        // Calculate days since last review (if available)
        let daysSinceLastReview = null;
        if (company.mostRecentReviewDate) {
          try {
            const lastReviewDate = new Date(company.mostRecentReviewDate);
            const now = Date.now();
            daysSinceLastReview = Math.floor((now - lastReviewDate) / (1000 * 60 * 60 * 24));
          } catch (error) {
            logError('Failed to parse review date', error, {
              company: company.name,
              date: company.mostRecentReviewDate
            });
          }
        }

        // FILTER 1: Broken website + No recent activity = Likely closed
        // A broken website with no reviews in 180+ days suggests the business is no longer operating
        if (
          ['ssl_error', 'timeout', 'not_found'].includes(websiteStatus) &&
          (daysSinceLastReview === null || daysSinceLastReview > 180)
        ) {
          logInfo('Skipping inactive prospect (broken site + no recent reviews)', {
            company: company.name,
            websiteStatus,
            daysSinceLastReview: daysSinceLastReview === null ? 'never' : daysSinceLastReview,
            reason: 'Likely out of business - broken website with no activity'
          });
          results.skipped++;
          results.filteredInactive = (results.filteredInactive || 0) + 1;
          continue;
        }

        // FILTER 2: No website + No recent activity + Low rating
        // No website, no recent customer engagement, and poor rating = not a viable prospect
        if (
          websiteStatus === 'no_website' &&
          (daysSinceLastReview === null || daysSinceLastReview > 180) &&
          (company.rating === null || company.rating < 3.5)
        ) {
          logInfo('Skipping inactive prospect (no website + no recent reviews + low rating)', {
            company: company.name,
            websiteStatus,
            daysSinceLastReview: daysSinceLastReview === null ? 'never' : daysSinceLastReview,
            rating: company.rating || 'none',
            reason: 'Not viable - no website, no activity, poor reputation'
          });
          results.skipped++;
          results.filteredInactive = (results.filteredInactive || 0) + 1;
          continue;
        }

        // FILTER 3: Parking page = Domain for sale
        // Parking pages indicate the domain is for sale, not an active business
        if (websiteStatus === 'parking_page') {
          logInfo('Skipping parking page', {
            company: company.name,
            websiteStatus,
            reason: 'Domain for sale, not an active business'
          });
          results.skipped++;
          results.filteredInactive = (results.filteredInactive || 0) + 1;
          continue;
        }

        // Track actual models used for this prospect
        const modelsUsed = {
          queryUnderstanding: options.modelSelections?.queryUnderstanding ||
                             customPrompts?.queryUnderstanding?.model ||
                             options.model ||
                             'grok-4-fast',
          websiteExtraction: options.modelSelections?.websiteExtraction ||
                           customPrompts?.websiteExtraction?.model ||
                           options.visionModel ||
                           'gpt-4o',
          relevanceCheck: options.modelSelections?.relevanceCheck ||
                         customPrompts?.relevanceCheck?.model ||
                         options.model ||
                         'grok-4-fast'
        };

        // Add relevance data to prospect
        const prospect = {
          ...prospectData,
          icp_match_score: icpScore,
          is_relevant: isRelevant,
          icp_brief_snapshot: projectIcpBrief, // Save ICP brief snapshot for historical tracking
          models_used: modelsUsed, // Track which models were actually used
          prompts_snapshot: customPrompts || null, // Save prompts used
          status: 'ready_for_analysis',
          run_id: runId,
          source: 'prospecting-engine',
          discovery_cost: 0, // Will be updated at end
          discovery_time_ms: Date.now() - startTime
        };

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
        ...results
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

export default { runProspectingPipeline };
