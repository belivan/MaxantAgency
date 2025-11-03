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

---

# Database Migration: Rate Limit Tracking (2025-11-03)

## Overview
This migration adds support for tracking rate limit errors and retry attempts in the `ai_calls` table.

## New Columns Added
- `retry_count` (INTEGER) - Number of retry attempts needed due to rate limits
- `rate_limit_hit` (BOOLEAN) - True if this call hit a 429 rate limit error

## How to Run the Migration

### Option 1: Supabase Dashboard (Recommended)

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard/)
2. Select your project
3. Navigate to **SQL Editor** in the left sidebar
4. Click **New Query**
5. Copy the contents of `add-rate-limit-fields.sql`
6. Paste into the SQL editor
7. Click **Run** or press `Ctrl+Enter`

### Option 2: Command Line (psql)

```bash
psql "postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres" -f migrations/add-rate-limit-fields.sql
```

## Verify Migration Success

Run this query in Supabase SQL Editor:
```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'ai_calls'
  AND column_name IN ('retry_count', 'rate_limit_hit');
```

Expected output:
- `retry_count` (integer, default: 0)
- `rate_limit_hit` (boolean, default: false)

## Rollback Procedure

If you need to rollback:
```sql
ALTER TABLE ai_calls DROP COLUMN IF EXISTS retry_count;
ALTER TABLE ai_calls DROP COLUMN IF EXISTS rate_limit_hit;
DROP INDEX IF EXISTS idx_ai_calls_rate_limit_hit;
DROP INDEX IF EXISTS idx_ai_calls_retry_count;
```

## Useful Queries After Migration

### Check for rate limit issues:
```sql
SELECT
  DATE_TRUNC('hour', created_at) as hour,
  engine,
  model,
  COUNT(*) as total_calls,
  SUM(CASE WHEN rate_limit_hit THEN 1 ELSE 0 END) as rate_limit_hits,
  AVG(retry_count) as avg_retries
FROM ai_calls
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY hour, engine, model
HAVING SUM(CASE WHEN rate_limit_hit THEN 1 ELSE 0 END) > 0
ORDER BY hour DESC, rate_limit_hits DESC;
```

### Find which models hit rate limits most:
```sql
SELECT
  provider,
  model,
  COUNT(*) as calls_with_rate_limits,
  AVG(retry_count) as avg_retries,
  MAX(retry_count) as max_retries
FROM ai_calls
WHERE rate_limit_hit = true
GROUP BY provider, model
ORDER BY calls_with_rate_limits DESC;
```

### Analyze retry patterns:
```sql
SELECT
  retry_count,
  COUNT(*) as occurrences,
  ROUND(AVG(duration_ms)) as avg_duration_ms,
  ROUND(AVG(cost)::numeric, 4) as avg_cost
FROM ai_calls
WHERE retry_count > 0
GROUP BY retry_count
ORDER BY retry_count;
```

## What This Enables

✅ **Rate Limit Monitoring** - Track when and how often you hit API rate limits
✅ **Cost Analysis** - See how retries affect costs and duration
✅ **Provider Comparison** - Identify which providers have the most rate limit issues
✅ **Capacity Planning** - Data-driven decisions on tier upgrades
✅ **Alerting** - Set up alerts when rate limit hits exceed thresholds
✅ **Performance Analysis** - Correlate retry counts with response times
