/**
 * Report Generation Configuration
 * Controls automatic report generation behavior
 */

export const reportConfig = {
  // Enable/disable automatic report generation when saving leads
  autoGenerateReports: process.env.AUTO_GENERATE_REPORTS === 'true' || false,

  // Default format for auto-generated reports
  defaultFormat: process.env.REPORT_FORMAT || 'html',

  // Which sections to include by default
  defaultSections: ['all'],

  // Whether to save report metadata to database
  saveToDatabase: true,

  // Maximum file size for reports (10MB)
  maxFileSize: 10 * 1024 * 1024,

  // Storage bucket configuration
  storage: {
    bucketName: 'reports',
    publicAccess: false,
    expirationTime: 3600 // 1 hour for signed URLs
  },

  // Report generation options
  generation: {
    includeScreenshots: false, // Don't include screenshots by default
    includeBusinessIntel: true,
    includeLeadPriority: true,
    includeActionPlan: true
  },

  // Granular section control
  // Set enabled: false to disable a section completely
  // Set placeholder: false to hide section when data missing (vs showing empty state)
  sections: {
    hero: {
      enabled: true,
      placeholder: false // Never show placeholder - required section
    },
    'score-breakdown': {
      enabled: true,
      placeholder: true // Show even without AI grading (uses fallback weights)
    },
    'strategic-assessment': {
      enabled: true,
      placeholder: true // Show with fallback summary if AI synthesis disabled
    },
    'benchmark-comparison-chart': {
      enabled: true,
      placeholder: true // Show empty state if no benchmark matched
    },
    'benchmark-screenshots': {
      enabled: true,
      placeholder: false // Hide if no benchmark (vs showing empty state)
    },
    'action-plan': {
      enabled: true,
      placeholder: true // Always show recommendations
    },
    timeline: {
      enabled: true,
      placeholder: true // Always show 30/60/90 roadmap
    },
    'business-intelligence': {
      enabled: true,
      placeholder: true // Show empty state if not collected
    },
    'design-system': {
      enabled: true,
      placeholder: false // Hide if design tokens not extracted
    },
    'technical-deep-dive': {
      enabled: true,
      placeholder: true // Show with available tech data
    },
    'complete-issue-breakdown': {
      enabled: true,
      placeholder: true // Always show issues categorized
    },
    'accessibility-compliance': {
      enabled: true,
      placeholder: true // Show empty state if no a11y issues
    },
    'performance-metrics': {
      enabled: true,
      placeholder: true // Show empty state if PageSpeed not collected
    },
    'screenshot-gallery': {
      enabled: true,
      placeholder: false // Hide if multi-page screenshots not collected
    },
    footer: {
      enabled: true,
      placeholder: false // Always present
    }
  }
};

/**
 * Get report configuration
 */
export function getReportConfig() {
  return reportConfig;
}

/**
 * Update report configuration
 */
export function updateReportConfig(updates) {
  Object.assign(reportConfig, updates);
  return reportConfig;
}