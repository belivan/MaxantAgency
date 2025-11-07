/**
 * Report Synthesis Pipeline
 * -------------------------
 * Runs post-analysis AI synthesis stages:
 *   1. Issue deduplication across modules
 *   2. Executive summary generation
 *
 * Returns structured data ready for report templates.
 */

import { loadPrompt } from '../../shared/prompt-loader.js';
import { callAI, parseJSONResponse } from '../../../database-tools/shared/ai-client.js';

const SYNTHESIS_NAMESPACE = 'report-synthesis';

const STAGES = {
  DEDUP: 'issue-deduplication',
  EXEC_SUMMARY: 'executive-insights-generator'
};

// Default timeout is 3 minutes (180 seconds) per stage
const SYNTHESIS_TIMEOUT = process.env.SYNTHESIS_TIMEOUT ? parseInt(process.env.SYNTHESIS_TIMEOUT) : 180000;

/**
 * Safely stringify a value for prompt variables.
 */
function safeStringify(value, fallback = []) {
  const target = value === undefined || value === null ? fallback : value;
  try {
    return JSON.stringify(target, null, 2);
  } catch (error) {
    console.warn('[Report Synthesis] Failed to stringify value. Using fallback.', error);
    try {
      return JSON.stringify(fallback, null, 2);
    } catch {
      return '[]';
    }
  }
}

/**
 * Build screenshot references for evidence linking.
 */
function buildScreenshotReferences(pages = []) {
  const references = [];
  let counter = 1;

  // Ensure pages is iterable
  const pageList = Array.isArray(pages) ? pages : [];

  for (const page of pageList) {
    const baseTitle = page.title || page.metadata?.title || page.url || 'Page';
    const modules = Object.entries(page.analyzed_for || {})
      .filter(([, used]) => Boolean(used))
      .map(([module]) => module);

    if (page.screenshot_paths?.desktop) {
      references.push({
        id: `SS-${counter++}`,
        pageUrl: page.url,
        fullUrl: page.fullUrl,
        title: baseTitle,
        viewport: 'desktop',
        path: page.screenshot_paths.desktop,
        modules,
        description: page.metadata?.description || null
      });
    }

    if (page.screenshot_paths?.mobile) {
      references.push({
        id: `SS-${counter++}`,
        pageUrl: page.url,
        fullUrl: page.fullUrl,
        title: baseTitle,
        viewport: 'mobile',
        path: page.screenshot_paths.mobile,
        modules,
        description: page.metadata?.description || null
      });
    }
  }

  return references;
}

/**
 * Create a promise that rejects after the specified timeout
 */
function createTimeoutPromise(timeoutMs, stageName) {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error(`Stage "${stageName}" timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });
}

/**
 * Run a synthesis stage with timeout protection
 */
async function runSynthesisStageWithTimeout(stage, context, timeoutMs = SYNTHESIS_TIMEOUT) {
  const stagePromise = runSynthesisStage(stage, context);
  const timeoutPromise = createTimeoutPromise(timeoutMs, stage);

  try {
    // Race between the actual stage and the timeout
    const result = await Promise.race([stagePromise, timeoutPromise]);
    return result;
  } catch (error) {
    if (error.message.includes('timed out')) {
      console.warn(`[Report Synthesis] Stage ${stage} timed out after ${timeoutMs}ms`);
    }
    throw error;
  }
}

/**
 * Helper to invoke a synthesis prompt and return parsed JSON with metadata.
 */
async function runSynthesisStage(stageId, variables) {
  console.log(`[Report Synthesis] Loading prompt: ${SYNTHESIS_NAMESPACE}/${stageId}`);
  const promptPath = `${SYNTHESIS_NAMESPACE}/${stageId}`;
  const prompt = await loadPrompt(promptPath, variables);
  
  console.log(`[Report Synthesis] Calling AI (model: ${prompt.model})...`);
  const startTime = Date.now();

  const response = await callAI({
    model: prompt.model,
    systemPrompt: prompt.systemPrompt,
    userPrompt: prompt.userPrompt,
    temperature: prompt.temperature,
    // maxTokens: REMOVED - let models use native capacity (no limits)
    jsonMode: true,
    autoFallback: false,
    timeout: SYNTHESIS_TIMEOUT  // Use synthesis-specific timeout (240s default)
  });
  
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`[Report Synthesis] AI response received (${duration}s, ${response.usage?.total_tokens || 'unknown'} tokens)`);

  // DEBUG: Log response preview if debug mode enabled
  if (process.env.DEBUG_SYNTHESIS === 'true') {
    const contentPreview = typeof response.content === 'string'
      ? response.content.substring(0, 200)
      : JSON.stringify(response.content).substring(0, 200);
    console.log(`[Report Synthesis] [DEBUG] Response preview: ${contentPreview}...`);
    console.log(`[Report Synthesis] [DEBUG] Response type: ${typeof response.content}`);
    console.log(`[Report Synthesis] [DEBUG] Response length: ${typeof response.content === 'string' ? response.content.length : 'N/A'} chars`);
  }

  const parsed = await parseJSONResponse(response.content);

  return {
    data: parsed,
    meta: {
      model: response.model || prompt.model,
      usage: response.usage || null,
      cost: response.cost || null,
      timestamp: new Date().toISOString(),
      duration: `${duration}s`
    }
  };
}

function formatTopIssue(topIssue) {
  if (!topIssue) return 'No critical issue identified';
  const title = topIssue.title || 'Critical issue';
  const detail = topIssue.description || topIssue.impact || '';
  return detail ? `${title}: ${detail}` : title;
}

function coerceBooleanFlag(value, trueLabel = 'Yes', falseLabel = 'No') {
  if (value === undefined || value === null) return 'Unknown';
  return value ? trueLabel : falseLabel;
}

function formatQuickWinFallback(quickWins = []) {
  return quickWins.slice(0, 5).map((win, index) => ({
    rank: index + 1,
    title: win.title || `Quick Win ${index + 1}`,
    description: win.description || win.recommendation || '',
    source: win.source || win.module || 'general',
    category: win.category || 'general',
    effort: win.effort || 'unknown',
    impactScore: win.impactScore ?? null,
    effortScore: win.effortScore ?? null,
    urgencyScore: win.urgencyScore ?? null,
    industryFitScore: win.industryFitScore ?? null,
    overallScore: win.overallScore ?? null,
    expectedImpact: win.impact || win.expectedImpact || '',
    reasoning: win.reasoning || '',
    implementation: win.implementation || ''
  }));
}

function formatConsolidatedFallback(allIssues = {}) {
  const buckets = [
    ...(allIssues.desktop || []),
    ...(allIssues.mobile || []),
    ...(allIssues.seo || []),
    ...(allIssues.content || []),
    ...(allIssues.social || []),
    ...(allIssues.accessibility || [])
  ];

  return buckets.slice(0, 10).map((issue, index) => ({
    id: `FALLBACK-${index + 1}`,
    title: issue.title || `Issue ${index + 1}`,
    description: issue.description || issue.impact || '',
    sources: issue.sources || [issue.module || 'general'],
    severity: issue.severity || 'medium',
    category: issue.category || 'general',
    impact: issue.impact || '',
    effort: issue.effort || 'medium',
    priority: issue.priority || 'medium',
    evidence: issue.evidence || [],
    affectedPages: issue.affectedPages || [],
    screenshotRefs: issue.screenshotRefs || [],
    originalIssueIds: issue.originalIssueIds || []
  }));
}

/**
 * Run full report synthesis pipeline.
 */
export async function runReportSynthesis({
  companyName,
  industry,
  grade,
  overallScore,
  url,
  issuesByModule,
  quickWins,
  leadScoring,
  topIssue,
  techStack,
  hasBlog,
  socialPlatforms,
  isMobileFriendly,
  hasHttps,
  crawlPages,
  topIssues  // NEW: Pre-selected top issues from Analysis Engine
}) {
  console.log('[Report Synthesis] runReportSynthesis called');
  console.log(`[Report Synthesis] Company: ${companyName}, Industry: ${industry}, Grade: ${grade}`);

  const errors = [];
  const stageMetadata = {};

  // NEW: Check if top issues already exist (from Analysis Engine)
  const hasPreSelectedTopIssues = topIssues && Array.isArray(topIssues) && topIssues.length > 0;
  if (hasPreSelectedTopIssues) {
    console.log(`[Report Synthesis] ⚡ Top ${topIssues.length} issues pre-selected by Analysis Engine`);
    console.log(`[Report Synthesis] ⚡ Skipping deduplication stage (saving ~$0.036)`);
    console.log(`[Report Synthesis] ⚡ Executive summary will focus on these ${topIssues.length} pre-selected issues`);
  }

  // Build screenshot references upfront (needed by both stages)
  // Ensure crawlPages is an array before passing it
  const safeCrawlPages = Array.isArray(crawlPages) ? crawlPages : [];
  const screenshotReferences = buildScreenshotReferences(safeCrawlPages);
  console.log(`[Report Synthesis] Built ${screenshotReferences.length} screenshot references`);

  const consolidatedContext = {
    company_name: companyName || 'Unknown Company',
    industry: industry || 'Unknown',
    grade: grade || 'N/A',
    overall_score: String(overallScore ?? 0),
    desktop_issues_json: safeStringify(issuesByModule?.desktop),
    mobile_issues_json: safeStringify(issuesByModule?.mobile),
    seo_issues_json: safeStringify(issuesByModule?.seo),
    content_issues_json: safeStringify(issuesByModule?.content),
    social_issues_json: safeStringify(issuesByModule?.social),
    accessibility_issues_json: safeStringify(issuesByModule?.accessibility),
    screenshot_references_json: safeStringify(screenshotReferences)
  };

  // ⚡ SEQUENTIAL SYNTHESIS: Run stages with dynamic timeout budget
  console.log('[Report Synthesis] Running synthesis stages sequentially...');

  // Telemetry: Track synthesis timing
  const synthesisStartTime = Date.now();
  const telemetry = {
    startTime: new Date().toISOString(),
    stages: {},
    executionMode: 'sequential'
  };

  // Use pre-selected top issues if available (from Analysis Engine), otherwise use fallback
  const issuesForExecutiveSummary = hasPreSelectedTopIssues
    ? topIssues
    : formatConsolidatedFallback(issuesByModule);

  const execSummaryContext = {
    company_name: companyName || 'Unknown Company',
    industry: industry || 'Unknown',
    grade: grade || 'N/A',
    overall_score: String(overallScore ?? 0),
    url: url || 'Unknown',
    lead_priority: leadScoring?.lead_priority !== undefined ? String(leadScoring.lead_priority) : 'Unknown',
    priority_tier: leadScoring?.priority_tier || 'unknown',
    budget_likelihood: leadScoring?.budget_likelihood || 'unknown',
    tech_stack: techStack || 'Unknown',
    pages_crawled: String(Array.isArray(crawlPages) ? crawlPages.length : 0),
    consolidated_issues_json: safeStringify(issuesForExecutiveSummary), // Use pre-selected top issues or fallback
    balanced_quick_wins_json: safeStringify(formatQuickWinFallback(quickWins)),
    screenshot_references_json: safeStringify(screenshotReferences)
  };

  // STAGE 1: Issue Deduplication (CRITICAL - Skip if top issues pre-selected)
  console.log('[Report Synthesis] Stage 1: Issue deduplication...');
  const dedupStartTime = Date.now();
  let dedupResult = null;

  if (hasPreSelectedTopIssues) {
    // Use pre-selected top issues from Analysis Engine
    console.log('[Report Synthesis] ✓ Using pre-selected top issues (deduplication skipped)');
    const dedupDuration = Date.now() - dedupStartTime;

    dedupResult = {
      consolidatedIssues: topIssues,
      mergeLog: [],
      statistics: {
        preSelected: true,
        source: 'analysis-engine',
        totalIssues: topIssues.length
      }
    };

    telemetry.stages.deduplication = {
      status: 'skipped',
      reason: 'pre_selected_top_issues',
      duration_ms: dedupDuration,
      tokens: 0,
      cost: 0,
      model: 'n/a'
    };
  } else {
    // Run AI deduplication
    console.log('[Report Synthesis] Running AI-powered deduplication...');
    try {
      const dedupResponse = await runSynthesisStageWithTimeout(STAGES.DEDUP, consolidatedContext, SYNTHESIS_TIMEOUT);
      const dedupDuration = Date.now() - dedupStartTime;

      dedupResult = dedupResponse.data;

      // Validate dedup response structure
      if (!dedupResult || !dedupResult.consolidatedIssues) {
        console.error('[Report Synthesis] ✗ Invalid dedup response structure:', {
          hasData: !!dedupResult,
          dataKeys: dedupResult ? Object.keys(dedupResult) : [],
          hasConsolidatedIssues: dedupResult?.consolidatedIssues !== undefined
        });
        throw new Error('Deduplication returned invalid structure - missing consolidatedIssues array');
      }

      stageMetadata.issueDeduplication = dedupResponse.meta;
      telemetry.stages.deduplication = {
        status: 'success',
        duration_ms: dedupDuration,
        tokens: dedupResponse.meta.usage?.total_tokens || 0,
        cost: dedupResponse.meta.cost || 0,
        model: dedupResponse.meta.model
      };
      console.log(`[Report Synthesis] ✓ Deduplication complete: ${dedupResult?.consolidatedIssues?.length || 0} consolidated issues (${(dedupDuration / 1000).toFixed(1)}s)`);
    } catch (error) {
      const dedupDuration = Date.now() - dedupStartTime;
      const errorMessage = error?.message || 'Unknown error';
      const isTimeout = errorMessage.includes('timed out');
      telemetry.stages.deduplication = {
        status: 'failed',
        error: errorMessage,
        timeout: isTimeout,
        duration_ms: dedupDuration
      };
      console.error('[Report Synthesis] ✗ Issue deduplication failed:', error);
      errors.push({ stage: STAGES.DEDUP, message: errorMessage });
    }
  }

  // Early return if deduplication failed completely
  if (!dedupResult) {
    console.warn('[Report Synthesis] ⚠️  Deduplication failed - returning fallback data without executive summary');
    const synthesisEndTime = Date.now();
    telemetry.endTime = new Date().toISOString();
    telemetry.totalDuration_ms = synthesisEndTime - synthesisStartTime;
    telemetry.totalDuration_seconds = ((synthesisEndTime - synthesisStartTime) / 1000).toFixed(1);
    telemetry.earlyReturn = true;
    telemetry.reason = 'deduplication_failed';

    console.log('\n' + '='.repeat(80));
    console.log('[Report Synthesis] EARLY TERMINATION - Deduplication Failed');
    console.log('='.repeat(80));
    console.log(`Total Duration: ${telemetry.totalDuration_seconds}s`);
    console.log(`Returning fallback data`);
    console.log('='.repeat(80) + '\n');

    return {
      consolidatedIssues: formatConsolidatedFallback(issuesByModule),
      mergeLog: [],
      consolidationStatistics: null,
      executiveSummary: null,
      executiveMetadata: null,
      screenshotReferences,
      stageMetadata,
      errors,
      telemetry
    };
  }

  // STAGE 2: Executive Summary (Optional - Only if time permits)
  let executiveSummary = null;
  const elapsedTime = Date.now() - synthesisStartTime;
  const remainingTime = SYNTHESIS_TIMEOUT - elapsedTime;
  const minimumTimeNeeded = 60000; // Need at least 1 minute for executive summary

  if (remainingTime > minimumTimeNeeded) {
    console.log(`[Report Synthesis] Stage 2: Running executive summary (${(remainingTime / 1000).toFixed(0)}s remaining)...`);
    const execStartTime = Date.now();

    try {
      const execResponse = await runSynthesisStageWithTimeout(STAGES.EXEC_SUMMARY, execSummaryContext, remainingTime);
      const execDuration = Date.now() - execStartTime;

      executiveSummary = execResponse.data;
      stageMetadata.executiveSummary = execResponse.meta;
      telemetry.stages.executiveSummary = {
        status: 'success',
        duration_ms: execDuration,
        tokens: execResponse.meta.usage?.total_tokens || 0,
        cost: execResponse.meta.cost || 0,
        model: execResponse.meta.model
      };
      console.log(`[Report Synthesis] ✓ Executive summary generated successfully (${(execDuration / 1000).toFixed(1)}s)`);
    } catch (error) {
      const execDuration = Date.now() - execStartTime;
      const errorMessage = error?.message || 'Unknown error';
      const isTimeout = errorMessage.includes('timed out');
      telemetry.stages.executiveSummary = {
        status: 'failed',
        error: errorMessage,
        timeout: isTimeout,
        duration_ms: execDuration
      };
      console.error('[Report Synthesis] ✗ Executive summary generation failed:', error);
      errors.push({ stage: STAGES.EXEC_SUMMARY, message: errorMessage });
    }
  } else {
    console.warn(`[Report Synthesis] ⚠ Skipping executive summary - insufficient time remaining (${(remainingTime / 1000).toFixed(0)}s, need ${(minimumTimeNeeded / 1000)}s)`);
    telemetry.stages.executiveSummary = {
      status: 'skipped',
      reason: 'insufficient_time',
      remainingTime_ms: remainingTime,
      minimumNeeded_ms: minimumTimeNeeded
    };
    errors.push({
      stage: STAGES.EXEC_SUMMARY,
      message: `Skipped due to insufficient time (${(remainingTime / 1000).toFixed(0)}s remaining, need ${(minimumTimeNeeded / 1000)}s)`
    });
  }

  // Calculate total synthesis duration
  const synthesisEndTime = Date.now();
  const totalDuration = synthesisEndTime - synthesisStartTime;
  telemetry.endTime = new Date().toISOString();
  telemetry.totalDuration_ms = totalDuration;
  telemetry.totalDuration_seconds = (totalDuration / 1000).toFixed(1);

  // Log comprehensive telemetry
  console.log('\n' + '='.repeat(80));
  console.log('[Report Synthesis] TELEMETRY SUMMARY');
  console.log('='.repeat(80));
  console.log(`Execution Mode: ${telemetry.executionMode}`);
  console.log(`Total Duration: ${telemetry.totalDuration_seconds}s (${telemetry.totalDuration_ms}ms)`);
  console.log('\nStage: Deduplication');
  if (telemetry.stages.deduplication) {
    if (telemetry.stages.deduplication.status === 'success') {
      console.log(`  ✓ Status: ${telemetry.stages.deduplication.status}`);
      console.log(`  Duration: ${(telemetry.stages.deduplication.duration_ms / 1000).toFixed(1)}s`);
      console.log(`  Tokens: ${telemetry.stages.deduplication.tokens}`);
      console.log(`  Cost: $${telemetry.stages.deduplication.cost?.toFixed(4) || '0.0000'}`);
      console.log(`  Model: ${telemetry.stages.deduplication.model}`);
    } else if (telemetry.stages.deduplication.status === 'skipped') {
      console.log(`  ⚡ Status: ${telemetry.stages.deduplication.status}`);
      console.log(`  Reason: ${telemetry.stages.deduplication.reason}`);
      console.log(`  Duration: ${(telemetry.stages.deduplication.duration_ms / 1000).toFixed(1)}s`);
      console.log(`  Cost: $${telemetry.stages.deduplication.cost?.toFixed(4) || '0.0000'} (saved)`);
    } else {
      console.log(`  ✗ Status: ${telemetry.stages.deduplication.status}`);
      console.log(`  Error: ${telemetry.stages.deduplication.error}`);
      console.log(`  Timeout: ${telemetry.stages.deduplication.timeout ? 'Yes' : 'No'}`);
    }
  }
  console.log('\nStage: Executive Summary');
  if (telemetry.stages.executiveSummary) {
    if (telemetry.stages.executiveSummary.status === 'success') {
      console.log(`  ✓ Status: ${telemetry.stages.executiveSummary.status}`);
      console.log(`  Duration: ${(telemetry.stages.executiveSummary.duration_ms / 1000).toFixed(1)}s`);
      console.log(`  Tokens: ${telemetry.stages.executiveSummary.tokens}`);
      console.log(`  Cost: $${telemetry.stages.executiveSummary.cost?.toFixed(4) || '0.0000'}`);
      console.log(`  Model: ${telemetry.stages.executiveSummary.model}`);
    } else if (telemetry.stages.executiveSummary.status === 'skipped') {
      console.log(`  ⚠ Status: ${telemetry.stages.executiveSummary.status}`);
      console.log(`  Reason: ${telemetry.stages.executiveSummary.reason}`);
      console.log(`  Remaining Time: ${(telemetry.stages.executiveSummary.remainingTime_ms / 1000).toFixed(1)}s`);
      console.log(`  Minimum Needed: ${(telemetry.stages.executiveSummary.minimumNeeded_ms / 1000).toFixed(1)}s`);
    } else {
      console.log(`  ✗ Status: ${telemetry.stages.executiveSummary.status}`);
      console.log(`  Error: ${telemetry.stages.executiveSummary.error || 'Unknown'}`);
      if (telemetry.stages.executiveSummary.timeout !== undefined) {
        console.log(`  Timeout: ${telemetry.stages.executiveSummary.timeout ? 'Yes' : 'No'}`);
      }
      if (telemetry.stages.executiveSummary.duration_ms) {
        console.log(`  Duration before failure: ${(telemetry.stages.executiveSummary.duration_ms / 1000).toFixed(1)}s`);
      }
    }
  }

  const totalCost = (telemetry.stages.deduplication?.cost || 0) + (telemetry.stages.executiveSummary?.cost || 0);
  const totalTokens = (telemetry.stages.deduplication?.tokens || 0) + (telemetry.stages.executiveSummary?.tokens || 0);
  console.log(`\nTotal Cost: $${totalCost.toFixed(4)}`);
  console.log(`Total Tokens: ${totalTokens}`);
  console.log('='.repeat(80) + '\n');

  console.log('[Report Synthesis] Pipeline complete');
  console.log(`[Report Synthesis] Total errors: ${errors.length}`);
  
  return {
    consolidatedIssues: dedupResult?.consolidatedIssues || formatConsolidatedFallback(issuesByModule),
    mergeLog: dedupResult?.mergeLog || [],
    consolidationStatistics: dedupResult?.statistics || null,
    executiveSummary: executiveSummary?.executiveSummary || null,
    executiveMetadata: executiveSummary?.metadata || null,
    screenshotReferences,
    stageMetadata,
    errors
  };
}

export default {
  runReportSynthesis
};

