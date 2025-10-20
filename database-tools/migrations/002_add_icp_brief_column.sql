-- Migration: Add icp_brief column to Projects Table
-- Date: 2025-10-20
-- Description: Adds the missing icp_brief column (missed in previous migration)

ALTER TABLE projects ADD COLUMN IF NOT EXISTS icp_brief jsonb;
