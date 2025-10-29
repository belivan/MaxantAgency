/**
 * Performance Metrics Section - Full Report Only
 *
 * Displays comprehensive performance data:
 * - PageSpeed Insights with circular gauges for mobile/desktop scores
 * - Core Web Vitals bars (FCP, LCP, TBT, CLS) with threshold indicators
 * - CrUX (Chrome User Experience) real user data with distribution charts
 *
 * Part of Technical Deep Dive section
 */

import { escapeHtml } from '../utils/helpers.js';

/**
 * Generate Performance Metrics Section
 * Includes PageSpeed Insights and CrUX data visualization
 */
export function generatePerformanceMetricsSection(analysisResult) {
  const {
    performance_metrics_pagespeed,
    performance_metrics_crux
  } = analysisResult;

  let html = '';

  // PageSpeed Insights
  if (performance_metrics_pagespeed) {
    html += '      <div style="background: var(--bg-secondary); padding: 24px; border-radius: 12px; margin-bottom: 24px;">\n';
    html += '        <h3 style="font-size: 1.3rem; font-weight: 600; margin-bottom: 8px;">📊 PageSpeed Insights</h3>\n';
    html += '        <p style="opacity: 0.7; margin-bottom: 16px; font-size: 0.95rem;">Lab data from simulated tests in controlled environments.</p>\n';

    // Helper function to generate visual metric card with bar
    const generateMetricCard = (label, value, unit, thresholds) => {
      const numValue = parseFloat(value);
      let status = 'poor';
      let color = 'var(--danger)'; // Red
      let percentage = 100;

      if (numValue <= thresholds.good) {
        status = 'good';
        color = 'var(--success)'; // Green
        percentage = (numValue / thresholds.good) * 50; // First half is good range
      } else if (numValue <= thresholds.needsImprovement) {
        status = 'needs-improvement';
        color = 'var(--warning)'; // Orange
        const range = thresholds.needsImprovement - thresholds.good;
        const position = numValue - thresholds.good;
        percentage = 50 + (position / range) * 30; // Middle 30% is needs improvement
      } else {
        percentage = Math.min(80 + (numValue / thresholds.needsImprovement) * 20, 100);
      }

      return `
        <div style="margin-bottom: 16px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <span style="font-size: 0.9rem; font-weight: 600; color: var(--text-primary);">${label}</span>
            <span style="font-size: 0.9rem; font-weight: 600; color: ${color};">${numValue.toFixed(label === 'CLS' ? 3 : 2)}${unit}</span>
          </div>
          <div style="position: relative; width: 100%; height: 24px; background: var(--bg-tertiary); border-radius: 6px; overflow: hidden; border: 1px solid var(--border-light);">
            <div style="position: absolute; width: ${percentage}%; height: 100%; background: ${color}; transition: width 0.3s;"></div>
            <div style="position: absolute; left: 50%; width: 2px; height: 100%; background: var(--border-default);"></div>
            <div style="position: absolute; left: 80%; width: 2px; height: 100%; background: var(--border-default);"></div>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 0.75rem; color: var(--text-secondary); margin-top: 4px;">
            <span>Good: &lt;${thresholds.good}${unit}</span>
            <span>Needs Improvement: ${thresholds.good}-${thresholds.needsImprovement}${unit}</span>
            <span>Poor: &gt;${thresholds.needsImprovement}${unit}</span>
          </div>
        </div>
      `;
    };

    // Helper function to generate performance score gauge
    const generateScoreGauge = (score, label, icon) => {
      const numScore = parseInt(score) || 0;
      let color = 'var(--danger)'; // Red
      let status = 'Poor';

      if (numScore >= 90) {
        color = 'var(--success)'; // Green
        status = 'Good';
      } else if (numScore >= 50) {
        color = 'var(--warning)'; // Orange
        status = 'Needs Improvement';
      }

      const circumference = 2 * Math.PI * 45; // radius = 45
      const offset = circumference - (numScore / 100) * circumference;

      return `
        <div style="text-align: center; padding: 20px; background: var(--bg-primary); border-radius: 12px; border: 1px solid var(--border-light);">
          <svg width="120" height="120" viewBox="0 0 120 120" style="margin: 0 auto 16px;">
            <circle cx="60" cy="60" r="45" fill="none" stroke="#E5E7EB" stroke-width="10"/>
            <circle
              cx="60" cy="60" r="45" fill="none"
              stroke="${color}"
              stroke-width="10"
              stroke-dasharray="${circumference}"
              stroke-dashoffset="${offset}"
              stroke-linecap="round"
              transform="rotate(-90 60 60)"
              style="transition: stroke-dashoffset 0.5s;"
            />
            <text x="60" y="60" text-anchor="middle" dominant-baseline="middle" font-size="32" font-weight="bold" fill="${color}">${numScore}</text>
          </svg>
          <h4 style="font-size: 1.1rem; margin-bottom: 4px; color: var(--text-primary); font-weight: 600;">${icon} ${label}</h4>
          <p style="font-size: 0.9rem; color: ${color}; font-weight: 500; margin: 0;">${status}</p>
        </div>
      `;
    };

    html += '        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px; margin-bottom: 24px;">\n';

    // Mobile Performance Score
    if (performance_metrics_pagespeed.mobile) {
      html += generateScoreGauge(performance_metrics_pagespeed.mobile.performanceScore, 'Mobile', '📱');
    }

    // Desktop Performance Score
    if (performance_metrics_pagespeed.desktop) {
      html += generateScoreGauge(performance_metrics_pagespeed.desktop.performanceScore, 'Desktop', '💻');
    }

    html += '        </div>\n';

    // Core Web Vitals thresholds
    const thresholds = {
      fcp: { good: 1.8, needsImprovement: 3.0 },
      lcp: { good: 2.5, needsImprovement: 4.0 },
      tbt: { good: 200, needsImprovement: 600 },
      cls: { good: 0.1, needsImprovement: 0.25 }
    };

    // Mobile Metrics
    if (performance_metrics_pagespeed.mobile?.metrics) {
      html += '        <div style="background: var(--bg-primary); padding: 20px; border-radius: 12px; margin-bottom: 16px; border: 1px solid var(--border-light);">\n';
      html += '          <h4 style="font-size: 1rem; font-weight: 600; margin-bottom: 16px; color: var(--text-primary);">📱 Mobile Metrics</h4>\n';

      const m = performance_metrics_pagespeed.mobile.metrics;
      if (m.firstContentfulPaint) {
        html += generateMetricCard('First Contentful Paint (FCP)', m.firstContentfulPaint, 's', thresholds.fcp);
      }
      if (m.largestContentfulPaint) {
        html += generateMetricCard('Largest Contentful Paint (LCP)', m.largestContentfulPaint, 's', thresholds.lcp);
      }
      if (m.totalBlockingTime) {
        html += generateMetricCard('Total Blocking Time (TBT)', m.totalBlockingTime, 'ms', thresholds.tbt);
      }
      if (m.cumulativeLayoutShift) {
        html += generateMetricCard('Cumulative Layout Shift (CLS)', m.cumulativeLayoutShift, '', thresholds.cls);
      }

      html += '        </div>\n';
    }

    // Desktop Metrics
    if (performance_metrics_pagespeed.desktop?.metrics) {
      html += '        <div style="background: var(--bg-primary); padding: 20px; border-radius: 12px; border: 1px solid var(--border-light);">\n';
      html += '          <h4 style="font-size: 1rem; font-weight: 600; margin-bottom: 16px; color: var(--text-primary);">💻 Desktop Metrics</h4>\n';

      const d = performance_metrics_pagespeed.desktop.metrics;
      if (d.firstContentfulPaint) {
        html += generateMetricCard('First Contentful Paint (FCP)', d.firstContentfulPaint, 's', thresholds.fcp);
      }
      if (d.largestContentfulPaint) {
        html += generateMetricCard('Largest Contentful Paint (LCP)', d.largestContentfulPaint, 's', thresholds.lcp);
      }
      if (d.totalBlockingTime) {
        html += generateMetricCard('Total Blocking Time (TBT)', d.totalBlockingTime, 'ms', thresholds.tbt);
      }
      if (d.cumulativeLayoutShift) {
        html += generateMetricCard('Cumulative Layout Shift (CLS)', d.cumulativeLayoutShift, '', thresholds.cls);
      }

      html += '        </div>\n';
    }

    html += '      </div>\n';
  }

  // CrUX Data - Real User Performance Metrics
  if (performance_metrics_crux) {
    html += '      <div style="background: var(--bg-secondary); padding: 24px; border-radius: 12px; margin-top: 16px;">\n';
    html += '        <h3 style="font-size: 1.3rem; font-weight: 600; margin-bottom: 8px;">🌐 Chrome User Experience (CrUX) - Real User Data</h3>\n';
    html += '        <p style="opacity: 0.7; margin-bottom: 16px; font-size: 0.95rem;">Performance data from actual Chrome users visiting your website over the past 28 days.</p>\n';

    const metrics = performance_metrics_crux.metrics || {};
    const hasMetrics = Object.keys(metrics).length > 0;

    if (!hasMetrics) {
      html += '        <p style="font-style: italic; opacity: 0.7; padding: 16px; background: var(--bg-primary); border-radius: 8px; border-left: 4px solid var(--warning);">CrUX data is not available for this website. This usually means the site doesn\'t have enough Chrome user traffic yet to generate meaningful statistics. Google\'s Chrome User Experience Report (CrUX) requires a minimum threshold of users before publishing data.</p>\n';
      html += '      </div>\n';
      return html; // Exit early if no metrics
    }

    // Helper function to get metric display name
    const getMetricName = (key) => {
      const names = {
        'largestContentfulPaint': 'Largest Contentful Paint (LCP)',
        'firstInputDelay': 'First Input Delay (FID)',
        'cumulativeLayoutShift': 'Cumulative Layout Shift (CLS)',
        'firstContentfulPaint': 'First Contentful Paint (FCP)',
        'interactionToNextPaint': 'Interaction to Next Paint (INP)'
      };
      return names[key] || key;
    };

    // Helper function to format metric value
    const formatMetricValue = (key, value) => {
      if (key.includes('Shift')) return value.toFixed(3); // CLS
      if (value > 1000) return (value / 1000).toFixed(2) + 's'; // Convert ms to seconds
      return value + 'ms';
    };

    // Display each metric
    Object.entries(metrics).forEach(([metricKey, metricData]) => {
      const good = Math.round((metricData.good || 0) * 100);
      const needsImprovement = Math.round((metricData.needsImprovement || 0) * 100);
      const poor = Math.round((metricData.poor || 0) * 100);
      const p75Value = metricData.percentiles?.p75;

      html += '        <div style="margin-bottom: 20px; padding: 16px; background: var(--bg-primary); border-radius: 8px; border: 1px solid var(--border-light);">\n';
      html += `          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">\n`;
      html += `            <h4 style="font-size: 1rem; font-weight: 600; color: var(--text-primary); margin: 0;">${getMetricName(metricKey)}</h4>\n`;
      if (p75Value !== undefined) {
        html += `            <span style="font-size: 0.9rem; font-weight: 600; color: var(--text-secondary); background: var(--bg-tertiary); padding: 4px 12px; border-radius: 6px;">75th: ${formatMetricValue(metricKey, p75Value)}</span>\n`;
      }
      html += `          </div>\n`;

      // Stacked bar chart showing good/needs improvement/poor distribution
      html += '          <div style="display: flex; width: 100%; height: 32px; border-radius: 6px; overflow: hidden; margin-bottom: 8px; border: 1px solid var(--border-light);">\n';

      if (good > 0) {
        html += `            <div style="width: ${good}%; background: var(--success); display: flex; align-items: center; justify-content: center; color: white; font-size: 0.85rem; font-weight: 600;">${good > 10 ? good + '%' : ''}</div>\n`;
      }
      if (needsImprovement > 0) {
        html += `            <div style="width: ${needsImprovement}%; background: var(--warning); display: flex; align-items: center; justify-content: center; color: white; font-size: 0.85rem; font-weight: 600;">${needsImprovement > 10 ? needsImprovement + '%' : ''}</div>\n`;
      }
      if (poor > 0) {
        html += `            <div style="width: ${poor}%; background: var(--danger); display: flex; align-items: center; justify-content: center; color: white; font-size: 0.85rem; font-weight: 600;">${poor > 10 ? poor + '%' : ''}</div>\n`;
      }

      html += '          </div>\n';

      // Legend
      html += '          <div style="display: flex; gap: 16px; font-size: 0.85rem;">\n';
      html += `            <div style="display: flex; align-items: center; gap: 6px;"><div style="width: 12px; height: 12px; background: var(--success); border-radius: 2px;"></div><span style="color: var(--text-secondary);">Good: ${good}%</span></div>\n`;
      html += `            <div style="display: flex; align-items: center; gap: 6px;"><div style="width: 12px; height: 12px; background: var(--warning); border-radius: 2px;"></div><span style="color: var(--text-secondary);">Needs Improvement: ${needsImprovement}%</span></div>\n`;
      html += `            <div style="display: flex; align-items: center; gap: 6px;"><div style="width: 12px; height: 12px; background: var(--danger); border-radius: 2px;"></div><span style="color: var(--text-secondary);">Poor: ${poor}%</span></div>\n`;
      html += '          </div>\n';

      html += '        </div>\n';
    });

    // Data source info
    if (performance_metrics_crux.origin) {
      html += `        <p style="font-size: 0.85rem; color: var(--text-secondary); opacity: 0.7; margin-top: 12px;">Data source: ${escapeHtml(performance_metrics_crux.origin)} • Form factor: ${performance_metrics_crux.formFactor || 'All devices'}</p>\n`;
    }

    html += '      </div>\n';
  }

  return html;
}
