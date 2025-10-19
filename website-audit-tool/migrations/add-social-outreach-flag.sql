-- Add flag to indicate leads that need social media outreach
-- (because their website failed to load)

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS requires_social_outreach BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS website_status TEXT DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS website_error TEXT;

COMMENT ON COLUMN leads.requires_social_outreach IS 'True if website failed but we have social profiles - use social media outreach instead';
COMMENT ON COLUMN leads.website_status IS 'active | failed | timeout | ssl_error | dns_error';
COMMENT ON COLUMN leads.website_error IS 'Error message if website failed to load';

-- Create index for filtering social outreach candidates
CREATE INDEX IF NOT EXISTS idx_leads_requires_social_outreach
  ON leads(requires_social_outreach)
  WHERE requires_social_outreach = TRUE;

-- Example query to find social outreach candidates:
-- SELECT company_name, url, social_profiles, website_error
-- FROM leads
-- WHERE requires_social_outreach = TRUE
-- AND social_profiles IS NOT NULL;
