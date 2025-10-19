# Maksant Command Center - Complete Setup Guide

You now have a **unified UI** that brings together all three apps:
- Client Orchestrator (prospect generation)
- Website Audit Tool (analysis)
- Email Composer (personalized emails)

---

## Quick Start (5 Minutes)

### 1. Configure Environment Variables

The unified UI needs access to your existing credentials. Copy them from `website-audit-tool/.env`:

```bash
cd command-center-ui

# Edit .env and paste your credentials:
# - SUPABASE_URL
# - SUPABASE_SERVICE_KEY
# - OPENAI_API_KEY
```

**Important:** All three apps share the same Supabase database, so use the same credentials.

### 2. Start Email Composer API

The email composer runs as a separate backend service on port 3001:

```bash
cd email-composer
npm start
```

Keep this running in a separate terminal.

### 3. Start the Unified UI

```bash
cd command-center-ui
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## The Complete Workflow

### Step 1: Generate Prospects (Prospects Tab)

1. Click the **Prospects** tab
2. Edit the brief JSON (or use the default)
3. Set parameters:
   - Company count: 20
   - City: "Philadelphia, PA" (optional)
   - Model: gpt-4o-mini
   - Verify URLs: ✓
4. Click **Generate Prospects**
5. Wait ~30-60 seconds
6. You'll see a table of verified companies with websites

**Behind the scenes:**
- Calls client-orchestrator to generate prospects
- Saves to Supabase `prospects` table with status `pending_analysis`

### Step 2: Analyze Websites (Prospects Tab)

1. Select prospects from the table (or keep all selected)
2. In the Analyzer Panel (right side):
   - Choose depth tier (tier1 = fast, tier2 = standard, tier3 = deep)
   - Select modules: SEO, Visual, Industry, Competitor
   - Add metadata (optional): campaign ID, project ID
3. Click **Run Analyzer**
4. Wait 1-3 minutes per website
5. Results are saved to Supabase `leads` table

**Behind the scenes:**
- Calls website-audit-tool/analyzer.js
- Extracts contact info (email, phone, name)
- Analyzes website quality
- Assigns grade (A/B/C/D/F)
- Saves detailed analysis to Supabase

### Step 3: View Analyzed Leads (Leads Tab)

1. Click the **Leads** tab
2. You'll see all analyzed leads from Supabase
3. Use filters:
   - Grade: A (best) to F (worst)
   - Has Email: Only show leads with email addresses
4. Select leads you want to contact
5. Click **Compose Emails** (button appears when leads are selected)

**Behind the scenes:**
- Queries Supabase `leads` table
- Shows contact info, industry, location, grade
- Tracks which leads have emails

### Step 4: Compose Personalized Emails (Emails Tab)

1. You're automatically switched to **Emails** tab
2. Choose email strategy:
   - Compliment Sandwich (recommended)
   - Problem-First
   - Achievement-Focused
   - Question-Based
3. Toggle options:
   - Generate A/B variants (multiple versions to test)
   - Re-verify website (fresh data from live site)
4. Click **Compose X Emails**
5. Wait 2-5 seconds per email
6. Review generated emails with quality scores

**Behind the scenes:**
- Calls email-composer API (port 3001)
- Uses AI to write personalized emails
- References website analysis data
- Saves to Supabase `composed_emails` table
- Optionally syncs to Notion

### Step 5: Send or Review (Emails Tab)

For each email, you can:
- **Copy to Clipboard** - Paste into your email client
- **View in Notion** - Review and approve in Notion (if configured)
- **Edit subject/body** - Customize before sending

**Notion Auto-Send Workflow (Optional):**
1. Emails sync to Notion with status "Pending"
2. Review in Notion, edit if needed
3. Change status to "Approved" in Notion
4. Email-composer auto-sends the email
5. Status updates to "Sent"

---

## The Four Tabs Explained

### Overview Tab
- Real-time statistics
- Pipeline health: prospects → leads → emails
- Conversion rates
- Quick action cards

### Prospects Tab
- Generate new prospect lists
- Configure and run analyzer
- View generated prospects
- Track analysis status

### Leads Tab
- Browse all analyzed leads
- Filter by grade, industry, email availability
- Select leads for outreach
- Export data

### Emails Tab
- Compose personalized emails
- Choose AI strategy
- Generate variants
- Track quality scores
- Send or sync to Notion

---

## Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    Supabase Database                         │
├─────────────────────────────────────────────────────────────┤
│  prospects table        leads table        composed_emails   │
│  ↓                      ↓                  ↓                 │
│  pending_analysis  →  Grade A/B/C  →  pending/sent          │
└─────────────────────────────────────────────────────────────┘
        ↑                      ↑                    ↑
        │                      │                    │
┌───────┴──────┐      ┌───────┴─────┐      ┌──────┴──────┐
│   Client     │      │  Website    │      │   Email     │
│ Orchestrator │      │ Audit Tool  │      │  Composer   │
└──────────────┘      └─────────────┘      └─────────────┘
        ↑                      ↑                    ↑
        └──────────────────────┴────────────────────┘
                            │
                  ┌─────────┴──────────┐
                  │  Command Center UI │
                  │  (localhost:3000)  │
                  └────────────────────┘
```

---

## Port Configuration

| Service | Port | Purpose |
|---------|------|---------|
| Command Center UI | 3000 | Main interface (Next.js) |
| Email Composer API | 3001 | Email generation backend |
| Website Audit Tool | 3000 | (Standalone - not needed when using UI) |

---

## Environment Variables Reference

### Required
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_KEY` - Service role key (full access)
- `OPENAI_API_KEY` - For AI-powered prospect generation and emails

### Optional
- `EMAIL_COMPOSER_URL` - Email composer API endpoint (default: http://localhost:3001)
- `ANTHROPIC_API_KEY` - Use Claude instead of GPT
- `XAI_API_KEY` - Use Grok for data extraction
- `NOTION_API_KEY` - Enable Notion sync for email review workflow
- `NOTION_DATABASE_ID` - Notion database for emails

---

## Troubleshooting

### "Supabase credentials not configured"

**Fix:** Edit `command-center-ui/.env` and add your Supabase credentials from `website-audit-tool/.env`.

### "Failed to compose email"

**Fix:** Make sure email-composer is running:
```bash
cd email-composer
npm start
```

### Leads table is empty

**Fix:** You need to analyze prospects first:
1. Go to Prospects tab
2. Generate prospects
3. Run analyzer on selected prospects
4. Wait for analysis to complete
5. Go to Leads tab - you should see results

### No prospects generated

**Fix:** Check your OpenAI API key:
```bash
# In command-center-ui/.env
OPENAI_API_KEY=sk-...
```

### Stats showing 0 everywhere

**Fix:**
1. Make sure Supabase tables exist (see SUPABASE-SETUP.md in website-audit-tool)
2. Run through the complete workflow at least once
3. Refresh the page

---

## Cost Estimates

### Per Lead (Full Pipeline)

**Prospect Generation:** $0.001 per company
- Uses GPT-4o-mini for company discovery

**Website Analysis:** $0.04-0.12 per site
- Basic + SEO: ~$0.04
- With Visual + Competitor: ~$0.12

**Email Composition:** $0.002-0.005 per email
- Uses Claude Sonnet or GPT for personalized writing

**Total per lead:** ~$0.05-0.13

### Monthly Examples

| Volume | Basic Analysis | Full Analysis |
|--------|----------------|---------------|
| 50 leads/month | ~$2.50 | ~$6.50 |
| 100 leads/month | ~$5.00 | ~$13.00 |
| 500 leads/month | ~$25.00 | ~$65.00 |

---

## Next Steps

### 1. Run Your First Campaign

Generate 10-20 prospects → Analyze → Compose emails → Send

### 2. Set Up Notion Sync (Optional)

1. Create Notion integration at [notion.so/my-integrations](https://notion.so/my-integrations)
2. Create a database for emails
3. Add credentials to `email-composer/.env`:
   ```bash
   NOTION_API_KEY=secret_...
   NOTION_DATABASE_ID=...
   ```
4. Restart email-composer
5. Emails will auto-sync to Notion for review

### 3. Customize Your Brief

Edit the brief in the Prospects tab to match your ICP:
- Target industries
- Company size
- Geographic focus
- Buyer triggers
- Exclusions

### 4. Monitor Performance

Check the Overview tab for:
- Conversion rates (prospects → leads with email)
- Email quality scores
- Pipeline health

---

## Architecture Overview

```
command-center-ui/
├─ app/
│  ├─ page.tsx                 # Main entry
│  ├─ layout.tsx               # Root layout
│  └─ api/                     # API routes
│     ├─ prospects/            # Generate prospects
│     ├─ analyze/              # Run analyzer
│     ├─ leads/                # Fetch leads
│     ├─ compose/              # Compose emails
│     ├─ emails/               # Fetch emails
│     └─ stats/                # Dashboard stats
│
├─ components/
│  ├─ unified-dashboard.tsx    # Main tabbed UI
│  ├─ stats-overview.tsx       # Overview tab
│  ├─ prospect-form.tsx        # Brief editor
│  ├─ prospect-table.tsx       # Prospect results
│  ├─ analyzer-panel.tsx       # Analysis config
│  ├─ leads-table.tsx          # Analyzed leads
│  └─ email-composer.tsx       # Email generation
│
├─ .env                        # Your credentials
├─ .env.example                # Template
├─ package.json                # Dependencies
└─ README.md                   # Documentation
```

---

## Support

**Built by Maksant**
- Website: [maksant.com](https://maksant.com)
- Email: maksantagency@gmail.com

**Documentation:**
- Command Center UI: `command-center-ui/README.md`
- Website Audit Tool: `website-audit-tool/README.md`
- Email Composer: `email-composer/README.md`
- Client Orchestrator: `client-orchestrator/README.md`

---

**Ready to generate leads? Start the UI and click the Prospects tab!**
