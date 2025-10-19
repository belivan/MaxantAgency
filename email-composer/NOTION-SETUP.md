# Notion + Supabase Integration Setup Guide

This guide will walk you through setting up the **Notion review workflow** for the email composer.

## The Complete Flow

```
1. Email Composer App (compose email)
   “
2. Supabase: composed_emails table (save with technical reasoning)
   “
3. Notion Database (auto-sync for beautiful review)
   “
4. You Review in Notion (approve/reject)
   “
5. Supabase Updates (status syncs back)
   “
6. Email Composer App /send endpoint (sends approved emails)
```

---

## Step 1: Create Supabase Table

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: `njejsagzeebvsupzffpd`
3. Click **SQL Editor**
4. Open the file: `supabase-schema.sql`
5. Copy the entire contents
6. Paste into SQL Editor
7. Click **Run**
8. Verify: Go to **Table Editor** ’ You should see `composed_emails` table

---

## Step 2: Create Notion Integration

1. Go to [Notion Integrations](https://www.notion.so/my-integrations)
2. Click **+ New integration**
3. Fill in:
   - Name: `Maksant Email Composer`
   - Associated workspace: Select your workspace
   - Type: Internal
4. Click **Submit**
5. **Copy the "Internal Integration Token"** (starts with `secret_`)
6. Save this for Step 4

---

## Step 3: Create Notion Database

### Option A: Use Template (Recommended)

I'll create a template for you. Here's the structure:

**Database Properties:**

| Property | Type | Options |
|----------|------|---------|
| Name | Title | - |
| Status | Select | Pending, Approved, Rejected, Sent, Failed |
| Company | Text | - |
| Contact | Text | - |
| Email | Email | - |
| Quality | Number | 0-100 |
| Website | URL | - |
| Strategy | Select | compliment-sandwich, problem-first, achievement-focused, question-based |
| Industry | Text | - |
| Composed | Date | - |

**Create it:**
1. In Notion, create a new page
2. Type `/database` ’ Choose "Table - Full page"
3. Name it: "Email Review Queue"
4. Add each property above (click `+` in the table header)
5. For Select properties, add the options listed

### Option B: I'll Give You a Template

If you want, I can generate a Notion template link you can duplicate. Let me know!

---

## Step 4: Connect Integration to Database

1. Open your "Email Review Queue" database in Notion
2. Click the `...` menu (top right)
3. Click **+ Add connections**
4. Select **Maksant Email Composer** (the integration you created)
5. Click **Confirm**

---

## Step 5: Get Database ID

1. Open your "Email Review Queue" database
2. Look at the URL:
   ```
   https://www.notion.so/myworkspace/abc123def456789?v=...
                                     ^^^^^^^^^^^^^^^^
                                     This is your Database ID
   ```
3. Copy the long ID (32 characters, letters + numbers)
4. Save this for Step 6

---

## Step 6: Update .env File

1. Open `email-composer/.env`
2. Find the `NOTION INTEGRATION` section
3. Paste your values:

```bash
# Notion API Key (from Step 2)
NOTION_API_KEY=secret_abc123def456...

# Notion Database ID (from Step 5)
NOTION_DATABASE_ID=abc123def456789
```

4. Save the file

---

## Step 7: Test the Integration

1. Restart the email-composer server:
   ```bash
   cd c:\Users\anton\Desktop\MaxantAgency\email-composer
   npm start
   ```

2. Compose an email:
   ```bash
   curl -X POST http://localhost:3001/api/compose \
     -H "Content-Type: application/json" \
     -d '{"url":"https://squarespace.com","strategy":"compliment-sandwich"}'
   ```

3. Check your Notion database ’ You should see a new page!

---

## What You'll See in Notion

Each composed email appears as a page with:

### Header
- =ç Emoji icon
- Title: "Company Name - Strategy"

### Properties (in database view)
- Status: Pending (select dropdown)
- Company, Contact, Email
- Quality Score (0-100)
- Website URL
- Strategy, Industry
- Composed date

### Page Content (click to open)

**THE EMAIL (Ready to Send)**
- Subject line
- Full email body (non-technical)
- Variants (if generated)

**WHY I WROTE THIS (Technical Breakdown)**
- Business summary
- Each issue explained:
  - Technical description
  - Why it matters
  - What I wrote (non-technical version)
  - Translation guide

**VERIFY YOURSELF (Checklist)**
- Step-by-step verification
- What to look for
- Competitor URLs for comparison

**Metadata**
- Strategy, AI model, quality score
- Verification status

---

## Workflow: How to Review

### In Notion Database View

1. See all pending emails in one view
2. Filter by:
   - Status (Pending / Approved / Rejected)
   - Quality Score (>90 = high quality)
   - Industry
   - Strategy

3. Sort by:
   - Quality (highest first)
   - Composed date (newest first)

### Review Each Email

1. **Click** the email row to open full page
2. **Read** "THE EMAIL" section ’ This is what gets sent
3. **Review** "WHY I WROTE THIS" ’ Understand the AI's reasoning
4. **Verify** yourself:
   - Go to the website
   - Check the checklist items
   - Confirm the email is accurate
5. **Decide**:
   - Change **Status** to `Approved` 
   - OR change to `Rejected` L
   - Add notes in the page if needed

### Bulk Actions

- Use Notion filters to see only "Pending"
- Review in batches
- Multi-select to approve multiple at once

---

## Step 8: Send Approved Emails

Once you've approved emails in Notion:

1. The status syncs back to Supabase automatically
2. Go to: [http://localhost:3001/send](http://localhost:3001/send)
3. See all approved emails ready to send
4. Click "Send X Approved Emails"
5. System sends via Gmail
6. Status updates to "Sent" in both Supabase + Notion

---

## Notion Views (Optional - Advanced)

You can create multiple views of your database:

### View 1: Pending Review (Default)
- Filter: Status = Pending
- Sort: Quality Score (descending)
- Show: All properties

### View 2: Approved & Ready
- Filter: Status = Approved
- Sort: Composed (ascending)
- Show: Company, Contact, Email, Quality

### View 3: Sent Emails (Performance Tracking)
- Filter: Status = Sent
- Sort: Sent date (descending)
- Show: Company, Opened, Replied, Reply Date

### View 4: High Quality Only
- Filter: Quality >= 90
- Sort: Composed (descending)

### View 5: Gallery View (Screenshots)
- View type: Gallery
- Card preview: Screenshots
- Card size: Medium

---

## Troubleshooting

**Problem: "Error: Notion API key is invalid"**
- Check you copied the full `secret_...` token
- Make sure you created an **Internal** integration
- Verify the token is in `.env` file

**Problem: "Error: Database not found"**
- Check the Database ID is correct (32 characters)
- Make sure you **connected the integration** to the database (Step 4)
- Verify you're using the database ID, not the page ID

**Problem: "Pages created but look empty"**
- This might happen if Notion API limits are hit
- Check the Supabase `composed_emails` table directly
- Data should be there even if Notion sync fails

**Problem: "Status changes in Notion don't sync back"**
- This requires webhooks (coming in next version)
- For now: manually check Notion, then update status via API or directly in Supabase

---

## Next Steps

Once this is working:

1.  Compose emails ’ Auto-appear in Notion
2.  Review in beautiful Notion interface
3.  Approve/reject with one click
4. = Send approved emails (Step 8)
5. =Ê Track performance (opens, replies)

---

## Support

If you get stuck:
- Check the server logs for errors
- Verify all env variables are set
- Test the Notion API key with their API explorer
- Check Supabase table has data

The Notion SDK docs: https://developers.notion.com/

---

Ready? Let's set it up! =€
