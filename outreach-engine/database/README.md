# Database Migration Instructions

## Step 1: Run the SQL Migration

The `composed_emails` table is missing some columns. To fix this:

1. Go to your Supabase project dashboard
2. Click on "SQL Editor" in the left sidebar
3. Click "New query"
4. Copy the contents of `migrations/001-add-missing-columns.sql`
5. Paste into the SQL editor
6. Click "Run" or press Ctrl+Enter

The migration will add these missing columns:
- `created_at` and `updated_at` (timestamps)
- `ai_model`, `generation_cost`, `generation_time_ms`
- `usage_input_tokens`, `usage_output_tokens`
- `quality_score`, `validation_issues`
- `has_variants`, `subject_variants`, `body_variants`, `recommended_variant`, `variant_reasoning`
- `industry`, `contact_name`, `contact_title`

## Step 2: Verify

After running the migration, you should see output like:
```
NOTICE:  Added created_at column
NOTICE:  Added updated_at column
NOTICE:  Added ai_model column
...
NOTICE:  ✅ Migration completed successfully!
```

## Step 3: Test

Run the tests to verify everything works:
```bash
cd outreach-engine
node tests/test-phase3-integration.js
```

## Alternative: Use psql

If you have psql installed and your Supabase connection string:

```bash
psql "your-supabase-connection-string" -f migrations/001-add-missing-columns.sql
```

## Troubleshooting

If you get "column already exists" errors, that's OK - the migration is safe to run multiple times.

If you get permission errors, make sure you're using your Supabase service role key, not the anon key.
