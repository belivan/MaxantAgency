/**
 * Issue Deduplication Service
 *
 * Intelligently deduplicates issues across all analyzers using AI to identify
 * semantic duplicates and merge them while preserving all metadata.
 *
 * CRITICAL: Preserves screenshot references and all metadata from merged issues.
 */

import { callAI, parseJSONResponse } from '../../database-tools/shared/ai-client.js';

/**
 * Deduplicates issues across all analyzers
 *
 * @param {Object} options - Deduplication options
 * @param {Array} options.allIssues - All issues from all analyzers
 * @param {Object} options.context - Business context (company_name, industry, etc.)
 * @param {String} options.grade - Current website grade
 * @param {Number} options.overall_score - Overall score
 * @returns {Promise<Object>} Deduplication results with consolidated issues
 */
export async function deduplicateIssues(options) {
  const { allIssues, context, grade, overall_score } = options;
  const startTime = Date.now();

  console.log(`\n[Issue Deduplication] Starting AI deduplication...`);
  console.log(`  Input: ${allIssues.length} issues from all analyzers`);

  // Edge case: If fewer than 2 issues, no deduplication needed
  if (allIssues.length <= 1) {
    return {
      consolidatedIssues: allIssues,
      mergeLog: [],
      statistics: {
        originalCount: allIssues.length,
        consolidatedCount: allIssues.length,
        reductionPercentage: 0
      },
      cost: 0,
      duration: Date.now() - startTime
    };
  }

  // Prepare issues for AI (include all metadata for preservation)
  const issuesWithMetadata = allIssues.map((issue, index) => ({
    id: issue.id || `issue-${index}`,
    title: issue.title,
    description: issue.description,
    severity: issue.severity,
    source: issue.source,
    category: issue.category,
    impact: issue.impact,
    priority: issue.priority,
    // CRITICAL: Preserve screenshot references
    screenshot: issue.screenshot || issue.screenshotReference || issue.screenshot_url || null,
    screenshotSection: issue.screenshotSection || null,
    page: issue.page || issue.url || '/',
    // Preserve other metadata
    wcagCriterion: issue.wcagCriterion || null,
    fix: issue.fix || issue.recommendation || null,
    difficulty: issue.difficulty || null
  }));

  // Build AI prompt for deduplication
  const systemPrompt = buildDeduplicationPrompt();
  const userPrompt = buildUserPrompt(issuesWithMetadata, context, grade, overall_score);

  try {
    // Call AI for intelligent deduplication
    const response = await callAI({
      model: process.env.DEDUPLICATION_MODEL || 'gpt-5-mini',
      systemPrompt,
      userPrompt,
      temperature: 0.2,
      jsonMode: true
    });

    const result = await parseJSONResponse(response.content);

    // Validate response
    if (!result.consolidatedIssues || !Array.isArray(result.consolidatedIssues)) {
      throw new Error('AI response missing consolidatedIssues array');
    }

    // Enrich consolidated issues with full metadata
    const enrichedIssues = result.consolidatedIssues.map(consolidated => {
      // Find all original issues that were merged into this one
      const mergedIds = consolidated.mergedIssues || [consolidated.primaryIssueId];
      const originalIssues = mergedIds.map(id =>
        allIssues.find(issue => (issue.id || `issue-${allIssues.indexOf(issue)}`) === id)
      ).filter(Boolean);

      if (originalIssues.length === 0) {
        console.warn(`[Issue Deduplication] No original issues found for consolidated issue: ${consolidated.title}`);
        return null;
      }

      // Use the primary issue as base
      const primaryIssue = originalIssues[0];

      // CRITICAL: Collect ALL screenshot references from merged issues
      const allScreenshots = originalIssues
        .map(issue => issue.screenshot || issue.screenshotReference || issue.screenshot_url)
        .filter(Boolean);

      const allScreenshotSections = originalIssues
        .map(issue => issue.screenshotSection)
        .filter(Boolean);

      // Collect all sources for transparency
      const allSources = [...new Set(originalIssues.map(i => i.source).filter(Boolean))];

      return {
        ...primaryIssue,
        // Use consolidated title and description from AI
        title: consolidated.title || primaryIssue.title,
        description: consolidated.description || primaryIssue.description,
        impact: consolidated.impact || primaryIssue.impact,

        // CRITICAL: Preserve ALL screenshot references
        screenshot: allScreenshots[0] || null, // Primary screenshot
        additionalScreenshots: allScreenshots.slice(1), // Additional screenshots
        screenshotSection: allScreenshotSections[0] || null,
        additionalScreenshotSections: allScreenshotSections.slice(1),

        // Metadata about the merge
        mergedFromCount: originalIssues.length,
        mergedSources: allSources,
        mergedIssueIds: mergedIds,
        deduplicationReason: consolidated.mergeReason || 'Similar issues identified by AI',

        // Keep highest severity/priority from merged issues
        severity: getHighestSeverity(originalIssues),
        priority: getHighestPriority(originalIssues)
      };
    }).filter(Boolean);

    // Calculate statistics
    const consolidatedCount = enrichedIssues.length;
    const originalCount = allIssues.length;
    const reductionPercentage = Math.round(((originalCount - consolidatedCount) / originalCount) * 100);

    const duration = Date.now() - startTime;

    console.log(`[Issue Deduplication] ✅ Complete`);
    console.log(`  Reduced: ${originalCount} → ${consolidatedCount} issues (${reductionPercentage}% reduction)`);
    console.log(`  Cost: $${response.cost?.toFixed(4) || '0.0000'}`);
    console.log(`  Duration: ${duration}ms`);

    return {
      consolidatedIssues: enrichedIssues,
      mergeLog: result.mergeLog || [],
      statistics: {
        originalCount,
        consolidatedCount,
        reductionPercentage,
        mergedGroups: result.mergeLog?.length || 0
      },
      cost: response.cost || 0,
      duration,
      modelUsed: response.model || 'gpt-5-mini',
      tokensUsed: response.usage?.total_tokens || 0
    };

  } catch (error) {
    console.error(`[Issue Deduplication] ❌ AI deduplication failed:`, error.message);
    console.log(`[Issue Deduplication] Returning original issues without deduplication`);

    // Return original issues if deduplication fails
    return {
      consolidatedIssues: allIssues,
      mergeLog: [],
      statistics: {
        originalCount: allIssues.length,
        consolidatedCount: allIssues.length,
        reductionPercentage: 0
      },
      cost: 0,
      duration: Date.now() - startTime,
      error: error.message
    };
  }
}

/**
 * Build the system prompt for AI deduplication
 */
function buildDeduplicationPrompt() {
  return `You are an expert at identifying and consolidating duplicate website issues across different analysis modules.

Your task is to identify issues that describe the SAME underlying problem, even if worded differently or observed from different perspectives.

DEDUPLICATION RULES:
1. **Same Root Cause**: Issues that stem from the same underlying problem should be merged
   - Example: "Missing alt text on images" (SEO) + "Images without alt text violate WCAG 1.1.1" (Accessibility) = SAME ISSUE

2. **Different Perspectives**: Issues observed by different analyzers but referring to same element
   - Example: "CTA button too small on mobile" (Mobile) + "Touch target below 44px minimum" (Accessibility) = SAME ISSUE

3. **Quantified vs Generic**: Merge generic descriptions with specific quantified versions
   - Keep: "280 of 856 images missing alt text (33%)"
   - Merge: "Many images lack alt text"

4. **Cross-Device Issues**: Issues that appear on both desktop and mobile
   - Example: "Hero text unreadable on desktop" + "Hero text too small on mobile" = "Hero text readability issues across devices"

PRESERVATION RULES:
1. **Keep Best Title**: Use the most specific, quantified, actionable title
2. **Merge Descriptions**: Combine insights from all perspectives
3. **Preserve Metadata**: Keep ALL screenshot references, sources, pages, WCAG criteria
4. **Highest Severity**: Use the highest severity/priority from merged issues

WHAT NOT TO MERGE:
- Issues affecting completely different elements (header vs footer)
- Issues with different root causes (design vs technical)
- Issues on different pages UNLESS they represent a site-wide pattern

Return JSON format:
{
  "consolidatedIssues": [
    {
      "primaryIssueId": "issue-0",
      "mergedIssues": ["issue-0", "issue-5", "issue-12"],
      "title": "280 of 856 images missing alt text (33%)",
      "description": "Comprehensive description combining all perspectives",
      "impact": "Combined impact on SEO, accessibility, and user experience",
      "mergeReason": "Same issue identified by SEO, accessibility, and unified visual analyzers"
    }
  ],
  "mergeLog": [
    {
      "mergedIds": ["issue-0", "issue-5", "issue-12"],
      "reason": "All refer to missing alt text on images",
      "consolidatedInto": "issue-0"
    }
  ]
}`;
}

/**
 * Build the user prompt with issues data
 */
function buildUserPrompt(issues, context, grade, overall_score) {
  return `Company: ${context.company_name}
Industry: ${context.industry}
Current Grade: ${grade} (${overall_score}/100)
Total Issues: ${issues.length}

ISSUES TO DEDUPLICATE:
${JSON.stringify(issues, null, 2)}

TASK:
1. Identify groups of issues that describe the SAME underlying problem
2. For each group, select the PRIMARY issue (most specific/quantified)
3. Merge duplicates into the primary issue
4. Create consolidated title and description that captures all perspectives
5. Return consolidated issues with merge information

IMPORTANT:
- Aim for 40-60% reduction through intelligent merging
- Preserve ALL screenshot references and metadata
- Keep issues that are truly distinct even if similar
- Focus on merging obvious duplicates and cross-analyzer observations of same problem`;
}

/**
 * Get the highest severity from a list of issues
 */
function getHighestSeverity(issues) {
  const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
  return issues.reduce((highest, issue) => {
    const currentWeight = severityOrder[issue.severity] || 0;
    const highestWeight = severityOrder[highest] || 0;
    return currentWeight > highestWeight ? issue.severity : highest;
  }, 'medium');
}

/**
 * Get the highest priority from a list of issues
 */
function getHighestPriority(issues) {
  const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
  return issues.reduce((highest, issue) => {
    const currentWeight = priorityOrder[issue.priority] || 0;
    const highestWeight = priorityOrder[highest] || 0;
    return currentWeight > highestWeight ? issue.priority : highest;
  }, 'medium');
}

// Export as default as well for convenience
export default { deduplicateIssues };