/**
 * Page Selection Service
 * 
 * Responsible for AI-powered page selection.
 * Determines which pages to analyze for each module (SEO, content, visual, social).
 * 
 * Single Responsibility: Intelligent Page Selection
 */

import { selectPagesForAnalysis, getUniquePagesToCrawl } from '../scrapers/intelligent-page-selector.js';

export class PageSelectionService {
  constructor(options = {}) {
    this.maxPagesPerModule = options.maxPagesPerModule || 5;
    this.onProgress = options.onProgress || (() => {});
  }

  /**
   * Use AI to select optimal pages for each analysis module
   * 
   * @param {object} sitemap - Sitemap from DiscoveryService
   * @param {object} context - Business context
   * @param {string} context.industry - Industry type
   * @param {string} context.company_name - Company name
   * @returns {Promise<object>} Page selection results
   * @returns {Array<string>} .seo_pages - Pages for SEO analysis
   * @returns {Array<string>} .content_pages - Pages for content analysis
   * @returns {Array<string>} .visual_pages - Pages for visual analysis
   * @returns {Array<string>} .social_pages - Pages for social analysis
   * @returns {string} .reasoning - AI's reasoning for selections
   */
  async selectPages(sitemap, context) {
    this.onProgress({ 
      step: 'selection', 
      message: 'AI selecting optimal pages for each analysis module...' 
    });

    const pageSelection = await selectPagesForAnalysis(sitemap, {
      industry: context.industry,
      companyName: context.company_name,
      maxPagesPerModule: this.maxPagesPerModule
    });

    console.log(`[PageSelectionService] AI selected pages:`, {
      seo: pageSelection.seo_pages.length,
      content: pageSelection.content_pages.length,
      visual: pageSelection.visual_pages.length,
      social: pageSelection.social_pages.length
    });

    // Get unique pages to crawl (union of all selections)
    const uniquePages = getUniquePagesToCrawl(pageSelection);

    this.onProgress({ 
      step: 'selection', 
      message: `AI selected ${uniquePages.length} unique pages to analyze` 
    });

    return {
      ...pageSelection,
      uniquePages
    };
  }

  /**
   * Get selection statistics
   * 
   * @param {object} selection - Selection object from selectPages()
   * @returns {object} Statistics
   */
  getStatistics(selection) {
    return {
      seoPageCount: selection.seo_pages.length,
      contentPageCount: selection.content_pages.length,
      visualPageCount: selection.visual_pages.length,
      socialPageCount: selection.social_pages.length,
      uniquePageCount: selection.uniquePages.length,
      reasoning: selection.reasoning || null
    };
  }

  /**
   * Filter crawled pages for a specific analyzer
   * 
   * @param {Array<object>} crawledPages - Pages from CrawlingService
   * @param {Array<string>} selectedUrls - URLs selected for this analyzer
   * @returns {Array<object>} Filtered pages
   */
  filterPagesForAnalyzer(crawledPages, selectedUrls) {
    return crawledPages.filter(page => selectedUrls.includes(page.url));
  }
}
