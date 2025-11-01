/**
 * Performance Analytics Service
 *
 * Integrates Google PageSpeed Insights and Chrome UX Report APIs
 * to provide real performance metrics and Core Web Vitals data.
 *
 * APIs Used:
 * - PageSpeed Insights: Lab data (synthetic tests)
 * - Chrome UX Report (CrUX): Field data (real users)
 */

import fetch from 'node-fetch';
import { parsePerformanceMetric, calculatePerformanceScore } from '../utils/performance-helpers.js';

export class PerformanceService {
  constructor(options = {}) {
    this.pageSpeedApiKey = process.env.PAGESPEED_API_KEY;
    this.cruxApiKey = process.env.CRUX_API_KEY || this.pageSpeedApiKey;
    this.timeout = parseInt(process.env.PERFORMANCE_API_TIMEOUT) || 30000;
    this.onProgress = options.onProgress || (() => {});

    // DIAGNOSTIC LOGGING
    console.log('[Performance] Service initialized with:');
    console.log(`  - PageSpeed API Key: ${this.pageSpeedApiKey ? 'CONFIGURED (' + this.pageSpeedApiKey.substring(0, 10) + '...)' : 'NOT CONFIGURED'}`);
    console.log(`  - CrUX API Key: ${this.cruxApiKey ? 'CONFIGURED' : 'NOT CONFIGURED'}`);
    console.log(`  - Timeout: ${this.timeout}ms`);
    console.log(`  - ENABLE_PERFORMANCE_API: ${process.env.ENABLE_PERFORMANCE_API}`);
  }

  /**
   * Fetch PageSpeed Insights data
   * @param {string} url - Website URL
   * @param {string} strategy - 'mobile' or 'desktop'
   * @returns {Promise<object>} PageSpeed data
   */
  async fetchPageSpeedInsights(url, strategy = 'mobile') {
    console.log(`[Performance] fetchPageSpeedInsights called for ${url} (${strategy})`);

    if (!this.pageSpeedApiKey) {
      console.error('[Performance] PageSpeed API key not configured - cannot fetch performance data!');
      return { success: false, error: 'API key not configured' };
    }

    try {
      const apiUrl = new URL('https://www.googleapis.com/pagespeedonline/v5/runPagespeed');
      apiUrl.searchParams.set('url', url);
      apiUrl.searchParams.set('strategy', strategy);
      apiUrl.searchParams.set('category', 'performance');
      apiUrl.searchParams.set('key', this.pageSpeedApiKey);

      console.log(`[Performance] Making API call to: ${apiUrl.origin}${apiUrl.pathname}`);
      console.log(`[Performance] Strategy: ${strategy}, Category: performance`);

      this.onProgress({
        step: 'performance',
        message: `Fetching PageSpeed data (${strategy})...`
      });

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(apiUrl.toString(), {
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`PageSpeed API error: ${response.status}`);
      }

      const data = await response.json();

      if (data.error) {
        console.error(`[Performance] API returned error: ${data.error.message}`);
        return { success: false, error: data.error.message };
      }

      console.log(`[Performance] PageSpeed API call successful for ${strategy}`);

      const audits = data.lighthouseResult.audits;
      const metrics = audits.metrics.details.items[0];

      const performanceScore = Math.round(data.lighthouseResult.categories.performance.score * 100);
      console.log(`[Performance] ${strategy} Performance Score: ${performanceScore}/100`);

      return {
        success: true,
        strategy,
        data: {
          // Performance score
          performanceScore,

          // Core Web Vitals
          lcp: Math.round(metrics.largestContentfulPaint),
          fid: Math.round(metrics.maxPotentialFID || metrics.totalBlockingTime),
          cls: parseFloat(metrics.cumulativeLayoutShift.toFixed(3)),
          fcp: Math.round(metrics.firstContentfulPaint),
          tti: Math.round(metrics.interactive),

          // Speed metrics
          speedIndex: Math.round(metrics.speedIndex),
          totalBlockingTime: Math.round(metrics.totalBlockingTime),

          // Opportunities (what to fix)
          opportunities: Object.entries(audits)
            .filter(([key, audit]) =>
              audit.details?.type === 'opportunity' &&
              audit.score !== null &&
              audit.score < 0.9
            )
            .map(([key, audit]) => ({
              id: key,
              title: audit.title,
              description: audit.description,
              score: Math.round(audit.score * 100),
              displayValue: audit.displayValue || '',
              savings: audit.details?.overallSavingsMs || 0
            }))
            .sort((a, b) => b.savings - a.savings)
            .slice(0, 5) // Top 5 opportunities
        }
      };
    } catch (error) {
      console.error(`[Performance] PageSpeed fetch failed (${strategy}):`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Fetch Chrome UX Report data
   * @param {string} url - Website URL
   * @param {string} formFactor - 'PHONE', 'DESKTOP', or 'TABLET'
   * @returns {Promise<object>} CrUX data
   */
  async fetchCruxData(url, formFactor = 'PHONE') {
    if (!this.cruxApiKey) {
      console.warn('[Performance] CrUX API key not configured');
      return { success: false, error: 'API key not configured' };
    }

    try {
      this.onProgress({
        step: 'performance',
        message: `Fetching real user metrics (${formFactor.toLowerCase()})...`
      });

      const response = await fetch(
        `https://chromeuxreport.googleapis.com/v1/records:queryRecord?key=${this.cruxApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: url,
            formFactor: formFactor,
            metrics: [
              'largest_contentful_paint',
              'cumulative_layout_shift',
              'first_contentful_paint',
              'interaction_to_next_paint'
            ]
          })
        }
      );

      const data = await response.json();

      if (data.error) {
        // Site might not have enough traffic for CrUX data
        return {
          success: false,
          error: data.error.message,
          noData: data.error.code === 404 || data.error.message.includes('does not have sufficient data')
        };
      }

      if (!data.record || !data.record.metrics) {
        return {
          success: false,
          error: 'Invalid CrUX response - missing metrics',
          noData: true
        };
      }

      const metrics = data.record.metrics;

      return {
        success: true,
        formFactor,
        data: {
          lcp: parsePerformanceMetric(metrics.largest_contentful_paint),
          cls: parsePerformanceMetric(metrics.cumulative_layout_shift, true), // CLS is decimal
          fcp: parsePerformanceMetric(metrics.first_contentful_paint),
          inp: parsePerformanceMetric(metrics.interaction_to_next_paint),

          // Overall rating
          rating: this.calculateCruxRating(metrics),

          // Collection period
          collectionPeriod: data.record.collectionPeriod
        }
      };
    } catch (error) {
      console.error(`[Performance] CrUX fetch failed (${formFactor}):`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Calculate overall rating from CrUX metrics with detailed breakdown
   */
  calculateCruxRating(metrics) {
    const lcp = metrics.largest_contentful_paint?.percentiles?.p75 || 0;
    const inp = metrics.interaction_to_next_paint?.percentiles?.p75 || 0;
    const cls = metrics.cumulative_layout_shift?.percentiles?.p75 || 0;

    // Check each metric against Google's thresholds
    const lcpGood = lcp > 0 && lcp < 2500;
    const inpGood = inp > 0 && inp < 200;  // INP threshold: good < 200ms
    const clsGood = cls >= 0 && cls < 0.1;

    const metrics_status = [
      { metric: 'LCP', passing: lcpGood, value: lcp, unit: 'ms' },
      { metric: 'INP', passing: inpGood, value: inp, unit: 'ms' },
      { metric: 'CLS', passing: clsGood, value: cls, unit: 'score' }
    ];

    const passingCount = metrics_status.filter(m => m.passing).length;
    const totalMetrics = metrics_status.length;

    // Overall assessment
    let overall, message;
    if (passingCount === 3) {
      overall = 'good';
      message = 'Passing Core Web Vitals';
    } else if (passingCount >= 2) {
      overall = 'needs-improvement';
      const failing = metrics_status.find(m => !m.passing);
      message = `${passingCount}/${totalMetrics} metrics passing (${failing?.metric} needs improvement)`;
    } else {
      overall = 'poor';
      message = `Only ${passingCount}/${totalMetrics} metrics passing`;
    }

    return {
      overall,
      message,
      passingCount,
      totalMetrics,
      passingPercentage: Math.round((passingCount / totalMetrics) * 100),
      breakdown: metrics_status
    };
  }

  /**
   * Fetch all performance data for a URL
   * @param {string} url - Website URL
   * @returns {Promise<object>} Combined performance data
   */
  async fetchAllPerformanceData(url) {
    console.log('[Performance] Fetching all performance analytics...');

    const enablePageSpeed = process.env.ENABLE_PAGESPEED_API !== 'false';
    const enableCrux = process.env.ENABLE_CRUX_API !== 'false';

    const results = await Promise.allSettled([
      // PageSpeed Insights - Mobile + Desktop
      enablePageSpeed ? this.fetchPageSpeedInsights(url, 'mobile') : Promise.resolve({ success: false, error: 'Disabled' }),
      enablePageSpeed ? this.fetchPageSpeedInsights(url, 'desktop') : Promise.resolve({ success: false, error: 'Disabled' }),

      // CrUX - Mobile + Desktop (with fallback)
      enableCrux ? this.fetchCruxData(url, 'PHONE') : Promise.resolve({ success: false, error: 'Disabled' }),
      enableCrux ? this.fetchCruxData(url, 'DESKTOP') : Promise.resolve({ success: false, error: 'Disabled' })
    ]);

    const [psiMobile, psiDesktop, cruxMobile, cruxDesktop] = results.map(r =>
      r.status === 'fulfilled' ? r.value : { success: false, error: r.reason?.message }
    );

    return {
      pageSpeed: {
        mobile: psiMobile.success ? psiMobile.data : null,
        desktop: psiDesktop.success ? psiDesktop.data : null
      },
      crux: {
        mobile: cruxMobile.success ? cruxMobile.data : null,
        desktop: cruxDesktop.success ? cruxDesktop.data : null,
        hasData: cruxMobile.success || cruxDesktop.success
      },
      errors: [
        !psiMobile.success && !cruxMobile.noData && { source: 'pagespeed-mobile', error: psiMobile.error },
        !psiDesktop.success && { source: 'pagespeed-desktop', error: psiDesktop.error },
        !cruxMobile.success && !cruxMobile.noData && { source: 'crux-mobile', error: cruxMobile.error },
        !cruxDesktop.success && !cruxDesktop.noData && { source: 'crux-desktop', error: cruxDesktop.error }
      ].filter(Boolean)
    };
  }

  /**
   * Generate performance issues from metrics
   * @param {object} performanceData - Data from fetchAllPerformanceData
   * @returns {array} Issues array
   */
  generatePerformanceIssues(performanceData) {
    const issues = [];
    const thresholds = this.loadThresholds();

    // Mobile PageSpeed issues
    if (performanceData.pageSpeed.mobile) {
      const mobile = performanceData.pageSpeed.mobile;

      // LCP (Largest Contentful Paint)
      if (mobile.lcp > thresholds.lcp.poor) {
        issues.push({
          title: `Slow mobile page load (${(mobile.lcp / 1000).toFixed(1)}s LCP)`,
          source: 'pagespeed-insights-mobile',
          severity: 'critical',
          category: 'performance',
          impact: 'Google ranking penalty + 53% of mobile users abandon slow sites',
          evidence: [
            `LCP: ${(mobile.lcp / 1000).toFixed(1)}s (target: <2.5s)`,
            'Core Web Vitals are a Google ranking factor',
            `Performance score: ${mobile.performanceScore}/100`
          ],
          recommendation: mobile.opportunities[0]?.title || 'Optimize images and reduce server response time',
          estimatedTimeSavings: mobile.opportunities[0]?.savings || 0,
          metrics: { lcp: mobile.lcp, target: thresholds.lcp.good }
        });
      }

      // CLS (Cumulative Layout Shift)
      if (mobile.cls > thresholds.cls.poor) {
        issues.push({
          title: `Layout shifts on mobile (CLS: ${mobile.cls.toFixed(3)})`,
          source: 'pagespeed-insights-mobile',
          severity: 'high',
          category: 'mobile',
          impact: 'Poor user experience, accidental clicks, frustrated users',
          evidence: [
            `CLS: ${mobile.cls.toFixed(3)} (target: <0.1)`,
            'Causes content to jump while loading'
          ],
          recommendation: 'Add size attributes to images, reserve space for ads/embeds',
          metrics: { cls: mobile.cls, target: thresholds.cls.good }
        });
      }

      // Performance score
      if (mobile.performanceScore < thresholds.performanceScore.poor) {
        issues.push({
          title: `Poor mobile performance score (${mobile.performanceScore}/100)`,
          source: 'pagespeed-insights-mobile',
          severity: mobile.performanceScore < 25 ? 'critical' : 'high',
          category: 'performance',
          impact: 'Slow site = lost visitors, lower rankings, fewer conversions',
          evidence: [
            `Performance score: ${mobile.performanceScore}/100`,
            `Speed Index: ${(mobile.speedIndex / 1000).toFixed(1)}s`
          ],
          recommendation: 'See optimization opportunities below',
          metrics: { score: mobile.performanceScore }
        });
      }

      // Add top 3 opportunities
      mobile.opportunities.slice(0, 3).forEach(opp => {
        if (opp.savings > 500) { // Only if saves >500ms
          issues.push({
            title: opp.title,
            source: 'pagespeed-insights-mobile',
            severity: opp.savings > 2000 ? 'high' : 'medium',
            category: 'performance',
            impact: `Could save ${(opp.savings / 1000).toFixed(1)}s load time`,
            evidence: [opp.description || opp.displayValue],
            recommendation: 'Implement recommended optimization',
            estimatedTimeSavings: opp.savings
          });
        }
      });
    }

    // CrUX real user data (if available)
    if (performanceData.crux.hasData && performanceData.crux.mobile) {
      const crux = performanceData.crux.mobile;

      if (crux.rating === 'poor') {
        issues.push({
          title: `Poor real-world mobile performance (CrUX: ${crux.rating})`,
          source: 'chrome-ux-report',
          severity: 'critical',
          category: 'performance',
          impact: 'Real Chrome users experiencing slow performance',
          evidence: [
            `Real user LCP: ${(crux.lcp.p75 / 1000).toFixed(1)}s (75th percentile)`,
            `${Math.round(crux.lcp.poor * 100)}% of users have poor LCP`,
            `Data from real Chrome visitors`
          ],
          recommendation: 'Prioritize performance fixes - this is affecting actual users',
          metrics: crux
        });
      }
    }

    return issues;
  }

  loadThresholds() {
    // Load from config file or use defaults
    return {
      lcp: { good: 2500, poor: 4000 },
      fid: { good: 100, poor: 300 },
      cls: { good: 0.1, poor: 0.25 },
      fcp: { good: 1800, poor: 3000 },
      performanceScore: { good: 90, poor: 50 }
    };
  }
}
