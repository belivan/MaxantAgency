# Database Setup Tool

Automated Supabase database setup utility for MaxantAgency. This CLI tool reads JSON schema definitions from all agents, generates SQL, and executes migrations - setting up your entire database with one command.

## Features

- Scans all agents for database schema files
- Validates schema definitions
- Generates SQL (CREATE TABLE, INDEX, CONSTRAINTS)
- Resolves table dependencies automatically
- Executes SQL on Supabase
- Migration tracking
- Seed data management
- Dry-run mode for SQL preview

## Installation

```bash
cd database-tools
npm install
```

## Configuration

1. Copy the environment template:
```bash
cp .env.template .env
```

2. Edit `.env` and add your Supabase credentials:
```env
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key-here
```

Find these values in your Supabase project:
- Dashboard → Project Settings → API

## Commands

### 1. Setup (Fresh Install)

Creates all tables, indexes, and constraints from schema files:

```bash
npm run db:setup
```

Options:
- `--dry-run` - Preview SQL without executing
- `--verbose` - Show detailed logs
- `--skip-constraints` - Create tables only, skip foreign keys
- `--force` - Drop existing tables and recreate

Examples:
```bash
# Preview SQL before running
npm run db:setup -- --dry-run

# Fresh setup with verbose logging
npm run db:setup -- --force --verbose

# Setup without foreign keys (useful for testing)
npm run db:setup -- --skip-constraints
```

### 2. Validate

Checks all schema files for errors:

```bash
npm run db:validate
```

Shows:
- Schema validation errors
- Warnings (missing indexes, etc.)
- Circular dependency detection

### 3. Migrate

Applies database migrations from `migrations/` directory:

```bash
npm run db:migrate
```

Options:
- `--version <version>` - Migrate to specific version
- `--rollback` - Rollback last migration
- `--verbose` - Show detailed logs

### 4. Seed

Inserts example/test data:

```bash
npm run db:seed
```

Options:
- `--reset` - Clear existing data first

## Schema Format

Place schema files in: `{agent}/database/schemas/{table}.json`

Example schema:

```json
{
  "table": "prospects",
  "description": "Companies discovered during prospecting",

  "columns": [
    {
      "name": "id",
      "type": "uuid",
      "primaryKey": true,
      "default": "gen_random_uuid()"
    },
    {
      "name": "company_name",
      "type": "text",
      "required": true,
      "index": true
    },
    {
      "name": "status",
      "type": "text",
      "enum": ["active", "inactive"],
      "default": "active"
    },
    {
      "name": "created_at",
      "type": "timestamptz",
      "default": "now()"
    }
  ],

  "indexes": [
    {
      "name": "idx_prospects_status_city",
      "columns": ["status", "city"],
      "unique": false
    }
  ],

  "foreignKeys": [
    {
      "column": "project_id",
      "references": "projects.id",
      "onDelete": "SET NULL",
      "onUpdate": "CASCADE"
    }
  ]
}
```

### Supported Column Types

- Text: `text`, `varchar`
- Numbers: `integer`, `bigint`, `decimal`, `numeric`
- UUID: `uuid`
- Boolean: `boolean`
- JSON: `json`, `jsonb`
- Timestamps: `timestamp`, `timestamptz`, `date`, `time`

### Column Modifiers

- `required: true` - NOT NULL
- `unique: true` - UNIQUE constraint
- `primaryKey: true` - PRIMARY KEY
- `index: true` - Create index
- `default: "value"` - DEFAULT value
- `enum: ["val1", "val2"]` - CHECK constraint
- `foreignKey: "table.id"` - Foreign key reference

## Directory Structure

```
database-tools/
├── cli.js                  # Main CLI entrypoint
├── setup.js                # Setup command
├── validate.js             # Validate command
├── migrate.js              # Migration command
├── seed.js                 # Seed command
│
├── generators/             # SQL generation
│   ├── table-generator.js
│   ├── index-generator.js
│   ├── constraint-generator.js
│   └── sql-generator.js
│
├── runners/                # Execution
│   ├── dependency-resolver.js
│   └── supabase-runner.js
│
├── validators/             # Validation
│   ├── schema-validator.js
│   └── sql-validator.js
│
├── shared/                 # Utilities
│   ├── logger.js
│   └── schema-loader.js
│
├── migrations/             # Migration files
│   └── history.json
│
├── seeds/                  # Seed data
│   └── example-prospects.json
│
└── templates/              # SQL templates
    ├── table-template.sql
    └── index-template.sql
```

## Workflow

### First Time Setup (New Developer)

```bash
# 1. Clone repo
git clone https://github.com/you/MaxantAgency.git

# 2. Install dependencies
cd database-tools
npm install

# 3. Configure Supabase
cp .env.template .env
# Edit .env with your credentials

# 4. Validate schemas
npm run db:validate

# 5. Preview setup
npm run db:setup -- --dry-run

# 6. Run setup
npm run db:setup

# 7. (Optional) Add seed data
npm run db:seed
```

### After Adding a New Table

```bash
# 1. Create schema file
# Example: prospecting-engine/database/schemas/new_table.json

# 2. Validate
npm run db:validate

# 3. Run migration (or re-run setup)
npm run db:migrate
```

### Before Deploying Changes

```bash
# Always validate first
npm run db:validate

# Preview SQL
npm run db:setup -- --dry-run

# Then deploy
npm run db:setup
```

## Backup Management System

MaxantAgency uses a **local-first persistence** pattern to protect data from database failures. All engines save data locally before attempting cloud uploads, ensuring zero data loss.

### Architecture

```
local-backups/
├── prospecting-engine/
│   ├── prospects/        # All prospects (uploaded and pending)
│   └── failed-uploads/   # Prospects that failed to upload
├── analysis-engine/
│   ├── leads/           # All leads (uploaded and pending)
│   └── failed-uploads/  # Leads that failed to upload
└── outreach-engine/     # (future)
    ├── composed_emails/
    └── failed-uploads/
```

**Workflow:**
1. 💾 **Save locally first** (before database upload)
2. ☁️ Attempt database upload
3. ✅ Mark as uploaded (if successful)
4. ⚠️ Move to failed-uploads/ (if failed)
5. 🔄 Retry later using centralized utilities

### Centralized Management Tools

#### 1. Backup Statistics Dashboard

View backup health across all engines:

```bash
# View all engines
npm run backup:stats

# Live updates every 5 seconds
npm run backup:stats:watch

# JSON output for automation
npm run backup:stats:json

# Specific engine only
node database-tools/scripts/backup-stats.js --engine prospecting-engine
```

**Example Output:**
```
╔════════════════════════════════════════════════════╗
║  BACKUP SYSTEM HEALTH DASHBOARD                   ║
╚════════════════════════════════════════════════════╝

Prospecting Engine:
  Total Backups:      18
  ├─ Uploaded:         0
  ├─ Pending:          0
  └─ Failed:          18

  Storage Used:       2.4 MB

Analysis Engine:
  Total Backups:       2
  ├─ Uploaded:         1
  ├─ Pending:          0
  └─ Failed:           1

  Storage Used:       145 KB

══════════════════════════════════════════════════════
SYSTEM TOTALS:
  Total Backups:      20
  Failed Uploads:     19 ⚠️
  Storage Used:       2.5 MB
  Success Rate:       5%
══════════════════════════════════════════════════════
```

#### 2. Retry Failed Uploads

Retry all failed uploads across engines:

```bash
# Retry all engines
npm run backup:retry

# Retry specific engine
node database-tools/scripts/retry-failed-uploads.js --engine prospecting-engine

# Preview mode (no changes)
node database-tools/scripts/retry-failed-uploads.js --dry-run

# Link to specific project (for prospects)
node database-tools/scripts/retry-failed-uploads.js --project-id <uuid>
```

**What it does:**
- Scans all `failed-uploads/` directories
- Attempts to upload each backup to Supabase
- Moves successful uploads to main directory
- Keeps failures in failed-uploads/ with updated error

#### 3. Cleanup Old Backups

Archive uploaded backups older than N days to save disk space:

```bash
# Delete uploaded backups older than 30 days (default)
npm run backup:cleanup

# Custom retention (90 days)
node database-tools/scripts/cleanup-old-backups.js --days 90

# Specific engine only
node database-tools/scripts/cleanup-old-backups.js --engine analysis-engine

# Preview mode (see what would be deleted)
node database-tools/scripts/cleanup-old-backups.js --dry-run

# Detailed output
node database-tools/scripts/cleanup-old-backups.js --verbose
```

**Safety:**
- ✅ Only deletes backups marked as `uploaded_to_db: true`
- ✅ **NEVER** deletes pending uploads
- ✅ **NEVER** deletes failed uploads
- ✅ Dry-run mode to preview changes

#### 4. Validate Backups

Check integrity of all backup files:

```bash
npm run backup:validate
```

**Validates:**
- ✅ JSON is valid (can be parsed)
- ✅ Required fields present (`saved_at`, `data`, `uploaded_to_db`, `upload_status`)
- ✅ Timestamps are valid dates
- ✅ Upload status is valid enum (`pending`/`uploaded`/`failed`)

### Using BackupManager in Your Engine

#### Step 1: Create Wrapper

Create `{engine}/utils/local-backup.js`:

```javascript
import { BackupManager } from '../../database-tools/shared/backup-manager.js';

// Initialize with engine-specific config
const backup = new BackupManager('prospecting-engine', {
  subdirectories: ['prospects', 'failed-uploads']
});

// Export wrapper functions for backward compatibility
export async function saveLocalBackup(prospectData) {
  return backup.saveBackup(prospectData, {
    company_name: prospectData.company_name,
    industry: prospectData.industry,
    city: prospectData.city,
    website: prospectData.website
  });
}

export async function markAsUploaded(backupPath, dbId) {
  return backup.markAsUploaded(backupPath, dbId);
}

export async function markAsFailed(backupPath, errorMessage) {
  return backup.markAsFailed(backupPath, errorMessage);
}

export async function getBackupStats() {
  return backup.getBackupStats();
}

export async function getPendingUploads() {
  return backup.getPendingUploads();
}

export async function getFailedUploads() {
  return backup.getFailedUploads();
}

export async function retryFailedUpload(backupPath, uploadFn) {
  return backup.retryFailedUpload(backupPath, uploadFn);
}
```

#### Step 2: Integrate into Orchestrator

Use the local-first pattern in your orchestrator:

```javascript
import { saveLocalBackup, markAsUploaded, markAsFailed } from './utils/local-backup.js';

// ALWAYS save locally FIRST
const backupPath = await saveLocalBackup(prospectData);

try {
  // Attempt database upload
  const { data, error } = await supabase
    .from('prospects')
    .insert(prospectData)
    .select()
    .single();

  if (error) throw error;

  // Mark as successfully uploaded
  await markAsUploaded(backupPath, data.id);

} catch (dbError) {
  // Database failed, but we have local backup!
  await markAsFailed(backupPath, dbError.message);

  // Still count as "saved" because local backup exists
  console.log('Saved locally (database failed):', backupPath);
}
```

### Backup File Format

Each backup is a JSON file with this structure:

```json
{
  "saved_at": "2025-10-21T19:26:23.014Z",
  "company_name": "Example Company",
  "industry": "Restaurant",
  "city": "Philadelphia",
  "website": "https://example.com",
  "data": {
    /* Full prospect/lead data object */
  },
  "uploaded_to_db": false,
  "upload_status": "pending",
  "database_id": null,
  "uploaded_at": null
}
```

**Upload statuses:**
- `pending` - Not yet uploaded to database
- `uploaded` - Successfully uploaded (includes `database_id`, `uploaded_at`)
- `failed` - Upload failed (includes `upload_error`, `failed_at`)

### BackupManager API Reference

**Core Methods:**

```javascript
// Save backup locally (returns filepath)
await backup.saveBackup(data, metadata)

// Mark as uploaded (updates file with DB ID)
await backup.markAsUploaded(backupPath, dbId)

// Mark as failed (moves to failed-uploads/)
await backup.markAsFailed(backupPath, errorMessage)

// Get statistics
await backup.getBackupStats()
// Returns: { total_backups, uploaded, pending_upload, failed_uploads, success_rate }

// Get pending uploads
await backup.getPendingUploads()
// Returns: [{ filepath, filename, backup: {...} }]

// Get failed uploads
await backup.getFailedUploads()
// Returns: [{ filepath, filename, backup: {...} }]

// Retry failed upload with custom function
await backup.retryFailedUpload(backupPath, async (data) => {
  // Your upload logic here
  const result = await supabase.from('table').insert(data);
  return result.data;
})

// Archive old backups (uploaded only)
await backup.archiveOldBackups(30) // Days
// Returns: count of deleted backups

// Validate backup integrity
await backup.validateBackup(backupPath)
// Returns: { valid: true/false, backup: {...}, error: "..." }
```

### Configuration Options

```javascript
new BackupManager(engineName, {
  subdirectories: ['data', 'failed-uploads'],  // Custom subdirectories
  projectRoot: '/custom/path',                  // Override project root (for testing)
  nameField: 'company_name'                     // Field to use for filename generation
})
```

### Best Practices

1. **Always save locally first**: Never attempt database upload without local backup
2. **Handle failures gracefully**: Failed database uploads should not crash the process
3. **Monitor failed uploads**: Use `npm run backup:stats` regularly
4. **Retry periodically**: Set up cron job to run `npm run backup:retry` daily
5. **Archive old data**: Run `npm run backup:cleanup` monthly to save disk space
6. **Validate after changes**: Run `npm run backup:validate` after manual file edits

### Monitoring & Alerting

**Set up monitoring:**
```bash
# Cron job: Daily retry at 2 AM
0 2 * * * cd /path/to/MaxantAgency && npm run backup:retry >> logs/backup-retry.log 2>&1

# Cron job: Monthly cleanup (keep 90 days)
0 3 1 * * cd /path/to/MaxantAgency && node database-tools/scripts/cleanup-old-backups.js --days 90 >> logs/backup-cleanup.log 2>&1

# Cron job: Daily stats report
0 8 * * * cd /path/to/MaxantAgency && npm run backup:stats:json > /tmp/backup-stats.json
```

**Alert on high failure rates:**
```bash
# Check if failure rate > 20%
npm run backup:stats:json | jq '.system_totals.failed_uploads > 20' && echo "ALERT: High backup failure rate!"
```

## Troubleshooting

### "No schema files found"

Check that your schemas are in the correct location:
```
{agent}/database/schemas/*.json
```

Supported agents:
- `prospecting-engine`
- `analysis-engine`
- `outreach-engine`
- `pipeline-orchestrator`

### "Failed to connect to Supabase"

1. Check your `.env` file exists
2. Verify `SUPABASE_URL` is correct
3. Verify `SUPABASE_SERVICE_KEY` is correct (not the anon key!)

### "Circular dependency detected"

Your foreign keys create a loop. Example:
- Table A references Table B
- Table B references Table A

Solution: Remove one foreign key or restructure your schema.

### "Table already exists"

Use `--force` to drop and recreate:
```bash
npm run db:setup -- --force
```

Warning: This will delete all data!

## Best Practices

1. **Always validate first**: Run `npm run db:validate` before setup
2. **Use dry-run**: Preview SQL with `--dry-run` before executing
3. **Index foreign keys**: Always add `index: true` to foreign key columns
4. **Enum for status fields**: Use enum instead of free text
5. **Default timestamps**: Add `created_at` and `updated_at` to all tables
6. **UUID primary keys**: Use `uuid` with `gen_random_uuid()` as default

## Schema Examples

See `templates/` directory for SQL templates and `seeds/` for seed data examples.

## Support

For issues or questions, contact the MaxantAgency team.
