# 🔧 Database Migration Required

## Current Status

**GPT-5 Integration**: ✅ **READY**
- All prompts updated to use GPT-5
- GPT-5 temperature compatibility fixed
- Lead scorer tested and working
- AI scoring code implemented

**Database Schema**: ⚠️ **5 COLUMNS MISSING**

### Columns Status

✅ **Already Exist** (8/13):
- `quality_gap_score` (INTEGER)
- `budget_score` (INTEGER)
- `urgency_score` (INTEGER)
- `industry_fit_score` (INTEGER)
- `company_size_score` (INTEGER)
- `engagement_score` (INTEGER)
- `business_intelligence` (JSONB)
- `crawl_metadata` (JSONB)

❌ **Missing** (5/13):
- `lead_priority` (INTEGER) - Overall priority score 0-100
- `lead_priority_reasoning` (TEXT) - AI explanation
- `priority_tier` (TEXT) - hot/warm/cold
- `budget_likelihood` (TEXT) - high/medium/low
- `fit_score` (INTEGER) - ICP fit score 0-100

---

## 📋 Migration Instructions

### Option 1: Supabase SQL Editor (Recommended)

1. **Go to Supabase Dashboard**:
   - Visit: https://supabase.com/dashboard/project/njejsagzeebvsupzffpd
   - Navigate to: **SQL Editor** → **New Query**

2. **Copy and paste this SQL**:

```sql
-- Add AI Lead Scoring Columns
ALTER TABLE leads ADD COLUMN IF NOT EXISTS lead_priority INTEGER;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS lead_priority_reasoning TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS priority_tier TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS budget_likelihood TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS fit_score INTEGER;

-- Add column documentation
COMMENT ON COLUMN leads.lead_priority IS 'Overall lead priority score (0-100) calculated by AI';
COMMENT ON COLUMN leads.lead_priority_reasoning IS 'AI explanation of why this priority score was assigned';
COMMENT ON COLUMN leads.priority_tier IS 'Priority tier: hot (75-100), warm (50-74), or cold (0-49)';
COMMENT ON COLUMN leads.budget_likelihood IS 'Budget likelihood assessment: high, medium, or low';
COMMENT ON COLUMN leads.fit_score IS 'How well the prospect matches ICP (0-100)';
```

3. **Click "Run"**

4. **Verify columns were added**:

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'leads'
  AND column_name IN (
    'lead_priority',
    'lead_priority_reasoning',
    'priority_tier',
    'budget_likelihood',
    'fit_score'
  )
ORDER BY column_name;
```

You should see all 5 columns listed.

### Option 2: Using Migration File

The complete migration SQL is available at:
```
analysis-engine/migrations/001_add_ai_scoring_columns.sql
```

---

## ✅ Post-Migration: Run E2E Test

Once columns are added, verify everything works:

### 1. Start All Services

```bash
npm run dev
```

Wait for all services to start:
- ✅ Prospecting Engine (port 3010)
- ✅ Analysis Engine (port 3001)
- ✅ Outreach Engine (port 3002)
- ✅ Command Center UI (port 3000)

### 2. Run GPT-5 E2E Test

```bash
cd analysis-engine
node test-gpt5-results.js
```

This will check the most recent lead and verify all AI scoring data is present.

### 3. Check Latest Lead

```bash
cd analysis-engine
node check-latest.js
```

Expected output:
```
✅ MOST RECENT LEAD - GPT-5 E2E TEST
Company: [Company Name]
Grade: A (92)

AI Lead Scoring:
  Priority: ✅ 85/100
  Tier: ✅ HOT
  Budget: ✅ HIGH

Dimension Scores:
  Quality Gap: ✅ 22/25
  Budget: ✅ 23/25

Business Intel: ✅ PRESENT
Crawl Metadata: ✅ PRESENT

✅ ✅ ✅  ALL DATA SAVED - GPT-5 E2E TEST PASSED!  ✅ ✅ ✅
```

---

## 🎯 Why This Migration Is Needed

The Analysis Engine now uses **GPT-5** to score leads on 6 dimensions:

1. **Quality Gap** (0-25 pts): How much improvement potential exists
2. **Budget** (0-25 pts): Estimated budget capacity
3. **Urgency** (0-20 pts): How urgently they need help
4. **Industry Fit** (0-15 pts): Match with target industry
5. **Company Size** (0-10 pts): Company size assessment
6. **Engagement** (0-5 pts): Social media engagement

These scores are combined into:
- **lead_priority**: Overall score 0-100
- **priority_tier**: HOT (75-100), WARM (50-74), COLD (0-49)
- **budget_likelihood**: HIGH, MEDIUM, LOW
- **fit_score**: How well they match ICP

Without these columns, the data cannot be saved and the leads table shows zeros/nulls.

---

## 🔍 Troubleshooting

### Migration runs but columns still missing?

Check if you're connected to the correct database:

```sql
SELECT current_database(), current_schema();
```

Should return: `postgres` and `public`

### Permission errors?

Ensure you're using the **service_role** key, not the anon key.

### Still having issues?

Check Supabase logs:
1. Dashboard → **Logs** → **Postgres Logs**
2. Look for ALTER TABLE errors

---

## 📁 Files Created

- `analysis-engine/migrations/001_add_ai_scoring_columns.sql` - Complete SQL migration
- `analysis-engine/migrations/add-ai-scoring-columns.js` - Column checker script
- `analysis-engine/migrations/run-migration.js` - Migration helper
- `scripts/create-sql-executor-rpc.sql` - RPC function for future migrations
- `MIGRATION-REQUIRED.md` - This file

---

**Status**: Waiting for database migration to complete ⏳

Once migration is done, the entire GPT-5 analysis pipeline will be fully operational!
