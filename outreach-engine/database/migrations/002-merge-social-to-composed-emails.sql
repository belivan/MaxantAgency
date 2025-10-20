-- Migration: Merge social_outreach into composed_emails
-- Date: 2025-01-20
-- Description: Adds social DM fields to composed_emails and drops the unused social_outreach table

BEGIN;

-- Step 1: Add social DM fields to composed_emails if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'composed_emails' AND column_name = 'platform'
  ) THEN
    ALTER TABLE composed_emails
    ADD COLUMN platform text DEFAULT 'email'
      CHECK (platform IN ('email', 'instagram', 'facebook', 'linkedin', 'twitter'));

    CREATE INDEX IF NOT EXISTS idx_composed_emails_platform ON composed_emails(platform);

    RAISE NOTICE 'Added platform column';
  ELSE
    RAISE NOTICE 'platform column already exists';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'composed_emails' AND column_name = 'character_count'
  ) THEN
    ALTER TABLE composed_emails
    ADD COLUMN character_count integer;
    RAISE NOTICE 'Added character_count column';
  ELSE
    RAISE NOTICE 'character_count column already exists';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'composed_emails' AND column_name = 'social_profile_url'
  ) THEN
    ALTER TABLE composed_emails
    ADD COLUMN social_profile_url text;
    RAISE NOTICE 'Added social_profile_url column';
  ELSE
    RAISE NOTICE 'social_profile_url column already exists';
  END IF;
END $$;

-- Step 2: Drop the unused social_outreach table if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'social_outreach'
  ) THEN
    DROP TABLE IF EXISTS social_outreach CASCADE;
    RAISE NOTICE 'Dropped social_outreach table';
  ELSE
    RAISE NOTICE 'social_outreach table does not exist';
  END IF;
END $$;

COMMIT;

-- Summary
DO $$
BEGIN
  RAISE NOTICE '✅ Migration completed successfully!';
  RAISE NOTICE 'composed_emails now handles both emails and social DMs.';
  RAISE NOTICE 'social_outreach table removed.';
END $$;
