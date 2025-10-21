-- Migration: Add Model Selection Tracking to Projects Table
-- Purpose: Track which AI models and prompts were used for prospecting and analysis
-- Date: 2025-10-21

-- Add model selection columns to projects table
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS prospecting_model_selections JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS analysis_model_selections JSONB DEFAULT NULL;

-- Add comments for documentation
COMMENT ON COLUMN projects.prospecting_model_selections IS 'AI model selections for prospecting modules (queryUnderstanding, websiteExtraction, relevanceCheck). Saved on first prospect generation to preserve historical accuracy.';

COMMENT ON COLUMN projects.analysis_model_selections IS 'AI model selections for analysis modules (design, SEO, content, social). Saved on first analysis to preserve historical accuracy.';

-- Verify columns exist
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'projects'
  AND column_name IN ('prospecting_model_selections', 'prospecting_prompts', 'analysis_model_selections', 'analysis_prompts')
ORDER BY column_name;

-- Example: Query projects with model selections
-- SELECT
--   id,
--   name,
--   prospecting_model_selections,
--   prospecting_prompts
-- FROM projects
-- WHERE prospecting_model_selections IS NOT NULL;
