/**
 * Discovery Service
 * 
 * Responsible for discovering all pages on a website without visiting them.
 * Uses sitemap.xml, robots.txt, and navigation parsing.
 * 
 * Single Responsibility: Page Discovery
 */

import { discoverAllPages } from '../scrapers/sitemap-discovery.js';

export class DiscoveryService {
  constructor(options = {}) {
    this.timeout = options.timeout || 30000;
    this.onProgress = options.onProgress || (() => {});
  }

  /**
   * Discover all pages on a website
   * 
   * @param {string} url - Website URL
   * @returns {Promise<object>} Discovery results
   * @returns {number} .totalPages - Total pages discovered
   * @returns {Array<string>} .pages - Array of page paths
   * @returns {Array<string>} .sources - Discovery sources used
   * @returns {object} .errors - Any errors encountered
   * @returns {number} .discoveryTime - Time taken (ms)
   */
  async discover(url) {
    this.onProgress({ step: 'discovery', message: `Discovering all pages on ${url}...` });

    const sitemap = await discoverAllPages(url, { timeout: this.timeout });

    console.log(`[DiscoveryService] Discovered ${sitemap.totalPages} pages`);
    this.onProgress({ 
      step: 'discovery', 
      message: `Found ${sitemap.totalPages} pages via sitemap/robots/navigation` 
    });

    // FALLBACK: If no pages discovered, use common website pages
    if (sitemap.totalPages === 0) {
      console.log(`[DiscoveryService] No pages discovered via sitemap/robots. Using fallback pages...`);
      
      const fallbackSitemap = {
        totalPages: 5,
        pages: ['/', '/about', '/services', '/contact', '/blog'],
        sources: ['fallback'],
        errors: sitemap.errors || {},
        discoveryTime: sitemap.discoveryTime || 0
      };

      this.onProgress({ 
        step: 'discovery', 
        message: 'Using fallback pages: homepage + common pages' 
      });

      return fallbackSitemap;
    }

    return sitemap;
  }

  /**
   * Get discovery statistics
   * 
   * @param {object} sitemap - Sitemap object from discover()
   * @returns {object} Statistics
   */
  getStatistics(sitemap) {
    // Handle sources as object (from sitemap-discovery) or array (from fallback)
    const sources = sitemap.sources;
    const sourcesArray = Array.isArray(sources) 
      ? sources 
      : Object.keys(sources || {}).filter(key => sources[key] > 0);
    
    return {
      totalPages: sitemap.totalPages || 0,
      sources: sourcesArray,
      hasSitemap: !sitemap.errors?.sitemap,
      hasRobots: !sitemap.errors?.robots,
      usedFallback: sourcesArray.includes('fallback'),
      discoveryTime: sitemap.discoveryTime || 0
    };
  }
}
