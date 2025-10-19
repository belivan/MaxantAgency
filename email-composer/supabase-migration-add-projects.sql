-- ============================================================================
-- MIGRATION: Add Project Tracking to composed_emails table
-- ============================================================================
-- This adds project_id, campaign_id, client_name, and source_app columns
-- to match the multi-tenant structure in the leads table
-- ============================================================================

-- Add project tracking columns
ALTER TABLE composed_emails
ADD COLUMN IF NOT EXISTS project_id TEXT,
ADD COLUMN IF NOT EXISTS campaign_id TEXT,
ADD COLUMN IF NOT EXISTS client_name TEXT,
ADD COLUMN IF NOT EXISTS source_app TEXT;

-- Add comments for documentation
COMMENT ON COLUMN composed_emails.project_id IS 'Project identifier from orchestrator app (e.g., "philly-coffee-2025")';
COMMENT ON COLUMN composed_emails.campaign_id IS 'Campaign identifier (e.g., "week-1-outreach")';
COMMENT ON COLUMN composed_emails.client_name IS 'Client or company name (e.g., "Maksant")';
COMMENT ON COLUMN composed_emails.source_app IS 'Source application that created this email (e.g., "email-composer", "command-center")';

-- Create indexes for fast filtering
CREATE INDEX IF NOT EXISTS idx_composed_emails_project_id ON composed_emails(project_id);
CREATE INDEX IF NOT EXISTS idx_composed_emails_campaign_id ON composed_emails(campaign_id);
CREATE INDEX IF NOT EXISTS idx_composed_emails_client_name ON composed_emails(client_name);
CREATE INDEX IF NOT EXISTS idx_composed_emails_source_app ON composed_emails(source_app);

-- Create composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_composed_emails_project_campaign ON composed_emails(project_id, campaign_id);
CREATE INDEX IF NOT EXISTS idx_composed_emails_project_status ON composed_emails(project_id, status);
CREATE INDEX IF NOT EXISTS idx_composed_emails_client_project ON composed_emails(client_name, project_id);

-- ============================================================================
-- USAGE INSTRUCTIONS
-- ============================================================================
--
-- 1. Go to Supabase Dashboard: https://supabase.com/dashboard
-- 2. Select your project
-- 3. Go to SQL Editor
-- 4. Paste this entire file
-- 5. Run the query
-- 6. Verify columns were added in Table Editor
--
-- ============================================================================

-- Example queries after migration:
--
-- Find all emails from a specific project:
-- SELECT * FROM composed_emails WHERE project_id = 'philly-coffee-2025';
--
-- Find all emails for a specific client:
-- SELECT * FROM composed_emails WHERE client_name = 'Maksant';
--
-- Find all emails from a campaign:
-- SELECT * FROM composed_emails WHERE campaign_id = 'week-1-outreach';
--
-- Get project statistics:
-- SELECT
--   project_id,
--   campaign_id,
--   COUNT(*) as total_emails,
--   COUNT(CASE WHEN status = 'sent' THEN 1 END) as sent_count,
--   COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
--   AVG(quality_score) as avg_quality_score,
--   COUNT(CASE WHEN replied THEN 1 END) as reply_count
-- FROM composed_emails
-- WHERE project_id IS NOT NULL
-- GROUP BY project_id, campaign_id
-- ORDER BY total_emails DESC;
--
-- Get campaign performance:
-- SELECT
--   campaign_id,
--   COUNT(*) as emails_sent,
--   COUNT(CASE WHEN opened THEN 1 END) as opened_count,
--   COUNT(CASE WHEN clicked THEN 1 END) as clicked_count,
--   COUNT(CASE WHEN replied THEN 1 END) as replied_count,
--   ROUND(100.0 * COUNT(CASE WHEN opened THEN 1 END) / COUNT(*), 2) as open_rate,
--   ROUND(100.0 * COUNT(CASE WHEN replied THEN 1 END) / COUNT(*), 2) as reply_rate
-- FROM composed_emails
-- WHERE status = 'sent' AND campaign_id IS NOT NULL
-- GROUP BY campaign_id
-- ORDER BY reply_rate DESC;
