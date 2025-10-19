-- Migration: Add multi-tenant support with project tracking columns
-- Run this in Supabase SQL Editor to add project/campaign tracking

-- Add project tracking columns
ALTER TABLE leads
ADD COLUMN IF NOT EXISTS project_id TEXT,
ADD COLUMN IF NOT EXISTS campaign_id TEXT,
ADD COLUMN IF NOT EXISTS client_name TEXT,
ADD COLUMN IF NOT EXISTS source_app TEXT;

-- Add comments for documentation
COMMENT ON COLUMN leads.project_id IS 'Project identifier from orchestrator app (e.g., "philly-coffee-2025")';
COMMENT ON COLUMN leads.campaign_id IS 'Campaign identifier (e.g., "week-1-outreach")';
COMMENT ON COLUMN leads.client_name IS 'Client or company name (e.g., "Maksant")';
COMMENT ON COLUMN leads.source_app IS 'Source application that created this lead (e.g., "client-orchestrator")';

-- Create indexes for fast filtering
CREATE INDEX IF NOT EXISTS idx_leads_project_id ON leads(project_id);
CREATE INDEX IF NOT EXISTS idx_leads_campaign_id ON leads(campaign_id);
CREATE INDEX IF NOT EXISTS idx_leads_client_name ON leads(client_name);
CREATE INDEX IF NOT EXISTS idx_leads_source_app ON leads(source_app);

-- Create composite index for common query patterns
CREATE INDEX IF NOT EXISTS idx_leads_project_campaign ON leads(project_id, campaign_id);
CREATE INDEX IF NOT EXISTS idx_leads_client_project ON leads(client_name, project_id);

-- Note: Existing rows will have NULL values for these new columns
-- This is expected and safe - they represent leads created before multi-tenant support

-- Example queries after migration:
--
-- Find all leads from a specific project:
-- SELECT * FROM leads WHERE project_id = 'philly-coffee-2025';
--
-- Find all leads for a specific client:
-- SELECT * FROM leads WHERE client_name = 'Maksant';
--
-- Find all leads from a campaign:
-- SELECT * FROM leads WHERE campaign_id = 'week-1-outreach';
--
-- Get project statistics:
-- SELECT
--   project_id,
--   campaign_id,
--   COUNT(*) as total_leads,
--   SUM(analysis_cost) as total_cost,
--   AVG(analysis_time) as avg_time_seconds
-- FROM leads
-- WHERE project_id IS NOT NULL
-- GROUP BY project_id, campaign_id
-- ORDER BY total_cost DESC;
