/**
 * Report Data Validator
 * Validates that analysis data has all critical fields before report generation
 * Prevents silent failures and incomplete reports
 */

/**
 * Validate analysis data for report generation
 * @param {Object} data - Analysis result data
 * @returns {Object} { valid: boolean, errors: string[], warnings: string[] }
 */
export function validateReportData(data) {
  const errors = [];
  const warnings = [];

  if (!data || typeof data !== 'object') {
    return {
      valid: false,
      errors: ['Analysis data is null or not an object'],
      warnings: []
    };
  }

  // ========================================
  // CRITICAL FIELDS (Report CANNOT generate without these)
  // ========================================

  // Core identification
  if (!data.company_name) errors.push('Missing: company_name');
  if (!data.url) errors.push('Missing: url');
  if (!data.grade && !data.website_grade) errors.push('Missing: grade or website_grade');
  if (data.overall_score === undefined || data.overall_score === null) errors.push('Missing: overall_score');

  // Dimension scores (required for score breakdown section)
  if (data.design_score === undefined || data.design_score === null) errors.push('Missing: design_score');
  if (data.seo_score === undefined || data.seo_score === null) errors.push('Missing: seo_score');
  if (data.content_score === undefined || data.content_score === null) errors.push('Missing: content_score');
  if (data.social_score === undefined || data.social_score === null) errors.push('Missing: social_score');

  // Issues arrays (critical for action plan and issue breakdown)
  if (!Array.isArray(data.design_issues_desktop)) {
    if (!Array.isArray(data.design_issues)) {
      errors.push('Missing: design_issues_desktop (and no fallback design_issues)');
    } else {
      warnings.push('Using legacy design_issues instead of design_issues_desktop/mobile split');
    }
  }
  if (!Array.isArray(data.design_issues_mobile)) {
    warnings.push('Missing: design_issues_mobile (mobile-specific issues won\'t display)');
  }
  if (!Array.isArray(data.seo_issues)) errors.push('Missing: seo_issues array');
  if (!Array.isArray(data.content_issues)) errors.push('Missing: content_issues array');
  if (!Array.isArray(data.social_issues)) errors.push('Missing: social_issues array');

  // Quick wins and top issue (needed for strategic sections)
  if (!Array.isArray(data.quick_wins)) warnings.push('Missing: quick_wins array');
  if (!data.top_issue) warnings.push('Missing: top_issue object');

  // Analysis timestamp
  if (!data.analyzed_at) warnings.push('Missing: analyzed_at timestamp');

  // ========================================
  // IMPORTANT BUT OPTIONAL FIELDS (Report can generate but sections may be empty)
  // ========================================

  // Screenshots (reports can generate without, but won't look good)
  if (!data.screenshot_desktop_path && !data.screenshot_desktop_url) {
    warnings.push('Missing: screenshot_desktop_path/url - Desktop screenshots won\'t display');
  }
  if (!data.screenshot_mobile_path && !data.screenshot_mobile_url) {
    warnings.push('Missing: screenshot_mobile_path/url - Mobile screenshots won\'t display');
  }

  // Performance data (entire section will be empty without this)
  if (!data.performance_metrics_pagespeed) {
    warnings.push('Missing: performance_metrics_pagespeed - Performance section will have no PageSpeed data');
  }
  if (!data.performance_metrics_crux) {
    warnings.push('Missing: performance_metrics_crux - Performance section will have no real user data');
  }

  // Accessibility (section will show fallback message without this)
  if (!data.accessibility_compliance) {
    warnings.push('Missing: accessibility_compliance - Accessibility section will be empty');
  }
  if (!Array.isArray(data.accessibility_issues)) {
    warnings.push('Missing: accessibility_issues array');
  }

  // Business intelligence (section will show "Not available" without this)
  if (!data.business_intelligence) {
    warnings.push('Missing: business_intelligence - Business Intelligence section will show fallbacks');
  }

  // Social data
  if (!data.social_profiles) {
    warnings.push('Missing: social_profiles - Social media links won\'t display in hero');
  }

  // Benchmark comparison (optional feature)
  if (!data.matched_benchmark) {
    warnings.push('Missing: matched_benchmark - Benchmark comparison section will be skipped');
  } else {
    // If benchmark exists, check for screenshots
    if (!data.matched_benchmark.screenshot_desktop_path && !data.matched_benchmark.screenshot_desktop_url) {
      warnings.push('Benchmark missing desktop screenshot - Side-by-side comparison won\'t work');
    }
    if (!data.matched_benchmark.screenshot_mobile_path && !data.matched_benchmark.screenshot_mobile_url) {
      warnings.push('Benchmark missing mobile screenshot - Side-by-side comparison won\'t work');
    }
  }

  // AI Synthesis data (optional but recommended)
  if (!data.consolidated_issues) {
    warnings.push('Missing: consolidated_issues - Report will use raw issues instead of deduplicated ones');
  }
  if (!data.executive_summary) {
    warnings.push('Missing: executive_summary - Report will use basic strategic assessment');
  }

  // Tech stack and infrastructure
  if (!data.tech_stack) warnings.push('Missing: tech_stack');
  if (data.has_https === undefined) warnings.push('Missing: has_https boolean');
  if (data.is_mobile_friendly === undefined) warnings.push('Missing: is_mobile_friendly boolean');

  // Industry context
  if (!data.industry) warnings.push('Missing: industry - Timeline may use generic recommendations');

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate and throw if critical data is missing
 * @param {Object} data - Analysis result data
 * @throws {Error} If validation fails
 */
export function validateOrThrow(data) {
  const result = validateReportData(data);

  if (!result.valid) {
    const errorMessage = [
      'Cannot generate report - missing critical data:',
      '',
      ...result.errors.map(e => `  ❌ ${e}`),
      '',
      'Report generation aborted to prevent incomplete output.'
    ].join('\n');

    throw new Error(errorMessage);
  }

  // Log warnings but don't throw
  if (result.warnings.length > 0) {
    console.warn('\n⚠️  Report Data Validation Warnings:');
    result.warnings.forEach(w => console.warn(`   ${w}`));
    console.warn('');
  }

  return result;
}

/**
 * Get human-readable validation summary
 * @param {Object} data - Analysis result data
 * @returns {string} Formatted validation report
 */
export function getValidationReport(data) {
  const result = validateReportData(data);

  const lines = [];
  lines.push('Report Data Validation Report');
  lines.push('='.repeat(60));
  lines.push('');

  if (result.valid) {
    lines.push('✅ PASSED - All critical data present');
  } else {
    lines.push('❌ FAILED - Missing critical data');
  }

  if (result.errors.length > 0) {
    lines.push('');
    lines.push('ERRORS (blocking):');
    result.errors.forEach(e => lines.push(`  ❌ ${e}`));
  }

  if (result.warnings.length > 0) {
    lines.push('');
    lines.push(`WARNINGS (${result.warnings.length} non-blocking issues):`);
    result.warnings.forEach(w => lines.push(`  ⚠️  ${w}`));
  }

  if (result.valid && result.warnings.length === 0) {
    lines.push('');
    lines.push('No warnings - complete data set available');
  }

  lines.push('');
  lines.push('='.repeat(60));

  return lines.join('\n');
}
