/**
 * Crawling Service
 * 
 * Responsible for crawling selected pages with desktop + mobile screenshots.
 * Only crawls pages chosen by PageSelectionService.
 * 
 * Single Responsibility: Page Crawling & Screenshots
 */

import { crawlSelectedPagesWithScreenshots } from '../scrapers/multi-page-crawler.js';
import { extractBusinessIntelligence } from '../scrapers/business-intelligence-extractor.js';

export class CrawlingService {
  constructor(options = {}) {
    this.timeout = options.timeout || 30000;
    this.concurrency = options.concurrency ?? 3;
    this.onProgress = options.onProgress || (() => {});
  }

  /**
   * Crawl selected pages with desktop + mobile screenshots
   *
   * @param {string} baseUrl - Base website URL
   * @param {Array<string>} pages - Pages to crawl (from PageSelectionService)
   * @param {string} companyName - Company name for screenshot file naming
   * @returns {Promise<object>} Crawl results
   * @returns {Array<object>} .pages - Successfully crawled pages
   * @returns {object} .homepage - Homepage data
   * @returns {object} .businessIntel - Extracted business intelligence
   * @returns {number} .crawlTime - Time taken (ms)
   */
  async crawl(baseUrl, pages, companyName = null) {
    const startTime = Date.now();

    this.onProgress({
      step: 'crawl',
      message: `Crawling ${pages.length} selected pages with desktop + mobile screenshots...`
    });

    const crawledPages = await crawlSelectedPagesWithScreenshots(baseUrl, pages, {
      timeout: this.timeout,
      concurrency: this.concurrency,
      companyName: companyName,  // Pass company name for screenshot file naming
      onProgress: (crawlProgress) => {
        this.onProgress({
          step: 'crawl',
          message: `Crawled ${crawlProgress.completed}/${pages.length} pages...`
        });
      }
    });

    console.log(`[CrawlingService] Successfully crawled ${crawledPages.filter(p => p.success).length}/${pages.length} pages`);

    // Filter successful crawls and map to expected format
    const successfulPages = crawledPages
      .filter(p => p && p.success)
      .map(p => ({
        url: p.url,
        fullUrl: p.fullUrl || new URL(p.url, baseUrl).href,
        html: p.html,
        metadata: p.metadata || {},
        screenshots: {
          // Screenshots are now file paths (strings), not Buffers
          desktop: p.screenshots?.desktop || null,
          mobile: p.screenshots?.mobile || null
        },
        designTokens: {
          desktop: p.designTokens?.desktop || { fonts: [], colors: [], extractedAt: new Date().toISOString() },
          mobile: p.designTokens?.mobile || { fonts: [], colors: [], extractedAt: new Date().toISOString() }
        },
        techStack: p.techStack || null,
        success: true,
        isHomepage: p.url === '/' || p.url === ''
      }));
    const failedPages = crawledPages
      .filter(p => p && !p.success)
      .map(p => ({
        url: p.url || null,
        fullUrl: p.fullUrl || null,
        error: p.error || null,
        timestamp: p.metadata?.timestamp || new Date().toISOString()
      }));
    if (successfulPages.length === 0) {
      throw new Error('Failed to crawl any selected pages');
    }

    // Find homepage in crawled pages
    const homepage = successfulPages.find(p => p.url === '/' || p.url === '') || successfulPages[0];

    // Extract business intelligence
    this.onProgress({ 
      step: 'business-intelligence', 
      message: 'Extracting business intelligence from crawled pages...' 
    });

    const businessIntel = extractBusinessIntelligence(successfulPages);

    console.log(`[CrawlingService] Extracted business intelligence:`, {
      companySize: businessIntel.companySize,
      yearsInBusiness: businessIntel.yearsInBusiness?.estimatedYears,
      pricingVisibility: businessIntel.pricingVisibility?.visible,
      premiumFeatures: businessIntel.premiumFeatures?.detected?.length || 0
    });

    const crawlTime = Date.now() - startTime;

    return {
      pages: successfulPages,
      failedPages,
      homepage,
      businessIntel,
      crawlTime
    };
  }

  /**
   * Get crawl statistics
   * 
   * @param {object} crawlResults - Results from crawl()
   * @returns {object} Statistics
   */
  getStatistics(crawlResults) {
    if (!crawlResults) {
      return {
        pagesCrawled: 0,
        screenshotsCaptured: 0,
        businessIntelExtracted: 0,
        hasHomepage: false,
        crawlTime: 0
      };
    }

    const pagesSource = Array.isArray(crawlResults)
      ? crawlResults
      : Array.isArray(crawlResults.pages)
        ? crawlResults.pages
        : typeof crawlResults === 'object'
          ? Object.values(crawlResults).filter(Boolean)
          : [];

    const pages = pagesSource
      .map(page => (page && typeof page === 'object') ? page : null)
      .filter(Boolean);

    const pagesCrawled = pages.length;
    const screenshotsCaptured = pages.reduce((total, page) => {
      const desktop = page.screenshots?.desktop ? 1 : 0;
      const mobile = page.screenshots?.mobile ? 1 : 0;
      return total + desktop + mobile;
    }, 0);

    const perPageIntel = pages.reduce((total, page) => {
      const intel = page.businessIntelligence || page.businessIntel;
      if (intel && Object.keys(intel).length > 0) {
        return total + 1;
      }
      return total;
    }, 0);

    const aggregateIntel = crawlResults.businessIntel && Object.keys(crawlResults.businessIntel).length > 0 ? 1 : 0;
    const businessIntelExtracted = perPageIntel || aggregateIntel;

    return {
      pagesCrawled,
      screenshotsCaptured,
      businessIntelExtracted,
      hasHomepage: Boolean(crawlResults.homepage || pages.some(page => page.isHomepage)),
      crawlTime: crawlResults.crawlTime || 0
    };
  }
}

// ensureBuffer() function removed - screenshots are now file paths (strings), not Buffers
// This is part of the memory optimization to avoid holding large buffers in memory
