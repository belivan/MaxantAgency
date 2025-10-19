/**
 * Content Insights Analyzer
 * Analyzes blog posts and news content with AI to extract personalization opportunities
 * Cost: ~$0.00002 per site (using grok-4-fast)
 */

import { callAI } from '../ai-providers.js';

/**
 * Analyze blog posts and news content for personalization insights
 * Extracts themes, expertise signals, engagement hooks, content gaps
 *
 * @param {Object} grokData - Grok extraction data
 * @param {string} companyName - Company name for context
 * @param {string} industry - Industry for context
 * @param {string} model - AI model to use (default: 'grok-4-fast')
 * @returns {Promise<Object>} Content insights
 */
export async function analyzeContentInsights(grokData, companyName, industry, model = 'grok-4-fast') {
  const recentPosts = grokData?.contentInfo?.recentPosts || [];
  const recentNews = grokData?.businessIntel?.recentNews || [];
  const hasActiveBlog = grokData?.contentInfo?.hasActiveBlog;

  // Skip if no content to analyze
  if (recentPosts.length === 0 && recentNews.length === 0) {
    console.log('ℹ️  No blog/news content to analyze');
    return {
      analyzed: false,
      reason: 'No blog posts or news found',
      hasActiveBlog: false
    };
  }

  try {
    console.log(`🤖 Analyzing blog/news content with ${model}...`);

    const prompt = `Analyze this company's blog and news content to extract personalization opportunities for outreach.

Company: ${companyName}
Industry: ${industry}

Recent Blog Posts:
${JSON.stringify(recentPosts, null, 2)}

Recent News/Achievements:
${JSON.stringify(recentNews, null, 2)}

Active Blog: ${hasActiveBlog ? 'Yes' : 'No'}

Extract and return JSON with:
{
  "contentThemes": ["topic1", "topic2", "topic3"], // 3-5 main topics they write about
  "expertiseSignals": ["expertise1", "expertise2"], // What they demonstrate expertise in
  "recentAchievements": ["achievement1", "achievement2"], // Newsworthy items to reference
  "contentFrequency": "active | occasional | inactive", // Based on dates and hasActiveBlog
  "engagementHook": "Specific article/news to reference in outreach (most recent/relevant)",
  "contentGaps": ["gap1", "gap2"], // Topics missing that are important for this industry
  "writingStyle": "professional | casual | technical | educational | promotional"
}

IMPORTANT:
- If no blog posts: contentThemes/expertiseSignals should be empty arrays
- engagementHook should be specific ("I saw your recent article on X") or null
- contentGaps should identify what's missing for their industry
- Be concise and actionable

Return ONLY valid JSON, no other text.`;

    const response = await callAI({
      model,
      prompt,
      systemPrompt: 'You are a content analyst. Extract actionable insights from blog/news content for personalized outreach. Return only valid JSON.',
      enableSearch: false
    });

    // Parse JSON response
    let insights;
    try {
      insights = JSON.parse(response.text);
    } catch (e) {
      console.log('⚠️  Failed to parse AI response as JSON, using raw text');
      insights = {
        analyzed: false,
        error: 'Failed to parse AI response',
        rawResponse: response.text
      };
    }

    console.log('✅ Content insights analyzed');

    return {
      analyzed: true,
      hasActiveBlog: hasActiveBlog || false,
      postCount: recentPosts.length,
      newsCount: recentNews.length,
      ...insights,
      model,
      analyzedAt: new Date().toISOString()
    };

  } catch (error) {
    console.log(`⚠️  Content analysis failed: ${error.message}`);
    return {
      analyzed: false,
      error: error.message,
      hasActiveBlog: hasActiveBlog || false
    };
  }
}

/**
 * Format content insights for display
 * @param {Object} insights - Content insights from analyzeContentInsights
 * @returns {string} Formatted text
 */
export function formatContentInsights(insights) {
  if (!insights || !insights.analyzed) {
    return 'No content insights available';
  }

  let output = '';

  if (insights.contentThemes && insights.contentThemes.length > 0) {
    output += `Content Themes:\n`;
    insights.contentThemes.forEach(theme => {
      output += `  • ${theme}\n`;
    });
  }

  if (insights.expertiseSignals && insights.expertiseSignals.length > 0) {
    output += `\nExpertise Signals:\n`;
    insights.expertiseSignals.forEach(signal => {
      output += `  • ${signal}\n`;
    });
  }

  if (insights.recentAchievements && insights.recentAchievements.length > 0) {
    output += `\nRecent Achievements:\n`;
    insights.recentAchievements.forEach(achievement => {
      output += `  • ${achievement}\n`;
    });
  }

  if (insights.engagementHook) {
    output += `\nEngagement Hook:\n  "${insights.engagementHook}"\n`;
  }

  if (insights.contentGaps && insights.contentGaps.length > 0) {
    output += `\nContent Gaps:\n`;
    insights.contentGaps.forEach(gap => {
      output += `  • ${gap}\n`;
    });
  }

  if (insights.writingStyle) {
    output += `\nWriting Style: ${insights.writingStyle}\n`;
  }

  output += `\nBlog Activity: ${insights.hasActiveBlog ? 'Active' : 'Inactive'} (${insights.postCount || 0} recent posts)`;

  return output;
}
