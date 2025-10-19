-- ============================================================================
-- MAKSANT EMAIL COMPOSER - Supabase Schema
-- ============================================================================
-- This creates the composed_emails table for storing generated emails
-- with full technical reasoning, business reasoning, and verification data
-- ============================================================================

-- Drop existing table if needed (CAREFUL - this deletes data!)
-- DROP TABLE IF EXISTS composed_emails CASCADE;

-- Create composed_emails table
CREATE TABLE IF NOT EXISTS composed_emails (
  -- Primary key
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Lead reference
  lead_id uuid REFERENCES leads(id) ON DELETE SET NULL,
  url text NOT NULL,
  company_name text,
  contact_email text,
  contact_name text,
  contact_title text,
  industry text,

  -- Email content (non-technical, ready to send)
  email_subject text NOT NULL,
  email_body text NOT NULL,
  email_strategy text, -- 'compliment-sandwich', 'problem-first', etc.

  -- A/B variants (if generated)
  has_variants boolean DEFAULT false,
  subject_variants jsonb, -- ["subject 1", "subject 2", "subject 3"]
  body_variants jsonb, -- ["body 1", "body 2"]
  recommended_variant jsonb, -- {"subject": 0, "body": 0}
  variant_reasoning text, -- Why recommended variant is best

  -- For Anton's review
  technical_reasoning jsonb, -- Array of technical breakdowns
  business_reasoning text, -- Non-technical summary
  verification_checklist jsonb, -- Steps to verify manually
  screenshot_urls jsonb, -- Array of screenshot URLs/paths

  -- Website verification
  website_verified boolean DEFAULT false,
  verification_data jsonb, -- Fresh data from re-verification agent
  verified_at timestamp,

  -- Quality metrics
  ai_model text, -- 'claude-sonnet-4-5', 'gpt-5', etc.
  quality_score integer CHECK (quality_score >= 0 AND quality_score <= 100),
  validation_issues jsonb, -- Any issues found during validation

  -- Approval workflow
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'sent', 'failed')),
  reviewed_at timestamp,
  reviewed_notes text, -- Anton's notes during review

  -- Sending
  sent_at timestamp,
  sent_via text, -- 'gmail', 'smtp', etc.
  sent_error text, -- Error message if sending failed
  gmail_draft_id text, -- Gmail draft ID if created as draft
  gmail_message_id text, -- Gmail message ID if sent

  -- Email performance tracking
  opened boolean DEFAULT false,
  opened_at timestamp,
  clicked boolean DEFAULT false,
  clicked_at timestamp,
  replied boolean DEFAULT false,
  replied_at timestamp,
  reply_sentiment text, -- 'positive', 'negative', 'neutral', 'interested'

  -- Notion integration
  notion_page_id text, -- Notion page ID for syncing
  synced_to_notion boolean DEFAULT false,
  notion_sync_at timestamp,

  -- Timestamps
  composed_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_composed_emails_status ON composed_emails(status);
CREATE INDEX IF NOT EXISTS idx_composed_emails_lead_id ON composed_emails(lead_id);
CREATE INDEX IF NOT EXISTS idx_composed_emails_url ON composed_emails(url);
CREATE INDEX IF NOT EXISTS idx_composed_emails_composed_at ON composed_emails(composed_at DESC);
CREATE INDEX IF NOT EXISTS idx_composed_emails_notion_page_id ON composed_emails(notion_page_id);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_composed_emails_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_composed_emails_updated_at
  BEFORE UPDATE ON composed_emails
  FOR EACH ROW
  EXECUTE FUNCTION update_composed_emails_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) - IMPORTANT FOR DATA PROTECTION
-- ============================================================================

-- Enable RLS on the table
ALTER TABLE composed_emails ENABLE ROW LEVEL SECURITY;

-- Policy 1: Allow service role to do everything (for the app's backend)
CREATE POLICY "Allow service role full access"
ON composed_emails
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Policy 2: Allow authenticated users to read their own organization's data
-- (Adjust this if you have multi-tenant setup)
CREATE POLICY "Allow authenticated read access"
ON composed_emails
FOR SELECT
TO authenticated
USING (true);

-- Policy 3: Allow authenticated users to insert
CREATE POLICY "Allow authenticated insert"
ON composed_emails
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Policy 4: Allow authenticated users to update
CREATE POLICY "Allow authenticated update"
ON composed_emails
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Note: These policies allow all authenticated users to access all data.
-- If you need user-specific access control, you'll need to add a user_id column
-- and modify the policies to use: USING (auth.uid() = user_id)

-- ============================================================================
-- USAGE INSTRUCTIONS
-- ============================================================================
--
-- 1. Go to Supabase Dashboard: https://supabase.com/dashboard
-- 2. Select your project: njejsagzeebvsupzffpd
-- 3. Go to SQL Editor
-- 4. Paste this entire file
-- 5. Run the query
-- 6. Verify table was created in Table Editor
--
-- ============================================================================

-- Sample query to verify table exists
-- SELECT * FROM composed_emails LIMIT 1;
