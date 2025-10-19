# Database Requirements - Complete Table Structures

## Overview

The email composer now supports **4 outreach channels**:
1. ✉️ Email outreach
2. 💼 LinkedIn InMails/messages
3. 📘 Facebook Messenger
4. 📸 Instagram DMs

We use **ONE unified table** (`composed_emails`) to store all outreach messages across all channels.

---

## 📊 LEADS TABLE (Input Data)

Your other agent should populate this table with prospect data.

### 🔴 CRITICAL Fields (Required):

```sql
company_name        TEXT        NOT NULL  -- Company name
website_url         TEXT        NOT NULL  -- Website URL
contact_email       TEXT                  -- Email for email outreach
industry            TEXT                  -- Industry/vertical
```

### 🟡 IMPORTANT Fields (Highly Recommended):

```sql
contact_name        TEXT                  -- Contact person name
contact_position    TEXT                  -- Job title (CEO, CTO, etc.)
analysis_summary    JSONB                 -- Website analysis:
  {
    "overview": "Company description",
    "strengths": ["strength 1", "strength 2"],
    "weaknesses": ["issue 1", "issue 2"],
    "recommendations": ["fix 1", "fix 2"]
  }
accessibility_grade TEXT                  -- A, B, C, D, F
performance_score   INTEGER               -- 0-100
seo_score          INTEGER               -- 0-100
```

### 🟢 SOCIAL MEDIA Fields (For DM Outreach):

```sql
linkedin_url        TEXT                  -- LinkedIn profile URL
facebook_url        TEXT                  -- Facebook profile URL
instagram_url       TEXT                  -- Instagram profile URL
```

### 📊 PROJECT TRACKING Fields:

```sql
project_id          TEXT                  -- Project ID
campaign_id         TEXT                  -- Campaign ID
client_name         TEXT                  -- Client name (multi-tenant)
source_app          TEXT                  -- Source application
```

---

## 📧 COMPOSED_EMAILS TABLE (Output Data)

**This table is AUTO-POPULATED by the email composer system.**

After running the migration (`supabase-migration-add-social-outreach.sql`), it will support ALL outreach types.

### Core Fields (Existing):

```sql
id                  UUID        PRIMARY KEY
company_name        TEXT        NOT NULL
website_url         TEXT
composed_at         TIMESTAMP   DEFAULT NOW()
sent_at            TIMESTAMP
status             TEXT        DEFAULT 'pending'  -- pending, approved, sent, rejected
quality_score      INTEGER                        -- 0-100
strategy           TEXT                           -- outreach strategy used
```

### Email-Specific Fields:

```sql
recipient_email     TEXT                          -- Email address
email_subject       TEXT                          -- Email subject line
email_body          TEXT                          -- Email message body
```

### Social Media Fields (NEW):

```sql
outreach_type       TEXT        DEFAULT 'email'   -- email, linkedin, facebook, instagram
platform            TEXT                          -- linkedin, facebook, instagram (NULL for email)
message_body        TEXT                          -- DM message text
character_count     INTEGER                       -- Message length
social_profile_url  TEXT                          -- Social media profile URL
```

### Project Tracking Fields:

```sql
project_id          TEXT
campaign_id         TEXT
client_name         TEXT
source_app          TEXT        DEFAULT 'email-composer'
```

### Notion Integration Fields:

```sql
notion_page_id      TEXT                          -- Notion page ID for sync
```

---

## 📋 Data Examples

### Example 1: Email Outreach Record

```json
{
  "outreach_type": "email",
  "platform": null,
  "company_name": "TechCorp Inc",
  "website_url": "https://techcorp.com",
  "recipient_email": "ceo@techcorp.com",
  "email_subject": "Quick win for TechCorp's website accessibility",
  "email_body": "Hi Sarah,\n\nI noticed TechCorp's website has some accessibility improvements that could boost your conversion rate by 20%...",
  "message_body": null,
  "character_count": null,
  "social_profile_url": null,
  "strategy": "compliment-sandwich",
  "status": "pending",
  "quality_score": 85
}
```

### Example 2: LinkedIn InMail Record

```json
{
  "outreach_type": "linkedin",
  "platform": "linkedin",
  "company_name": "TechCorp Inc",
  "website_url": "https://techcorp.com",
  "recipient_email": null,
  "email_subject": null,
  "email_body": null,
  "message_body": "Hi Sarah, I noticed TechCorp's site has some page speed opportunities - running a quick audit shows potential for ~40% faster load times. Would you be interested in a quick optimization breakdown?",
  "character_count": 250,
  "social_profile_url": "https://linkedin.com/in/sarah-johnson",
  "strategy": "value-first",
  "status": "pending",
  "quality_score": 88
}
```

### Example 3: Instagram DM Record

```json
{
  "outreach_type": "instagram",
  "platform": "instagram",
  "company_name": "TechCorp Inc",
  "website_url": "https://techcorp.com",
  "recipient_email": null,
  "email_subject": null,
  "email_body": null,
  "message_body": "Hey Sarah! 👋 Loved your latest post on remote work. Quick optimization tip: Your site's load speed could be faster. Compress those images and watch performance improve! 🚀",
  "character_count": 201,
  "social_profile_url": "https://instagram.com/techcorp",
  "strategy": "quick-win",
  "status": "pending",
  "quality_score": 82
}
```

---

## 🚀 Migration Steps

### Step 1: Run the Migration

Execute the SQL migration in Supabase:

```bash
# Copy contents of supabase-migration-add-social-outreach.sql
# Paste into Supabase SQL Editor
# Run the migration
```

### Step 2: Verify Table Structure

```sql
-- Check that new columns exist
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'composed_emails'
ORDER BY ordinal_position;
```

### Step 3: Test with Sample Data

The system will automatically populate this table when you generate outreach messages via the API.

---

## 📌 Summary for Your Other Agent

**LEADS TABLE - They need to populate:**

**Minimum (to get started):**
- ✅ company_name
- ✅ website_url
- ✅ contact_email
- ✅ industry

**Recommended (for quality):**
- ✅ contact_name
- ✅ analysis_summary (JSONB)
- ✅ accessibility_grade
- ✅ performance_score
- ✅ seo_score

**Social media (for DMs):**
- ✅ linkedin_url
- ✅ facebook_url
- ✅ instagram_url

**COMPOSED_EMAILS TABLE - Auto-populated by system:**
- ❌ They don't need to touch this
- ✅ Run the migration to add social media support
- ✅ System handles all inserts automatically

---

## 🎯 Next Steps

1. **Run migration**: Execute `supabase-migration-add-social-outreach.sql` in Supabase
2. **Populate leads**: Have other agent fill the `leads` table
3. **Generate outreach**: Use API endpoints to generate emails/DMs
4. **System auto-saves**: All messages saved to `composed_emails` table
5. **Notion sync**: Messages sync to Notion automatically
6. **Approve & send**: Mark as "Approved" in Notion, then send via SMTP or manually copy DMs

Done! 🎉
