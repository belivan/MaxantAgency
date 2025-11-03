/**
 * Timeline Section Component
 * Generates 30-60-90 day implementation roadmap with phased approach
 */

import { escapeHtml, extractTopIssues } from '../utils/helpers.js';

/**
 * Generate timeline section HTML
 * @param {Object} analysisResult - Full analysis result data
 * @param {Object} synthesisData - Optional AI synthesis data with consolidated issues
 * @param {Object} options - Generation options
 * @returns {string} HTML string for timeline section
 */
export function generateTimeline(analysisResult, synthesisData = {}, options = {}) {
  const { reportType = 'full' } = options;

  const {
    industry,
    grade,
    quick_wins = [],
    design_issues_desktop = [],
    design_issues_mobile = [],
    seo_issues = [],
    content_issues = [],
    top_issue
  } = analysisResult;

  // Combine design issues
  const design_issues = [...(design_issues_desktop || []), ...(design_issues_mobile || [])];

  // Get consolidated issues for better planning
  const issues = synthesisData.consolidatedIssues || extractTopIssues(analysisResult);
  const criticalIssues = issues.filter(i => i.severity === 'critical' || i.priority === 'critical');
  const highIssues = issues.filter(i => i.severity === 'high' || i.priority === 'high');

  let html = '    <!-- Implementation Timeline -->\n';
  html += '    <section class="section" id="timeline">\n';
  html += '      <div class="section-header">\n';
  html += '        <h2 class="section-title">\n';
  html += '          <span class="section-title-icon">📅</span>\n';
  html += '          30-60-90 Day Implementation Plan\n';
  html += '        </h2>\n';
  html += '        <p class="section-description">Phased approach to prioritize quick wins and high-impact improvements</p>\n';
  html += '      </div>\n';

  html += '      <div class="roadmap-timeline">\n';
  html += '        <div class="timeline-connector"></div>\n';

  // Check for AI-generated strategic roadmap first
  const strategicRoadmap = synthesisData?.executiveSummary?.strategicRoadmap;

  if (strategicRoadmap && strategicRoadmap.month1) {
    // Use AI-generated roadmap with strategic focus and expected impacts

    // Month 1 (30 days)
    html += '        <div class="roadmap-phase">\n';
    html += '          <div class="phase-marker">30</div>\n';
    html += '          <div class="phase-content">\n';
    html += `            <h3 class="phase-title">First 30 Days: ${escapeHtml(strategicRoadmap.month1.focus || 'Quick Wins & Foundation')}</h3>\n`;

    if (strategicRoadmap.month1.items && strategicRoadmap.month1.items.length > 0) {
      html += '            <ul style="margin: 8px 0; padding-left: 20px; color: var(--text-secondary);">\n';
      strategicRoadmap.month1.items.forEach(item => {
        html += `              <li style="margin-bottom: 4px;">${escapeHtml(item)}</li>\n`;
      });
      html += '            </ul>\n';
    }

    if (strategicRoadmap.month1.expectedImpact) {
      html += `            <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border-light); font-size: 13px; color: var(--success);">\n`;
      html += `              <strong>Expected Impact:</strong> ${escapeHtml(strategicRoadmap.month1.expectedImpact)}\n`;
      html += '            </div>\n';
    }

    html += '          </div>\n';
    html += '        </div>\n';
  } else {
    // Fallback to heuristic-based roadmap
    // Get consolidated issues if available
    const consolidatedIssues = synthesisData?.consolidatedIssues || [];

    // 30 Days - Quick Wins & Critical Fixes
    html += '        <div class="roadmap-phase">\n';
    html += '          <div class="phase-marker">30</div>\n';
    html += '          <div class="phase-content">\n';
    html += '            <h3 class="phase-title">First 30 Days: Quick Wins & Critical Fixes</h3>\n';

    // Show quick wins and top critical items by title only
    const phase1Items = [];

    // Add top issue first
    if (top_issue) {
      const topIssueText = typeof top_issue === 'string' ? top_issue : (top_issue.title || top_issue.description || '');
      if (topIssueText) {
        phase1Items.push(topIssueText);
      }
    }

    // Add quick wins (concise references)
    if (quick_wins.length > 0) {
      quick_wins.slice(0, 4).forEach(win => {
        if (win && !phase1Items.includes(win)) {
          phase1Items.push(win);
        }
      });
    }

    if (phase1Items.length > 0) {
      html += '            <ul style="margin: 8px 0; padding-left: 20px; color: var(--text-secondary);">\n';
      phase1Items.slice(0, 5).forEach(item => {
        html += `              <li style="margin-bottom: 4px;">${escapeHtml(item)}</li>\n`;
      });
      html += '            </ul>\n';
    } else {
      html += '            <p style="color: var(--text-secondary); margin: 8px 0;">Implement immediate fixes and low-hanging fruit improvements</p>\n';
    }

    html += '          </div>\n';
    html += '        </div>\n';
  }

  // Month 2 (60 Days)
  if (strategicRoadmap && strategicRoadmap.month2) {
    // Use AI-generated month 2 roadmap
    html += '        <div class="roadmap-phase">\n';
    html += '          <div class="phase-marker">60</div>\n';
    html += '          <div class="phase-content">\n';
    html += `            <h3 class="phase-title">Days 31-60: ${escapeHtml(strategicRoadmap.month2.focus || 'High-Impact Improvements')}</h3>\n`;

    if (strategicRoadmap.month2.items && strategicRoadmap.month2.items.length > 0) {
      html += '            <ul style="margin: 8px 0; padding-left: 20px; color: var(--text-secondary);">\n';
      strategicRoadmap.month2.items.forEach(item => {
        html += `              <li style="margin-bottom: 4px;">${escapeHtml(item)}</li>\n`;
      });
      html += '            </ul>\n';
    }

    if (strategicRoadmap.month2.expectedImpact) {
      html += `            <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border-light); font-size: 13px; color: var(--success);">\n`;
      html += `              <strong>Expected Impact:</strong> ${escapeHtml(strategicRoadmap.month2.expectedImpact)}\n`;
      html += '            </div>\n';
    }

    html += '          </div>\n';
    html += '        </div>\n';
  } else {
    // Fallback to heuristic-based month 2
    const consolidatedIssues = synthesisData?.consolidatedIssues || [];

    html += '        <div class="roadmap-phase">\n';
    html += '          <div class="phase-marker">60</div>\n';
    html += '          <div class="phase-content">\n';
    html += '            <h3 class="phase-title">Days 31-60: High-Impact Improvements</h3>\n';

    // Reference consolidated issues by title only (no descriptions)
    const phase2Items = [];

    if (consolidatedIssues.length > 0) {
      // Get issues marked as high priority
      consolidatedIssues
        .filter(i => i.severity === 'high' || i.priority === 'high')
        .slice(0, 3)
        .forEach(issue => {
          phase2Items.push(issue.title);
        });
    }

    // Fallback to design/content issues if no consolidated issues
    if (phase2Items.length === 0) {
      if (design_issues.length > 0) {
        design_issues.slice(0, 2).forEach(issue => {
          const text = typeof issue === 'string' ? issue : (issue.title || issue.description || '');
          if (text && !phase2Items.includes(text)) {
            phase2Items.push(text);
          }
        });
      }
    }

    // Add a few SEO issues if phase2 needs more items
    if (phase2Items.length < 3 && seo_issues.length > 0) {
      seo_issues.slice(0, 2).forEach(issue => {
        const text = typeof issue === 'string' ? issue : (issue.title || issue.description || '');
        if (text && !phase2Items.includes(text)) {
          phase2Items.push(text);
        }
      });
    }

    if (phase2Items.length > 0) {
      html += '            <ul style="margin: 8px 0; padding-left: 20px; color: var(--text-secondary);">\n';
      phase2Items.slice(0, 4).forEach(item => {
        html += `              <li style="margin-bottom: 4px;">${escapeHtml(item)}</li>\n`;
      });
      html += '            </ul>\n';
    } else {
      html += '            <p style="color: var(--text-secondary); margin: 8px 0;">Enhance user experience and SEO foundations</p>\n';
    }

    html += '          </div>\n';
    html += '        </div>\n';
  }

  // Month 3 (90 Days)
  if (strategicRoadmap && strategicRoadmap.month3) {
    // Use AI-generated month 3 roadmap
    html += '        <div class="roadmap-phase">\n';
    html += '          <div class="phase-marker">90</div>\n';
    html += '          <div class="phase-content">\n';
    html += `            <h3 class="phase-title">Days 61-90: ${escapeHtml(strategicRoadmap.month3.focus || 'Strategic Enhancements')}</h3>\n`;

    if (strategicRoadmap.month3.items && strategicRoadmap.month3.items.length > 0) {
      html += '            <ul style="margin: 8px 0; padding-left: 20px; color: var(--text-secondary);">\n';
      strategicRoadmap.month3.items.forEach(item => {
        html += `              <li style="margin-bottom: 4px;">${escapeHtml(item)}</li>\n`;
      });
      html += '            </ul>\n';
    }

    if (strategicRoadmap.month3.expectedImpact) {
      html += `            <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border-light); font-size: 13px; color: var(--success);">\n`;
      html += `              <strong>Expected Impact:</strong> ${escapeHtml(strategicRoadmap.month3.expectedImpact)}\n`;
      html += '            </div>\n';
    }

    html += '          </div>\n';
    html += '        </div>\n';
  } else {
    // Fallback to heuristic-based month 3
    html += '        <div class="roadmap-phase">\n';
    html += '          <div class="phase-marker">90</div>\n';
    html += '          <div class="phase-content">\n';
    html += '            <h3 class="phase-title">Days 61-90: Strategic Enhancements</h3>\n';

    // Industry-specific strategic recommendations (not repeating issues)
    const phase3Items = [];

    // Add industry-specific growth initiatives based on business type
    if (industry) {
      const industryLower = industry.toLowerCase();
      if (industryLower.includes('hvac') || industryLower.includes('plumb') || industryLower.includes('electric')) {
        phase3Items.push('Build service area pages for local SEO');
        phase3Items.push('Add customer review integration');
        phase3Items.push('Create seasonal service campaigns');
      } else if (industryLower.includes('dental') || industryLower.includes('medical') || industryLower.includes('health')) {
        phase3Items.push('Implement online appointment booking');
        phase3Items.push('Add patient portal integration');
        phase3Items.push('Create procedure-specific landing pages');
      } else if (industryLower.includes('restaurant') || industryLower.includes('food')) {
        phase3Items.push('Integrate online ordering system');
        phase3Items.push('Set up reservation system');
        phase3Items.push('Add menu with pricing and photos');
      } else if (industryLower.includes('retail') || industryLower.includes('ecommerce') || industryLower.includes('shop')) {
        phase3Items.push('Enhance product pages with rich media');
        phase3Items.push('Implement abandoned cart recovery');
        phase3Items.push('Add product recommendations');
      } else if (industryLower.includes('legal') || industryLower.includes('law')) {
        phase3Items.push('Add case studies and testimonials');
        phase3Items.push('Implement live chat for consultations');
        phase3Items.push('Create practice area landing pages');
      } else {
        phase3Items.push('Implement conversion tracking & analytics');
        phase3Items.push('Develop content marketing strategy');
        phase3Items.push('Set up A/B testing framework');
      }
    }

    if (phase3Items.length === 0) {
      phase3Items.push('Implement advanced SEO strategies');
      phase3Items.push('Enhance user engagement features');
      phase3Items.push('Build social proof elements');
    }

    html += '            <ul style="margin: 8px 0; padding-left: 20px; color: var(--text-secondary);">\n';
    phase3Items.slice(0, 5).forEach(item => {
      html += `              <li style="margin-bottom: 4px;">${escapeHtml(item)}</li>\n`;
    });
    html += '            </ul>\n';

    html += '          </div>\n';
    html += '        </div>\n';
  }

  html += '      </div>\n';
  html += '    </section>\n\n';
  return html;
}
