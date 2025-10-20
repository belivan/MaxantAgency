-- Migration: Add Configuration Columns to Projects Table
-- Date: 2025-10-20
-- Description: Adds icp_brief, analysis_config, and outreach_config columns for Phase 0 implementation

-- Add all three configuration columns
ALTER TABLE projects ADD COLUMN IF NOT EXISTS icp_brief jsonb;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS analysis_config jsonb;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS outreach_config jsonb;
