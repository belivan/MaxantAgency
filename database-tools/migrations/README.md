# Database Migration: Model Selection Tracking

## Overview
This migration adds support for tracking which AI models and prompts were used for prospecting and analysis on each project.

## New Columns Added
- `prospecting_model_selections` (JSONB) - Which AI models were selected for prospecting modules
- `analysis_model_selections` (JSONB) - Which AI models were selected for analysis modules

These columns work alongside the existing:
- `prospecting_prompts` (JSONB) - Custom prompts used for prospecting
- `analysis_prompts` (JSONB) - Custom prompts used for analysis

## How to Run the Migration

### Option 1: Supabase Dashboard (Recommended)
1. Go to your Supabase project dashboard
2. Navigate to: **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy and paste the contents of `add-model-selections.sql`
5. Click **Run** (or press `Ctrl/Cmd + Enter`)
6. Verify success - you should see a table showing the new columns

### Option 2: Via psql CLI
```bash
psql "your-supabase-connection-string" -f add-model-selections.sql
```

### Option 3: Via Supabase CLI
```bash
supabase db execute < add-model-selections.sql
```

## Verify Migration Success

Run this query in Supabase SQL Editor:
```sql
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'projects'
  AND column_name LIKE '%model%'
ORDER BY column_name;
```

You should see:
- `analysis_model_selections` (jsonb, YES)
- `prospecting_model_selections` (jsonb, YES)

## Testing

After running the migration, test with:
```bash
# From project root
node test-model-selections-e2e.js
```

This will:
1. ✅ Verify database schema
2. ✅ Create a test project with model selections
3. ✅ Load and verify the data
4. ✅ Test auto-fork functionality
5. ✅ Query projects by model usage
6. ✅ Clean up test data

## Rollback (if needed)

To remove the columns:
```sql
ALTER TABLE projects
DROP COLUMN IF EXISTS prospecting_model_selections,
DROP COLUMN IF EXISTS analysis_model_selections;
```

**⚠️ Warning:** This will permanently delete all model selection data!

## Example Data Structure

### prospecting_model_selections
```json
{
  "queryUnderstanding": "grok-4-fast",
  "websiteExtraction": "gpt-4o-vision",
  "relevanceCheck": "claude-haiku-4-5"
}
```

### analysis_model_selections
```json
{
  "design": "gpt-4o",
  "seo": "grok-4",
  "content": "claude-sonnet-4-5",
  "social": "grok-4-fast"
}
```

## What This Enables

✅ **Historical Tracking** - Know exactly which AI models were used for each project
✅ **Cost Analysis** - Track which models are being used most frequently
✅ **Quality Comparison** - Compare results across different model configurations
✅ **Auto-Fork Support** - Preserved when projects are forked with new settings
✅ **Auditing** - Complete audit trail of AI usage

## Next Steps

Once migration is complete:
1. Run the E2E test to verify everything works
2. The UI will automatically start saving model selections on first generation
3. Existing projects will have `null` for these fields (that's expected)
4. New projects and auto-forks will preserve model selections
