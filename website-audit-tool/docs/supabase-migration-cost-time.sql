-- Migration: Add cost and time tracking to leads table
-- Run this in Supabase SQL Editor to add cost/time tracking columns

-- Add cost tracking columns
ALTER TABLE leads
ADD COLUMN IF NOT EXISTS analysis_cost DECIMAL(10, 4),
ADD COLUMN IF NOT EXISTS analysis_time INTEGER,
ADD COLUMN IF NOT EXISTS cost_breakdown JSONB;

-- Add comments for documentation
COMMENT ON COLUMN leads.analysis_cost IS 'Total cost of analysis in dollars (e.g., $0.0234)';
COMMENT ON COLUMN leads.analysis_time IS 'Total analysis time in seconds';
COMMENT ON COLUMN leads.cost_breakdown IS 'Detailed cost breakdown per operation (JSONB): {grokExtraction: 0.015, basicAnalysis: 0.003, etc.}';

-- Create index on analysis_cost for cost reporting queries
CREATE INDEX IF NOT EXISTS idx_leads_analysis_cost ON leads(analysis_cost);
CREATE INDEX IF NOT EXISTS idx_leads_analysis_time ON leads(analysis_time);

-- Example cost breakdown structure:
-- {
--   "grokExtraction": 0.015,
--   "basicAnalysis": 0.003,
--   "industryAnalysis": 0.003,
--   "emailWriting": 0.001,
--   "critiqueReasoning": 0.001,
--   "qaReview": 0.001
-- }
