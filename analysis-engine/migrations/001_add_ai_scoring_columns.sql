-- Migration: Add AI Lead Scoring Columns
-- Date: 2025-10-20
-- Description: Adds GPT-5 lead priority scoring and business intelligence columns to leads table

-- Add missing AI Lead Scoring columns
ALTER TABLE leads ADD COLUMN IF NOT EXISTS lead_priority INTEGER;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS lead_priority_reasoning TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS priority_tier TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS budget_likelihood TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS fit_score INTEGER;

-- Add comments to document the columns
COMMENT ON COLUMN leads.lead_priority IS 'Overall lead priority score (0-100) calculated by AI';
COMMENT ON COLUMN leads.lead_priority_reasoning IS 'AI explanation of why this priority score was assigned';
COMMENT ON COLUMN leads.priority_tier IS 'Priority tier: hot (75-100), warm (50-74), or cold (0-49)';
COMMENT ON COLUMN leads.budget_likelihood IS 'Budget likelihood assessment: high, medium, or low';
COMMENT ON COLUMN leads.fit_score IS 'How well the prospect matches ICP (0-100)';

-- Verify columns exist
DO $$
BEGIN
  RAISE NOTICE '✅ Migration complete. Verifying columns...';
END $$;

SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'leads'
  AND column_name IN (
    'lead_priority',
    'lead_priority_reasoning',
    'priority_tier',
    'budget_likelihood',
    'fit_score',
    'quality_gap_score',
    'budget_score',
    'urgency_score',
    'industry_fit_score',
    'company_size_score',
    'engagement_score',
    'business_intelligence',
    'crawl_metadata'
  )
ORDER BY column_name;
