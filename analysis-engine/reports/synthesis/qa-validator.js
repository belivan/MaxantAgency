/**
 * QA / Report Reviewer Agent
 * ---------------------------
 * Validates synthesis outputs and ensures evidence references are correct.
 * 
 * Responsibilities:
 * 1. Validate screenshot references (SS-1, SS-2, etc.) exist
 * 2. Check consolidated issues have evidence
 * 3. Verify executive summary references actual data
 * 4. Flag missing or broken references
 * 5. Assess report quality metrics
 */

/**
 * Extract all screenshot reference IDs from text (e.g., SS-1, SS-2)
 */
function extractScreenshotRefs(text) {
  if (!text || typeof text !== 'string') return [];
  
  // Match patterns like SS-1, SS-12, [SS-3], (SS-4), etc.
  const matches = text.match(/\bSS-\d+\b/gi) || [];
  return [...new Set(matches.map(ref => ref.toUpperCase()))];
}

/**
 * Validate that all screenshot references in text exist in the reference list
 */
function validateScreenshotReferences(text, screenshotReferences = []) {
  const refsInText = extractScreenshotRefs(text);
  const availableRefs = new Set(screenshotReferences.map(ref => ref.id?.toUpperCase()));
  
  const missing = refsInText.filter(ref => !availableRefs.has(ref));
  const valid = refsInText.filter(ref => availableRefs.has(ref));
  
  return {
    total: refsInText.length,
    valid: valid.length,
    missing: missing,
    validRefs: valid,
    isValid: missing.length === 0
  };
}

/**
 * Check if consolidated issues have sufficient evidence
 */
function validateIssueEvidence(consolidatedIssues = []) {
  const results = [];
  
  for (const issue of consolidatedIssues) {
    const hasTitle = Boolean(issue.title);
    const hasDescription = Boolean(issue.description);
    const hasSources = Array.isArray(issue.sources) && issue.sources.length > 0;
    const hasEvidence = Array.isArray(issue.evidence) && issue.evidence.length > 0;
    const hasScreenshots = Array.isArray(issue.screenshotRefs) && issue.screenshotRefs.length > 0;
    const hasAffectedPages = Array.isArray(issue.affectedPages) && issue.affectedPages.length > 0;
    
    const evidenceScore = [hasTitle, hasDescription, hasSources, hasEvidence, hasScreenshots, hasAffectedPages]
      .filter(Boolean).length;
    
    const quality = evidenceScore >= 5 ? 'excellent' : 
                    evidenceScore >= 4 ? 'good' : 
                    evidenceScore >= 3 ? 'acceptable' : 'poor';
    
    results.push({
      issueId: issue.id,
      title: issue.title || 'Untitled Issue',
      quality,
      evidenceScore,
      checks: {
        hasTitle,
        hasDescription,
        hasSources,
        hasEvidence,
        hasScreenshots,
        hasAffectedPages
      },
      warnings: []
    });
    
    // Add specific warnings
    if (!hasTitle) results[results.length - 1].warnings.push('Missing title');
    if (!hasDescription) results[results.length - 1].warnings.push('Missing description');
    if (!hasSources) results[results.length - 1].warnings.push('No source modules identified');
    if (!hasEvidence && !hasScreenshots) results[results.length - 1].warnings.push('No evidence or screenshots');
  }
  
  return results;
}

/**
 * Validate executive summary quality
 */
function validateExecutiveSummary(executiveSummary, synthesisResults) {
  if (!executiveSummary) {
    return {
      isValid: false,
      quality: 'missing',
      errors: ['Executive summary not generated'],
      warnings: [],
      screenshotValidation: { isValid: true, missing: [] }
    };
  }
  
  const errors = [];
  const warnings = [];
  
  // Check required fields
  if (!executiveSummary.overview) {
    errors.push('Missing overview section');
  }
  
  if (!executiveSummary.keyFindings || !Array.isArray(executiveSummary.keyFindings)) {
    errors.push('Missing or invalid keyFindings array');
  } else if (executiveSummary.keyFindings.length === 0) {
    warnings.push('No key findings listed');
  }
  
  if (!executiveSummary.priorityActions || !Array.isArray(executiveSummary.priorityActions)) {
    errors.push('Missing or invalid priorityActions array');
  } else if (executiveSummary.priorityActions.length === 0) {
    warnings.push('No priority actions listed');
  }
  
  if (!executiveSummary.nextSteps) {
    warnings.push('Missing nextSteps section');
  }
  
  // Validate screenshot references in executive summary
  const fullText = [
    executiveSummary.overview,
    ...(executiveSummary.keyFindings || []).map(f => `${f.title} ${f.description} ${f.evidence || ''}`),
    ...(executiveSummary.priorityActions || []).map(a => `${a.title} ${a.rationale || ''} ${a.evidence || ''}`),
    executiveSummary.nextSteps
  ].join(' ');
  
  const screenshotValidation = validateScreenshotReferences(
    fullText, 
    synthesisResults.screenshotReferences
  );
  
  if (screenshotValidation.missing.length > 0) {
    errors.push(`Invalid screenshot references: ${screenshotValidation.missing.join(', ')}`);
  }
  
  // Check for evidence usage
  const totalEvidence = screenshotValidation.total;
  if (totalEvidence === 0) {
    warnings.push('Executive summary contains no screenshot references - missing evidence');
  } else if (totalEvidence < 3) {
    warnings.push(`Only ${totalEvidence} screenshot reference(s) used - consider adding more evidence`);
  }
  
  const quality = errors.length > 0 ? 'invalid' : 
                  warnings.length > 2 ? 'poor' : 
                  warnings.length > 0 ? 'good' : 'excellent';
  
  return {
    isValid: errors.length === 0,
    quality,
    errors,
    warnings,
    screenshotValidation,
    evidenceCount: totalEvidence
  };
}

/**
 * Calculate overall report quality score (0-100)
 */
function calculateQualityScore(validationResults) {
  let score = 100;
  
  // Executive summary quality (-30 if missing, -15 if poor, -5 if good)
  if (validationResults.executiveSummary.quality === 'missing') score -= 30;
  else if (validationResults.executiveSummary.quality === 'invalid') score -= 25;
  else if (validationResults.executiveSummary.quality === 'poor') score -= 15;
  else if (validationResults.executiveSummary.quality === 'good') score -= 5;
  
  // Issue evidence quality
  const poorIssues = validationResults.issueEvidence.filter(i => i.quality === 'poor').length;
  const acceptableIssues = validationResults.issueEvidence.filter(i => i.quality === 'acceptable').length;
  score -= poorIssues * 5;
  score -= acceptableIssues * 2;
  
  // Screenshot reference errors
  score -= validationResults.screenshotErrors * 3;
  
  // Synthesis stage errors
  score -= validationResults.synthesisErrors * 10;
  
  return Math.max(0, score);
}

/**
 * Main QA validation function
 * 
 * @param {Object} synthesisResults - Results from runReportSynthesis()
 * @returns {Object} Validation report with pass/fail status and recommendations
 */
export function validateReportQuality(synthesisResults) {
  const startTime = Date.now();
  
  // Validate consolidated issues
  const issueEvidence = validateIssueEvidence(synthesisResults.consolidatedIssues);
  
  // Validate executive summary
  const executiveSummary = validateExecutiveSummary(
    synthesisResults.executiveSummary,
    synthesisResults
  );
  
  // Count screenshot reference errors
  const screenshotErrors = executiveSummary.screenshotValidation.missing.length;
  
  // Count synthesis stage errors
  const synthesisErrors = (synthesisResults.errors || []).length;
  
  // Calculate quality score
  const validationResults = {
    issueEvidence,
    executiveSummary,
    screenshotErrors,
    synthesisErrors
  };
  
  const qualityScore = calculateQualityScore(validationResults);
  
  // Determine overall status
  const criticalErrors = executiveSummary.errors.length + synthesisErrors;
  const totalWarnings = executiveSummary.warnings.length + 
                        issueEvidence.filter(i => i.warnings.length > 0).length;
  
  const status = criticalErrors > 0 ? 'FAIL' : 
                 qualityScore < 70 ? 'WARN' : 
                 qualityScore < 90 ? 'PASS' : 'EXCELLENT';
  
  // Generate recommendations
  const recommendations = [];
  
  if (synthesisErrors > 0) {
    recommendations.push(`Fix ${synthesisErrors} synthesis pipeline error(s) - check logs for details`);
  }
  
  if (screenshotErrors > 0) {
    recommendations.push(`Remove or fix ${screenshotErrors} invalid screenshot reference(s)`);
  }
  
  const poorIssues = issueEvidence.filter(i => i.quality === 'poor');
  if (poorIssues.length > 0) {
    recommendations.push(`Improve evidence for ${poorIssues.length} issue(s) with poor quality`);
  }
  
  if (executiveSummary.evidenceCount === 0) {
    recommendations.push('Executive summary needs screenshot evidence - add references to build credibility');
  }
  
  if (executiveSummary.quality === 'poor' || executiveSummary.quality === 'invalid') {
    recommendations.push('Executive summary quality is low - review AI prompt or add manual polish');
  }
  
  if (recommendations.length === 0) {
    recommendations.push('Report quality is excellent - ready to deliver');
  }
  
  return {
    status,
    qualityScore,
    timestamp: new Date().toISOString(),
    executionTimeMs: Date.now() - startTime,
    summary: {
      totalIssues: issueEvidence.length,
      excellentIssues: issueEvidence.filter(i => i.quality === 'excellent').length,
      goodIssues: issueEvidence.filter(i => i.quality === 'good').length,
      acceptableIssues: issueEvidence.filter(i => i.quality === 'acceptable').length,
      poorIssues: issueEvidence.filter(i => i.quality === 'poor').length,
      screenshotReferences: synthesisResults.screenshotReferences?.length || 0,
      screenshotErrors,
      synthesisErrors,
      criticalErrors,
      totalWarnings
    },
    issueEvidence,
    executiveSummary,
    synthesisStageResults: (synthesisResults.errors || []).map(err => ({
      stage: err.stage,
      error: err.message,
      severity: 'critical'
    })),
    recommendations,
    rawSynthesisResults: {
      hasConsolidatedIssues: Boolean(synthesisResults.consolidatedIssues?.length),
      hasExecutiveSummary: Boolean(synthesisResults.executiveSummary),
      hasScreenshotReferences: Boolean(synthesisResults.screenshotReferences?.length),
      stageMetadata: synthesisResults.stageMetadata
    }
  };
}

/**
 * Generate a human-readable QA report
 */
export function generateQAReport(validationResults) {
  const lines = [];
  
  lines.push('═══════════════════════════════════════════════════════════');
  lines.push('           QA / REPORT REVIEWER VALIDATION REPORT          ');
  lines.push('═══════════════════════════════════════════════════════════');
  lines.push('');
  
  // Status header
  const statusEmoji = {
    'EXCELLENT': '✅',
    'PASS': '✓',
    'WARN': '⚠️',
    'FAIL': '❌'
  }[validationResults.status] || '?';
  
  lines.push(`Status: ${statusEmoji} ${validationResults.status}`);
  lines.push(`Quality Score: ${validationResults.qualityScore}/100`);
  lines.push(`Timestamp: ${validationResults.timestamp}`);
  lines.push(`Execution Time: ${validationResults.executionTimeMs}ms`);
  lines.push('');
  
  // Summary
  lines.push('─────────────────────────────────────────────────────────');
  lines.push('SUMMARY');
  lines.push('─────────────────────────────────────────────────────────');
  const s = validationResults.summary;
  lines.push(`Total Issues: ${s.totalIssues}`);
  lines.push(`  ✓ Excellent: ${s.excellentIssues}`);
  lines.push(`  ✓ Good: ${s.goodIssues}`);
  lines.push(`  ~ Acceptable: ${s.acceptableIssues}`);
  lines.push(`  ✗ Poor: ${s.poorIssues}`);
  lines.push('');
  lines.push(`Screenshot References Available: ${s.screenshotReferences}`);
  lines.push(`Screenshot Reference Errors: ${s.screenshotErrors}`);
  lines.push(`Synthesis Pipeline Errors: ${s.synthesisErrors}`);
  lines.push('');
  
  // Executive Summary Validation
  lines.push('─────────────────────────────────────────────────────────');
  lines.push('EXECUTIVE SUMMARY VALIDATION');
  lines.push('─────────────────────────────────────────────────────────');
  const exec = validationResults.executiveSummary;
  lines.push(`Quality: ${exec.quality.toUpperCase()}`);
  lines.push(`Valid: ${exec.isValid ? 'YES' : 'NO'}`);
  lines.push(`Evidence Count: ${exec.evidenceCount} screenshot reference(s)`);
  
  if (exec.errors.length > 0) {
    lines.push('');
    lines.push('ERRORS:');
    exec.errors.forEach(err => lines.push(`  ❌ ${err}`));
  }
  
  if (exec.warnings.length > 0) {
    lines.push('');
    lines.push('WARNINGS:');
    exec.warnings.forEach(warn => lines.push(`  ⚠️  ${warn}`));
  }
  
  lines.push('');
  
  // Issue Evidence Quality
  if (s.poorIssues > 0 || s.acceptableIssues > 0) {
    lines.push('─────────────────────────────────────────────────────────');
    lines.push('ISSUES NEEDING IMPROVEMENT');
    lines.push('─────────────────────────────────────────────────────────');
    
    const needsWork = validationResults.issueEvidence.filter(
      i => i.quality === 'poor' || i.quality === 'acceptable'
    );
    
    needsWork.slice(0, 10).forEach(issue => {
      lines.push(`${issue.quality === 'poor' ? '❌' : '⚠️'} ${issue.title}`);
      lines.push(`   Quality: ${issue.quality} (${issue.evidenceScore}/6)`);
      if (issue.warnings.length > 0) {
        issue.warnings.forEach(w => lines.push(`   - ${w}`));
      }
      lines.push('');
    });
    
    if (needsWork.length > 10) {
      lines.push(`... and ${needsWork.length - 10} more issues`);
      lines.push('');
    }
  }
  
  // Recommendations
  lines.push('─────────────────────────────────────────────────────────');
  lines.push('RECOMMENDATIONS');
  lines.push('─────────────────────────────────────────────────────────');
  validationResults.recommendations.forEach((rec, idx) => {
    lines.push(`${idx + 1}. ${rec}`);
  });
  lines.push('');
  
  lines.push('═══════════════════════════════════════════════════════════');
  
  return lines.join('\n');
}

export default {
  validateReportQuality,
  generateQAReport,
  validateScreenshotReferences,
  validateIssueEvidence,
  validateExecutiveSummary
};
