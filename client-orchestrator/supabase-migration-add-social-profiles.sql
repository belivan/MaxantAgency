-- Migration: Add social_profiles JSONB column to prospects table
-- Purpose: Store Instagram, Facebook, LinkedIn company, and LinkedIn person URLs
-- Date: 2025-10-19

-- Add social_profiles column as JSONB
ALTER TABLE prospects
ADD COLUMN IF NOT EXISTS social_profiles JSONB;

-- Add comment to describe the structure
COMMENT ON COLUMN prospects.social_profiles IS 'Social media profiles: {instagram: string, facebook: string, linkedin_company: string, linkedin_person: string}';

-- Create GIN index on social_profiles for faster JSON queries
CREATE INDEX IF NOT EXISTS idx_prospects_social_profiles ON prospects USING GIN (social_profiles);

-- Example queries after migration:

-- Find prospects with Instagram profiles
-- SELECT * FROM prospects WHERE social_profiles->>'instagram' IS NOT NULL;

-- Find prospects with LinkedIn decision makers
-- SELECT * FROM prospects WHERE social_profiles->>'linkedin_person' IS NOT NULL;

-- Find prospects with complete social profiles (all 4 platforms)
-- SELECT * FROM prospects
-- WHERE social_profiles->>'instagram' IS NOT NULL
--   AND social_profiles->>'facebook' IS NOT NULL
--   AND social_profiles->>'linkedin_company' IS NOT NULL
--   AND social_profiles->>'linkedin_person' IS NOT NULL;
