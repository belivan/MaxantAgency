-- ============================================================================
-- ADD SOCIAL MEDIA OUTREACH SUPPORT TO COMPOSED_EMAILS TABLE
-- ============================================================================
--
-- This migration extends the composed_emails table to support:
-- - Email outreach (existing)
-- - LinkedIn InMails/messages
-- - Facebook Messenger outreach
-- - Instagram DMs
--
-- We're using ONE table for all outreach types for simplicity.
-- ============================================================================

-- Make email fields nullable (social media DMs don't have email subjects)
ALTER TABLE composed_emails
ALTER COLUMN email_subject DROP NOT NULL,
ALTER COLUMN email_body DROP NOT NULL;

-- Add new columns for social media outreach
ALTER TABLE composed_emails
ADD COLUMN IF NOT EXISTS outreach_type TEXT DEFAULT 'email',
ADD COLUMN IF NOT EXISTS platform TEXT,
ADD COLUMN IF NOT EXISTS message_body TEXT,
ADD COLUMN IF NOT EXISTS character_count INTEGER,
ADD COLUMN IF NOT EXISTS social_profile_url TEXT;

-- Add comment explaining the columns
COMMENT ON COLUMN composed_emails.outreach_type IS 'Type of outreach: email, linkedin, facebook, instagram';
COMMENT ON COLUMN composed_emails.platform IS 'Social media platform for DMs (linkedin, facebook, instagram) or NULL for email';
COMMENT ON COLUMN composed_emails.message_body IS 'Social media DM message body (alternative to email_body for social)';
COMMENT ON COLUMN composed_emails.character_count IS 'Character count for social media messages (platform limits)';
COMMENT ON COLUMN composed_emails.social_profile_url IS 'LinkedIn/Facebook/Instagram profile URL to send DM to';

-- Create index for filtering by outreach type
CREATE INDEX IF NOT EXISTS idx_composed_emails_outreach_type ON composed_emails(outreach_type);
CREATE INDEX IF NOT EXISTS idx_composed_emails_platform ON composed_emails(platform);

-- Update existing records to have outreach_type = 'email'
UPDATE composed_emails
SET outreach_type = 'email'
WHERE outreach_type IS NULL;

-- ============================================================================
-- USAGE NOTES
-- ============================================================================
--
-- EMAIL OUTREACH (existing):
-- - outreach_type: 'email'
-- - platform: NULL
-- - email_subject: subject line
-- - email_body: email message
-- - recipient_email: email address
--
-- LINKEDIN OUTREACH:
-- - outreach_type: 'linkedin'
-- - platform: 'linkedin'
-- - email_subject: NULL (no subject for DMs)
-- - message_body: LinkedIn InMail/message text
-- - social_profile_url: LinkedIn profile URL
-- - character_count: message length (300 max if not connected)
--
-- FACEBOOK MESSENGER:
-- - outreach_type: 'facebook'
-- - platform: 'facebook'
-- - email_subject: NULL
-- - message_body: Messenger message text
-- - social_profile_url: Facebook profile URL
-- - character_count: message length
--
-- INSTAGRAM DM:
-- - outreach_type: 'instagram'
-- - platform: 'instagram'
-- - email_subject: NULL
-- - message_body: Instagram DM text
-- - social_profile_url: Instagram profile URL
-- - character_count: message length (1000 max)
--
-- ============================================================================
