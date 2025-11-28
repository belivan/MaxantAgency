# Complete Integration Guide
## Supabase → Outreach Engine → Notion

This guide explains how data flows between all three systems and how to use them together.

---

## 🏗️ Architecture Overview

```
┌──────────────────────────────────────────────────────────────┐
│                    YOUR WORKFLOW                             │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  1. Prospecting Engine → Finds companies → Saves to         │
│     Supabase `prospects` table                              │
│                                                              │
│  2. Analysis Engine → Analyzes websites → Saves to          │
│     Supabase `leads` table                                  │
│                                                              │
│  3. Outreach Engine → Generates emails → Saves to           │
│     Supabase `composed_emails` table                        │
│                                                              │
│  4. Notion Sync → Pushes emails to Notion for review        │
│                                                              │
│  5. Manual Review → Approve/reject in Notion                │
│                                                              │
│  6. Sync Back → Pull approvals from Notion                  │
│                                                              │
│  7. Send Emails → SMTP sends approved emails                │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## 📊 Supabase Tables

### Table 1: `leads` (Input)
**Created by:** Analysis Engine (Agent 2)
**Used by:** Outreach Engine reads this to generate emails

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Unique lead ID |
| company_name | text | Business name |
| url | text | Website URL |
| contact_email | text | Email address |
| contact_name | text | Contact person |
| industry | text | Business type |
| city | text | Location |
| website_grade | text | A-F rating |
| lead_grade | text | A-F business quality |
| top_issue | jsonb | Main website problem |
| analysis_summary | text | AI analysis |
| status | text | Pipeline status |

### Table 2: `composed_emails` (Output)
**Created by:** Outreach Engine (Agent 3)
**Synced to:** Notion for review

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Email record ID |
| lead_id | uuid | FK to leads.id |
| email_subject | text | Generated subject |
| email_body | text | Generated body |
| has_variants | boolean | A/B test enabled? |
| subject_variants | jsonb | 3 subject options |
| body_variants | jsonb | 2-3 body options |
| status | text | pending/ready/approved/sent |
| notion_page_id | text | Notion page reference |
| synced_to_notion | boolean | Pushed to Notion? |
| notion_sync_at | timestamptz | When synced |
| validation_score | integer | Quality 0-100 |
| model_used | text | AI model name |
| generation_cost | decimal | Cost in USD |
| created_at | timestamptz | When created |

---

## 🔌 How to Use the Integrations

### Step 1: Generate an Email (Saves to Supabase)

**Endpoint:** `POST /api/compose`

```bash
curl -X POST http://localhost:3002/api/compose \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example-restaurant.com",
    "strategy": "problem-first",
    "generateVariants": false
  }'
```

**What happens:**
1. ✅ Fetches lead from Supabase `leads` table by URL
2. ✅ Generates email with Claude AI
3. ✅ Validates quality (spam check, length, etc.)
4. ✅ **Saves to Supabase** `composed_emails` table
5. ✅ Returns email data

**Response:**
```json
{
  "success": true,
  "email": {
    "id": "a1b2c3d4-...",
    "subject": "outdated design holding back bella vista",
    "body": "Hi Maria,\n\nI noticed...",
    "validation_score": 95,
    "status": "ready"
  }
}
```

---

### Step 2: Sync to Notion (Manual)

You have **3 options** to sync emails to Notion:

#### Option A: Sync One Email

**Not yet implemented as endpoint** - but the function exists:

```javascript
import { syncEmailToNotion } from './integrations/notion.js';

const email = {
  id: 'email-uuid',
  subject: 'Subject line',
  body: 'Email body...',
  status: 'ready',
  validation_score: 95,
  cost: 0.0004
};

const lead = {
  company_name: 'Bella Vista Bistro',
  url: 'https://example.com',
  contact_email: 'owner@example.com',
  industry: 'Restaurant',
  lead_grade: 'A'
};

await syncEmailToNotion(email, lead);
```

#### Option B: Sync All Pending Emails (Batch)

**Endpoint:** Need to create this - let me add it!

**Should work like:**
```bash
POST /api/sync-to-notion
{
  "status": "ready",  // Only sync emails with this status
  "limit": 50
}
```

#### Option C: Auto-Sync on Generation

**Currently disabled** - but you can enable it in `server.js` after email generation:

```javascript
// In /api/compose endpoint, after saveComposedEmail:
if (process.env.AUTO_SYNC_NOTION === 'true') {
  await syncEmailToNotion(savedEmail, lead);
}
```

---

### Step 3: Review in Notion

1. Open your Notion database ("Cold Email Tracker")
2. You'll see all synced emails as rows
3. Review the email content
4. Change Status column:
   - **Pending** → Not reviewed yet
   - **Approved** → Ready to send ✅
   - **Rejected** → Don't send ❌
   - **Sent** → Already sent

---

### Step 4: Sync Approvals Back from Notion

**Endpoint:** `POST /api/sync-from-notion`

```bash
curl -X POST http://localhost:3002/api/sync-from-notion \
  -H "Content-Type: application/json" \
  -d '{
    "autoSend": false,
    "dryRun": true
  }'
```

**What happens:**
1. ✅ Fetches all "Approved" pages from Notion
2. ✅ Finds matching emails in Supabase by company name
3. ✅ Updates status to "approved" in Supabase
4. ✅ Optionally sends emails immediately if `autoSend: true`

**Response:**
```json
{
  "success": true,
  "synced": 12,
  "approved": [
    {
      "company": "Bella Vista Bistro",
      "email_id": "uuid",
      "notion_page_id": "page-id"
    }
  ]
}
```

---

### Step 5: Send Approved Emails

**Endpoint:** `POST /api/send-batch`

```bash
curl -X POST http://localhost:3002/api/send-batch \
  -H "Content-Type: application/json" \
  -d '{
    "status": "approved",
    "limit": 10,
    "actualSend": false
  }'
```

**What happens:**
1. ✅ Fetches approved emails from Supabase
2. ✅ Sends via Gmail SMTP
3. ✅ Updates status to "sent" in Supabase
4. ✅ Updates status in Notion
5. ✅ Creates .eml file backups

---

## 🔄 Complete Example Workflow

### Scenario: Generate & Send 10 Outreach Emails

**Step 1: Check available leads**
```bash
GET /api/leads/ready
```

**Step 2: Generate emails for all ready leads**
```bash
POST /api/compose-batch
{
  "leadIds": ["id1", "id2", "id3", ...],
  "strategy": "problem-first",
  "generateVariants": true
}
```

**Step 3: Sync all to Notion for review**
```bash
POST /api/sync-to-notion
{
  "status": "ready",
  "limit": 50
}
```

**Step 4: Review in Notion**
- Open Notion database
- Review each email
- Mark good ones as "Approved"
- Mark bad ones as "Rejected"

**Step 5: Pull approvals back**
```bash
POST /api/sync-from-notion
{
  "autoSend": false,
  "dryRun": false
}
```

**Step 6: Send approved emails**
```bash
POST /api/send-batch
{
  "status": "approved",
  "limit": 10,
  "actualSend": true
}
```

**Step 7: Track in Notion**
- Sent emails auto-update to "Sent" status
- Check "Sent Date" column
- Wait for replies

---

## 🔧 Configuration

### Environment Variables (.env)

```bash
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-key

# Notion
NOTION_API_KEY=ntn_your-api-key
NOTION_DATABASE_ID=your-database-id

# Optional: Auto-sync
AUTO_SYNC_NOTION=false  # Set to 'true' to auto-sync on generation
```

---

## 📋 Notion Database Properties

Make sure your Notion database has these columns (see screenshot you sent):

**Required:**
- ✅ Company (Title)
- ✅ Status (Select)
- ✅ Subject (Text)
- ✅ Body (Text)
- ✅ Contact (Text)
- ✅ Email (Text)

**Recommended:**
- Quality (Select: A/B/C/D/F)
- Industry (Multi-select)
- Website (URL)
- Strategy (Select)
- Composed (Date)
- Sent Date (Date)
- Response Date (Date)
- Technical Reasoning (Text)
- Business Summary (Text)

**For A/B Testing:**
- Subject Variant 1 (Text)
- Subject Variant 2 (Text)
- Subject Variant 3 (Text)
- Body Variant 1 (Text)
- Body Variant 2 (Text)
- AI Recommendation (Text)

---

## 🚨 Troubleshooting

### "Lead not found for URL"
**Problem:** URL doesn't exist in `leads` table
**Solution:** Make sure Analysis Engine (Agent 2) analyzed this lead first

### "Notion sync failed: Unauthorized"
**Problem:** Invalid Notion API key or database ID
**Solution:** Check `.env` credentials, ensure integration has access to database

### "Duplicate key error"
**Problem:** Trying to save email that already exists
**Solution:** Check if email was already generated for this lead

### "No leads ready for outreach"
**Problem:** All leads are already contacted or ungraded
**Solution:** Run prospecting + analysis first to get new leads

---

## 📊 Data Flow Diagram

```
PROSPECTING ENGINE (Agent 1)
         ↓
    prospects table
         ↓
ANALYSIS ENGINE (Agent 2)
         ↓
     leads table  ←───────┐
         ↓                │
OUTREACH ENGINE (Agent 3) │
         ↓                │
  composed_emails table   │
         ↓                │
   NOTION DATABASE        │
         ↓                │
   (Manual Review)        │
         ↓                │
   Mark as "Approved"     │
         ↓                │
   Sync back to Supabase ─┘
         ↓
   SMTP Email Sender
         ↓
   Email Sent! 📧
```

---

## 🎯 Next Steps

1. ✅ Ensure Supabase tables exist (use database-tools)
2. ✅ Verify Notion integration (run `node test-notion.js`)
3. ✅ Add missing columns to Notion database
4. ✅ Generate test email
5. ✅ Manually sync to Notion
6. ✅ Approve in Notion
7. ✅ Sync back and send

---

Need help? Check:
- `integrations/database.js` - All Supabase functions
- `integrations/notion.js` - All Notion functions
- `server.js` - All API endpoints
