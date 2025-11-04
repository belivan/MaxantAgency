/**
 * Validation Service
 *
 * Orchestrates screenshot validation to filter out false positives from analysis results.
 * Uses two-layer approach: rule-based artifact detection + AI verification.
 *
 * Usage:
 *   const validationService = new ValidationService();
 *   const { filteredAnalysis, validationMetadata } = await validationService.validate({
 *     analysisResults,
 *     screenshotPaths,
 *     context
 *   });
 */

import { detectArtifact } from './validation/artifact-detector.js';
import { validateIssue } from './validation/qa-validator.js';

export class ValidationService {
  constructor(options = {}) {
    this.enabled = process.env.ENABLE_QA_VALIDATION === 'true';
    this.maxIssues = parseInt(process.env.MAX_ISSUES_TO_VALIDATE) || 50;
    this.confidenceThreshold = parseFloat(process.env.VALIDATION_CONFIDENCE_THRESHOLD) || 0.5;
    this.skipArtifacts = process.env.SKIP_LOW_CONFIDENCE_ARTIFACTS !== 'false';
  }

  /**
   * Validate analysis results by filtering out false positives
   *
   * @param {Object} params
   * @param {Object} params.analysisResults - Raw analysis from unified-visual-analyzer
   * @param {Object} params.screenshotPaths - Section paths from _screenshot_sections
   * @param {Object} params.context - Company name, industry, etc.
   * @returns {Promise<Object>} { filteredAnalysis, validationMetadata }
   */
  async validate({ analysisResults, screenshotPaths, context }) {
    if (!this.enabled) {
      return {
        filteredAnalysis: analysisResults,
        validationMetadata: { enabled: false }
      };
    }

    console.log('[Validation Service] Starting screenshot validation...');

    // Collect screenshot section paths from all results
    const allScreenshotPaths = this.collectScreenshotPaths(analysisResults, screenshotPaths);

    // Extract all visual issues
    const visualIssues = this.extractVisualIssues(analysisResults);

    console.log(`[Validation Service] Found ${visualIssues.length} visual issues to validate`);

    // Limit validation to max issues (safety)
    const issuesToValidate = visualIssues.slice(0, this.maxIssues);

    if (issuesToValidate.length < visualIssues.length) {
      console.warn(`[Validation Service] Limiting validation to ${this.maxIssues} issues (${visualIssues.length} total)`);
    }

    // Validate each issue
    const validationResults = [];
    let totalCost = 0;
    let totalDuration = 0;
    let verifiedCount = 0;
    let rejectedCount = 0;

    for (const issue of issuesToValidate) {
      const startTime = Date.now();

      // Step 1: Pre-check with artifact detector (free, fast)
      const artifactCheck = detectArtifact(issue);

      // Step 2: Decide if we need AI validation
      const needsAIValidation = this.shouldRunAIValidation(artifactCheck);

      if (!needsAIValidation && this.skipArtifacts) {
        // Skip AI validation for obvious artifacts
        console.log(`[Validation Service] Skipping AI validation for likely artifact: "${issue.title}"`);
        validationResults.push({
          issue,
          verified: false,
          skipped: true,
          reason: 'artifact_detected',
          artifactCheck
        });
        rejectedCount++;
        continue;
      }

      // Step 3: Run AI validation
      try {
        const validation = await validateIssue(issue, allScreenshotPaths, context.company_name || 'Unknown');

        const isVerified = validation.validation.verified &&
                          validation.validation.confidence >= this.confidenceThreshold;

        if (isVerified) {
          verifiedCount++;
        } else {
          rejectedCount++;
        }

        validationResults.push({
          issue,
          verified: isVerified,
          validation,
          artifactCheck
        });

        totalCost += validation.meta.cost || 0;
        totalDuration += validation.meta.duration_ms || 0;

      } catch (error) {
        console.error(`[Validation Service] Error validating issue "${issue.title}":`, error.message);
        // On error, assume issue is valid (fail-safe)
        validationResults.push({
          issue,
          verified: true,
          error: error.message,
          artifactCheck
        });
        verifiedCount++;
      }
    }

    // Filter analysis results
    const filteredAnalysis = this.filterAnalysis(analysisResults, validationResults);

    // Build metadata
    const validationMetadata = {
      enabled: true,
      total_issues_analyzed: visualIssues.length,
      issues_validated: issuesToValidate.length,
      verified_issues: verifiedCount,
      rejected_issues: rejectedCount,
      rejection_rate: ((rejectedCount / issuesToValidate.length) * 100).toFixed(1) + '%',
      validation_cost: totalCost,
      validation_duration_ms: totalDuration,
      avg_duration_per_issue_ms: Math.round(totalDuration / issuesToValidate.length),
      confidence_threshold: this.confidenceThreshold,
      rejection_summary: validationResults
        .filter(r => !r.verified)
        .map(r => ({
          title: r.issue.title,
          reason: r.validation?.validation.artifact_type || r.reason || 'low_confidence',
          confidence: r.validation?.validation.confidence || 0,
          viewport: r.issue.metadata?.viewport || 'unknown'
        }))
    };

    console.log('[Validation Service] Validation complete:', {
      verified: verifiedCount,
      rejected: rejectedCount,
      cost: `$${totalCost.toFixed(4)}`,
      duration: `${(totalDuration / 1000).toFixed(1)}s`
    });

    return { filteredAnalysis, validationMetadata };
  }

  /**
   * Collect screenshot paths from analysis results
   */
  collectScreenshotPaths(analysisResults, additionalPaths = {}) {
    const paths = { ...additionalPaths };

    // Collect paths from individual page results
    if (analysisResults._results) {
      analysisResults._results.forEach(result => {
        if (result._screenshot_sections) {
          Object.assign(paths, result._screenshot_sections);
        }
      });
    }

    // Collect from top-level if present
    if (analysisResults._screenshot_sections) {
      Object.assign(paths, analysisResults._screenshot_sections);
    }

    return paths;
  }

  /**
   * Extract all visual issues from analysis results
   */
  extractVisualIssues(analysisResults) {
    const issues = [];

    // From individual page results
    if (analysisResults._results) {
      analysisResults._results.forEach(result => {
        this.addIssuesFromResult(result, issues);
      });
    }

    // From top-level aggregated results
    this.addIssuesFromResult(analysisResults, issues);

    return issues;
  }

  /**
   * Add issues from a single result object
   */
  addIssuesFromResult(result, issues) {
    ['desktopIssues', 'mobileIssues', 'responsiveIssues', 'sharedIssues'].forEach(key => {
      if (result[key] && Array.isArray(result[key])) {
        result[key].forEach(issue => {
          // Only add if issue has metadata (required for validation)
          if (issue.metadata) {
            issues.push(issue);
          }
        });
      }
    });
  }

  /**
   * Determine if AI validation is needed based on artifact pre-check
   */
  shouldRunAIValidation(artifactCheck) {
    // Always validate if no artifact detected
    if (!artifactCheck.isPotentialArtifact) {
      return true;
    }

    // For potential artifacts, validate if confidence is medium or low
    // High confidence artifacts (>0.8) can be skipped
    return artifactCheck.confidence < 0.8;
  }

  /**
   * Filter analysis results by removing rejected issues
   */
  filterAnalysis(analysisResults, validationResults) {
    // Create a set of verified issue titles for fast lookup
    const verifiedTitles = new Set(
      validationResults
        .filter(r => r.verified)
        .map(r => r.issue.title)
    );

    // Deep clone to avoid mutating original
    const filtered = JSON.parse(JSON.stringify(analysisResults));

    // Filter issues at all levels
    ['desktopIssues', 'mobileIssues', 'responsiveIssues', 'sharedIssues'].forEach(key => {
      if (filtered[key] && Array.isArray(filtered[key])) {
        filtered[key] = filtered[key].filter(issue => {
          // Keep issues without metadata (non-visual issues)
          if (!issue.metadata) return true;

          // Keep only verified visual issues
          return verifiedTitles.has(issue.title);
        });
      }
    });

    // Filter individual page results if present
    if (filtered._results) {
      filtered._results = filtered._results.map(result => {
        const filteredResult = { ...result };

        ['desktopIssues', 'mobileIssues', 'responsiveIssues', 'sharedIssues'].forEach(key => {
          if (filteredResult[key] && Array.isArray(filteredResult[key])) {
            filteredResult[key] = filteredResult[key].filter(issue => {
              if (!issue.metadata) return true;
              return verifiedTitles.has(issue.title);
            });
          }
        });

        return filteredResult;
      });
    }

    return filtered;
  }
}

export default ValidationService;
