-- Migration: Add analysis_prompts column to projects table
-- Date: 2025-10-20
-- Description: Adds JSONB column to store custom AI prompts for analysis

-- Add the column
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS analysis_prompts JSONB;

-- Add a comment explaining the column
COMMENT ON COLUMN projects.analysis_prompts IS 'Custom AI prompts for analysis (design, SEO, content, social). Locked after first analysis to preserve historical accuracy.';

-- Verify the column was added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'projects'
AND column_name = 'analysis_prompts';