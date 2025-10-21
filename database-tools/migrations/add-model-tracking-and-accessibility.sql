-- Migration: Add Model Tracking and Accessibility Fields to Leads Table
-- Date: 2025-10-21
-- Description: Adds model tracking fields for all 6 analyzers + accessibility score/issues

-- Add accessibility score
ALTER TABLE leads
ADD COLUMN IF NOT EXISTS accessibility_score INTEGER;

-- Add model tracking fields
ALTER TABLE leads
ADD COLUMN IF NOT EXISTS seo_analysis_model TEXT;

ALTER TABLE leads
ADD COLUMN IF NOT EXISTS content_analysis_model TEXT;

ALTER TABLE leads
ADD COLUMN IF NOT EXISTS desktop_visual_model TEXT;

ALTER TABLE leads
ADD COLUMN IF NOT EXISTS mobile_visual_model TEXT;

ALTER TABLE leads
ADD COLUMN IF NOT EXISTS social_analysis_model TEXT;

ALTER TABLE leads
ADD COLUMN IF NOT EXISTS accessibility_analysis_model TEXT;

-- Add accessibility issues
ALTER TABLE leads
ADD COLUMN IF NOT EXISTS accessibility_issues JSONB DEFAULT '[]'::jsonb;

-- Add check constraint for accessibility score
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_accessibility_score_range'
  ) THEN
    ALTER TABLE leads
    ADD CONSTRAINT chk_accessibility_score_range
    CHECK (accessibility_score IS NULL OR (accessibility_score >= 0 AND accessibility_score <= 100));
  END IF;
END $$;

-- Add comments for documentation
COMMENT ON COLUMN leads.accessibility_score IS 'Accessibility/WCAG compliance score 0-100';
COMMENT ON COLUMN leads.seo_analysis_model IS 'AI model used for SEO analysis (e.g., grok-4-fast)';
COMMENT ON COLUMN leads.content_analysis_model IS 'AI model used for content analysis (e.g., grok-4-fast)';
COMMENT ON COLUMN leads.desktop_visual_model IS 'AI model used for desktop visual analysis (e.g., gpt-4o)';
COMMENT ON COLUMN leads.mobile_visual_model IS 'AI model used for mobile visual analysis (e.g., gpt-4o)';
COMMENT ON COLUMN leads.social_analysis_model IS 'AI model used for social media analysis (e.g., grok-4-fast)';
COMMENT ON COLUMN leads.accessibility_analysis_model IS 'AI model used for accessibility analysis (e.g., grok-4-fast)';
COMMENT ON COLUMN leads.accessibility_issues IS 'Array of WCAG accessibility violations found';

-- Verify migration
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'leads'
  AND column_name IN (
    'accessibility_score',
    'seo_analysis_model',
    'content_analysis_model',
    'desktop_visual_model',
    'mobile_visual_model',
    'social_analysis_model',
    'accessibility_analysis_model',
    'accessibility_issues'
  )
ORDER BY column_name;