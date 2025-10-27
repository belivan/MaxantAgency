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