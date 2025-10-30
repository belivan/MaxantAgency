/**
 * Sections Registry
 *
 * Central registry of all report sections with metadata for:
 * - Section ordering
 * - Required vs optional sections
 * - Placeholder behavior
 * - Data requirements
 * - Report type (preview vs full)
 */

import { generateHeroSection } from './sections/hero-section.js';
import { generateScoreBreakdownSection } from './sections/score-breakdown.js';
import { generateStrategicAssessment } from './sections/executive-summary.js';
import { generateBenchmarkComparisonChart } from './sections/benchmark-comparison.js';
import { generateSideBySideComparison } from './sections/screenshot-comparison.js';
import { generateActionPlan } from './sections/action-plan.js';
import { generateTimeline } from './sections/timeline.js';
import { generateBusinessIntelligenceSection } from './sections/business-intelligence.js';
import { generateDesignSystemSection } from './sections/design-system-section.js';
import { generateTechnicalDeepDive } from './sections/technical-deep-dive.js';
import { generateCompleteIssueBreakdown } from './sections/issue-breakdown.js';
import { generateAccessibilityComplianceSection } from './sections/accessibility.js';
import { generatePerformanceMetricsSection } from './sections/performance-metrics.js';
import { generateMultiPageScreenshotGallery } from './sections/screenshot-gallery.js';
import { generateLeadScoringDashboard } from './sections/lead-scoring.js';
import { generateAIWeights } from './sections/ai-weights.js';
import { generateAnalysisScope } from './sections/analysis-scope.js';
import { generateDesignTokensSection } from './sections/design-tokens.js';
import { generateFooter } from './sections/footer.js';

/**
 * Section Registry
 * Each section has:
 * - id: Unique identifier
 * - name: Display name
 * - component: Function that generates the section HTML
 * - order: Display order in report
 * - reportTypes: Array of report types this section appears in ['preview', 'full']
 * - required: Whether section must always be present
 * - showPlaceholder: Show empty state if data missing (vs hiding completely)
 * - requiredData: Array of field names that must exist for section to render
 * - description: What this section contains
 */
export const SECTIONS_REGISTRY = [
  {
    id: 'hero',
    name: 'Executive Dashboard',
    component: generateHeroSection,
    order: 1,
    reportTypes: ['preview', 'full'],
    required: true,
    showPlaceholder: false,
    requiredData: ['company_name', 'url', 'grade', 'overall_score'],
    description: 'Header with company info, grade badge, and score overview'
  },
  {
    id: 'lead-scoring',
    name: 'Lead Scoring Dashboard',
    component: generateLeadScoringDashboard,
    order: 2,
    reportTypes: ['full'],
    required: false,
    showPlaceholder: false,
    requiredData: [],
    description: 'BANT+ lead qualification scores and priority tier'
  },
  {
    id: 'strategic-assessment',
    name: 'Executive Summary',
    component: generateStrategicAssessment,
    order: 3,
    reportTypes: ['preview', 'full'],
    required: true,
    showPlaceholder: true,
    requiredData: [],
    description: 'AI-generated executive summary with key insights'
  },
  {
    id: 'analysis-scope',
    name: 'Analysis Scope & Methodology',
    component: generateAnalysisScope,
    order: 4,
    reportTypes: ['full'],
    required: false,
    showPlaceholder: false,
    requiredData: [],
    description: 'Intelligent page selection and analysis metadata'
  },
  {
    id: 'design-tokens',
    name: 'Design System Tokens',
    component: generateDesignTokensSection,
    order: 5,
    reportTypes: ['full'],
    required: false,
    showPlaceholder: false,
    requiredData: [],
    description: 'Extracted color palettes and typography from desktop and mobile viewports'
  },
  {
    id: 'benchmark-comparison-chart',
    name: 'Industry Benchmark Comparison',
    component: generateBenchmarkComparisonChart,
    order: 6,
    reportTypes: ['preview', 'full'],
    required: false,
    showPlaceholder: true,
    requiredData: ['matched_benchmark'],
    description: 'Comparison chart vs industry leader'
  },
  {
    id: 'benchmark-screenshots',
    name: 'Side-by-Side Screenshot Comparison',
    component: generateSideBySideComparison,
    order: 7,
    reportTypes: ['preview', 'full'],
    required: false,
    showPlaceholder: false,
    requiredData: ['matched_benchmark'],
    description: 'Desktop/mobile screenshots compared to benchmark'
  },
  {
    id: 'action-plan',
    name: 'Action Plan',
    component: generateActionPlan,
    order: 8,
    reportTypes: ['preview', 'full'],
    required: true,
    showPlaceholder: true,
    requiredData: [],
    description: 'Prioritized list of recommended improvements'
  },
  {
    id: 'timeline',
    name: '30/60/90 Day Roadmap',
    component: generateTimeline,
    order: 9,
    reportTypes: ['preview', 'full'],
    required: false,
    showPlaceholder: true,
    requiredData: [],
    description: 'Strategic implementation timeline'
  },
  {
    id: 'business-intelligence',
    name: 'Business Intelligence',
    component: generateBusinessIntelligenceSection,
    order: 10,
    reportTypes: ['full'],
    required: false,
    showPlaceholder: true,
    requiredData: ['business_intelligence'],
    description: 'Market analysis, competitor insights, and lead scoring'
  },
  {
    id: 'design-system',
    name: 'Design System Analysis',
    component: generateDesignSystemSection,
    order: 11,
    reportTypes: ['full'],
    required: false,
    showPlaceholder: false,
    requiredData: [],
    description: 'Design tokens, color palette, typography analysis'
  },
  {
    id: 'technical-deep-dive',
    name: 'Technical Deep Dive',
    component: generateTechnicalDeepDive,
    order: 12,
    reportTypes: ['full'],
    required: false,
    showPlaceholder: true,
    requiredData: [],
    description: 'Technical stack, performance metrics, SEO details'
  },
  {
    id: 'complete-issue-breakdown',
    name: 'Complete Issue Breakdown',
    component: generateCompleteIssueBreakdown,
    order: 13,
    reportTypes: ['full'],
    required: false,
    showPlaceholder: true,
    requiredData: [],
    description: 'All issues categorized by type with severity ratings'
  },
  {
    id: 'accessibility-compliance',
    name: 'Accessibility Compliance',
    component: generateAccessibilityComplianceSection,
    order: 14,
    reportTypes: ['full'],
    required: false,
    showPlaceholder: true,
    requiredData: [],
    description: 'WCAG compliance report and accessibility issues'
  },
  {
    id: 'performance-metrics',
    name: 'Performance Metrics',
    component: generatePerformanceMetricsSection,
    order: 15,
    reportTypes: ['full'],
    required: false,
    showPlaceholder: true,
    requiredData: ['performance_metrics_pagespeed'],
    description: 'PageSpeed Insights and Core Web Vitals data'
  },
  {
    id: 'score-breakdown',
    name: 'Grading Methodology',
    component: generateScoreBreakdownSection,
    order: 16,
    reportTypes: ['preview', 'full'],
    required: false,
    showPlaceholder: true,
    requiredData: [],
    description: 'Pie chart and bars showing how the grade was calculated'
  },
  {
    id: 'ai-weights',
    name: 'AI Category Weights',
    component: generateAIWeights,
    order: 17,
    reportTypes: ['full'],
    required: false,
    showPlaceholder: false,
    requiredData: [],
    description: 'AI-calculated category weights and reasoning'
  },
  {
    id: 'screenshot-gallery',
    name: 'Multi-Page Screenshot Gallery',
    component: generateMultiPageScreenshotGallery,
    order: 18,
    reportTypes: ['full'],
    required: false,
    showPlaceholder: false,
    requiredData: [],
    description: 'Screenshots from multiple pages across the site'
  },
  {
    id: 'footer',
    name: 'Footer',
    component: generateFooter,
    order: 99,
    reportTypes: ['preview', 'full'],
    required: true,
    showPlaceholder: false,
    requiredData: [],
    description: 'Report footer with metadata and branding'
  }
];

/**
 * Get sections for a specific report type
 * @param {string} reportType - 'preview' or 'full'
 * @returns {Array} Filtered and sorted sections
 */
export function getSectionsForReportType(reportType = 'full') {
  return SECTIONS_REGISTRY
    .filter(section => section.reportTypes.includes(reportType))
    .sort((a, b) => a.order - b.order);
}

/**
 * Get section by ID
 * @param {string} sectionId - Section identifier
 * @returns {Object|null} Section definition or null
 */
export function getSectionById(sectionId) {
  return SECTIONS_REGISTRY.find(section => section.id === sectionId) || null;
}

/**
 * Check if section should render based on data availability
 * @param {Object} section - Section definition
 * @param {Object} analysisResult - Analysis data
 * @returns {boolean} True if section should render
 */
export function shouldRenderSection(section, analysisResult) {
  // Required sections always render
  if (section.required) {
    return true;
  }

  // Check if required data fields exist and are non-empty
  if (section.requiredData && section.requiredData.length > 0) {
    const hasRequiredData = section.requiredData.every(field => {
      const value = analysisResult[field];
      if (value === null || value === undefined) return false;
      if (Array.isArray(value)) return value.length > 0;
      if (typeof value === 'object') return Object.keys(value).length > 0;
      return true;
    });

    return hasRequiredData;
  }

  // If no specific requirements, allow rendering
  return true;
}

/**
 * Get enabled sections from config
 * @param {Object} config - Report configuration
 * @param {string} reportType - 'preview' or 'full'
 * @returns {Array} Enabled sections
 */
export function getEnabledSections(config = {}, reportType = 'full') {
  const allSections = getSectionsForReportType(reportType);

  // If no config provided, return all sections
  if (!config.sections) {
    return allSections;
  }

  // Filter based on config
  return allSections.filter(section => {
    const sectionConfig = config.sections[section.id];

    // If not configured, default to enabled
    if (!sectionConfig) return true;

    // Check if explicitly disabled
    if (sectionConfig.enabled === false) return false;

    return true;
  });
}
