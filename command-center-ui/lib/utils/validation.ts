/**
 * Validation Schemas
 * Zod schemas for form validation
 */

import { z } from 'zod';

// ============================================================================
// ICP BRIEF SCHEMA
// ============================================================================

export const icpBriefSchema = z.object({
  business_type: z.string().min(1, 'Business type is required'),
  industry: z.string().min(1, 'Industry is required'),
  target_description: z.string().min(10, 'Description must be at least 10 characters'),
  size_range: z.object({
    min_employees: z.number().optional(),
    max_employees: z.number().optional(),
    min_revenue: z.number().optional(),
    max_revenue: z.number().optional()
  }).optional(),
  location: z.object({
    city: z.string().optional(),
    state: z.string().optional(),
    country: z.string().optional(),
    radius_miles: z.number().optional()
  }).optional(),
  exclusions: z.array(z.string()).optional(),
  additional_criteria: z.record(z.any()).optional()
});

export type ICPBrief = z.infer<typeof icpBriefSchema>;

// ============================================================================
// PROJECT SCHEMAS
// ============================================================================

export const createProjectSchema = z.object({
  name: z.string()
    .min(3, 'Project name must be at least 3 characters')
    .max(100, 'Project name must be less than 100 characters'),
  description: z.string()
    .max(500, 'Description must be less than 500 characters')
    .optional(),
  icp_brief: icpBriefSchema.optional(),
  budget_limit: z.number()
    .positive('Budget must be positive')
    .optional(),
  budget_alert_threshold: z.number()
    .min(0)
    .max(100, 'Threshold must be between 0-100%')
    .optional()
});

export type CreateProjectFormData = z.infer<typeof createProjectSchema>;

export const updateProjectSchema = createProjectSchema.partial();

// ============================================================================
// PROSPECTING SCHEMAS
// ============================================================================

export const prospectGenerationSchema = z.object({
  count: z.number()
    .int('Count must be an integer')
    .min(1, 'Minimum count is 1')
    .max(50, 'Maximum count is 50'),
  model: z.enum(['grok-4-fast', 'gpt-4o', 'gpt-5', 'claude-sonnet-4-5', 'claude-haiku-4-5']),
  visionModel: z.enum(['gpt-4o', 'claude-sonnet-4-5', 'claude-haiku-4-5']),
  verify: z.boolean().default(true),
  project_id: z.string().uuid().optional()
});

export type ProspectGenerationFormData = z.infer<typeof prospectGenerationSchema>;

// ============================================================================
// ANALYSIS SCHEMAS
// ============================================================================

export const analysisOptionsSchema = z.object({
  tier: z.enum(['tier1', 'tier2', 'tier3']), // Deprecated but kept for backward compatibility
  modules: z.array(
    z.enum(['design', 'seo', 'content', 'performance', 'accessibility', 'social'])
  ).min(1, 'Select at least one module'),
  capture_screenshots: z.boolean().default(true),

  // Multi-page crawling configuration (NEW v2.0)
  max_pages: z.number()
    .int('Max pages must be an integer')
    .min(5, 'Minimum 5 pages')
    .max(50, 'Maximum 50 pages')
    .default(30),
  level_2_sample_rate: z.number()
    .min(0.25, 'Minimum 25% sample rate')
    .max(1.0, 'Maximum 100% sample rate')
    .default(0.5),
  max_crawl_time: z.number()
    .int('Max crawl time must be an integer')
    .min(30, 'Minimum 30 seconds')
    .max(300, 'Maximum 300 seconds')
    .default(120),

  // AI model selections per module (NEW v2.0)
  model_selections: z.record(z.string()).optional(),

  autoEmail: z.boolean().default(false),
  autoAnalyze: z.boolean().default(false)
});

export type AnalysisOptionsFormData = z.infer<typeof analysisOptionsSchema>;

// ============================================================================
// EMAIL COMPOSITION SCHEMAS
// ============================================================================

export const emailCompositionSchema = z.object({
  strategy: z.enum([
    'compliment-sandwich',
    'problem-first',
    'achievement-focused',
    'question-based',
    'value-first',
    'storytelling'
  ]).optional(),
  model: z.enum(['haiku', 'sonnet', 'gpt-4o-mini']).default('haiku'),
  generate_variants: z.boolean().default(true),
  num_subject_variants: z.number().int().min(1).max(5).default(3),
  num_body_variants: z.number().int().min(1).max(5).default(2),
  tone: z.enum(['professional', 'casual', 'friendly', 'formal']).default('professional'),
  max_length: z.number().int().min(100).max(2000).default(500)
});

export type EmailCompositionFormData = z.infer<typeof emailCompositionSchema>;

// ============================================================================
// SOCIAL COMPOSITION SCHEMAS
// ============================================================================

export const socialCompositionSchema = z.object({
  platform: z.enum(['instagram', 'facebook', 'linkedin', 'twitter']),
  strategy: z.enum([
    'value-first',
    'compliment-question',
    'common-ground',
    'quick-win',
    'storytelling'
  ]).optional(),
  model: z.enum(['haiku', 'sonnet', 'gpt-4o-mini']).default('haiku'),
  generate_variants: z.boolean().default(true),
  num_variants: z.number().int().min(1).max(5).default(3),
  tone: z.enum(['professional', 'casual', 'friendly']).default('friendly'),
  max_length: z.number().int().optional()
});

export type SocialCompositionFormData = z.infer<typeof socialCompositionSchema>;

// ============================================================================
// SEND EMAIL SCHEMAS
// ============================================================================

export const sendEmailSchema = z.object({
  email_id: z.string().uuid('Invalid email ID'),
  provider: z.enum(['gmail', 'custom-smtp']).default('gmail'),
  delay_ms: z.number().int().min(0).max(60000).default(0),
  actually_send: z.boolean().default(false)
});

export const batchSendSchema = z.object({
  email_ids: z.array(z.string().uuid()).min(1, 'Select at least one email'),
  provider: z.enum(['gmail', 'custom-smtp']).default('gmail'),
  delay_between_emails_ms: z.number().int().min(1000).max(60000).default(5000),
  actually_send: z.boolean().default(false)
});

export type BatchSendFormData = z.infer<typeof batchSendSchema>;

// ============================================================================
// FILTER SCHEMAS
// ============================================================================

export const leadFiltersSchema = z.object({
  grade: z.array(z.enum(['A', 'B', 'C', 'D', 'F'])).optional(),
  min_score: z.number().min(0).max(100).optional(),
  max_score: z.number().min(0).max(100).optional(),
  has_email: z.boolean().optional(),
  has_phone: z.boolean().optional(),
  industry: z.union([z.string(), z.array(z.string())]).optional(),
  location: z.string().optional(),
  project_id: z.string().uuid().optional(),
  analysis_tier: z.union([
    z.enum(['tier1', 'tier2', 'tier3']),
    z.array(z.enum(['tier1', 'tier2', 'tier3']))
  ]).optional(),
  sort_by: z.enum(['grade', 'score', 'date', 'company_name']).default('score'),
  sort_order: z.enum(['asc', 'desc']).default('desc')
});

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validate email address
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate URL
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate JSON string
 */
export function isValidJSON(str: string): boolean {
  try {
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
}

/**
 * Parse and validate JSON with error message
 */
export function parseJSON<T = any>(str: string): { success: true; data: T } | { success: false; error: string } {
  try {
    const data = JSON.parse(str);
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message || 'Invalid JSON' };
  }
}
