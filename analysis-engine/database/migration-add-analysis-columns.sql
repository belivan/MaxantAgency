-- Migration: Add Analysis Engine columns to existing leads table
-- This adds structured data columns while preserving website-audit-tool compatibility
-- Run this in Supabase SQL Editor

-- Individual category scores (for filtering and sorting)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS design_score INTEGER;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS seo_score INTEGER;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS content_score INTEGER;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS social_score INTEGER;

-- Structured issues (JSONB arrays with category, priority, impact, etc.)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS design_issues JSONB DEFAULT '[]'::jsonb;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS seo_issues JSONB DEFAULT '[]'::jsonb;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS content_issues JSONB DEFAULT '[]'::jsonb;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS social_issues JSONB DEFAULT '[]'::jsonb;

-- Quick wins for outreach (actionable fixes)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS quick_wins JSONB DEFAULT '[]'::jsonb;

-- Top issue for email subject lines
ALTER TABLE leads ADD COLUMN IF NOT EXISTS top_issue JSONB;

-- Outreach text fields
ALTER TABLE leads ADD COLUMN IF NOT EXISTS one_liner TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS call_to_action TEXT;

-- Critique sections (detailed breakdown by category)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS critique_sections JSONB;

-- Social metadata
ALTER TABLE leads ADD COLUMN IF NOT EXISTS social_metadata JSONB;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS social_platforms_present TEXT[];

-- Website metadata
ALTER TABLE leads ADD COLUMN IF NOT EXISTS page_title TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS meta_description TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS is_mobile_friendly BOOLEAN;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS has_https BOOLEAN;

-- Prospect reference (link to prospects table)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS prospect_id UUID;

-- Add foreign key if prospects table exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'prospects') THEN
    ALTER TABLE leads
    ADD CONSTRAINT fk_prospect
    FOREIGN KEY (prospect_id)
    REFERENCES prospects(id)
    ON DELETE SET NULL;
  END IF;
END $$;

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_leads_design_score ON leads(design_score);
CREATE INDEX IF NOT EXISTS idx_leads_seo_score ON leads(seo_score);
CREATE INDEX IF NOT EXISTS idx_leads_content_score ON leads(content_score);
CREATE INDEX IF NOT EXISTS idx_leads_social_score ON leads(social_score);
CREATE INDEX IF NOT EXISTS idx_leads_source_app ON leads(source_app);
CREATE INDEX IF NOT EXISTS idx_leads_prospect_id ON leads(prospect_id);

-- Add comment explaining the dual format
COMMENT ON TABLE leads IS 'Unified leads table supporting both website-audit-tool (critique arrays) and analysis-engine (structured issues) formats';

-- Show summary
SELECT
  'Migration complete!' as status,
  COUNT(*) as existing_leads,
  COUNT(CASE WHEN design_score IS NOT NULL THEN 1 END) as with_analysis_engine_data
FROM leads;
