import { type MockReport } from './mock-data'

/**
 * Database types matching the actual schema
 */
interface DatabaseReport {
  id: string
  company_name: string
  website_url: string
  website_grade: string
  overall_score: number
  synthesis_data?: any
  generated_at: string
  lead?: DatabaseLead | null
}

interface DatabaseLead {
  design_score?: number
  seo_score?: number
  content_score?: number
  social_score?: number
  top_issues?: any[]
  quick_wins?: any[]
  analysis_summary?: string
  top_issue?: string
}

/**
 * Normalize URL by removing protocol and trailing slash
 * @example "https://example.com/" → "example.com"
 */
function normalizeUrl(url: string): string {
  return url
    .replace(/^https?:\/\//, '')
    .replace(/\/$/, '')
}

/**
 * Extract string array from JSONB field with various schemas
 * Handles: [{issue: "text"}, ...], [{title: "text"}, ...], ["text", ...], or null
 */
function extractStringArray(jsonbArray: any[] | null | undefined, field: string = 'issue'): string[] {
  if (!jsonbArray || !Array.isArray(jsonbArray)) {
    return []
  }

  return jsonbArray
    .map((item) => {
      if (typeof item === 'string') {
        return item
      }
      if (typeof item === 'object' && item !== null) {
        // Try multiple possible field names
        return item[field] || item.title || item.description || item.text || JSON.stringify(item)
      }
      return String(item)
    })
    .filter(Boolean)
    .slice(0, 20) // Reasonable limit
}

/**
 * Generate a compelling top priority message from available data
 */
function generateTopPriority(report: DatabaseReport, lead: DatabaseLead | null | undefined): string {
  // Priority 1: Use synthesis data if available
  if (report.synthesis_data?.topPriority) {
    return report.synthesis_data.topPriority
  }

  // Priority 2: Use lead's top_issue with grade context
  if (lead?.top_issue) {
    const grade = report.website_grade
    const gradeContext = grade === 'F' || grade === 'D'
      ? 'Critical issue requiring immediate attention:'
      : grade === 'C'
      ? 'High-impact improvement opportunity:'
      : 'Key optimization opportunity:'

    return `${gradeContext} ${lead.top_issue}`
  }

  // Priority 3: Generic but actionable fallback
  const grade = report.website_grade
  if (grade === 'F' || grade === 'D') {
    return `Your website needs immediate attention to compete effectively and convert visitors into customers. Focus on the critical issues identified in the top 5 problems below.`
  } else if (grade === 'C') {
    return `Your website has solid potential but several areas need improvement to maximize conversions. Start with the high-impact issues identified below.`
  } else {
    return `Your website performs well overall. Focus on the optimization opportunities below to further increase your competitive advantage.`
  }
}

/**
 * Generate executive summary with fallback chain
 */
function generateExecutiveSummary(report: DatabaseReport, lead: DatabaseLead | null | undefined): string {
  // Priority 1: Use synthesis data (AI-generated business summary)
  if (report.synthesis_data?.executiveSummary) {
    return report.synthesis_data.executiveSummary
  }

  // Priority 2: Use lead's analysis summary
  if (lead?.analysis_summary) {
    return lead.analysis_summary
  }

  // Priority 3: Auto-generate basic summary
  const grade = report.website_grade
  const score = report.overall_score

  const gradeDescriptions: Record<string, string> = {
    A: 'excellent performance with only minor optimization opportunities',
    B: 'strong performance with room for improvement',
    C: 'functional foundation but several areas need attention to maximize conversions',
    D: 'significant issues that are hindering effectiveness and conversion potential',
    F: 'critical problems that require immediate attention'
  }

  const description = gradeDescriptions[grade] || 'been analyzed'

  return `${report.company_name} has ${description}. With an overall score of ${score}/100, the website shows both strengths and opportunities for improvement. Review the detailed analysis below to understand the specific issues and quick wins identified.`
}

/**
 * Transform database report + lead into MockReport format
 * This is the main transformation function used by the API
 */
export function transformDatabaseReport(report: DatabaseReport): MockReport {
  const lead = report.lead

  return {
    id: report.id,
    company_name: report.company_name,
    url: normalizeUrl(report.website_url),
    grade: (report.website_grade as 'A' | 'B' | 'C' | 'D' | 'F') || 'C',
    overall_score: Math.round(report.overall_score || 0),
    design_score: Math.round(lead?.design_score || 0),
    seo_score: Math.round(lead?.seo_score || 0),
    content_score: Math.round(lead?.content_score || 0),
    social_score: Math.round(lead?.social_score || 0),
    executive_summary: generateExecutiveSummary(report, lead),
    top_priority: generateTopPriority(report, lead),
    top_issues: extractStringArray(lead?.top_issues, 'issue').slice(0, 5),
    quick_wins: extractStringArray(lead?.quick_wins, 'title'),
    analyzed_at: report.generated_at
  }
}

/**
 * Type guard to check if database report has required fields
 */
export function isValidDatabaseReport(report: any): report is DatabaseReport {
  return (
    typeof report === 'object' &&
    report !== null &&
    typeof report.id === 'string' &&
    typeof report.company_name === 'string' &&
    typeof report.website_url === 'string' &&
    typeof report.website_grade === 'string' &&
    typeof report.overall_score === 'number'
  )
}
