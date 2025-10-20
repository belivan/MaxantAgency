# Run Column Cleanup Migration

## Quick Steps:

1. **Open Supabase Dashboard** → SQL Editor
2. **Copy** the file: `outreach-engine/database/migrations/003-cleanup-unused-columns.sql`
3. **Paste** into SQL Editor
4. **Click Run**

## What This Removes:

### Redundant Columns:
- `outreach_type` ← **This one you asked about!** (redundant with `platform`)
- `message_body` (duplicate of `email_body`)
- `composed_at` (use `created_at` instead)

### Unused Columns:
- `business_reasoning`
- `verification_data`, `verified_at`, `website_verified`
- `screenshot_urls`
- `reviewed_notes`

## What Stays:

✅ All core columns (platform, email_subject, email_body, etc.)
✅ Future feature columns (gmail_message_id, opened_at, replied_at, etc.)
✅ All your existing data

## Expected Output:

```
NOTICE:  Dropped outreach_type column (redundant with platform)
NOTICE:  Dropped message_body column (use email_body for all content)
NOTICE:  Dropped business_reasoning column
NOTICE:  Dropped composed_at column (use created_at)
NOTICE:  Dropped verification_data column
NOTICE:  Dropped verified_at column
NOTICE:  Dropped website_verified column
NOTICE:  Dropped screenshot_urls column
NOTICE:  Dropped reviewed_notes column
NOTICE:  ✅ Cleanup completed!
```

## After Running:

Run this to verify:
```bash
cd outreach-engine
node -e "
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const { data } = await supabase.from('composed_emails').select('*').limit(1);
const columns = Object.keys(data[0]);

console.log('Removed columns check:');
console.log('  outreach_type:', columns.includes('outreach_type') ? '❌ Still there' : '✅ Removed');
console.log('  message_body:', columns.includes('message_body') ? '❌ Still there' : '✅ Removed');
console.log('  composed_at:', columns.includes('composed_at') ? '❌ Still there' : '✅ Removed');
console.log('\nTotal columns:', columns.length);
"
```

## Safe to Run?

✅ **YES** - No data will be lost, only empty/redundant columns removed
✅ Can be run multiple times safely (checks if columns exist first)
