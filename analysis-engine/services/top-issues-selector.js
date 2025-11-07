/**
 * AI-Powered Top Issues Selector
 *
 * Filters issues to high/critical severity, then uses AI to select
 * the top 5 most impactful issues for cold outreach.
 */

import { callAI, parseJSONResponse } from '../../database-tools/shared/ai-client.js';

/**
 * Calculate similarity between two strings (0-1 scale)
 * Uses Levenshtein distance normalized by string length
 */
function calculateSimilarity(str1, str2) {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();

  // Quick exact match check
  if (s1 === s2) return 1;

  // Check for substring containment (one is subset of other)
  if (s1.includes(s2) || s2.includes(s1)) {
    const shorter = Math.min(s1.length, s2.length);
    const longer = Math.max(s1.length, s2.length);
    return shorter / longer; // Return similarity based on length ratio
  }

  // Calculate Levenshtein distance
  const matrix = [];
  for (let i = 0; i <= s2.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= s1.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= s2.length; i++) {
    for (let j = 1; j <= s1.length; j++) {
      if (s2.charAt(i - 1) === s1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  const distance = matrix[s2.length][s1.length];
  const maxLength = Math.max(s1.length, s2.length);
  return 1 - (distance / maxLength);
}

/**
 * Deduplicate issues by title similarity
 * Keeps the most specific/quantified version of duplicate issues
 *
 * @param {Array} issues - Issues to deduplicate
 * @param {Number} threshold - Similarity threshold (0-1) above which issues are considered duplicates
 * @returns {Array} Deduplicated issues
 */
function deduplicateByTitleSimilarity(issues, threshold = 0.7) {
  if (!issues || issues.length === 0) return [];

  const deduplicated = [];
  const seen = new Set();

  for (let i = 0; i < issues.length; i++) {
    if (seen.has(i)) continue;

    const currentIssue = issues[i];
    let bestVersion = currentIssue;
    seen.add(i);

    // Check against remaining issues
    for (let j = i + 1; j < issues.length; j++) {
      if (seen.has(j)) continue;

      const candidateIssue = issues[j];
      const similarity = calculateSimilarity(currentIssue.title, candidateIssue.title);

      if (similarity >= threshold) {
        // Found a duplicate - keep the better version
        seen.add(j);

        // Prefer the version with numbers/data (more specific)
        const currentHasNumbers = /\d+/.test(currentIssue.title);
        const candidateHasNumbers = /\d+/.test(candidateIssue.title);

        if (candidateHasNumbers && !currentHasNumbers) {
          bestVersion = candidateIssue;
        } else if (!candidateHasNumbers && currentHasNumbers) {
          bestVersion = currentIssue;
        } else if (candidateIssue.title.length > currentIssue.title.length) {
          // If both have numbers or neither do, prefer longer (more descriptive)
          bestVersion = candidateIssue;
        }
      }
    }

    deduplicated.push(bestVersion);
  }

  return deduplicated;
}

/**
 * Select top N issues using AI
 *
 * @param {Array} allIssues - All issues from analysis
 * @param {Object} context - Business context (company_name, industry, grade, etc.)
 * @param {Number} limit - Number of top issues to select (default: 5)
 * @returns {Promise<Object>} { topIssues, excludedCount, selectionStrategy, cost, duration }
 */
export async function selectTopIssues(allIssues, context, limit = 5) {
  const startTime = Date.now();

  // Step 1: Filter by severity (configurable via TOP_ISSUES_SEVERITY_FILTER)
  const severityFilter = process.env.TOP_ISSUES_SEVERITY_FILTER || 'critical,high';
  const allowedSeverities = severityFilter.split(',').map(s => s.trim());

  const filteredIssues = allIssues.filter(issue =>
    allowedSeverities.includes(issue.severity)
  );

  console.log(`\n📊 Filtering issues:`);
  console.log(`  Total issues: ${allIssues.length}`);
  console.log(`  Severity filter: ${allowedSeverities.join(', ')}`);
  console.log(`  Filtered issues: ${filteredIssues.length}`);

  // Edge case: If fewer than limit filtered issues, return all
  if (filteredIssues.length <= limit) {
    console.log(`  ⚠️  Only ${filteredIssues.length} issues matching severity filter (< limit of ${limit})`);
    console.log(`  Returning all ${filteredIssues.length} without AI selection`);

    return {
      topIssues: filteredIssues.map((issue, index) => ({
        ...issue,
        rank: index + 1,
        reasoning: `Selected due to ${issue.severity} severity (no filtering needed)`
      })),
      excludedCount: 0,
      selectionStrategy: `Only ${filteredIssues.length} issues matching severity filter [${allowedSeverities.join(', ')}], all included`,
      cost: 0,
      duration: Date.now() - startTime,
      aiUsed: false
    };
  }

  // Step 2: Prepare issues for AI (simplified format to reduce tokens)
  const simplifiedIssues = filteredIssues.map(issue => ({
    id: issue.id,
    severity: issue.severity,
    title: issue.title,
    description: issue.description,
    impact: issue.impact,
    difficulty: issue.difficulty,
    source: issue.source,
    page: issue.page
  }));

  // Step 3: Build AI prompt
  const systemPrompt = `You are a cold outreach strategist for a web development agency. Your job is to select the ${limit} most compelling website issues that will resonate with a business owner in a cold email pitch.

Your selection criteria:
1. Business Impact: Issues that directly affect revenue, conversions, or customer trust
2. Outreach Appeal: Issues that make great email hooks ("Your site is losing 60% of mobile visitors")
3. Credibility: Issues backed by data/screenshots (not subjective opinions)
4. Quick Win Balance: Mix of high-impact easy fixes and major improvements
5. Non-Technical Language: Issues that business owners understand (not developer jargon)

CRITICAL DEDUPLICATION RULES:
- If multiple issues describe the same underlying problem, SELECT ONLY ONE (the most specific/quantified version)
- Examples of duplicates to avoid:
  * "280 of 856 images missing alt text (33%)" vs "Many images missing alt text" → Choose the quantified version
  * "11 of 84 form inputs missing labels (13%)" vs "Form inputs missing labels on multiple pages" → Choose the quantified version
  * "Poor mobile responsiveness" vs "Mobile layout breaks on small screens" → Choose the more specific version
- When you identify duplicate issues, merge them by selecting the one with:
  1. Specific data/counts (prefer "43 of 149 images" over "many images")
  2. More actionable description
  3. Better business impact framing

IMPORTANT: Return EXACTLY ${limit} UNIQUE issues (no duplicates). Select the issues that would make the most compelling cold outreach message.`;

  const userPrompt = `Company: ${context.company_name}
Industry: ${context.industry}
Grade: ${context.grade} (${context.overall_score}/100)

Filtered Issues (${filteredIssues.length} matching severity: ${allowedSeverities.join(', ')}):
${JSON.stringify(simplifiedIssues, null, 2)}

Task: Select the TOP ${limit} issues that would make the most compelling cold outreach message.

For each selected issue, provide:
- Issue ID (from input)
- Rank (1-${limit})
- Reasoning (why this issue is outreach-worthy in 1-2 sentences)

Return JSON format:
{
  "topIssues": [
    {
      "issueId": "mobile-visual-1",
      "rank": 1,
      "reasoning": "Mobile responsiveness affects 60% of traffic - biggest revenue impact"
    }
  ],
  "excludedCount": ${filteredIssues.length - limit},
  "selectionStrategy": "Brief summary of your selection approach"
}`;

  // Step 4: Call AI
  console.log(`\n🤖 Calling AI to select top ${limit} issues...`);

  try {
    const response = await callAI({
      model: 'gpt-5-mini',
      systemPrompt,
      userPrompt,
      temperature: 0.3,
      jsonMode: true
    });

    const result = await parseJSONResponse(response.content);

    // Step 5: Validate response
    if (!result.topIssues || !Array.isArray(result.topIssues)) {
      throw new Error('AI response missing topIssues array');
    }

    if (result.topIssues.length !== limit) {
      console.warn(`  ⚠️  AI returned ${result.topIssues.length} issues (expected ${limit})`);
    }

    // Step 6: Enrich with full issue data
    const enrichedTopIssues = result.topIssues.map(selected => {
      const fullIssue = allIssues.find(issue => issue.id === selected.issueId);
      if (!fullIssue) {
        console.warn(`  ⚠️  Issue ${selected.issueId} not found in original issues`);
        return null;
      }

      return {
        ...fullIssue,
        rank: selected.rank,
        reasoning: selected.reasoning
      };
    }).filter(Boolean); // Remove nulls

    // Step 7: Post-processing deduplication (safety net)
    const beforeDedup = enrichedTopIssues.length;
    const deduplicatedIssues = deduplicateByTitleSimilarity(enrichedTopIssues, 0.7);
    const afterDedup = deduplicatedIssues.length;

    if (beforeDedup !== afterDedup) {
      console.log(`  🔄 Deduplication: ${beforeDedup} → ${afterDedup} issues (removed ${beforeDedup - afterDedup} duplicates)`);
    }

    // Re-rank after deduplication
    const finalIssues = deduplicatedIssues.map((issue, index) => ({
      ...issue,
      rank: index + 1
    }));

    const duration = Date.now() - startTime;

    console.log(`  ✅ AI selection complete`);
    console.log(`  Cost: $${response.cost?.toFixed(4) || '0.0000'}`);
    console.log(`  Time: ${duration}ms`);

    return {
      topIssues: finalIssues,
      excludedCount: result.excludedCount || (filteredIssues.length - finalIssues.length),
      selectionStrategy: result.selectionStrategy || 'AI-powered selection based on business impact',
      severityFilter: allowedSeverities.join(', '),
      cost: response.cost || 0,
      duration,
      aiUsed: true,
      modelUsed: response.model || 'gpt-5-mini',
      tokensUsed: response.usage?.total_tokens || 0,
      deduplicationApplied: beforeDedup !== afterDedup,
      duplicatesRemoved: beforeDedup - afterDedup
    };

  } catch (error) {
    console.error(`\n❌ AI selection failed:`, error.message);
    console.log(`  Falling back to rule-based selection (top ${limit} by severity)`);

    // Fallback: Sort by severity then priority
    const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    const sortedIssues = filteredIssues
      .sort((a, b) => {
        // Sort by severity first
        const severityDiff = (severityOrder[b.severity] || 0) - (severityOrder[a.severity] || 0);
        if (severityDiff !== 0) return severityDiff;

        // Then by priority
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
      });

    // Apply deduplication to fallback selection too
    const deduplicatedSorted = deduplicateByTitleSimilarity(sortedIssues, 0.7);
    const fallbackSelection = deduplicatedSorted
      .slice(0, limit)
      .map((issue, index) => ({
        ...issue,
        rank: index + 1,
        reasoning: 'Selected via fallback rule-based sorting (AI unavailable)'
      }));

    return {
      topIssues: fallbackSelection,
      excludedCount: filteredIssues.length - fallbackSelection.length,
      selectionStrategy: `Fallback: Rule-based sorting by severity [${allowedSeverities.join(', ')}] and priority (with deduplication)`,
      severityFilter: allowedSeverities.join(', '),
      cost: 0,
      duration: Date.now() - startTime,
      aiUsed: false,
      error: error.message,
      deduplicationApplied: true
    };
  }
}
