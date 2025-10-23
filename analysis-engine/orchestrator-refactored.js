/**
 * Analysis Orchestrator (REFACTORED)
 * 
 * Lightweight coordinator for the intelligent multi-page website analysis pipeline.
 * Delegates work to focused services instead of doing everything in one function.
 * 
 * ARCHITECTURE:
 * - DiscoveryService: Page discovery via sitemap/robots
 * - PageSelectionService: AI-powered page selection
 * - CrawlingService: Page crawling with screenshots
 * - AnalysisCoordinator: Runs all 6 analyzers
 * - ResultsAggregator: Compiles final results
 */

import { DiscoveryService } from './services/discovery-service.js';
import { PageSelectionService } from './services/page-selection-service.js';
import { CrawlingService } from './services/crawling-service.js';
import { AnalysisCoordinator } from './services/analysis-coordinator.js';
import { ResultsAggregator } from './services/results-aggregator.js';

/**
 * Run INTELLIGENT multi-page analysis pipeline
 * 
 * @param {string} url - Website URL to analyze
 * @param {object} context - Business context
 * @param {string} context.company_name - Company name
 * @param {string} context.industry - Industry type
 * @param {string} context.prospect_id - Prospect ID (for database)
 * @param {object} options - Analysis options
 * @param {object} options.customPrompts - Custom AI prompts (optional)
 * @param {function} options.onProgress - Progress callback (optional)
 * @param {number} options.maxPagesPerModule - Max pages to analyze per module (default: 5)
 * @returns {Promise<object>} Complete analysis results
 */
export async function analyzeWebsiteIntelligent(url, context = {}, options = {}) {
  const { customPrompts, onProgress, maxPagesPerModule = 5 } = options;
  const startTime = Date.now();

  const progress = (step, message) => {
    if (onProgress) {
      onProgress({ step, message, timestamp: new Date().toISOString() });
    }
  };

  try {
    // ========================================
    // PHASE 1: DISCOVERY
    // ========================================
    const discoveryService = new DiscoveryService({ 
      timeout: 30000,
      onProgress: progress 
    });

    const sitemap = await discoveryService.discover(url);
    console.log(`[Orchestrator] Discovery:`, discoveryService.getStatistics(sitemap));

    // ========================================
    // PHASE 2: PAGE SELECTION
    // ========================================
    const pageSelectionService = new PageSelectionService({ 
      maxPagesPerModule,
      onProgress: progress 
    });

    const pageSelection = await pageSelectionService.selectPages(sitemap, context);
    console.log(`[Orchestrator] Page Selection:`, pageSelectionService.getStatistics(pageSelection));

    // ========================================
    // PHASE 3: CRAWLING
    // ========================================
    const crawlingService = new CrawlingService({ 
      timeout: 30000,
      concurrency: 3,  // Parallel contexts using shared browser
      onProgress: progress 
    });

    const crawlData = await crawlingService.crawl(url, pageSelection.uniquePages);
    console.log(`[Orchestrator] Crawling:`, crawlingService.getStatistics(crawlData));

    // ========================================
    // PHASE 4: ANALYSIS
    // ========================================
    const analysisCoordinator = new AnalysisCoordinator({ 
      onProgress: progress 
    });

    const analysisResults = await analysisCoordinator.runAnalysis(
      crawlData,
      pageSelection,
      sitemap,
      context,
      url,
      customPrompts
    );
    console.log(`[Orchestrator] Analysis:`, analysisCoordinator.getStatistics(analysisResults));

    // ========================================
    // PHASE 5: RESULTS AGGREGATION
    // ========================================
    const resultsAggregator = new ResultsAggregator({ 
      onProgress: progress 
    });

    const finalResults = await resultsAggregator.aggregate(
      analysisResults,
      crawlData,
      pageSelection,
      sitemap,
      context,
      url,
      startTime
    );

    const totalTime = Date.now() - startTime;
    console.log(`[Orchestrator] ✅ Analysis complete in ${(totalTime / 1000).toFixed(2)}s`);

    return finalResults;

  } catch (error) {
    console.error('[Orchestrator] ❌ Analysis failed:', error);
    throw error;
  }
}

// Export services for direct use if needed
export {
  DiscoveryService,
  PageSelectionService,
  CrawlingService,
  AnalysisCoordinator,
  ResultsAggregator
};
