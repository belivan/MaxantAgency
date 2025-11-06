/**
 * AI-Powered Top Issues Selector
 *
 * Filters issues to high/critical severity, then uses AI to select
 * the top 5 most impactful issues for cold outreach.
 */

import { callAI, parseJSONResponse } from '../../database-tools/shared/ai-client.js';

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

  // Step 1: Filter to high and critical severity only
  const criticalAndHigh = allIssues.filter(issue =>
    issue.severity === 'critical' || issue.severity === 'high'
  );

  console.log(`\n📊 Filtering issues:`);
  console.log(`  Total issues: ${allIssues.length}`);
  console.log(`  High/Critical: ${criticalAndHigh.length}`);

  // Edge case: If fewer than limit high/critical issues, return all
  if (criticalAndHigh.length <= limit) {
    console.log(`  ⚠️  Only ${criticalAndHigh.length} high/critical issues (< limit of ${limit})`);
    console.log(`  Returning all ${criticalAndHigh.length} without AI selection`);

    return {
      topIssues: criticalAndHigh.map((issue, index) => ({
        ...issue,
        rank: index + 1,
        reasoning: 'Selected due to high/critical severity (no filtering needed)'
      })),
      excludedCount: 0,
      selectionStrategy: `Only ${criticalAndHigh.length} high/critical issues found, all included`,
      cost: 0,
      duration: Date.now() - startTime,
      aiUsed: false
    };
  }

  // Step 2: Prepare issues for AI (simplified format to reduce tokens)
  const simplifiedIssues = criticalAndHigh.map(issue => ({
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

IMPORTANT: Return EXACTLY ${limit} issues. Select the issues that would make the most compelling cold outreach message.`;

  const userPrompt = `Company: ${context.company_name}
Industry: ${context.industry}
Grade: ${context.grade} (${context.overall_score}/100)

High/Critical Issues (${criticalAndHigh.length}):
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
  "excludedCount": ${criticalAndHigh.length - limit},
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

    const duration = Date.now() - startTime;

    console.log(`  ✅ AI selection complete`);
    console.log(`  Cost: $${response.cost?.toFixed(4) || '0.0000'}`);
    console.log(`  Time: ${duration}ms`);

    return {
      topIssues: enrichedTopIssues,
      excludedCount: result.excludedCount || (criticalAndHigh.length - enrichedTopIssues.length),
      selectionStrategy: result.selectionStrategy || 'AI-powered selection based on business impact',
      cost: response.cost || 0,
      duration,
      aiUsed: true,
      modelUsed: response.model || 'gpt-5-mini',
      tokensUsed: response.usage?.total_tokens || 0
    };

  } catch (error) {
    console.error(`\n❌ AI selection failed:`, error.message);
    console.log(`  Falling back to rule-based selection (top ${limit} by severity)`);

    // Fallback: Sort by severity then priority
    const fallbackSelection = criticalAndHigh
      .sort((a, b) => {
        // Sort critical before high
        if (a.severity === 'critical' && b.severity !== 'critical') return -1;
        if (b.severity === 'critical' && a.severity !== 'critical') return 1;

        // Then by priority
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
      })
      .slice(0, limit)
      .map((issue, index) => ({
        ...issue,
        rank: index + 1,
        reasoning: 'Selected via fallback rule-based sorting (AI unavailable)'
      }));

    return {
      topIssues: fallbackSelection,
      excludedCount: criticalAndHigh.length - fallbackSelection.length,
      selectionStrategy: 'Fallback: Rule-based sorting by severity and priority',
      cost: 0,
      duration: Date.now() - startTime,
      aiUsed: false,
      error: error.message
    };
  }
}
