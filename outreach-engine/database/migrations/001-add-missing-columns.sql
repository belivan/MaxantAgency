-- Migration: Add missing columns to composed_emails table
-- Date: 2025-01-20
-- Description: Adds metadata columns that were defined in schema but missing from actual table

BEGIN;

-- Add timestamp columns if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'composed_emails' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE composed_emails
    ADD COLUMN created_at timestamptz DEFAULT now();
    RAISE NOTICE 'Added created_at column';
  ELSE
    RAISE NOTICE 'created_at column already exists';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'composed_emails' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE composed_emails
    ADD COLUMN updated_at timestamptz DEFAULT now();
    RAISE NOTICE 'Added updated_at column';
  ELSE
    RAISE NOTICE 'updated_at column already exists';
  END IF;
END $$;

-- Add AI model column if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'composed_emails' AND column_name = 'ai_model'
  ) THEN
    ALTER TABLE composed_emails
    ADD COLUMN ai_model text;
    RAISE NOTICE 'Added ai_model column';
  END IF;
END $$;

-- Add generation cost and time columns if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'composed_emails' AND column_name = 'generation_cost'
  ) THEN
    ALTER TABLE composed_emails
    ADD COLUMN generation_cost decimal;
    RAISE NOTICE 'Added generation_cost column';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'composed_emails' AND column_name = 'generation_time_ms'
  ) THEN
    ALTER TABLE composed_emails
    ADD COLUMN generation_time_ms integer;
    RAISE NOTICE 'Added generation_time_ms column';
  END IF;
END $$;

-- Add usage token columns if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'composed_emails' AND column_name = 'usage_input_tokens'
  ) THEN
    ALTER TABLE composed_emails
    ADD COLUMN usage_input_tokens integer;
    RAISE NOTICE 'Added usage_input_tokens column';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'composed_emails' AND column_name = 'usage_output_tokens'
  ) THEN
    ALTER TABLE composed_emails
    ADD COLUMN usage_output_tokens integer;
    RAISE NOTICE 'Added usage_output_tokens column';
  END IF;
END $$;

-- Add quality score and validation columns if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'composed_emails' AND column_name = 'quality_score'
  ) THEN
    ALTER TABLE composed_emails
    ADD COLUMN quality_score integer;
    RAISE NOTICE 'Added quality_score column';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'composed_emails' AND column_name = 'validation_issues'
  ) THEN
    ALTER TABLE composed_emails
    ADD COLUMN validation_issues jsonb;
    RAISE NOTICE 'Added validation_issues column';
  END IF;
END $$;

-- Add variant columns if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'composed_emails' AND column_name = 'has_variants'
  ) THEN
    ALTER TABLE composed_emails
    ADD COLUMN has_variants boolean DEFAULT false;
    RAISE NOTICE 'Added has_variants column';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'composed_emails' AND column_name = 'subject_variants'
  ) THEN
    ALTER TABLE composed_emails
    ADD COLUMN subject_variants jsonb;
    RAISE NOTICE 'Added subject_variants column';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'composed_emails' AND column_name = 'body_variants'
  ) THEN
    ALTER TABLE composed_emails
    ADD COLUMN body_variants jsonb;
    RAISE NOTICE 'Added body_variants column';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'composed_emails' AND column_name = 'recommended_variant'
  ) THEN
    ALTER TABLE composed_emails
    ADD COLUMN recommended_variant jsonb;
    RAISE NOTICE 'Added recommended_variant column';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'composed_emails' AND column_name = 'variant_reasoning'
  ) THEN
    ALTER TABLE composed_emails
    ADD COLUMN variant_reasoning text;
    RAISE NOTICE 'Added variant_reasoning column';
  END IF;
END $$;

-- Add additional metadata columns if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'composed_emails' AND column_name = 'industry'
  ) THEN
    ALTER TABLE composed_emails
    ADD COLUMN industry text;
    RAISE NOTICE 'Added industry column';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'composed_emails' AND column_name = 'contact_name'
  ) THEN
    ALTER TABLE composed_emails
    ADD COLUMN contact_name text;
    RAISE NOTICE 'Added contact_name column';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'composed_emails' AND column_name = 'contact_title'
  ) THEN
    ALTER TABLE composed_emails
    ADD COLUMN contact_title text;
    RAISE NOTICE 'Added contact_title column';
  END IF;
END $$;

COMMIT;

-- Summary
DO $$
BEGIN
  RAISE NOTICE '✅ Migration completed successfully!';
  RAISE NOTICE 'All missing columns have been added to composed_emails table.';
END $$;
