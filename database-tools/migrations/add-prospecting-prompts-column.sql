-- ================================================================
-- Migration: Add prospecting_prompts column to projects table
-- Date: 2025-10-20
-- Description: Adds a JSONB column to store AI prompts used for
--              prospecting (query understanding, website extraction,
--              relevance check) for historical tracking
-- ================================================================

-- Add the prospecting_prompts column
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS prospecting_prompts JSONB;

-- Add a comment to document the column
COMMENT ON COLUMN projects.prospecting_prompts IS
  'AI prompts used for prospecting (query understanding, website extraction, relevance check). Saved on first prospect generation to preserve historical accuracy.';

-- ================================================================
-- Verification Query
-- ================================================================
-- Run this to verify the column was added successfully:
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'projects'
-- AND column_name = 'prospecting_prompts';
