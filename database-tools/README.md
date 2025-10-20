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
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
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
3. Verify `SUPABASE_SERVICE_ROLE_KEY` is correct (not the anon key!)

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
