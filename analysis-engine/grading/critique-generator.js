/**
 * Critique Generator - Generate actionable website critiques for outreach
 *
 * Takes analysis results and generates human-readable summaries
 * Focuses on specific, fixable issues that demonstrate value
 */

import { getTopIssue, extractQuickWins } from './grader.js';

/**
 * Generate a comprehensive critique from analysis results
 *
 * @param {object} analysisResults - Full analysis results from all analyzers
 * @param {object} gradeResults - Grading results from grader
 * @param {object} context - Business context (company name, industry, etc.)
 * @returns {object} Formatted critique with summary and recommendations
 */
export function generateCritique(analysisResults, gradeResults, context = {}) {
  const companyName = context.company_name || 'your business';
  const industry = context.industry || 'your industry';

  // Extract key insights
  const topIssue = getTopIssue(analysisResults);
  const quickWins = extractQuickWins(analysisResults);
  const criticalIssues = extractCriticalIssues(analysisResults);

  // Generate summary paragraph
  const summary = generateSummary(
    companyName,
    industry,
    gradeResults,
    topIssue,
    quickWins.length,
    criticalIssues.length
  );

  // Generate detailed sections
  const sections = {
    design: generateDesignSection(analysisResults.design),
    seo: generateSEOSection(analysisResults.seo),
    content: generateContentSection(analysisResults.content),
    social: generateSocialSection(analysisResults.social)
  };

  // Generate actionable recommendations
  const recommendations = generateRecommendations(
    quickWins,
    criticalIssues,
    gradeResults.grade
  );

  return {
    summary,
    topIssue,
    quickWins: quickWins.slice(0, 5), // Top 5 quick wins
    criticalIssues: criticalIssues.slice(0, 3), // Top 3 critical issues
    sections,
    recommendations,
    callToAction: generateCallToAction(gradeResults.grade, quickWins.length),

    _meta: {
      generator: 'v1.0',
      timestamp: new Date().toISOString(),
      wordCount: countWords(summary)
    }
  };
}

/**
 * Generate summary paragraph for email/outreach
 */
function generateSummary(companyName, industry, gradeResults, topIssue, quickWinCount, criticalCount) {
  const { grade, overallScore, gradeLabel, outreachAngle } = gradeResults;

  // Build summary based on grade
  let summary = `I analyzed ${companyName}'s website and it received a grade of ${grade} (${overallScore}/100 - ${gradeLabel}). `;

  // Add context based on grade
  const issueDesc = topIssue?.description ? topIssue.description.toLowerCase() : 'has several areas that need improvement';

  if (grade === 'A') {
    summary += `Your website has a strong foundation with excellent ${getStrongestArea(gradeResults.scores)}. `;
    summary += `I identified ${quickWinCount} small optimizations that could push you even further ahead of competitors. `;
  } else if (grade === 'B') {
    summary += `Your website has a solid foundation, but ${issueDesc}. `;
    summary += `I found ${quickWinCount} quick-win improvements that could significantly boost conversions. `;
  } else if (grade === 'C') {
    summary += `Your website is functional but ${issueDesc}. `;
    summary += `I identified ${criticalCount} critical issues and ${quickWinCount} quick fixes that could dramatically improve results. `;
  } else if (grade === 'D') {
    summary += `Your website has ${criticalCount} major issues that are likely costing you leads every day. `;
    summary += `The most critical: ${issueDesc}. `;
    summary += `A focused redesign could provide clear ROI. `;
  } else {
    summary += `Your website has critical problems that need immediate attention. `;
    summary += `The biggest issue: ${issueDesc}. `;
    summary += `A complete rebuild would be more cost-effective than trying to fix individual issues. `;
  }

  return summary;
}

/**
 * Get the strongest scoring area
 */
function getStrongestArea(scores) {
  const areas = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  return areas[0][0];
}

/**
 * Extract critical issues from all analyzers
 */
function extractCriticalIssues(analysisResults) {
  const critical = [];

  // Design critical issues
  if (analysisResults.design?.issues) {
    for (const issue of analysisResults.design.issues) {
      if (issue.severity === 'critical' || issue.priority === 'high') {
        critical.push({
          source: 'design',
          severity: 'critical',
          ...issue
        });
      }
    }
  }

  // SEO critical issues
  if (analysisResults.seo?.issues) {
    for (const issue of analysisResults.seo.issues) {
      if (issue.severity === 'critical' || issue.priority === 'high') {
        critical.push({
          source: 'seo',
          severity: 'critical',
          ...issue
        });
      }
    }
  }

  // Content critical issues
  if (analysisResults.content?.issues) {
    for (const issue of analysisResults.content.issues) {
      if (issue.severity === 'high' || issue.priority === 'high') {
        critical.push({
          source: 'content',
          severity: 'critical',
          ...issue
        });
      }
    }
  }

  // Social critical issues
  if (analysisResults.social?.issues) {
    for (const issue of analysisResults.social.issues) {
      if (issue.severity === 'high' || issue.priority === 'high') {
        critical.push({
          source: 'social',
          severity: 'critical',
          ...issue
        });
      }
    }
  }

  return critical;
}

/**
 * Generate design section summary
 */
function generateDesignSection(designResults) {
  if (!designResults || !designResults.issues) {
    return { score: 50, summary: 'Design analysis unavailable', issues: [] };
  }

  const score = designResults.overallDesignScore || 50;
  const issueCount = designResults.issues.length;
  const positives = designResults.positives || [];

  let summary = '';
  if (score >= 80) {
    summary = `Strong design with ${issueCount} minor improvements identified.`;
  } else if (score >= 60) {
    summary = `Good design foundation with ${issueCount} areas for improvement.`;
  } else if (score >= 40) {
    summary = `Design needs significant work - ${issueCount} issues affecting user experience.`;
  } else {
    summary = `Critical design problems - ${issueCount} major issues hurting conversions.`;
  }

  return {
    score,
    summary,
    issues: designResults.issues.slice(0, 5),
    positives: positives.slice(0, 3)
  };
}

/**
 * Generate SEO section summary
 */
function generateSEOSection(seoResults) {
  if (!seoResults || !seoResults.issues) {
    return { score: 50, summary: 'SEO analysis unavailable', issues: [] };
  }

  const score = seoResults.seoScore || 50;
  const criticalCount = seoResults.issues.filter(i => i.severity === 'critical').length;

  let summary = '';
  if (score >= 80) {
    summary = `Excellent SEO foundation with minor optimization opportunities.`;
  } else if (score >= 60) {
    summary = `Good SEO basics but missing ${criticalCount} critical elements.`;
  } else if (score >= 40) {
    summary = `SEO needs work - ${criticalCount} critical issues limiting visibility.`;
  } else {
    summary = `Serious SEO problems - ${criticalCount} critical issues preventing ranking.`;
  }

  return {
    score,
    summary,
    issues: seoResults.issues.slice(0, 5),
    opportunities: seoResults.opportunities?.slice(0, 3) || []
  };
}

/**
 * Generate content section summary
 */
function generateContentSection(contentResults) {
  if (!contentResults || !contentResults.issues) {
    return { score: 50, summary: 'Content analysis unavailable', issues: [] };
  }

  const score = contentResults.contentScore || 50;
  const hasBlog = contentResults.hasBlog || false;
  const engagementHooks = contentResults.engagementHooks || [];

  let summary = '';
  if (score >= 80) {
    summary = `Strong content strategy${hasBlog ? ' with active blog' : ''}.`;
  } else if (score >= 60) {
    summary = `Good content foundation but ${!hasBlog ? 'missing blog content' : 'could be more engaging'}.`;
  } else {
    summary = `Content needs significant improvement - ${!hasBlog ? 'no blog' : 'weak content quality'}.`;
  }

  return {
    score,
    summary,
    hasBlog,
    issues: contentResults.issues?.slice(0, 5) || [],
    engagementHooks: engagementHooks.slice(0, 3)
  };
}

/**
 * Generate social media section summary
 */
function generateSocialSection(socialResults) {
  if (!socialResults || !socialResults.platformsPresent) {
    return { score: 50, summary: 'Social analysis unavailable', issues: [] };
  }

  const score = socialResults.socialScore || 50;
  const platforms = socialResults.platformsPresent || [];
  const mostActive = socialResults.mostActivePlatform;

  let summary = '';
  if (platforms.length === 0) {
    summary = `No social media presence detected - missing major opportunity.`;
  } else if (platforms.length === 1) {
    summary = `Only active on ${platforms[0]} - could expand to other platforms.`;
  } else if (score >= 70) {
    summary = `Active on ${platforms.length} platforms with ${mostActive} performing best.`;
  } else {
    summary = `Present on ${platforms.length} platforms but engagement is weak.`;
  }

  return {
    score,
    summary,
    platforms,
    mostActive,
    issues: socialResults.issues?.slice(0, 5) || [],
    strengths: socialResults.strengths?.slice(0, 3) || []
  };
}

/**
 * Generate prioritized recommendations
 */
function generateRecommendations(quickWins, criticalIssues, grade) {
  const recommendations = [];

  // Quick wins first (always recommend these)
  if (quickWins.length > 0) {
    recommendations.push({
      priority: 'immediate',
      category: 'quick-wins',
      title: `${quickWins.length} Quick Wins (1-2 hours total)`,
      items: quickWins.slice(0, 5).map(qw => qw.title),
      impact: 'Immediate visible improvements with minimal effort'
    });
  }

  // Critical issues
  if (criticalIssues.length > 0) {
    recommendations.push({
      priority: 'high',
      category: 'critical',
      title: `${criticalIssues.length} Critical Issues`,
      items: criticalIssues.slice(0, 3).map(ci => ci.title),
      impact: 'Fixing these will significantly improve conversions and visibility'
    });
  }

  // Grade-specific recommendations
  if (grade === 'D' || grade === 'F') {
    recommendations.push({
      priority: 'strategic',
      category: 'redesign',
      title: 'Consider Complete Redesign',
      items: ['Modern design framework', 'Mobile-first approach', 'Performance optimization'],
      impact: 'More cost-effective than fixing individual issues'
    });
  } else if (grade === 'C') {
    recommendations.push({
      priority: 'medium',
      category: 'refresh',
      title: 'Targeted Improvements',
      items: ['Modernize design elements', 'SEO optimization', 'Content strategy'],
      impact: 'Bring website up to industry standards'
    });
  }

  return recommendations;
}

/**
 * Generate call-to-action based on grade and findings
 */
function generateCallToAction(grade, quickWinCount) {
  if (grade === 'F') {
    return 'Your website needs immediate attention. Let\'s schedule a call to discuss a complete rebuild that will actually drive business results.';
  } else if (grade === 'D') {
    return `I've identified ${quickWinCount} quick wins and several critical issues. Let's hop on a quick call to discuss how we can turn your website into a lead-generation machine.`;
  } else if (grade === 'C') {
    return `I found ${quickWinCount} specific improvements that could significantly boost your conversions. Want to see the full analysis and discuss next steps?`;
  } else if (grade === 'B') {
    return `Your site is solid, but I found ${quickWinCount} optimizations that could push you ahead of competitors. Interested in the details?`;
  } else {
    return `Your website is excellent! I found ${quickWinCount} advanced optimizations that could give you an even bigger edge. Want to discuss?`;
  }
}

/**
 * Count words in text
 */
function countWords(text) {
  return text.split(/\s+/).filter(word => word.length > 0).length;
}

/**
 * Generate one-liner critique (for email subject or preview)
 */
export function generateOneLiner(companyName, topIssue, grade, quickWinCount) {
  if (grade === 'A' || grade === 'B') {
    return `${companyName}: Found ${quickWinCount} quick improvements to boost your already-strong website`;
  } else if (grade === 'C') {
    return `${companyName}: ${topIssue.title} is costing you leads (+ ${quickWinCount} other fixes)`;
  } else {
    return `${companyName}: Your website has critical issues that need immediate attention`;
  }
}
