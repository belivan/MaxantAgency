-- Migration: Remove Email-Related Fields from Database
-- Run this in Supabase SQL Editor after refactoring to data-collection-only mode
--
-- WHAT THIS DOES:
-- - Removes email generation fields (email_subject, email_body, critique_reasoning)
-- - Renames lead_grade column to website_grade (if it exists)
-- - Drops QA review columns
-- - Keeps all data collection fields intact
--
-- IMPORTANT: This migration is SAFE to run - it only removes email-related columns
-- Your contact data, analysis results, and all other data will be preserved.

-- ============================================================================
-- STEP 1: Rename lead_grade to website_grade (if column exists)
-- ============================================================================

-- Check if lead_grade exists, if so, rename it to website_grade
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'leads'
    AND column_name = 'lead_grade'
  ) THEN
    -- Only rename if website_grade doesn't already exist
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_name = 'leads'
      AND column_name = 'website_grade'
    ) THEN
      ALTER TABLE leads RENAME COLUMN lead_grade TO website_grade;
      RAISE NOTICE 'Renamed lead_grade to website_grade';
    ELSE
      -- If both exist, drop lead_grade and keep website_grade
      ALTER TABLE leads DROP COLUMN lead_grade;
      RAISE NOTICE 'Dropped lead_grade column (website_grade already exists)';
    END IF;
  ELSE
    RAISE NOTICE 'lead_grade column not found - skipping rename';
  END IF;
END$$;

-- ============================================================================
-- STEP 2: Drop email-related columns
-- ============================================================================

-- Drop email subject and body columns
ALTER TABLE leads
  DROP COLUMN IF EXISTS email_subject,
  DROP COLUMN IF EXISTS email_body;

-- Drop critique reasoning column
ALTER TABLE leads
  DROP COLUMN IF EXISTS critique_reasoning;

-- Drop QA review columns (if they exist)
ALTER TABLE leads
  DROP COLUMN IF EXISTS qa_review,
  DROP COLUMN IF EXISTS qa_issues,
  DROP COLUMN IF EXISTS qa_warnings,
  DROP COLUMN IF EXISTS qa_suggestions;

-- ============================================================================
-- STEP 3: Update indexes to use website_grade instead of lead_grade
-- ============================================================================

-- Drop old lead_grade indexes if they exist
DROP INDEX IF EXISTS idx_leads_lead_grade;
DROP INDEX IF EXISTS idx_leads_lead_grade_outreach;

-- Create new website_grade indexes
CREATE INDEX IF NOT EXISTS idx_leads_website_grade ON leads(website_grade);
CREATE INDEX IF NOT EXISTS idx_leads_website_grade_outreach
  ON leads(website_grade, outreach_status)
  WHERE contact_email IS NOT NULL;

-- ============================================================================
-- STEP 4: Add comments for documentation
-- ============================================================================

COMMENT ON COLUMN leads.website_grade IS 'Website quality grade (A-F) based on data completeness (formerly lead_grade for email quality)';
COMMENT ON COLUMN leads.website_score IS 'Website quality score 0-100 based on extracted data completeness';

-- ============================================================================
-- VERIFICATION: Check what was changed
-- ============================================================================

-- Show current schema (data collection fields only)
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'leads'
  AND column_name IN (
    'website_grade', 'website_score', 'contact_email', 'contact_phone',
    'social_profiles', 'services', 'tech_stack', 'critiques_basic',
    'analysis_cost', 'analysis_time', 'project_id', 'campaign_id'
  )
ORDER BY column_name;

-- ============================================================================
-- SUCCESS!
-- ============================================================================
--
-- ✅ Email fields removed successfully
-- ✅ lead_grade renamed to website_grade
-- ✅ Indexes updated
-- ✅ All data collection fields preserved
--
-- Your database is now optimized for data collection only.
-- Email generation will be handled by a separate app.
-- ============================================================================
