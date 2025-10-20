/**
 * Orchestrator - Coordinates the full website analysis pipeline
 *
 * PIPELINE:
 * 1. Capture screenshot and HTML
 * 2. Parse HTML for structured data
 * 3. Run all analyzers in parallel (design, SEO, content, social)
 * 4. Calculate grade and extract insights
 * 5. Generate critique for outreach
 * 6. Return complete analysis
 */

import { captureWebsite } from './scrapers/screenshot-capture.js';
import { parseHTML, getContentSummary } from './scrapers/html-parser.js';
import { runAllAnalyses, calculateTotalCost } from './analyzers/index.js';
import { calculateGrade, extractQuickWins, getTopIssue } from './grading/grader.js';
import { generateCritique, generateOneLiner } from './grading/critique-generator.js';

/**
 * Run complete analysis pipeline for a single URL
 *
 * @param {string} url - Website URL to analyze
 * @param {object} context - Business context
 * @param {string} context.company_name - Company name
 * @param {string} context.industry - Industry type
 * @param {string} context.prospect_id - Prospect ID (for database)
 * @param {object} options - Analysis options
 * @param {function} options.onProgress - Progress callback (optional)
 * @returns {Promise<object>} Complete analysis results
 */
export async function analyzeWebsite(url, context = {}, options = {}) {
  const { onProgress } = options;

  const startTime = Date.now();
  const progress = (step, message) => {
    if (onProgress) {
      onProgress({ step, message, timestamp: new Date().toISOString() });
    }
  };

  try {
    // STEP 1: Capture screenshot and HTML
    progress('capture', `Capturing ${url}...`);
    const captureResult = await captureWebsite(url, {
      timeout: 30000,
      fullPage: true,
      waitForNetworkIdle: true
    });

    if (!captureResult.success) {
      throw new Error(`Failed to capture website: ${captureResult.error}`);
    }

    const {
      screenshot,
      html,
      metadata: pageMetadata,
      techStack,
      isMobileFriendly,
      pageLoadTime
    } = captureResult;

    // STEP 2: Parse HTML
    progress('parse', 'Parsing HTML and extracting data...');
    const parsedData = parseHTML(html, url);
    const contentSummary = getContentSummary(parsedData);

    // Enhance context with parsed data
    const enrichedContext = {
      ...context,
      tech_stack: techStack?.cms || 'Unknown',
      load_time: (pageLoadTime / 1000).toFixed(2), // Convert to seconds
      has_blog: parsedData.content.hasBlog
    };

    // STEP 3: Run all analyzers in parallel
    progress('analyze', 'Running design, SEO, content, and social analysis...');
    const analysisResults = await runAllAnalyses({
      url,
      screenshot,
      html,
      context: enrichedContext,
      socialProfiles: parsedData.social.links,
      socialMetadata: {
        platformCount: parsedData.social.platformCount,
        platformsPresent: parsedData.social.platformsPresent
      }
    });

    // Add parsed data to analysis results
    analysisResults.seo.parsedData = parsedData.seo;
    analysisResults.content.parsedData = parsedData.content;
    analysisResults.social.parsedData = parsedData.social;

    // STEP 4: Calculate grade
    progress('grade', 'Calculating overall grade...');

    const scores = {
      design: analysisResults.design?.overallDesignScore || 50,
      seo: analysisResults.seo?.seoScore || 50,
      content: analysisResults.content?.contentScore || 50,
      social: analysisResults.social?.socialScore || 50
    };

    const quickWins = extractQuickWins(analysisResults);

    const gradeMetadata = {
      quickWinCount: quickWins.length,
      isMobileFriendly,
      hasHTTPS: pageMetadata?.hasHTTPS || false,
      siteAccessible: true,
      industry: context.industry
    };

    const gradeResults = calculateGrade(scores, gradeMetadata);

    // STEP 5: Generate critique
    progress('critique', 'Generating actionable critique...');
    const critique = generateCritique(analysisResults, gradeResults, enrichedContext);

    // STEP 6: Calculate costs
    const analysisCost = calculateTotalCost(analysisResults);

    // STEP 7: Compile final results
    const totalTime = Date.now() - startTime;
    progress('complete', 'Analysis complete!');

    return {
      success: true,

      // Core results
      url: captureResult.url,
      company_name: context.company_name,
      industry: context.industry,
      prospect_id: context.prospect_id,

      // Grading
      grade: gradeResults.grade,
      overall_score: gradeResults.overallScore,
      grade_label: gradeResults.gradeLabel,
      grade_description: gradeResults.gradeDescription,
      outreach_angle: gradeResults.outreachAngle,

      // Scores breakdown
      design_score: scores.design,
      seo_score: scores.seo,
      content_score: scores.content,
      social_score: scores.social,

      // Detailed analysis results
      design_issues: analysisResults.design?.issues || [],
      seo_issues: analysisResults.seo?.issues || [],
      content_issues: analysisResults.content?.issues || [],
      social_issues: analysisResults.social?.issues || [],

      // Quick wins and top issue
      quick_wins: quickWins,
      top_issue: getTopIssue(analysisResults),

      // Critique
      analysis_summary: critique.summary,
      critique_sections: critique.sections,
      recommendations: critique.recommendations,
      call_to_action: critique.callToAction,
      one_liner: generateOneLiner(
        context.company_name || 'This business',
        critique.topIssue,
        gradeResults.grade,
        quickWins.length
      ),

      // Metadata
      tech_stack: techStack?.cms || 'Unknown',
      page_load_time: pageLoadTime,
      is_mobile_friendly: isMobileFriendly,
      has_https: pageMetadata?.hasHTTPS || false,
      has_blog: parsedData.content.hasBlog,

      // Social
      social_profiles: parsedData.social.links,
      social_platforms_present: parsedData.social.platformsPresent,
      social_metadata: {
        platformCount: parsedData.social.platformCount,
        hasSocialPresence: parsedData.social.hasSocialPresence
      },

      // Content insights
      content_insights: {
        wordCount: parsedData.content.wordCount,
        hasBlog: parsedData.content.hasBlog,
        blogPostCount: parsedData.content.blogPostCount,
        completeness: parsedData.content.completeness,
        ctaCount: parsedData.content.ctaCount
      },

      // Contact info (if found)
      contact_email: parsedData.content.contactInfo.emails[0] || null,
      contact_phone: parsedData.content.contactInfo.phones[0] || null,

      // SEO metadata
      page_title: parsedData.seo.title,
      meta_description: parsedData.seo.description,

      // Performance metadata
      analysis_cost: analysisCost,
      analysis_time: totalTime,
      analyzed_at: new Date().toISOString(),

      // Raw data (for debugging/detailed view)
      _raw: {
        analysisResults,
        gradeResults,
        parsedData,
        techStack
      }
    };

  } catch (error) {
    console.error('Analysis failed:', error);

    return {
      success: false,
      url,
      company_name: context.company_name,
      industry: context.industry,
      prospect_id: context.prospect_id,
      error: error.message,
      analyzed_at: new Date().toISOString(),
      analysis_time: Date.now() - startTime
    };
  }
}

/**
 * Analyze multiple websites in parallel
 *
 * @param {array} targets - Array of {url, context} objects
 * @param {object} options - Analysis options
 * @param {number} options.concurrency - Max parallel analyses (default: 2)
 * @param {function} options.onProgress - Progress callback
 * @param {function} options.onComplete - Completion callback per analysis
 * @returns {Promise<array>} Array of analysis results
 */
export async function analyzeMultiple(targets, options = {}) {
  const { concurrency = 2, onProgress, onComplete } = options;

  const results = [];
  const chunks = chunkArray(targets, concurrency);

  let completed = 0;
  const total = targets.length;

  for (const chunk of chunks) {
    const chunkResults = await Promise.allSettled(
      chunk.map(({ url, context }) =>
        analyzeWebsite(url, context, {
          onProgress: onProgress ? (progress) => {
            onProgress({
              ...progress,
              url,
              completed,
              total
            });
          } : undefined
        })
      )
    );

    for (const result of chunkResults) {
      completed++;

      const analysisResult = result.status === 'fulfilled'
        ? result.value
        : {
            success: false,
            error: result.reason.message,
            analyzed_at: new Date().toISOString()
          };

      results.push(analysisResult);

      if (onComplete) {
        onComplete(analysisResult, completed, total);
      }
    }
  }

  return results;
}

/**
 * Get analysis summary for a batch
 */
export function getBatchSummary(results) {
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  const gradeDistribution = {
    A: successful.filter(r => r.grade === 'A').length,
    B: successful.filter(r => r.grade === 'B').length,
    C: successful.filter(r => r.grade === 'C').length,
    D: successful.filter(r => r.grade === 'D').length,
    F: successful.filter(r => r.grade === 'F').length
  };

  const avgScore = successful.length > 0
    ? successful.reduce((sum, r) => sum + r.overall_score, 0) / successful.length
    : 0;

  const totalCost = successful.reduce((sum, r) => sum + (r.analysis_cost || 0), 0);
  const totalTime = successful.reduce((sum, r) => sum + (r.analysis_time || 0), 0);

  return {
    total: results.length,
    successful: successful.length,
    failed: failed.length,
    gradeDistribution,
    averageScore: Math.round(avgScore * 10) / 10,
    totalCost: Math.round(totalCost * 1000) / 1000,
    totalTime,
    avgTimePerAnalysis: successful.length > 0 ? Math.round(totalTime / successful.length) : 0
  };
}

/**
 * Split array into chunks
 */
function chunkArray(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}
