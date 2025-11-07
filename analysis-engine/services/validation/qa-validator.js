/**
 * QA Validation Agent
 *
 * Uses GPT-5 Vision to validate if reported issues are actually visible
 * in the provided screenshots.
 *
 * Workflow:
 * 1. Load screenshot section(s) referenced in issue metadata
 * 2. Call GPT-5 with QA validation prompt
 * 3. Get verification result with confidence score
 * 4. Detect screenshot artifacts
 */

import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { callAI, parseJSONResponse } from '../../../database-tools/shared/ai-client.js';
import { detectArtifact } from './artifact-detector.js';
import { loadPrompt, substituteVariables } from '../../shared/prompt-loader.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Validate a single issue against screenshot evidence
 *
 * @param {object} issue - Issue object with title, description, metadata
 * @param {object} screenshotPaths - Map of screenshot number → file path
 * @param {string} companyName - Company name for context
 * @returns {Promise<object>} Validation result
 */
export async function validateIssue(issue, screenshotPaths, companyName = 'this website') {
  try {
    console.log(`\n[QA Validator] Validating: "${issue.title}"`);

    // Step 1: Pre-check for artifacts
    const artifactCheck = detectArtifact(issue);
    console.log(`[QA Validator] Artifact pre-check: ${artifactCheck.isPotentialArtifact ? '⚠ FLAGGED' : '✓ Clean'}`);
    if (artifactCheck.isPotentialArtifact) {
      console.log(`[QA Validator] Artifact confidence: ${artifactCheck.confidence} (${artifactCheck.artifactType})`);
      console.log(`[QA Validator] Reasoning: ${artifactCheck.reasoning}`);
    }

    // Step 2: Load screenshot section(s)
    const screenshots = await loadScreenshots(issue, screenshotPaths);
    console.log(`[QA Validator] Loaded ${screenshots.length} screenshot(s)`);

    // Step 3: Load QA validation prompt (using centralized loader)
    const promptConfig = await loadPrompt('qa-validator');

    // Step 4: Build user prompt with issue details (using centralized variable substitution)
    const metadata = issue.metadata || {};
    const userPrompt = await substituteVariables(
      promptConfig.userPromptTemplate,
      {
        issue_title: issue.title,
        issue_description: issue.description,
        issue_category: issue.category,
        issue_viewport: metadata.viewport || 'unknown',
        issue_page_region: metadata.page_region || 'unknown',
        issue_keywords: (metadata.keywords || []).join(', ')
      }
    );

    // Step 5: Call GPT-5 Vision
    console.log(`[QA Validator] Calling ${promptConfig.model} for verification...`);
    const startTime = Date.now();
    const response = await callAI({
      model: promptConfig.model,
      systemPrompt: promptConfig.systemPrompt,
      userPrompt: userPrompt,
      temperature: promptConfig.temperature,
      images: screenshots,
      jsonMode: true
    });
    const duration = Date.now() - startTime;

    console.log(`[QA Validator] AI response received (${duration}ms)`);
    console.log(`[QA Validator] Cost: $${response.cost?.toFixed(4) || '0.0000'}`);

    // Step 6: Parse validation result
    const validation = await parseJSONResponse(response.content);

    // Step 7: Combine with artifact detection
    const result = {
      issue: {
        title: issue.title,
        category: issue.category,
        viewport: issue.metadata?.viewport
      },
      validation: {
        verified: validation.verified,
        confidence: validation.confidence,
        evidence: validation.evidence,
        potential_artifact: validation.potential_artifact,
        artifact_type: validation.artifact_type,
        reasoning: validation.reasoning
      },
      artifact_precheck: artifactCheck,
      meta: {
        model: promptConfig.model,
        duration_ms: duration,
        cost: response.cost || 0,
        screenshot_count: screenshots.length,
        timestamp: new Date().toISOString()
      }
    };

    // Log result
    const statusIcon = validation.verified ? '✓' : '✗';
    const confidenceBar = '█'.repeat(Math.round(validation.confidence * 10));
    console.log(`[QA Validator] ${statusIcon} Verified: ${validation.verified} (confidence: ${validation.confidence.toFixed(2)} ${confidenceBar})`);
    if (validation.potential_artifact) {
      console.log(`[QA Validator] ⚠ AI flagged as potential artifact: ${validation.artifact_type}`);
    }

    return result;

  } catch (error) {
    console.error(`[QA Validator] Validation failed:`, error.message);
    return {
      issue: {
        title: issue.title,
        category: issue.category,
        viewport: issue.metadata?.viewport
      },
      validation: null,
      error: error.message,
      artifact_precheck: detectArtifact(issue)
    };
  }
}

/**
 * Load screenshot sections referenced in issue metadata
 */
async function loadScreenshots(issue, screenshotPaths) {
  const screenshots = [];
  const screenshotNumbers = issue.metadata?.screenshot_numbers || [];

  if (screenshotNumbers.length === 0) {
    throw new Error('Issue metadata missing screenshot_numbers');
  }

  for (const num of screenshotNumbers) {
    const pathInfo = screenshotPaths[num];
    if (!pathInfo) {
      throw new Error(`Screenshot ${num} not found in paths`);
    }

    console.log(`[QA Validator] Loading screenshot ${num}: ${pathInfo.filename}`);
    const buffer = await readFile(pathInfo.filepath);
    screenshots.push(buffer);
  }

  return screenshots;
}

/**
 * Validate all issues in an analysis result
 *
 * @param {object} analysisResult - Full analysis with desktopIssues, mobileIssues, etc.
 * @param {object} screenshotPaths - Map of screenshot number → file path
 * @param {string} companyName - Company name
 * @param {object} options - Validation options
 * @returns {Promise<object>} Validation results for all issues
 */
export async function validateAllIssues(analysisResult, screenshotPaths, companyName, options = {}) {
  const {
    maxIssues = null,          // Limit number of issues to validate
    skipArtifacts = false,     // Skip issues flagged as likely artifacts
    minArtifactConfidence = 0.7  // Artifact confidence threshold for skipping
  } = options;

  const allIssues = [
    ...(analysisResult.desktopIssues || []).map(i => ({ ...i, source: 'desktop' })),
    ...(analysisResult.mobileIssues || []).map(i => ({ ...i, source: 'mobile' })),
    ...(analysisResult.responsiveIssues || []).map(i => ({ ...i, source: 'responsive' })),
    ...(analysisResult.sharedIssues || []).map(i => ({ ...i, source: 'shared' }))
  ];

  console.log(`\n[QA Validator] Starting validation of ${allIssues.length} issues...`);

  const results = {
    totalIssues: allIssues.length,
    validatedIssues: 0,
    skippedIssues: 0,
    verified: 0,
    rejected: 0,
    uncertain: 0,
    potentialArtifacts: 0,
    validations: [],
    summary: {
      avgConfidence: 0,
      totalCost: 0,
      totalDuration: 0
    }
  };

  let issuesToValidate = allIssues;

  // Apply limit if specified
  if (maxIssues && maxIssues < allIssues.length) {
    console.log(`[QA Validator] Limiting to first ${maxIssues} issues`);
    issuesToValidate = allIssues.slice(0, maxIssues);
  }

  // Validate each issue
  for (const issue of issuesToValidate) {
    // Pre-check for artifacts if skipArtifacts is enabled
    if (skipArtifacts) {
      const artifactCheck = detectArtifact(issue);
      if (artifactCheck.isPotentialArtifact && artifactCheck.confidence >= minArtifactConfidence) {
        console.log(`\n[QA Validator] Skipping "${issue.title}" (likely artifact: ${artifactCheck.confidence.toFixed(2)})`);
        results.skippedIssues++;
        continue;
      }
    }

    const result = await validateIssue(issue, screenshotPaths, companyName);
    results.validations.push(result);
    results.validatedIssues++;

    if (result.validation) {
      // Count verification outcomes
      if (result.validation.verified && result.validation.confidence >= 0.7) {
        results.verified++;
      } else if (!result.validation.verified && result.validation.confidence >= 0.7) {
        results.rejected++;
      } else {
        results.uncertain++;
      }

      // Count artifacts
      if (result.validation.potential_artifact) {
        results.potentialArtifacts++;
      }

      // Accumulate cost and duration
      results.summary.totalCost += result.meta.cost;
      results.summary.totalDuration += result.meta.duration_ms;
    }
  }

  // Calculate averages
  if (results.validatedIssues > 0) {
    const confidences = results.validations
      .filter(r => r.validation)
      .map(r => r.validation.confidence);

    results.summary.avgConfidence = confidences.reduce((sum, c) => sum + c, 0) / confidences.length;
    results.summary.avgConfidence = Math.round(results.summary.avgConfidence * 100) / 100;
  }

  console.log(`\n[QA Validator] Validation complete!`);
  console.log(`  Validated: ${results.validatedIssues}/${results.totalIssues}`);
  console.log(`  Verified: ${results.verified}`);
  console.log(`  Rejected: ${results.rejected}`);
  console.log(`  Uncertain: ${results.uncertain}`);
  console.log(`  Potential artifacts: ${results.potentialArtifacts}`);
  console.log(`  Total cost: $${results.summary.totalCost.toFixed(4)}`);
  console.log(`  Total duration: ${(results.summary.totalDuration / 1000).toFixed(1)}s`);

  return results;
}

export default {
  validateIssue,
  validateAllIssues
};
