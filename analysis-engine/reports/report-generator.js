/**
 * Report Generator - Generate comprehensive website audit reports in Markdown or HTML
 *
 * Usage:
 *   import { generateReport } from './reports/report-generator.js';
 *
 *   const report = await generateReport(analysisResult, {
 *     format: 'markdown', // or 'html'
 *     sections: ['all'] // or specific sections: ['executive', 'desktop', 'mobile']
 *   });
 */

import { generateExecutiveSummary } from './templates/sections/executive-summary.js';
import { generateDesktopAnalysis } from './templates/sections/desktop-analysis.js';
import { generateMobileAnalysis } from './templates/sections/mobile-analysis.js';
import { generateSEOSection } from './templates/sections/seo-section.js';
import { generateContentSection } from './templates/sections/content-section.js';
import { generateSocialSection } from './templates/sections/social-section.js';
import { generateAccessibilitySection } from './templates/sections/accessibility-section.js';
import { generateBusinessIntelSection } from './templates/sections/business-intel.js';
import { generateLeadPrioritySection } from './templates/sections/lead-priority.js';
import { generateOutreachStrategy } from './templates/sections/outreach-strategy.js';
import { generateAnalysisScope } from './templates/sections/analysis-scope.js';
import { generateActionPlan } from './templates/sections/action-plan.js';
import { generateAppendix } from './templates/sections/appendix.js';
import { generateHTMLReport } from './exporters/html-exporter.js';
import { generatePDF, generatePDFFromContent } from './exporters/pdf-generator.js';

/**
 * Generate a complete website audit report
 *
 * @param {object} analysisResult - Full analysis result from Analysis Engine
 * @param {object} options - Report generation options
 * @param {string} options.format - Report format ('markdown', 'html', or 'pdf')
 * @param {array} options.sections - Sections to include (['all'] or specific sections)
 * @param {object} options.theme - Theme options (reserved for future use)
 * @param {string} options.pdfOutputPath - Where to save PDF (only for format='pdf')
 * @returns {object} Report content and metadata
 */
export async function generateReport(analysisResult, options = {}) {
  const {
    format = 'markdown',
    sections = ['all'],
    theme = 'professional',
    pdfOutputPath = null,
    synthesisData = null  // NEW: AI synthesis results
  } = options;

  if (!['markdown', 'html', 'pdf'].includes(format)) {
    throw new Error(`Unsupported format: ${format}. Supported formats: 'markdown', 'html', 'pdf'`);
  }

  const startTime = Date.now();

  // For PDF format, generate HTML first then convert
  if (format === 'pdf') {
    console.log('Generating PDF report (HTML -> PDF conversion)...');
    
    const htmlContent = await generateHTMLReport(analysisResult, synthesisData);
    const outputPath = pdfOutputPath || `report-${Date.now()}.pdf`;
    
    const pdfResult = await generatePDFFromContent(htmlContent, outputPath);
    const generationTime = Date.now() - startTime;

    if (pdfResult.success) {
      return {
        content: null, // PDF is binary, stored in file
        format: 'pdf',
        path: pdfResult.path,
        metadata: {
          company_name: analysisResult.company_name,
          website_url: analysisResult.url,
          overall_score: analysisResult.overall_score,
          website_grade: analysisResult.grade,
          sections_included: 'all',
          generation_time_ms: generationTime,
          generation_method: pdfResult.method,
          message: pdfResult.message,
          generated_at: new Date().toISOString(),
          images_embedded: true // Base64 images in HTML are embedded in PDF
        }
      };
    } else {
      // Return HTML fallback with instructions
      return {
        content: htmlContent,
        format: 'html',
        path: null,
        metadata: {
          company_name: analysisResult.company_name,
          website_url: analysisResult.url,
          overall_score: analysisResult.overall_score,
          website_grade: analysisResult.grade,
          sections_included: 'all',
          generation_time_ms: generationTime,
          generation_method: pdfResult.method,
          message: pdfResult.message,
          instructions_path: pdfResult.instructions_path,
          generated_at: new Date().toISOString(),
          note: 'PDF generation failed. HTML report provided. See instructions for manual conversion.'
        }
      };
    }
  }

  // For HTML format, use dedicated HTML exporter
  if (format === 'html') {
    const htmlContent = await generateHTMLReport(analysisResult, synthesisData);
    const generationTime = Date.now() - startTime;

    return {
      content: htmlContent,
      format: 'html',
      metadata: {
        company_name: analysisResult.company_name,
        website_url: analysisResult.url,
        overall_score: analysisResult.overall_score,
        website_grade: analysisResult.grade,
        sections_included: 'all', // HTML always includes all sections
        generation_time_ms: generationTime,
        content_length: htmlContent.length,
        word_count: countWords(htmlContent.replace(/<[^>]*>/g, '')), // Strip HTML tags for word count
        generated_at: new Date().toISOString()
      }
    };
  }

  // Determine which sections to include
  const includeAll = sections.includes('all');
  const shouldInclude = (sectionName) => includeAll || sections.includes(sectionName);

  let reportContent = '';

  // Generate sections (pass synthesisData to all sections)
  if (shouldInclude('executive')) {
    reportContent += generateExecutiveSummary(analysisResult, synthesisData);
  }

  if (shouldInclude('desktop')) {
    reportContent += generateDesktopAnalysis(analysisResult, synthesisData);
  }

  if (shouldInclude('mobile')) {
    reportContent += generateMobileAnalysis(analysisResult, synthesisData);
  }

  if (shouldInclude('seo')) {
    reportContent += generateSEOSection(analysisResult);
  }

  if (shouldInclude('content')) {
    reportContent += generateContentSection(analysisResult);
  }

  if (shouldInclude('social')) {
    reportContent += generateSocialSection(analysisResult);
  }

  if (shouldInclude('accessibility')) {
    reportContent += generateAccessibilitySection(analysisResult);
  }

  if (shouldInclude('business-intel')) {
    reportContent += generateBusinessIntelSection(analysisResult);
  }

  if (shouldInclude('outreach-strategy')) {
    reportContent += generateOutreachStrategy(analysisResult);
  }

  if (shouldInclude('lead-priority')) {
    reportContent += generateLeadPrioritySection(analysisResult);
  }

  if (shouldInclude('analysis-scope')) {
    reportContent += generateAnalysisScope(analysisResult);
  }

  if (shouldInclude('action-plan')) {
    reportContent += generateActionPlan(analysisResult, synthesisData);
  }

  if (shouldInclude('appendix')) {
    reportContent += generateAppendix(analysisResult);
  }

  const generationTime = Date.now() - startTime;

  return {
    content: reportContent,
    format,
    metadata: {
      company_name: analysisResult.company_name,
      website_url: analysisResult.url,
      overall_score: analysisResult.overall_score,
      website_grade: analysisResult.grade,
      sections_included: includeAll ? 'all' : sections,
      generation_time_ms: generationTime,
      content_length: reportContent.length,
      word_count: countWords(reportContent),
      generated_at: new Date().toISOString()
    }
  };
}

/**
 * Generate report filename
 */
export function generateReportFilename(analysisResult, format = 'markdown') {
  const { company_name, url } = analysisResult;

  // Sanitize company name for filename
  const sanitized = (company_name || 'website-audit')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  const extMap = {
    'markdown': 'md',
    'html': 'html',
    'pdf': 'pdf',
    'json': 'json'
  };

  const ext = extMap[format] || format;

  return `${sanitized}-website-audit-${timestamp}.${ext}`;
}

/**
 * Generate storage path for Supabase Storage
 */
export function generateStoragePath(analysisResult, format = 'markdown') {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');

  const filename = generateReportFilename(analysisResult, format);

  return `reports/${year}/${month}/${filename}`;
}

/**
 * Count words in text
 */
function countWords(text) {
  return text.split(/\s+/).filter(word => word.length > 0).length;
}

/**
 * Get available sections
 */
export function getAvailableSections() {
  return [
    'executive',
    'desktop',
    'mobile',
    'seo',
    'content',
    'social',
    'accessibility',
    'business-intel',
    'outreach-strategy',
    'lead-priority',
    'analysis-scope',
    'action-plan',
    'appendix'
  ];
}

/**
 * Validate analysis result has required fields
 */
export function validateAnalysisResult(analysisResult) {
  const required = ['company_name', 'url', 'grade', 'overall_score'];

  const missing = required.filter(field => !analysisResult[field]);

  if (missing.length > 0) {
    throw new Error(`Missing required fields in analysis result: ${missing.join(', ')}`);
  }

  return true;
}

