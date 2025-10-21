BEGIN;

-- Add ai_page_selection column to leads table
ALTER TABLE leads
ADD COLUMN IF NOT EXISTS ai_page_selection JSONB;

COMMENT ON COLUMN leads.ai_page_selection IS 'AI page selection decisions and reasoning (which pages for which modules)';

COMMIT;
