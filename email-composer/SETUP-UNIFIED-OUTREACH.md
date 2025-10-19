# Unified Outreach System - Setup Guide

## What You Have Now

Your email composer now supports **ALL outreach channels** in ONE unified table:

✉️ **Email outreach**
💼 **LinkedIn InMails/messages**
📘 **Facebook Messenger outreach**
📸 **Instagram DMs**

All saved in the `composed_emails` table - one place to view everything!

---

## Step 1: Run Database Migration (REQUIRED)

Go to your Supabase dashboard → SQL Editor → Paste this SQL:

```sql
-- Add columns for social media outreach
ALTER TABLE composed_emails
ADD COLUMN IF NOT EXISTS outreach_type TEXT DEFAULT 'email',
ADD COLUMN IF NOT EXISTS platform TEXT,
ADD COLUMN IF NOT EXISTS message_body TEXT,
ADD COLUMN IF NOT EXISTS character_count INTEGER,
ADD COLUMN IF NOT EXISTS social_profile_url TEXT;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_composed_emails_outreach_type ON composed_emails(outreach_type);
CREATE INDEX IF NOT EXISTS idx_composed_emails_platform ON composed_emails(platform);
```

Click **Run** - Done!

---

## Step 2: Tell Your Other Agent What Data to Add

Your other agent needs to populate the **leads table** with:

### Required (minimum):
```
company_name       - "TechCorp Inc"
website_url        - "https://techcorp.com"
contact_email      - "ceo@techcorp.com"
industry           - "SaaS"
```

### Social Media URLs (for DMs):
```
linkedin_url       - "https://linkedin.com/company/techcorp"
facebook_url       - "https://facebook.com/techcorp"
instagram_url      - "https://instagram.com/techcorp"
```

### Recommended (for quality):
```
contact_name       - "Sarah Johnson"
analysis_summary   - {JSON with strengths/weaknesses}
accessibility_grade - "B+"
performance_score  - 72
seo_score         - 65
```

---

## Step 3: How to Use (API Examples)

### Generate Email Outreach

```bash
curl -X POST http://localhost:3001/api/compose \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://techcorp.com",
    "strategy": "compliment-sandwich",
    "model": "haiku"
  }'
```

**Saves to database as:**
- `outreach_type` = 'email'
- `email_subject` = "Quick win for TechCorp..."
- `email_body` = "Hi Sarah, I noticed..."

---

### Generate LinkedIn DM

```bash
curl -X POST http://localhost:3001/api/compose-social \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://techcorp.com",
    "platform": "linkedin",
    "strategy": "value-first",
    "model": "haiku"
  }'
```

**Saves to database as:**
- `outreach_type` = 'linkedin'
- `platform` = 'linkedin'
- `message_body` = "Hi Sarah, I noticed your site..."
- `social_profile_url` = "https://linkedin.com/in/sarah"

---

### Generate Facebook Messenger

```bash
curl -X POST http://localhost:3001/api/compose-social \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://techcorp.com",
    "platform": "facebook",
    "strategy": "common-ground",
    "model": "haiku"
  }'
```

**Saves to database as:**
- `outreach_type` = 'facebook'
- `platform` = 'facebook'
- `message_body` = "Hey Sarah! Loved your recent post..."

---

### Generate Instagram DM

```bash
curl -X POST http://localhost:3001/api/compose-social \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://techcorp.com",
    "platform": "instagram",
    "strategy": "quick-win",
    "model": "haiku"
  }'
```

**Saves to database as:**
- `outreach_type` = 'instagram'
- `platform` = 'instagram'
- `message_body` = "Hey! Quick tip: your site..."

---

## Step 4: View All Outreach in One Place

Query the unified table:

```sql
-- Get all outreach (emails + DMs)
SELECT
  outreach_type,
  platform,
  company_name,
  email_subject,        -- For emails
  message_body,         -- For DMs
  character_count,
  social_profile_url,
  status,
  quality_score
FROM composed_emails
ORDER BY composed_at DESC;

-- Filter by type
SELECT * FROM composed_emails WHERE outreach_type = 'linkedin';
SELECT * FROM composed_emails WHERE outreach_type = 'email';
SELECT * FROM composed_emails WHERE platform = 'instagram';
```

---

## Outreach Strategies Available

### Email Strategies:
- `compliment-sandwich` - Compliment → Value → Ask
- `problem-first` - Lead with pain point
- `achievement-focused` - Highlight their wins

### Social Media Strategies:
- `value-first` - Lead with specific insight/value
- `common-ground` - Connect over shared interests
- `compliment-question` - Genuine compliment + question
- `quick-win` - Offer actionable tip

---

## What Happens Automatically

When you generate outreach (email or DM):

1. ✅ AI generates personalized message using Haiku (cheap!)
2. ✅ Message validated for quality
3. ✅ Saved to `composed_emails` table
4. ✅ Synced to Notion (if enabled)
5. ✅ Status set to "pending"
6. ✅ Cost tracked and logged

Then you:
1. Review in Notion or query database
2. Mark as "Approved"
3. For emails: Send via SMTP
4. For DMs: Copy/paste manually to LinkedIn/Facebook/Instagram

---

## Database Structure After Migration

| Field | Email | LinkedIn | Facebook | Instagram |
|-------|-------|----------|----------|-----------|
| `outreach_type` | 'email' | 'linkedin' | 'facebook' | 'instagram' |
| `platform` | NULL | 'linkedin' | 'facebook' | 'instagram' |
| `email_subject` | ✅ "Subject..." | NULL | NULL | NULL |
| `email_body` | ✅ "Hi Sarah..." | NULL | NULL | NULL |
| `message_body` | NULL | ✅ "Hi Sarah..." | ✅ "Hey!" | ✅ "Quick tip..." |
| `character_count` | NULL | ✅ 250 | ✅ 150 | ✅ 100 |
| `social_profile_url` | NULL | ✅ LinkedIn URL | ✅ Facebook URL | ✅ Instagram URL |
| `recipient_email` | ✅ email@... | NULL | NULL | NULL |
| `company_name` | ✅ | ✅ | ✅ | ✅ |
| `status` | ✅ | ✅ | ✅ | ✅ |
| `quality_score` | ✅ | ✅ | ✅ | ✅ |

---

## Summary

✅ **ONE table** for emails + LinkedIn + Facebook + Instagram
✅ **Cheap AI** (Haiku 3.5 = $0.0001 per message)
✅ **Auto-save** to database
✅ **Quality validation**
✅ **Notion sync** (optional)
✅ **Project tracking** (project_id, campaign_id, client_name)

**Next:** Run the migration SQL, populate leads table, start generating!
