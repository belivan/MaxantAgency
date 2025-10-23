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
    maxPagesPerModule = 5,
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

    // ========================================
    // PHASE 6: REPORT GENERATION (if requested)
    // ========================================
    if (generate_report) {
      console.log(`\n[Report Generation] Starting ${report_format.toUpperCase()} report generation...`);
      progress({ step: 'report', message: `Generating ${report_format} report...` });
      
      try {
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
          console.warn(`[Report Generation] ⚠️  Report generation failed: ${reportResult.error}`);
          finalResults.report_error = reportResult.error;
        }
      } catch (reportError) {
        console.error(`[Report Generation] ❌ Report generation failed:`, reportError);
        finalResults.report_error = reportError.message;
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
