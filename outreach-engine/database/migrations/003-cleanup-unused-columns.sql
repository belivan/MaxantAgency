-- Migration: Clean up unused/redundant columns
-- Date: 2025-01-20
-- Description: Removes redundant and unused columns from composed_emails

BEGIN;

-- Drop redundant columns
DO $$
BEGIN
  -- Drop outreach_type (redundant with platform)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'composed_emails' AND column_name = 'outreach_type'
  ) THEN
    ALTER TABLE composed_emails DROP COLUMN outreach_type;
    RAISE NOTICE 'Dropped outreach_type column (redundant with platform)';
  END IF;

  -- Drop message_body (duplicate of email_body)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'composed_emails' AND column_name = 'message_body'
  ) THEN
    ALTER TABLE composed_emails DROP COLUMN message_body;
    RAISE NOTICE 'Dropped message_body column (use email_body for all content)';
  END IF;

  -- Drop business_reasoning (not used in current spec)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'composed_emails' AND column_name = 'business_reasoning'
  ) THEN
    ALTER TABLE composed_emails DROP COLUMN business_reasoning;
    RAISE NOTICE 'Dropped business_reasoning column';
  END IF;

  -- Drop composed_at (use created_at instead)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'composed_emails' AND column_name = 'composed_at'
  ) THEN
    ALTER TABLE composed_emails DROP COLUMN composed_at;
    RAISE NOTICE 'Dropped composed_at column (use created_at)';
  END IF;

  -- Drop verification columns (not currently used)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'composed_emails' AND column_name = 'verification_data'
  ) THEN
    ALTER TABLE composed_emails DROP COLUMN verification_data;
    RAISE NOTICE 'Dropped verification_data column';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'composed_emails' AND column_name = 'verified_at'
  ) THEN
    ALTER TABLE composed_emails DROP COLUMN verified_at;
    RAISE NOTICE 'Dropped verified_at column';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'composed_emails' AND column_name = 'website_verified'
  ) THEN
    ALTER TABLE composed_emails DROP COLUMN website_verified;
    RAISE NOTICE 'Dropped website_verified column';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'composed_emails' AND column_name = 'screenshot_urls'
  ) THEN
    ALTER TABLE composed_emails DROP COLUMN screenshot_urls;
    RAISE NOTICE 'Dropped screenshot_urls column';
  END IF;

  -- Drop reviewed_notes (use validation_issues instead)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'composed_emails' AND column_name = 'reviewed_notes'
  ) THEN
    ALTER TABLE composed_emails DROP COLUMN reviewed_notes;
    RAISE NOTICE 'Dropped reviewed_notes column';
  END IF;

END $$;

COMMIT;

-- Summary
DO $$
BEGIN
  RAISE NOTICE '✅ Cleanup completed!';
  RAISE NOTICE 'Removed redundant and unused columns.';
  RAISE NOTICE 'Table now matches the canonical schema.';
END $$;
