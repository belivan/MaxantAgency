-- Migration: Add accessibility_compliance column to leads table
-- Date: 2025-10-21
-- Description: Adds WCAG compliance details field for accessibility analyzer results

BEGIN;

-- Add accessibility_compliance column
ALTER TABLE leads
ADD COLUMN IF NOT EXISTS accessibility_compliance JSONB DEFAULT '{}';

-- Add comment for documentation
COMMENT ON COLUMN leads.accessibility_compliance IS 'WCAG 2.1 compliance details from accessibility analyzer (violations by level, compliance percentage, etc.)';

COMMIT;

-- Verify the column was added
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'leads' AND column_name = 'accessibility_compliance';