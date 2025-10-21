# Outreach Engine Database

The Outreach Engine uses Supabase PostgreSQL for data storage. This directory contains the schema definition and migration scripts.

---

## Database Schema

### Main Table: `composed_emails`

Stores both email and social DM outreach messages.

**Location**: [schemas/composed_emails.json](schemas/composed_emails.json)

**Key columns**:
- `id` (uuid) - Primary key
- `lead_id` (uuid) - Foreign key to `leads` table
- `platform` (text) - 'email', 'instagram', 'facebook', 'linkedin'
- `email_subject` / `email_body` - Message content
- `status` (text) - 'pending', 'approved', 'sent', 'failed'
- `quality_score` (integer) - Validation score (0-100)
- `ai_model` (text) - Model used for generation
- `generation_cost` (numeric) - Cost in dollars
- `created_at` / `updated_at` - Timestamps

---

## Database Setup

### Option A: Automatic Setup (Recommended)

Use the centralized database-tools from the project root:

```bash
cd ../database-tools

# Validate all schemas
npm run db:validate

# Preview SQL that will be generated
npm run db:setup -- --dry-run

# Create/update tables
npm run db:setup
```

This creates tables across all engines including `composed_emails`.

### Option B: Manual Setup via Supabase UI

1. Go to Supabase Dashboard → SQL Editor
2. Run the migrations in order (see Migrations section below)

---

## Migrations

### Pending Migrations

The following migrations need to be run manually in your Supabase database:

**Migration 001**: Add missing columns
- **File**: [migrations/001-add-missing-columns.sql](migrations/001-add-missing-columns.sql)
- **Purpose**: Adds variant columns, quality metrics, AI metadata
- **Status**: Pending - run if you need A/B testing or quality tracking

**Migration 002**: Merge social & email tables
- **File**: [migrations/002-merge-social-to-composed-emails.sql](migrations/002-merge-social-to-composed-emails.sql)
- **Purpose**: Consolidates `social_outreach` into `composed_emails`
- **Status**: Pending - run to unify data model
- **Guide**: [migrations/docs/MERGE-TABLES-GUIDE.md](migrations/docs/MERGE-TABLES-GUIDE.md)

**Migration 003**: Cleanup unused columns
- **File**: [migrations/003-cleanup-unused-columns.sql](migrations/003-cleanup-unused-columns.sql)
- **Purpose**: Removes redundant/unused columns
- **Status**: Pending - run after migration 001 & 002
- **Guide**: [migrations/docs/RUN-CLEANUP.md](migrations/docs/RUN-CLEANUP.md)

### How to Run Migrations

**Via Supabase Dashboard** (easiest):
1. Open Supabase Dashboard → SQL Editor
2. Click "New query"
3. Copy contents of migration SQL file
4. Paste and click "Run"

**Via psql** (if you have it installed):
```bash
psql "your-supabase-connection-string" -f migrations/001-add-missing-columns.sql
```

**Via migration runner**:
```bash
node database/run-migration.js migrations/001-add-missing-columns.sql
```

### Migration Status Check

Check what's currently in your database:

```bash
# View current schema
node scripts/check-table-usage.js

# Check if specific columns exist
node -e "
import { supabase } from './integrations/database.js';
const { data } = await supabase.from('composed_emails').select('*').limit(1);
console.log('Columns:', Object.keys(data[0] || {}));
"
```

---

## Current System Status

The Outreach Engine **currently works** with the basic `composed_emails` table structure. The migrations are **optional enhancements** that add:

- ✅ **Migration 001**: A/B variant tracking, quality scores, detailed metadata
- ✅ **Migration 002**: Unified email + social DM storage (recommended)
- ✅ **Migration 003**: Cleaner schema (removes unused columns)

**You can start using the Outreach Engine immediately** - migrations can be applied later when needed.

---

## Supabase Client

**Location**: [supabase-client.js](supabase-client.js)

Main database functions:
- `saveComposedEmail(data)` - Save generated email/DM
- `getComposedEmailById(id)` - Get email by ID
- `getReadyEmails(limit)` - Get approved emails ready to send
- `updateEmailStatus(id, status)` - Update email status
- `getStats()` - Get email statistics

---

## Environment Variables

Required in `.env`:

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
```

**Note**: Use the **service role key**, not the anon key, for server-side operations.

---

## Testing Database Connection

```bash
# Quick test
node -e "
import { supabase } from './integrations/database.js';
const { data, error } = await supabase.from('composed_emails').select('count');
console.log(error ? '❌ Error: ' + error.message : '✅ Connected!');
"

# View leads
node scripts/check-leads.js

# View composed emails
node scripts/show-all-leads.js
```

---

## Schema JSON Format

Schemas are defined in JSON for use with the centralized `database-tools/` system:

```json
{
  "tableName": "composed_emails",
  "columns": [
    { "name": "id", "type": "uuid", "primaryKey": true, "default": "gen_random_uuid()" },
    { "name": "lead_id", "type": "uuid" },
    { "name": "email_subject", "type": "text" }
  ],
  "foreignKeys": [
    {
      "column": "lead_id",
      "references": "leads.id",
      "onDelete": "SET NULL"
    }
  ],
  "indexes": [
    { "columns": ["status"] },
    { "columns": ["platform"] }
  ]
}
```

See [database-tools/README.md](../../database-tools/README.md) for full schema format documentation.

---

## Troubleshooting

**"permission denied for table"**
- Make sure you're using `SUPABASE_SERVICE_KEY`, not `SUPABASE_ANON_KEY`

**"relation does not exist"**
- Table not created yet - run `npm run db:setup` from database-tools

**"column does not exist"**
- You may need to run pending migrations (001, 002, 003)
- Check current schema with `scripts/check-table-usage.js`

**"connection refused"**
- Verify `SUPABASE_URL` in `.env`
- Check Supabase project is not paused

---

## Related Documentation

- [../../database-tools/README.md](../../database-tools/README.md) - Centralized schema management
- [../README.md](../README.md) - Outreach Engine main documentation
- [migrations/docs/MERGE-TABLES-GUIDE.md](migrations/docs/MERGE-TABLES-GUIDE.md) - Table consolidation guide
- [migrations/docs/RUN-CLEANUP.md](migrations/docs/RUN-CLEANUP.md) - Column cleanup guide