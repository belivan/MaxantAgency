-- Migration: Add ALL missing columns to prospects table
-- Run this in Supabase SQL Editor

-- This adds all columns that may be missing from the original schema

-- Core business columns (nullable since they may be missing during discovery)
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS company_name TEXT;
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS industry TEXT;
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id);
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS website_status TEXT DEFAULT 'active';

-- Location columns
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS address TEXT;

-- Contact columns
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS contact_email TEXT;
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS contact_phone TEXT;
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS contact_name TEXT;

-- Business data columns
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS services JSONB;

-- Google data columns
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS google_place_id TEXT;
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS google_rating DECIMAL;
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS google_review_count INTEGER;

-- Social columns
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS social_profiles JSONB;
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS social_metadata JSONB;

-- ICP/relevance columns
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS icp_match_score INTEGER;
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS is_relevant BOOLEAN DEFAULT true;

-- Tracking columns
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS run_id TEXT;
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'prospecting-engine';
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS discovery_cost DECIMAL;
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS discovery_time_ms INTEGER;

-- Add column comments
COMMENT ON COLUMN prospects.company_name IS 'Name of the company (nullable - may be missing during initial discovery)';
COMMENT ON COLUMN prospects.industry IS 'Industry or business category (nullable - may be enriched later)';
COMMENT ON COLUMN prospects.project_id IS 'Foreign key to projects table (nullable - not all prospects belong to a project)';
COMMENT ON COLUMN prospects.website IS 'Company website URL';
COMMENT ON COLUMN prospects.website_status IS 'Website accessibility status';
COMMENT ON COLUMN prospects.city IS 'City location';
COMMENT ON COLUMN prospects.state IS 'State or province';
COMMENT ON COLUMN prospects.address IS 'Full street address';
COMMENT ON COLUMN prospects.contact_email IS 'Contact email address';
COMMENT ON COLUMN prospects.contact_phone IS 'Contact phone number';
COMMENT ON COLUMN prospects.contact_name IS 'Contact person name';
COMMENT ON COLUMN prospects.description IS 'Company description or bio';
COMMENT ON COLUMN prospects.services IS 'Array of services offered by the company';
COMMENT ON COLUMN prospects.google_place_id IS 'Google Maps Place ID (unique)';
COMMENT ON COLUMN prospects.google_rating IS 'Google Maps rating (1.0 - 5.0)';
COMMENT ON COLUMN prospects.google_review_count IS 'Number of Google reviews';
COMMENT ON COLUMN prospects.social_profiles IS 'Social media profile URLs (instagram, facebook, linkedin, twitter)';
COMMENT ON COLUMN prospects.social_metadata IS 'Scraped metadata from social profiles (followers, bio, etc.)';
COMMENT ON COLUMN prospects.icp_match_score IS 'Relevance score to ICP (0-100)';
COMMENT ON COLUMN prospects.is_relevant IS 'Whether prospect matches ICP criteria';
COMMENT ON COLUMN prospects.run_id IS 'Batch run identifier (UUID)';
COMMENT ON COLUMN prospects.source IS 'Data source identifier';
COMMENT ON COLUMN prospects.discovery_cost IS 'Total API costs for discovering this prospect (USD)';
COMMENT ON COLUMN prospects.discovery_time_ms IS 'Time taken to discover and enrich (milliseconds)';

-- Add unique constraint on google_place_id (if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'prospects_google_place_id_key'
    ) THEN
        ALTER TABLE prospects ADD CONSTRAINT prospects_google_place_id_key UNIQUE (google_place_id);
    END IF;
END $$;

-- Add check constraints (if they don't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'chk_google_rating_range'
    ) THEN
        ALTER TABLE prospects ADD CONSTRAINT chk_google_rating_range
        CHECK (google_rating >= 1.0 AND google_rating <= 5.0);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'chk_icp_match_score_range'
    ) THEN
        ALTER TABLE prospects ADD CONSTRAINT chk_icp_match_score_range
        CHECK (icp_match_score >= 0 AND icp_match_score <= 100);
    END IF;
END $$;

-- Add indexes for foreign keys and common queries
CREATE INDEX IF NOT EXISTS idx_prospects_project_id ON prospects(project_id);
CREATE INDEX IF NOT EXISTS idx_prospects_google_place_id ON prospects(google_place_id);
CREATE INDEX IF NOT EXISTS idx_prospects_run_id ON prospects(run_id);
CREATE INDEX IF NOT EXISTS idx_prospects_created_at ON prospects(created_at);
CREATE INDEX IF NOT EXISTS idx_prospects_is_relevant ON prospects(is_relevant);

-- Verify all columns were added
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'prospects'
ORDER BY ordinal_position;
