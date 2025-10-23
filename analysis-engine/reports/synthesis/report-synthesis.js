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
import { callAI, parseJSONResponse } from '../../shared/ai-client.js';

const SYNTHESIS_NAMESPACE = 'report-synthesis';

const STAGES = {
  DEDUP: 'issue-deduplication',
  EXEC_SUMMARY: 'executive-insights-generator'
};

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

  for (const page of pages || []) {
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
    jsonMode: true,
    autoFallback: false
  });
  
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`[Report Synthesis] AI response received (${duration}s, ${response.usage?.total_tokens || 'unknown'} tokens)`);

  const parsed = parseJSONResponse(response.content);

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
  crawlPages
}) {
  console.log('[Report Synthesis] runReportSynthesis called');
  console.log(`[Report Synthesis] Company: ${companyName}, Industry: ${industry}, Grade: ${grade}`);
  
  const errors = [];
  const stageMetadata = {};

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
    accessibility_issues_json: safeStringify(issuesByModule?.accessibility)
  };

  console.log('[Report Synthesis] Stage 1/2: Running issue deduplication...');
  let dedupResult = null;

  try {
    const dedup = await runSynthesisStage(STAGES.DEDUP, consolidatedContext);
    dedupResult = dedup.data;
    stageMetadata.issueDeduplication = dedup.meta;
    console.log(`[Report Synthesis] ✓ Deduplication complete: ${dedupResult?.consolidatedIssues?.length || 0} consolidated issues`);
  } catch (error) {
    console.error('[Report Synthesis] ✗ Issue deduplication failed:', error);
    errors.push({ stage: STAGES.DEDUP, message: error.message });
  }

  const screenshotReferences = buildScreenshotReferences(crawlPages);
  console.log(`[Report Synthesis] Built ${screenshotReferences.length} screenshot references`);

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
    consolidated_issues_json: safeStringify(dedupResult?.consolidatedIssues, formatConsolidatedFallback(issuesByModule)),
    balanced_quick_wins_json: safeStringify(formatQuickWinFallback(quickWins)),
    screenshot_references_json: safeStringify(screenshotReferences)
  };

  console.log('[Report Synthesis] Stage 2/2: Generating executive summary...');
  let executiveSummary = null;

  try {
    const execSummary = await runSynthesisStage(STAGES.EXEC_SUMMARY, execSummaryContext);
    executiveSummary = execSummary.data;
    stageMetadata.executiveSummary = execSummary.meta;
    console.log('[Report Synthesis] ✓ Executive summary generated successfully');
  } catch (error) {
    console.error('[Report Synthesis] ✗ Executive summary generation failed:', error);
    errors.push({ stage: STAGES.EXEC_SUMMARY, message: error.message });
  }

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

