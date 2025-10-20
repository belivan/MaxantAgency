-- Add state column to leads table
-- This migration adds the missing 'state' column to store US state abbreviations (NY, CA, etc.)

ALTER TABLE leads
ADD COLUMN IF NOT EXISTS state TEXT;

COMMENT ON COLUMN leads.state IS 'Business state (NY, CA, etc.)';
