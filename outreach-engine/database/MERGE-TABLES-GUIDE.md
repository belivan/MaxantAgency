# Merge Social & Email Tables - Migration Guide

## What Changed?

**Before:** Two separate tables
- `composed_emails` → for emails only
- `social_outreach` → for social DMs (EMPTY, not being used)

**After:** ONE unified table
- `composed_emails` → handles BOTH emails AND social DMs
- `social_outreach` → DELETED

## Benefits

✅ Simpler - everything in one place
✅ Easier to manage - one table to query
✅ Less confusion - no duplicate schemas
✅ `platform` column distinguishes: email, instagram, facebook, linkedin

## Run the Migration

### Option 1: Via Supabase Dashboard (Recommended)

1. Open Supabase Dashboard → SQL Editor
2. Click "New query"
3. Copy the contents of `migrations/002-merge-social-to-composed-emails.sql`
4. Paste and click "Run"

You should see:
```
NOTICE:  Added platform column
NOTICE:  Added character_count column
NOTICE:  Added social_profile_url column
NOTICE:  Dropped social_outreach table
NOTICE:  ✅ Migration completed successfully!
```

### Option 2: Via psql

```bash
psql "your-supabase-connection-string" -f migrations/002-merge-social-to-composed-emails.sql
```

## What This Does

### Adds 3 New Columns to `composed_emails`:

1. **platform** (text, default 'email')
   - Values: `email`, `instagram`, `facebook`, `linkedin`, `twitter`
   - Indexed for fast filtering

2. **character_count** (integer)
   - For social DMs (Instagram 1000, Facebook 20k, LinkedIn 8k)

3. **social_profile_url** (text)
   - Link to prospect's social profile

### Drops Table:

- **social_outreach** → Deleted (was empty, not being used)

## After Migration

### Query Examples:

```sql
-- Get all emails
SELECT * FROM composed_emails WHERE platform = 'email';

-- Get Instagram DMs
SELECT * FROM composed_emails WHERE platform = 'instagram';

-- Get all social DMs
SELECT * FROM composed_emails WHERE platform != 'email';

-- Get everything
SELECT * FROM composed_emails;
```

### Code Changes:

✅ **Already done** - code now saves to `composed_emails` with platform set
✅ **Schema updated** - `composed_emails.json` includes social fields
✅ **Old schema deleted** - `social_outreach.json` removed

## Verification

After running migration, check:

```bash
cd outreach-engine
node check-table-usage.js
```

Should show:
- ✅ `composed_emails` exists with new columns
- ❌ `social_outreach` no longer exists

## Rollback (if needed)

If you need to undo this:

```sql
BEGIN;

-- Remove new columns
ALTER TABLE composed_emails DROP COLUMN IF EXISTS platform;
ALTER TABLE composed_emails DROP COLUMN IF EXISTS character_count;
ALTER TABLE composed_emails DROP COLUMN IF EXISTS social_profile_url;

COMMIT;
```

Note: This won't recreate `social_outreach` - you'd need to restore that separately if really needed.

## Questions?

- **Will this delete my existing emails?** NO - existing data stays intact
- **Do I lose data?** NO - `social_outreach` was empty
- **Can I undo this?** YES - see Rollback section above
- **Do I need to change code?** NO - already updated
