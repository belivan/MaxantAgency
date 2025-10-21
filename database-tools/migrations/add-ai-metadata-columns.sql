-- Add AI metadata columns to project_prospects table
-- These columns track how AI interpreted the ICP brief and discovered each prospect

ALTER TABLE project_prospects
ADD COLUMN IF NOT EXISTS discovery_query TEXT,
ADD COLUMN IF NOT EXISTS query_generation_model TEXT,
ADD COLUMN IF NOT EXISTS icp_brief_snapshot JSONB,
ADD COLUMN IF NOT EXISTS prompts_snapshot JSONB,
ADD COLUMN IF NOT EXISTS model_selections_snapshot JSONB,
ADD COLUMN IF NOT EXISTS relevance_reasoning TEXT,
ADD COLUMN IF NOT EXISTS discovery_cost_usd DECIMAL,
ADD COLUMN IF NOT EXISTS discovery_time_ms INTEGER;

-- Add constraints
ALTER TABLE project_prospects
ADD CONSTRAINT IF NOT EXISTS chk_discovery_cost_positive
  CHECK (discovery_cost_usd IS NULL OR discovery_cost_usd >= 0);

ALTER TABLE project_prospects
ADD CONSTRAINT IF NOT EXISTS chk_discovery_time_positive
  CHECK (discovery_time_ms IS NULL OR discovery_time_ms >= 0);

-- Add comments to document the columns
COMMENT ON COLUMN project_prospects.discovery_query IS 'AI-generated search query that discovered this prospect for this project';
COMMENT ON COLUMN project_prospects.query_generation_model IS 'AI model used for query understanding (e.g., grok-4-fast, gpt-4o)';
COMMENT ON COLUMN project_prospects.icp_brief_snapshot IS 'Snapshot of the project''s ICP brief when this prospect was discovered';
COMMENT ON COLUMN project_prospects.prompts_snapshot IS 'Snapshot of all prompts used during discovery (queryUnderstanding, websiteExtraction, relevanceCheck)';
COMMENT ON COLUMN project_prospects.model_selections_snapshot IS 'Snapshot of model selections for each AI step during discovery';
COMMENT ON COLUMN project_prospects.relevance_reasoning IS 'AI''s explanation for why this prospect matches the project''s ICP';
COMMENT ON COLUMN project_prospects.discovery_cost_usd IS 'Total API cost to discover and enrich this prospect for this project (USD)';
COMMENT ON COLUMN project_prospects.discovery_time_ms IS 'Time taken to discover and enrich this prospect for this project (milliseconds)';