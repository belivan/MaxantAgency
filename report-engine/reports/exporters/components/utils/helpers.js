/**
 * Utility Helper Functions for Report Generation
 */

/**
 * Escape HTML special characters
 */
export function escapeHtml(text) {
  if (!text) return '';
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return String(text).replace(/[&<>"']/g, m => map[m]);
}

/**
 * Get color based on grade letter
 */
export function getGradeColor(grade) {
  const gradeUpper = String(grade).toUpperCase();
  const colorMap = {
    'A': '#059669',  // Green
    'B': '#10B981',  // Light Green
    'C': '#F59E0B',  // Amber
    'D': '#F97316',  // Orange
    'F': '#DC2626'   // Red
  };
  return colorMap[gradeUpper] || '#71717A'; // Default gray
}

/**
 * Get color based on score (0-100)
 */
export function getScoreColor(score) {
  if (score >= 85) return '#059669';  // Green (A)
  if (score >= 70) return '#10B981';  // Light Green (B)
  if (score >= 55) return '#F59E0B';  // Amber (C)
  if (score >= 40) return '#F97316';  // Orange (D)
  return '#DC2626';                   // Red (F)
}

/**
 * Format date to readable string
 */
export function formatDate(dateInput) {
  const date = new Date(dateInput || Date.now());
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

/**
 * Format number with commas
 */
export function formatNumber(num) {
  if (!num && num !== 0) return '0';
  return Number(num).toLocaleString('en-US');
}

/**
 * Get severity badge HTML
 */
export function getSeverityBadge(severity) {
  const severityLower = String(severity).toLowerCase();
  const badges = {
    'critical': '<span style="background: #FEE2E2; color: #DC2626; padding: 4px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 600;">Critical</span>',
    'high': '<span style="background: #FEF3C7; color: #D97706; padding: 4px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 600;">High</span>',
    'medium': '<span style="background: #FEF3C7; color: #D97706; padding: 4px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 600;">Medium</span>',
    'low': '<span style="background: #DBEAFE; color: #0891B2; padding: 4px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 600;">Low</span>'
  };
  return badges[severityLower] || badges['medium'];
}

/**
 * Get metric status color based on value and thresholds
 */
export function getMetricColor(value, thresholds) {
  const { good, needsImprovement } = thresholds;
  if (value <= good) return '#059669';  // Green
  if (value <= needsImprovement) return '#F59E0B';  // Amber
  return '#DC2626';  // Red
}

/**
 * Calculate percentage for progress bars
 */
export function calculatePercentage(value, max) {
  if (!max || max === 0) return 0;
  return Math.min(100, Math.max(0, (value / max) * 100));
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text, maxLength = 100) {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

/**
 * Get priority icon based on lead score
 */
export function getPriorityIcon(score) {
  if (score >= 80) return '🔥';  // High priority
  if (score >= 60) return '⭐';  // Medium priority
  return '📌';  // Low priority
}

/**
 * Format URL for display (remove protocol, www)
 */
export function formatUrlDisplay(url) {
  if (!url) return '';
  return url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
}

/**
 * Check if value exists and is not empty
 */
export function exists(value) {
  return value !== null && value !== undefined && value !== '';
}

/**
 * Safe array access with fallback
 */
export function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

/**
 * Safe object access with fallback
 */
export function safeObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

/**
 * Extract top issues from analysis result
 * Used for action plan when consolidated issues are not available
 */
export function extractTopIssues(analysisResult) {
  const issues = [];

  // Add top issue if available
  if (analysisResult.top_issue) {
    issues.push({
      title: analysisResult.top_issue,
      severity: 'critical',
      businessImpact: 'Primary barrier to website success'
    });
  }

  // Add top design issues
  if (analysisResult.design_issues?.length > 0) {
    analysisResult.design_issues.slice(0, 2).forEach(issue => {
      issues.push({
        title: issue,
        severity: 'high',
        businessImpact: 'Impacts user experience and conversions'
      });
    });
  }

  // Add top SEO issues
  if (analysisResult.seo_issues?.length > 0) {
    analysisResult.seo_issues.slice(0, 2).forEach(issue => {
      issues.push({
        title: issue,
        severity: 'high',
        businessImpact: 'Limits search visibility and traffic'
      });
    });
  }

  return issues;
}

/**
 * Get default summary based on grade
 */
export function getDefaultSummary(grade, score, companyName) {
  if (grade === 'A') {
    return `${companyName}'s website demonstrates excellent performance. Minor optimizations can further enhance results.`;
  } else if (grade === 'B') {
    return `${companyName}'s website performs well with opportunities to enhance user experience and conversion rates.`;
  } else if (grade === 'C') {
    return `${companyName}'s website has significant improvement opportunities that will enhance user engagement.`;
  } else {
    return `${companyName}'s website requires comprehensive improvements to establish a stronger digital presence.`;
  }
}

/**
 * Generate benchmark-aware summary (2-3 paragraphs)
 */
export function generateBenchmarkAwareSummary(data) {
  const {
    company_name,
    grade,
    overall_score,
    matched_benchmark,
    design_score,
    seo_score,
    content_score,
    social_score,
    one_liner
  } = data;

  let paragraphs = [];

  // Paragraph 1: Overall performance with benchmark context
  if (matched_benchmark) {
    const gap = matched_benchmark.scores.overall - overall_score;
    const percentOfBenchmark = Math.round((overall_score / matched_benchmark.scores.overall) * 100);

    if (gap > 0) {
      paragraphs.push(
        `Your website scores ${Math.round(overall_score)}/100 (Grade ${grade}), performing at ${percentOfBenchmark}% of ${matched_benchmark.company_name}'s level—a leading ${matched_benchmark.industry || 'industry'} business with exceptional digital presence.`
      );
    } else {
      paragraphs.push(
        `Your website scores ${Math.round(overall_score)}/100 (Grade ${grade}), matching or exceeding ${matched_benchmark.company_name}—a leading ${matched_benchmark.industry || 'industry'} business recognized for digital excellence.`
      );
    }
  } else {
    // Fallback without benchmark
    paragraphs.push(
      `Your website scores ${Math.round(overall_score)}/100 (Grade ${grade}). ${one_liner || getDefaultSummary(grade, overall_score, company_name)}`
    );
  }

  // Paragraph 2: Strengths and opportunities
  if (matched_benchmark) {
    const matchedDimensions = [];
    const gapDimensions = [];

    // Check which dimensions match or lag
    if (Math.abs(content_score - matched_benchmark.scores.content) <= 5) {
      matchedDimensions.push('content quality');
    }
    if (Math.abs(design_score - matched_benchmark.scores.design) <= 5) {
      matchedDimensions.push('design');
    }
    if (Math.abs(seo_score - matched_benchmark.scores.seo) <= 5) {
      matchedDimensions.push('SEO');
    }

    if (design_score < matched_benchmark.scores.design - 5) {
      gapDimensions.push('design');
    }
    if (seo_score < matched_benchmark.scores.seo - 5) {
      gapDimensions.push('SEO');
    }
    if (content_score < matched_benchmark.scores.content - 5) {
      gapDimensions.push('content');
    }
    if (social_score < matched_benchmark.scores.social - 5) {
      gapDimensions.push('social presence');
    }

    if (matchedDimensions.length > 0 && gapDimensions.length > 0) {
      const matchedText = matchedDimensions.length === 1
        ? matchedDimensions[0]
        : matchedDimensions.slice(0, -1).join(', ') + ' and ' + matchedDimensions[matchedDimensions.length - 1];

      const gapText = gapDimensions.length === 1
        ? gapDimensions[0]
        : gapDimensions.slice(0, -1).join(', ') + ' and ' + gapDimensions[gapDimensions.length - 1];

      paragraphs.push(
        `While your ${matchedText} matches theirs, there are clear opportunities to learn from their approach to ${gapText}.`
      );
    } else if (gapDimensions.length > 0) {
      const gapText = gapDimensions.length === 1
        ? gapDimensions[0]
        : gapDimensions.join(', ');

      paragraphs.push(
        `There are opportunities to learn from ${matched_benchmark.company_name}'s approach to ${gapText}.`
      );
    } else {
      paragraphs.push(
        `Your website performs strongly across all key dimensions.`
      );
    }
  } else {
    // Fallback: mention top opportunities without benchmark
    const weakAreas = [];
    if (design_score < 70) weakAreas.push('design');
    if (seo_score < 70) weakAreas.push('SEO');
    if (content_score < 70) weakAreas.push('content');

    if (weakAreas.length > 0) {
      paragraphs.push(
        `Key improvement opportunities exist in ${weakAreas.join(', ')}.`
      );
    }
  }

  // Paragraph 3: Actionable next steps
  if (matched_benchmark) {
    const gap = matched_benchmark.scores.overall - overall_score;

    if (gap > 20) {
      // Large gap - milestone approach
      paragraphs.push(
        `The analysis below identifies priority actions, backed by concrete measurements and benchmark comparisons, that can help you progress toward industry leader performance through phased milestones.`
      );
    } else if (gap > 0) {
      // Small gap - achievable
      paragraphs.push(
        `The analysis below identifies priority actions, backed by concrete measurements and benchmark comparisons, that could help you match or exceed industry leader performance within 90 days.`
      );
    } else {
      // At or above benchmark
      paragraphs.push(
        `The analysis below identifies opportunities to maintain your competitive edge and continue leading in digital excellence.`
      );
    }
  } else {
    paragraphs.push(
      `The analysis below identifies priority actions that will enhance your digital presence and user experience.`
    );
  }

  return paragraphs.join(' ');
}
