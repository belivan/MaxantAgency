/**
 * Multi-Page DOM Scraper
 *
 * Extracts business data from websites using intelligent DOM parsing
 * and multi-page crawling. Much faster and more reliable than AI vision.
 *
 * Features:
 * - Email extraction (mailto links, patterns, contact pages)
 * - Phone extraction (tel links, patterns, structured data)
 * - Schema.org/JSON-LD parsing
 * - Multi-page crawling (contact, about, services)
 * - Service/menu extraction
 * - Meta tag parsing
 *
 * Refactored to use extracted utility modules.
 */

import { logInfo, logWarn, logDebug } from '../shared/logger.js';
import { extractBusinessIntelligence } from './business-intelligence-extractor.js';
import { discoverPages } from '../selectors/page-discovery.js';
import { selectPagesForBI } from '../selectors/bi-page-selector.js';

// Import extracted utilities
import {
  extractSchemaOrg,
  extractEmails,
  extractPhones,
  extractDescription,
  extractServices,
  extractContactName,
  calculateConfidence
} from './dom-extraction-utils.js';

import { fallbackPageVisits } from './page-visitors.js';

/**
 * Extract all data from website using DOM parsing with AI-powered page selection
 *
 * @param {object} page - Playwright page object
 * @param {string} url - Website URL
 * @param {string} companyName - Company name for context
 * @param {string} industry - Industry for intelligent page selection (default: 'general')
 * @param {object} options - Additional options {useAIPageSelection: boolean}
 * @returns {Promise<object>} Extracted data with confidence score
 */
export async function extractFromDOM(page, url, companyName, industry = 'general', options = {}) {
  const { useAIPageSelection = true } = options;
  const startTime = Date.now();

  logInfo('Starting DOM extraction', { url, company: companyName });

  const data = {
    contact_email: null,
    contact_phone: null,
    contact_name: null,
    description: null,
    services: [],
    confidence: 0,
    pages_visited: ['homepage'],
    business_intelligence: null
  };

  // Collect HTML snapshots for BI extraction
  const crawledPages = [];

  try {
    // ═══════════════════════════════════════════════════════════
    // STEP 1: Extract from Homepage
    // ═══════════════════════════════════════════════════════════

    logDebug('Extracting from homepage', { url });

    // Parse Schema.org structured data (BEST source!)
    const schemaData = await extractSchemaOrg(page);
    if (schemaData) {
      data.contact_email = schemaData.email;
      data.contact_phone = schemaData.telephone;
      data.description = schemaData.description;
      data.contact_name = schemaData.contact_name;
      if (schemaData.services?.length > 0) {
        data.services = schemaData.services;
      }
      logInfo('Schema.org data found', {
        hasEmail: !!schemaData.email,
        hasPhone: !!schemaData.telephone,
        servicesCount: schemaData.services?.length || 0
      });
    }

    // Extract emails from homepage
    if (!data.contact_email) {
      data.contact_email = await extractEmails(page);
    }

    // Extract phones from homepage
    if (!data.contact_phone) {
      data.contact_phone = await extractPhones(page);
    }

    // Extract description from meta tags
    if (!data.description) {
      data.description = await extractDescription(page);
    }

    // Extract services from homepage
    if (data.services.length === 0) {
      data.services = await extractServices(page, companyName);
    }

    // Capture homepage HTML for BI extraction
    try {
      const homepageHtml = await page.content();
      crawledPages.push({
        url: url,
        html: homepageHtml,
        isHomepage: true
      });
    } catch (error) {
      logWarn('Failed to capture homepage HTML for BI', { error: error.message });
    }

    // ═══════════════════════════════════════════════════════════
    // STEP 2: AI-Powered Multi-Page Crawling
    // ═══════════════════════════════════════════════════════════

    if (useAIPageSelection) {
      try {
        logInfo('Starting AI-powered page selection', { industry, company: companyName });

        // 2a. Discover all pages from sitemap/robots/navigation
        const discovered = await discoverPages(url, { timeout: 10000 });
        logInfo('Page discovery complete', {
          totalPages: discovered.totalPages,
          sources: discovered.sources
        });

        // 2b. Use AI to select optimal pages for BI
        const selection = await selectPagesForBI(discovered, {
          company_name: companyName,
          industry: industry
        }, { maxPages: 7 });

        logInfo('AI page selection complete', {
          selectedPages: selection.selected_pages.length,
          reasoning: selection.reasoning,
          cost: selection.meta?.cost || 0
        });

        // 2c. Visit each selected page (skip homepage - already visited)
        const pagesToVisit = selection.selected_pages.filter(p => p !== '/');

        for (const pagePath of pagesToVisit) {
          try {
            const pageUrl = new URL(pagePath, url).href;
            logDebug('Visiting selected page', { page: pagePath });

            await page.goto(pageUrl, {
              waitUntil: 'domcontentloaded',
              timeout: 10000
            });

            // Extract contact data if still missing
            if (!data.contact_email) {
              data.contact_email = await extractEmails(page);
            }
            if (!data.contact_phone) {
              data.contact_phone = await extractPhones(page);
            }
            if (!data.description) {
              data.description = await extractDescription(page);
            }
            if (data.services.length === 0) {
              data.services = await extractServices(page, companyName);
            }
            if (!data.contact_name) {
              data.contact_name = await extractContactName(page);
            }

            // Capture page HTML for BI extraction
            try {
              const pageHtml = await page.content();
              crawledPages.push({
                url: pageUrl,
                html: pageHtml,
                isHomepage: false
              });
            } catch (error) {
              logWarn('Failed to capture page HTML for BI', {
                page: pagePath,
                error: error.message
              });
            }

            // Track visited page
            const pageType = pagePath.split('/').filter(Boolean)[0] || 'unknown';
            data.pages_visited.push(pageType);

          } catch (error) {
            logWarn('Failed to visit selected page', {
              page: pagePath,
              error: error.message
            });
            // Continue with next page
          }
        }

      } catch (error) {
        logWarn('AI page selection failed, falling back to hardcoded pages', {
          error: error.message
        });

        // Fallback to hardcoded page visits
        await fallbackPageVisits(page, url, data, crawledPages);
      }
    } else {
      // Use hardcoded page visits if AI selection is disabled
      await fallbackPageVisits(page, url, data, crawledPages);
    }

    // ═══════════════════════════════════════════════════════════
    // STEP 5: Calculate Confidence Score
    // ═══════════════════════════════════════════════════════════

    data.confidence = calculateConfidence(data);

    // ═══════════════════════════════════════════════════════════
    // STEP 6: Extract Business Intelligence from Crawled Pages
    // ═══════════════════════════════════════════════════════════

    if (crawledPages.length > 0) {
      try {
        logInfo('Extracting business intelligence', {
          pagesCount: crawledPages.length,
          pages: data.pages_visited
        });
        data.business_intelligence = extractBusinessIntelligence(crawledPages);
        logInfo('Business intelligence extracted', {
          hasCompanySize: !!data.business_intelligence?.companySize,
          hasYearsInBusiness: !!data.business_intelligence?.yearsInBusiness,
          hasPricing: !!data.business_intelligence?.pricingVisibility,
          hasFreshness: !!data.business_intelligence?.contentFreshness
        });
      } catch (error) {
        logWarn('Business intelligence extraction failed', { error: error.message });
        data.business_intelligence = null;
      }
    }

    const duration = Date.now() - startTime;
    logInfo('DOM extraction complete', {
      url,
      duration_ms: duration,
      confidence: data.confidence,
      hasEmail: !!data.contact_email,
      hasPhone: !!data.contact_phone,
      hasDescription: !!data.description,
      servicesCount: data.services.length,
      pagesVisited: data.pages_visited.length,
      hasBI: !!data.business_intelligence
    });

    return data;

  } catch (error) {
    logWarn('DOM extraction failed', { url, error: error.message });
    return {
      ...data,
      confidence: 0,
      error: error.message
    };
  }
}

// Re-export utility functions for backward compatibility
export {
  extractSchemaOrg,
  extractEmails,
  extractPhones,
  extractDescription,
  extractServices,
  extractContactName,
  calculateConfidence
} from './dom-extraction-utils.js';

export {
  visitContactPage,
  visitAboutPage,
  visitServicesPage,
  fallbackPageVisits
} from './page-visitors.js';
