-- Migration: Add address column to prospects table
-- Run this in Supabase SQL Editor

-- Add address column if it doesn't exist
ALTER TABLE prospects
ADD COLUMN IF NOT EXISTS address TEXT;

-- Add column comment
COMMENT ON COLUMN prospects.address IS 'Full street address';

-- Verify the column was added
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'prospects' AND column_name = 'address';
