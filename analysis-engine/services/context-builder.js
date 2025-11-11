/**
 * Context Builder - Accumulates findings across pages and analyzers
 *
 * Enables intelligent context sharing to reduce duplicate issues and improve analysis quality.
 * Can be toggled on/off for A/B testing to measure impact.
 *
 * Features:
 * - Cross-page context: Pass findings from analyzed pages to subsequent pages
 * - Cross-analyzer context: Share insights between different analyzer modules
 * - Metrics tracking: Measure impact on performance, issue count, and quality
 */

export class ContextBuilder {
  constructor(options = {}) {
    this.enableCrossPage = options.enableCrossPage ?? false;
    this.enableCrossAnalyzer = options.enableCrossAnalyzer ?? false;
    this.verboseLogging = options.verboseLogging ?? false;

    // Cross-page context
    this.pagesAnalyzed = [];
    this.issuesFound = new Map(); // category -> Set of issue titles
    this.patterns = [];
    this.pageScores = [];

    // Cross-analyzer context
    this.analyzerResults = new Map(); // analyzer name -> key findings
    this.sharedInsights = [];

    // Metrics tracking
    this.metrics = {
      issueReduction: {
        total: 0,
        duplicatesAvoided: 0,
        contextualized: 0
      },
      performance: {
        contextBuildTime: 0,
        contextUsageTime: 0
      },
      quality: {
        issuesUpgraded: 0, // Severity increased due to context
        issuesDowngraded: 0, // Severity decreased due to context
        scopeEnhanced: 0 // Issues marked as site-wide vs page-specific
      }
    };

    this.startTime = Date.now();
  }

  /**
   * Add page analysis results to context
   * @param {object} pageResult - Analysis results for a page
   * @param {string} pageResult.url - Page URL
   * @param {array} pageResult.issues - Issues found on this page
   * @param {object} pageResult.scores - Scores for this page
   * @param {string} pageResult.analyzer - Analyzer that produced these results
   */
  addPageContext(pageResult) {
    if (!this.enableCrossPage) return;

    const buildStart = Date.now();

    this.pagesAnalyzed.push({
      url: pageResult.url,
      timestamp: Date.now(),
      issueCount: pageResult.issues?.length || 0
    });

    // Track issues by category for duplicate detection
    if (pageResult.issues) {
      pageResult.issues.forEach(issue => {
        const category = issue.category || 'general';
        if (!this.issuesFound.has(category)) {
          this.issuesFound.set(category, new Set());
        }

        // Store normalized issue title for matching
        const normalizedTitle = this.normalizeIssueTitle(issue.title);
        this.issuesFound.get(category).add(normalizedTitle);
      });
    }

    // Track scores for pattern detection
    if (pageResult.scores) {
      this.pageScores.push({
        url: pageResult.url,
        ...pageResult.scores
      });
    }

    // Detect patterns across pages
    this.detectPatterns();

    this.metrics.performance.contextBuildTime += (Date.now() - buildStart);

    if (this.verboseLogging) {
      console.log(`[Context] Added page context for ${pageResult.url}`);
      console.log(`[Context]   Total pages: ${this.pagesAnalyzed.length}`);
      console.log(`[Context]   Unique issues: ${this.getTotalUniqueIssues()}`);
    }
  }

  /**
   * Add analyzer results to shared context
   * @param {string} analyzer - Analyzer name (e.g., 'visual', 'seo', 'content')
   * @param {object} findings - Key findings to share with other analyzers
   */
  addAnalyzerContext(analyzer, findings) {
    if (!this.enableCrossAnalyzer) return;

    const buildStart = Date.now();

    this.analyzerResults.set(analyzer, {
      timestamp: Date.now(),
      keyFindings: findings.keyFindings || [],
      topIssues: findings.topIssues || [],
      scores: findings.scores || {},
      suggestions: findings.suggestions || []
    });

    // Generate insights for other analyzers
    this.generateSharedInsights(analyzer, findings);

    this.metrics.performance.contextBuildTime += (Date.now() - buildStart);

    if (this.verboseLogging) {
      console.log(`[Context] Added analyzer context from ${analyzer}`);
      console.log(`[Context]   Analyzers completed: ${this.analyzerResults.size}`);
    }
  }

  /**
   * Get context for analyzing a new page
   * @param {string} pageUrl - URL of page being analyzed
   * @param {object} options - Additional options
   * @returns {object} Context to pass to analyzer
   */
  getPageContext(pageUrl, options = {}) {
    if (!this.enableCrossPage) return null;

    const usageStart = Date.now();

    const context = {
      pagesAnalyzedCount: this.pagesAnalyzed.length,
      previousPages: this.pagesAnalyzed.map(p => p.url),

      // Issues already found
      knownIssues: this.getKnownIssuesSummary(),

      // Patterns detected
      patterns: this.patterns,

      // Score trends
      scoreTrends: this.getScoreTrends(),

      // Instructions for AI
      instructions: this.generatePageContextInstructions()
    };

    this.metrics.performance.contextUsageTime += (Date.now() - usageStart);

    return context;
  }

  /**
   * Get context for a specific analyzer
   * @param {string} analyzer - Analyzer name
   * @returns {object} Context from other analyzers
   */
  getAnalyzerContext(analyzer) {
    if (!this.enableCrossAnalyzer) return null;

    const usageStart = Date.now();

    // Get results from analyzers that have already run
    const availableContext = {};

    for (const [name, results] of this.analyzerResults.entries()) {
      if (name !== analyzer) {
        availableContext[name] = {
          keyFindings: results.keyFindings,
          topIssues: results.topIssues,
          scores: results.scores
        };
      }
    }

    // Add relevant shared insights
    const relevantInsights = this.sharedInsights.filter(insight =>
      insight.relevantTo.includes(analyzer)
    );

    const context = {
      analyzersCompleted: Array.from(this.analyzerResults.keys()),
      otherAnalyzers: availableContext,
      sharedInsights: relevantInsights,
      instructions: this.generateAnalyzerContextInstructions(analyzer)
    };

    this.metrics.performance.contextUsageTime += (Date.now() - usageStart);

    return context;
  }

  /**
   * Check if an issue is a duplicate of a previously found issue
   * @param {object} issue - Issue to check
   * @param {string} currentPage - Current page URL
   * @returns {object} { isDuplicate: boolean, existingIssue: object|null, scope: string }
   */
  checkDuplicateIssue(issue, currentPage) {
    if (!this.enableCrossPage) {
      return { isDuplicate: false, existingIssue: null, scope: 'page' };
    }

    const category = issue.category || 'general';
    const normalizedTitle = this.normalizeIssueTitle(issue.title);

    if (this.issuesFound.has(category)) {
      const categoryIssues = this.issuesFound.get(category);

      // Check for exact match
      if (categoryIssues.has(normalizedTitle)) {
        this.metrics.issueReduction.duplicatesAvoided++;

        return {
          isDuplicate: true,
          existingIssue: normalizedTitle,
          scope: 'site-wide', // Issue appears on multiple pages
          action: 'merge_or_skip'
        };
      }

      // Check for similar issues (fuzzy match)
      for (const existingTitle of categoryIssues) {
        if (this.areSimilarIssues(normalizedTitle, existingTitle)) {
          this.metrics.issueReduction.contextualized++;

          return {
            isDuplicate: true,
            existingIssue: existingTitle,
            scope: 'site-wide',
            similarity: this.calculateSimilarity(normalizedTitle, existingTitle),
            action: 'contextualize'
          };
        }
      }
    }

    return { isDuplicate: false, existingIssue: null, scope: 'page' };
  }

  /**
   * Enhance issue with context (upgrade severity if site-wide, add scope info)
   * @param {object} issue - Issue to enhance
   * @param {object} duplicateInfo - Info from checkDuplicateIssue
   * @returns {object} Enhanced issue
   */
  enhanceIssueWithContext(issue, duplicateInfo) {
    if (!duplicateInfo.isDuplicate) return issue;

    const enhanced = { ...issue };

    // Add scope information
    enhanced.scope = duplicateInfo.scope;
    enhanced.appearsOn = this.pagesAnalyzed.length + 1 + ' pages';

    // Upgrade severity if site-wide issue
    if (duplicateInfo.scope === 'site-wide') {
      const severityLevels = ['low', 'medium', 'high', 'critical'];
      const currentLevel = severityLevels.indexOf(issue.severity || 'medium');
      const newLevel = Math.min(currentLevel + 1, severityLevels.length - 1);

      if (newLevel > currentLevel) {
        enhanced.severity = severityLevels[newLevel];
        enhanced.severityReason = 'Upgraded due to site-wide occurrence';
        this.metrics.quality.issuesUpgraded++;
      }

      this.metrics.quality.scopeEnhanced++;
    }

    return enhanced;
  }

  /**
   * Get metrics for A/B testing comparison
   * @returns {object} Comprehensive metrics
   */
  getMetrics() {
    const totalTime = Date.now() - this.startTime;

    return {
      contextSharing: {
        crossPageEnabled: this.enableCrossPage,
        crossAnalyzerEnabled: this.enableCrossAnalyzer
      },
      issueReduction: {
        ...this.metrics.issueReduction,
        reductionRate: this.metrics.issueReduction.total > 0
          ? ((this.metrics.issueReduction.duplicatesAvoided / this.metrics.issueReduction.total) * 100).toFixed(1) + '%'
          : '0%'
      },
      performance: {
        ...this.metrics.performance,
        totalTime,
        overheadPercentage: ((this.metrics.performance.contextBuildTime + this.metrics.performance.contextUsageTime) / totalTime * 100).toFixed(2) + '%'
      },
      quality: {
        ...this.metrics.quality
      },
      context: {
        pagesAnalyzed: this.pagesAnalyzed.length,
        uniqueIssueCategories: this.issuesFound.size,
        totalUniqueIssues: this.getTotalUniqueIssues(),
        patternsDetected: this.patterns.length,
        analyzersCompleted: this.analyzerResults.size,
        sharedInsights: this.sharedInsights.length
      }
    };
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  normalizeIssueTitle(title) {
    return title
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  areSimilarIssues(title1, title2) {
    // Simple similarity check - can be enhanced with Levenshtein distance
    const words1 = new Set(title1.split(' '));
    const words2 = new Set(title2.split(' '));

    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);

    const similarity = intersection.size / union.size;
    return similarity > 0.7; // 70% word overlap
  }

  calculateSimilarity(title1, title2) {
    const words1 = new Set(title1.split(' '));
    const words2 = new Set(title2.split(' '));
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    return (intersection.size / union.size * 100).toFixed(0) + '%';
  }

  getTotalUniqueIssues() {
    let total = 0;
    for (const issues of this.issuesFound.values()) {
      total += issues.size;
    }
    return total;
  }

  getKnownIssuesSummary() {
    const summary = [];
    for (const [category, issues] of this.issuesFound.entries()) {
      summary.push({
        category,
        count: issues.size,
        examples: Array.from(issues).slice(0, 3) // Top 3 examples
      });
    }
    return summary;
  }

  detectPatterns() {
    // Detect consistent issues across pages
    if (this.pagesAnalyzed.length < 2) return;

    // Example: Detect if all pages have low mobile scores
    const mobileScores = this.pageScores.map(p => p.mobile || p.mobileScore).filter(Boolean);
    if (mobileScores.length >= 2) {
      const avgMobile = mobileScores.reduce((a, b) => a + b, 0) / mobileScores.length;
      if (avgMobile < 60) {
        this.addPattern({
          type: 'site-wide-mobile-issues',
          description: 'Consistent mobile UX problems across all pages',
          severity: 'high',
          affectedPages: this.pagesAnalyzed.length
        });
      }
    }

    // Detect score consistency
    const desktopScores = this.pageScores.map(p => p.desktop || p.desktopScore).filter(Boolean);
    if (desktopScores.length >= 2) {
      const variance = this.calculateVariance(desktopScores);
      if (variance < 100) { // Low variance = consistent quality
        this.addPattern({
          type: 'consistent-design-quality',
          description: 'Consistent design quality across pages',
          severity: 'info',
          affectedPages: this.pagesAnalyzed.length
        });
      } else if (variance > 400) { // High variance = inconsistent
        this.addPattern({
          type: 'inconsistent-design-quality',
          description: 'Inconsistent design quality across pages',
          severity: 'medium',
          affectedPages: this.pagesAnalyzed.length
        });
      }
    }
  }

  addPattern(pattern) {
    // Avoid duplicate patterns
    const exists = this.patterns.some(p => p.type === pattern.type);
    if (!exists) {
      this.patterns.push(pattern);
    }
  }

  calculateVariance(numbers) {
    const avg = numbers.reduce((a, b) => a + b, 0) / numbers.length;
    const squareDiffs = numbers.map(n => Math.pow(n - avg, 2));
    return squareDiffs.reduce((a, b) => a + b, 0) / numbers.length;
  }

  getScoreTrends() {
    if (this.pageScores.length < 2) return null;

    return {
      desktop: this.calculateTrend(this.pageScores.map(p => p.desktop || p.desktopScore).filter(Boolean)),
      mobile: this.calculateTrend(this.pageScores.map(p => p.mobile || p.mobileScore).filter(Boolean)),
      seo: this.calculateTrend(this.pageScores.map(p => p.seo || p.seoScore).filter(Boolean))
    };
  }

  calculateTrend(scores) {
    if (scores.length < 2) return null;

    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    const min = Math.min(...scores);
    const max = Math.max(...scores);

    return {
      average: Math.round(avg),
      min,
      max,
      variance: Math.round(this.calculateVariance(scores)),
      trend: max - min > 20 ? 'inconsistent' : 'consistent'
    };
  }

  generatePageContextInstructions() {
    const instructions = [];

    if (this.pagesAnalyzed.length > 0) {
      instructions.push(
        `You are analyzing page ${this.pagesAnalyzed.length + 1} of a multi-page website.`
      );

      if (this.getTotalUniqueIssues() > 0) {
        instructions.push(
          `The following issues have already been identified on previous pages:`,
          ...this.getKnownIssuesSummary().map(cat =>
            `  - ${cat.category}: ${cat.count} unique issues`
          ),
          '',
          'IMPORTANT: When you find similar issues:',
          '  1. If the issue is IDENTICAL, note it appears on multiple pages (site-wide)',
          '  2. If the issue is SIMILAR, focus on what\'s DIFFERENT about this page',
          '  3. Avoid reporting the exact same issue again unless page-specific details add value'
        );
      }

      if (this.patterns.length > 0) {
        instructions.push(
          '',
          'Patterns detected across pages:',
          ...this.patterns.map(p => `  - ${p.description}`)
        );
      }
    }

    return instructions.join('\n');
  }

  generateAnalyzerContextInstructions(analyzer) {
    const instructions = [];

    if (this.analyzerResults.size > 0) {
      instructions.push(
        `You are running the ${analyzer} analyzer.`,
        `The following analyzers have already completed:`,
        ...Array.from(this.analyzerResults.keys()).map(name => `  - ${name}`),
        ''
      );

      // Add analyzer-specific context
      if (analyzer === 'seo' && this.analyzerResults.has('visual')) {
        const visual = this.analyzerResults.get('visual');
        instructions.push(
          'CONTEXT from visual analyzer:',
          `  - Visual issues found that may impact SEO (images, layout)`,
          `  - Consider how visual problems affect user engagement metrics`
        );
      }

      if (analyzer === 'accessibility' && this.analyzerResults.has('visual')) {
        instructions.push(
          'CONTEXT from visual analyzer:',
          `  - Check if reported visual issues also violate WCAG guidelines`,
          `  - Focus on accessibility issues NOT already covered by visual analysis`
        );
      }

      if (analyzer === 'content' && this.analyzerResults.has('seo')) {
        instructions.push(
          'CONTEXT from SEO analyzer:',
          `  - SEO analyzer may have identified content-related issues`,
          `  - Focus on messaging, tone, and persuasiveness rather than SEO technicalities`
        );
      }

      if (this.sharedInsights.length > 0) {
        const relevant = this.sharedInsights.filter(i => i.relevantTo.includes(analyzer));
        if (relevant.length > 0) {
          instructions.push(
            '',
            'Insights from other analyzers:',
            ...relevant.map(i => `  - ${i.insight}`)
          );
        }
      }
    }

    return instructions.join('\n');
  }

  generateSharedInsights(analyzer, findings) {
    // Generate insights that other analyzers can use
    const insights = [];

    if (analyzer === 'visual') {
      if (findings.topIssues?.some(i => i.title?.includes('image') || i.title?.includes('alt'))) {
        insights.push({
          from: 'visual',
          relevantTo: ['seo', 'accessibility'],
          insight: 'Image-related issues detected that may affect SEO and accessibility'
        });
      }

      if (findings.topIssues?.some(i => i.title?.includes('mobile') || i.title?.includes('responsive'))) {
        insights.push({
          from: 'visual',
          relevantTo: ['seo', 'accessibility'],
          insight: 'Mobile/responsive issues detected - check for mobile-specific SEO and accessibility concerns'
        });
      }
    }

    if (analyzer === 'seo') {
      if (findings.topIssues?.some(i => i.title?.includes('content') || i.title?.includes('heading'))) {
        insights.push({
          from: 'seo',
          relevantTo: ['content', 'accessibility'],
          insight: 'Content structure issues detected - verify heading hierarchy and semantic HTML'
        });
      }
    }

    this.sharedInsights.push(...insights);
  }
}

export default ContextBuilder;
