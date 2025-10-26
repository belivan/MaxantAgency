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
import { autoGenerateReport } from './reports/auto-report-generator.js';
import { findBestBenchmark } from './services/benchmark-matcher.js';

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
 * @param {boolean} options.generate_report - Generate HTML/PDF report (default: false)
 * @param {string} options.report_format - Report format: 'html', 'pdf', 'markdown' (default: 'html')
 * @param {boolean} options.save_to_database - Save report to database (default: false)
 * @returns {Promise<object>} Complete analysis results
 */
export async function analyzeWebsiteIntelligent(url, context = {}, options = {}) {
  const {
    customPrompts,
    onProgress,
    maxPagesPerModule = process.env.MAX_PAGES_PER_MODULE ? parseInt(process.env.MAX_PAGES_PER_MODULE) : 5,
    generate_report = false,
    report_format = 'html',
    save_to_database = false
  } = options;
  const startTime = Date.now();

  const progress = (step, message) => {
    if (onProgress) {
      onProgress({ step, message, timestamp: new Date().toISOString() });
    }
  };

  // Check if multi-page crawl is enabled
  const enableMultiPageCrawl = process.env.ENABLE_MULTI_PAGE_CRAWL !== 'false';

  try {
    let sitemap, pageSelection, crawlData;

    if (enableMultiPageCrawl) {
      // ========================================
      // PHASE 1: DISCOVERY (Multi-Page Mode)
      // ========================================
      const discoveryService = new DiscoveryService({
        timeout: 30000,
        onProgress: progress
      });

      sitemap = await discoveryService.discover(url);
      console.log(`[Orchestrator] Discovery:`, discoveryService.getStatistics(sitemap));

      // ========================================
      // PHASE 2: PAGE SELECTION (Multi-Page Mode)
      // ========================================
      const pageSelectionService = new PageSelectionService({
        maxPagesPerModule,
        onProgress: progress
      });

      pageSelection = await pageSelectionService.selectPages(sitemap, context);
      console.log(`[Orchestrator] Page Selection:`, pageSelectionService.getStatistics(pageSelection));

      // ========================================
      // PHASE 3: CRAWLING (Multi-Page Mode)
      // ========================================
      const crawlingService = new CrawlingService({
        timeout: 30000,
        concurrency: 3,  // Parallel contexts using shared browser
        onProgress: progress
      });

      crawlData = await crawlingService.crawl(url, pageSelection.uniquePages);
      console.log(`[Orchestrator] Crawling:`, crawlingService.getStatistics(crawlData));

    } else {
      // ========================================
      // SINGLE-PAGE MODE (ENABLE_MULTI_PAGE_CRAWL=false)
      // ========================================
      console.log(`[Orchestrator] Multi-page crawl disabled. Running single-page analysis only.`);
      progress({ step: 'crawl', message: 'Single-page mode: crawling homepage only...' });

      const crawlingService = new CrawlingService({
        timeout: 30000,
        concurrency: 1,
        onProgress: progress
      });

      // Only crawl the homepage
      crawlData = await crawlingService.crawl(url, ['/']);

      // Create minimal sitemap/page selection for single page
      sitemap = {
        pages: [{ url: '/', fullUrl: url }],
        totalPages: 1,
        sources: ['single-page-mode'],
        errors: {}
      };

      pageSelection = {
        strategy: 'single-page-mode',
        seo_pages: ['/'],
        content_pages: ['/'],
        visual_pages: ['/'],
        social_pages: ['/'],
        uniquePages: ['/']
      };

      console.log(`[Orchestrator] Single-page mode: homepage crawled successfully`);
    }

    // ========================================
    // PHASE 3.5: BENCHMARK MATCHING (OPTIONAL)
    // ========================================
    let benchmark = null;
    let benchmarkMatchMetadata = null;

    const useBenchmarking = process.env.USE_AI_GRADING === 'true' || process.env.USE_BENCHMARK_CONTEXT === 'true';

    if (useBenchmarking) {
      console.log(`\n[Orchestrator] Fetching industry benchmark for context-aware analysis...`);
      progress({ step: 'benchmark-matching', message: 'Finding best industry comparison...' });

      try {
        const benchmarkResult = await findBestBenchmark({
          company_name: context.company_name || 'Unknown',
          industry: context.industry || 'general',
          url: url,
          city: context.city,
          state: context.state,
          business_intelligence: crawlData.businessIntel || null,
          icp_criteria: context.icp_criteria || null
        });

        if (benchmarkResult.success) {
          benchmark = benchmarkResult.benchmark;
          benchmarkMatchMetadata = benchmarkResult.match_metadata;

          console.log(`[Orchestrator] ✅ Benchmark matched: ${benchmark.company_name}`);
          console.log(`[Orchestrator]    Match score: ${benchmarkMatchMetadata.match_score}%`);
          console.log(`[Orchestrator]    Tier: ${benchmarkMatchMetadata.comparison_tier}`);
          console.log(`[Orchestrator]    Benchmark score: ${benchmark.overall_score}/100 (Grade ${benchmark.overall_grade})`);
          console.log(`[Orchestrator]    Reasoning: ${benchmarkMatchMetadata.match_reasoning}`);
        } else {
          console.warn(`[Orchestrator] ⚠️ No benchmark found: ${benchmarkResult.error}`);
          console.warn(`[Orchestrator]    Analysis will proceed without benchmark context`);
        }
      } catch (error) {
        console.error(`[Orchestrator] ❌ Benchmark matching failed:`, error.message);
        console.log(`[Orchestrator]    Analysis will proceed without benchmark context`);
      }
    } else {
      console.log(`[Orchestrator] Benchmark context disabled (USE_AI_GRADING=${process.env.USE_AI_GRADING}, USE_BENCHMARK_CONTEXT=${process.env.USE_BENCHMARK_CONTEXT})`);
    }

    // ========================================
    // PHASE 4: ANALYSIS (with benchmark context)
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
      customPrompts,
      benchmark,  // NEW: Pass benchmark to all analyzers
      benchmarkMatchMetadata  // NEW: Pass match metadata
    );
    console.log(`[Orchestrator] Analysis:`, analysisCoordinator.getStatistics(analysisResults));

    // ========================================
    // PHASE 4.5: PERFORMANCE ANALYTICS (OPTIONAL)
    // ========================================
    const enablePerformance = process.env.ENABLE_PERFORMANCE_API !== 'false';

    if (enablePerformance) {
      console.log(`[Orchestrator] Fetching performance analytics...`);
      progress({ step: 'performance', message: 'Fetching PageSpeed + CrUX data...' });

      const { PerformanceService } = await import('./services/performance-service.js');
      const performanceService = new PerformanceService({ onProgress: progress });

      const performanceData = await performanceService.fetchAllPerformanceData(url);
      const performanceIssues = performanceService.generatePerformanceIssues(performanceData);

      analysisResults.performance = {
        pageSpeed: performanceData.pageSpeed,
        crux: performanceData.crux,
        issues: performanceIssues,
        errors: performanceData.errors,
        model: 'performance-api'  // Not AI, but for consistency
      };

      console.log(`[Orchestrator] Performance data fetched:`, {
        pageSpeedMobile: performanceData.pageSpeed.mobile ? 'SUCCESS' : 'FAILED',
        pageSpeedDesktop: performanceData.pageSpeed.desktop ? 'SUCCESS' : 'FAILED',
        cruxData: performanceData.crux.hasData ? 'SUCCESS' : 'NO DATA',
        issuesFound: performanceIssues.length
      });
    } else {
      console.log(`[Orchestrator] Performance analytics disabled`);
    }

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
      startTime,
      benchmark,  // NEW: Pass benchmark data
      benchmarkMatchMetadata  // NEW: Pass benchmark match metadata
    );

    const totalTime = Date.now() - startTime;
    console.log(`[Orchestrator] ✅ Analysis complete in ${(totalTime / 1000).toFixed(2)}s`);

    // ========================================
    // PHASE 6: REPORT GENERATION (if requested)
    // ========================================
    if (generate_report) {
      console.log(`\n[Report Generation] Starting ${report_format.toUpperCase()} report generation...`);
      progress({ step: 'report', message: `Generating ${report_format} report...` });

      const reportResult = await autoGenerateReport(finalResults, {
        format: report_format,
        sections: ['all'],
        saveToDatabase: save_to_database,
        project_id: context.project_id
      });

      if (reportResult.success) {
        console.log(`[Report Generation] ✅ Report generated successfully`);
        console.log(`[Report Generation] 📄 Local path: ${reportResult.local_path}`);

        // Add report paths to the result
        finalResults.report_html_path = reportResult.local_path;
        finalResults.report_markdown_path = null;
        finalResults.report_storage_path = reportResult.storage_path;
        finalResults.report_format = report_format;

        // Add synthesis metadata if available
        if (reportResult.synthesis?.used) {
          const totalOriginalIssues =
            (finalResults.design_issues_desktop?.length || 0) +
            (finalResults.design_issues_mobile?.length || 0) +
            (finalResults.seo_issues?.length || 0) +
            (finalResults.content_issues?.length || 0) +
            (finalResults.social_issues?.length || 0) +
            (finalResults.accessibility_issues?.length || 0);

          finalResults.synthesis_metadata = {
            success: true,
            original_issue_count: totalOriginalIssues,
            consolidated_issue_count: reportResult.synthesis.consolidatedIssuesCount,
            reduction_percentage: totalOriginalIssues > 0
              ? Math.round((1 - reportResult.synthesis.consolidatedIssuesCount / totalOriginalIssues) * 100)
              : 0,
            total_duration_seconds: reportResult.metadata?.generation_time_ms
              ? (reportResult.metadata.generation_time_ms / 1000).toFixed(1)
              : 'N/A',
            total_tokens_used: reportResult.metadata?.total_tokens || 0,
            total_cost: reportResult.metadata?.total_cost || 0,
            errors: reportResult.synthesis.errors
          };
        }

        progress({ step: 'report', message: `Report saved to ${reportResult.local_path}` });
      } else {
        throw new Error(`Report generation failed: ${reportResult.error}`);
      }
    }

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
