# DATABASE SETUP TOOL - Technical Specification
Version: 2.0
Agent Assignment: Agent 5
Status: NEW UTILITY - BUILD FROM SCRATCH

═══════════════════════════════════════════════════════════════════

## 1. PURPOSE & SCOPE

### What This Tool Does:
The Database Setup Tool is a CLI utility that automates Supabase database setup.
It reads JSON schema definitions from all agents, generates SQL, and executes
migrations. Makes it easy for anyone to set up the complete database with one
command.

### What This Tool Does NOT Do:
- Does NOT run as a service (it's a CLI tool, not a server)
- Does NOT compete with other agents (it's a helper they all use)
- Does NOT store data (just creates tables)

### Core Philosophy:
"One command to set up the entire database - no manual SQL required"

═══════════════════════════════════════════════════════════════════

## 2. ARCHITECTURE OVERVIEW

### Type: CLI Tool (not a service)
### Language: Node.js (ES Modules)
### Usage: `npm run db:setup`

### How It Works:

```
USER RUNS: npm run db:setup

TOOL DOES:
1. Scans all agents for database/schemas/*.json files
2. Reads each JSON schema definition
3. Generates SQL CREATE TABLE statements
4. Generates SQL for indexes, foreign keys, constraints
5. Connects to Supabase
6. Executes all SQL in correct order (dependencies first)
7. Logs results
8. Optionally seeds example data

OUTPUT:
✅ prospects table created (Agent 1)
✅ leads table created (Agent 2)
✅ composed_emails table created (Agent 3)
✅ social_outreach table created (Agent 3)
✅ campaigns table created (Agent 6)
✅ campaign_runs table created (Agent 6)
✅ All indexes created
✅ All foreign keys created
```

═══════════════════════════════════════════════════════════════════

## 3. FILE STRUCTURE (REQUIRED)

database-tools/
├── package.json
├── .env.template
│
├── cli.js                         # Main CLI entrypoint
├── setup.js                       # Setup command logic
├── migrate.js                     # Migration command
├── seed.js                        # Seed command
├── validate.js                    # Validation command
│
├── generators/
│   ├── sql-generator.js           # JSON → SQL converter
│   ├── table-generator.js         # CREATE TABLE generator
│   ├── index-generator.js         # CREATE INDEX generator
│   └── constraint-generator.js    # Foreign keys, unique, etc.
│
├── runners/
│   ├── supabase-runner.js         # Execute SQL on Supabase
│   └── dependency-resolver.js     # Order tables by dependencies
│
├── validators/
│   ├── schema-validator.js        # Validate JSON schemas
│   └── sql-validator.js           # Validate generated SQL
│
├── migrations/
│   ├── 001_initial_setup.sql      # Generated migration
│   ├── 002_add_projects.sql
│   └── history.json               # Migration tracking
│
├── seeds/
│   ├── example-prospects.json
│   ├── example-brief.json
│   └── seed-runner.js
│
├── templates/
│   ├── table-template.sql
│   └── index-template.sql
│
└── shared/
    ├── logger.js
    └── schema-loader.js           # Loads schemas from all agents

═══════════════════════════════════════════════════════════════════

## 4. CLI COMMANDS

### 4.1 Setup (Fresh Install)

```bash
npm run db:setup
# or
node cli.js setup
```

**What it does:**
1. Scans for all schema files
2. Validates schemas
3. Generates SQL
4. Creates all tables
5. Creates all indexes
6. Creates all constraints
7. Logs summary

**Flags:**
- `--dry-run` - Preview SQL without executing
- `--verbose` - Show detailed logs
- `--skip-constraints` - Create tables only, skip foreign keys
- `--force` - Drop existing tables and recreate

**Example:**
```bash
npm run db:setup -- --dry-run --verbose
```

**Output:**
```
🔍 Scanning for schema files...
   Found 6 schemas across 4 agents

📄 Loading schemas...
   ✅ prospecting-engine/database/schemas/prospects.json
   ✅ analysis-engine/database/schemas/leads.json
   ✅ outreach-engine/database/schemas/composed_emails.json
   ✅ outreach-engine/database/schemas/social_outreach.json
   ✅ pipeline-orchestrator/database/schemas/campaigns.json
   ✅ pipeline-orchestrator/database/schemas/campaign_runs.json

🔧 Resolving dependencies...
   prospects (no dependencies)
   campaigns (no dependencies)
   leads (depends on: prospects)
   composed_emails (depends on: leads, campaigns)
   social_outreach (depends on: leads)
   campaign_runs (depends on: campaigns)

🏗️  Generating SQL...
   Generated 6 CREATE TABLE statements
   Generated 15 CREATE INDEX statements
   Generated 8 ALTER TABLE (foreign keys)

🚀 Executing on Supabase...
   ✅ Created table: prospects
   ✅ Created table: campaigns
   ✅ Created table: leads
   ✅ Created table: composed_emails
   ✅ Created table: social_outreach
   ✅ Created table: campaign_runs
   ✅ Created 15 indexes
   ✅ Added 8 foreign key constraints

✅ Database setup complete!
   Tables: 6
   Indexes: 15
   Constraints: 8
   Duration: 3.2s
```

---

### 4.2 Migrate (Apply Changes)

```bash
npm run db:migrate
# or
node cli.js migrate
```

**What it does:**
1. Checks migration history
2. Finds new migration files
3. Runs them in order
4. Records in history

**Flags:**
- `--version` - Migrate to specific version
- `--rollback` - Rollback last migration

**Example:**
```bash
npm run db:migrate -- --version 003
```

---

### 4.3 Seed (Add Example Data)

```bash
npm run db:seed
# or
node cli.js seed
```

**What it does:**
1. Loads seed data from seeds/ directory
2. Inserts example records
3. Useful for testing/demo

**Flags:**
- `--reset` - Clear existing data first

**Example:**
```bash
npm run db:seed -- --reset
```

**Output:**
```
🌱 Seeding database...
   ✅ Inserted 5 example prospects
   ✅ Inserted 3 example leads
   ✅ Inserted 1 example campaign

✅ Seeding complete!
```

---

### 4.4 Validate (Check Schemas)

```bash
npm run db:validate
# or
node cli.js validate
```

**What it does:**
1. Validates all JSON schemas
2. Checks for naming conflicts
3. Validates foreign key references
4. Reports issues

**Example output:**
```
🔍 Validating schemas...

✅ prospects.json - Valid
✅ leads.json - Valid
❌ composed_emails.json - ERROR
   Foreign key references non-existent table: "projects"

⚠️  social_outreach.json - WARNING
   Column "lead_id" has no index (foreign key without index)

❌ Validation failed - 1 error, 1 warning
```

---

### 4.5 Generate (Create New Schema)

```bash
npm run db:generate -- --table users
# or
node cli.js generate --table users
```

**What it does:**
1. Interactive prompt for table details
2. Generates JSON schema file
3. Saves to specified agent directory

**Example:**
```bash
$ npm run db:generate -- --table projects

? Which agent owns this table?
  > prospecting-engine
    analysis-engine
    outreach-engine

? Table name: projects

? Description: Client projects and campaigns

? Add column:
  > name (text, required)
    description (text)
    created_at (timestamptz, default: now())

✅ Generated: prospecting-engine/database/schemas/projects.json
```

═══════════════════════════════════════════════════════════════════

## 5. JSON SCHEMA FORMAT

### Standard Schema Format

Every agent defines schemas in this format:

**File:** `{agent}/database/schemas/{table}.json`

```json
{
  "table": "prospects",
  "description": "Companies discovered during prospecting",

  "columns": [
    {
      "name": "id",
      "type": "uuid",
      "primaryKey": true,
      "default": "gen_random_uuid()",
      "description": "Primary key"
    },
    {
      "name": "company_name",
      "type": "text",
      "required": true,
      "index": true,
      "description": "Business name"
    },
    {
      "name": "website",
      "type": "text",
      "required": false,
      "unique": false
    },
    {
      "name": "google_rating",
      "type": "decimal",
      "precision": 2,
      "scale": 1
    },
    {
      "name": "social_profiles",
      "type": "jsonb",
      "description": "Social media URLs"
    },
    {
      "name": "status",
      "type": "text",
      "enum": ["ready_for_analysis", "queued", "analyzed"],
      "default": "ready_for_analysis",
      "index": true
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
    },
    {
      "name": "idx_prospects_google_place_id",
      "columns": ["google_place_id"],
      "unique": true
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

```javascript
{
  // Text
  "text": "text",
  "varchar": "varchar(255)",

  // Numbers
  "integer": "integer",
  "bigint": "bigint",
  "decimal": "decimal(10,2)",

  // UUID
  "uuid": "uuid",

  // Boolean
  "boolean": "boolean",

  // JSON
  "json": "json",
  "jsonb": "jsonb",

  // Timestamps
  "timestamp": "timestamp",
  "timestamptz": "timestamptz",
  "date": "date",
  "time": "time"
}
```

### Column Modifiers

```json
{
  "name": "column_name",
  "type": "text",

  "required": true,           // NOT NULL
  "unique": true,             // UNIQUE constraint
  "primaryKey": true,         // PRIMARY KEY
  "index": true,              // Create index

  "default": "value",         // DEFAULT value
  "default": "now()",         // DEFAULT function

  "foreignKey": "table.id",   // Foreign key reference
  "onDelete": "CASCADE",      // ON DELETE action
  "onUpdate": "CASCADE",      // ON UPDATE action

  "enum": ["val1", "val2"],   // CHECK constraint

  "description": "..."        // Comment
}
```

═══════════════════════════════════════════════════════════════════

## 6. SQL GENERATION LOGIC

### 6.1 Table Generator

File: generators/table-generator.js

```javascript
export function generateCreateTable(schema) {
  /**
   * Convert JSON schema to CREATE TABLE statement
   *
   * @param {object} schema - Table schema
   * @returns {string} SQL CREATE TABLE
   */

  const columns = schema.columns.map(col => {
    let sql = `  ${col.name} ${col.type}`;

    if (col.required) sql += ' NOT NULL';
    if (col.unique) sql += ' UNIQUE';
    if (col.primaryKey) sql += ' PRIMARY KEY';
    if (col.default) sql += ` DEFAULT ${col.default}`;

    if (col.enum) {
      sql += ` CHECK (${col.name} IN (${col.enum.map(v => `'${v}'`).join(', ')}))`;
    }

    return sql;
  }).join(',\n');

  return `CREATE TABLE IF NOT EXISTS ${schema.table} (\n${columns}\n);`;
}
```

**Example output:**
```sql
CREATE TABLE IF NOT EXISTS prospects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL,
  website text,
  google_rating decimal(2,1),
  social_profiles jsonb,
  status text NOT NULL DEFAULT 'ready_for_analysis' CHECK (status IN ('ready_for_analysis', 'queued', 'analyzed')),
  created_at timestamptz DEFAULT now()
);
```

---

### 6.2 Index Generator

File: generators/index-generator.js

```javascript
export function generateIndexes(schema) {
  /**
   * Generate CREATE INDEX statements
   *
   * @param {object} schema - Table schema
   * @returns {string[]} Array of SQL statements
   */

  const indexes = [];

  // Indexes from column definitions
  for (const col of schema.columns) {
    if (col.index && !col.primaryKey) {
      indexes.push(
        `CREATE INDEX IF NOT EXISTS idx_${schema.table}_${col.name} ON ${schema.table}(${col.name});`
      );
    }
  }

  // Composite indexes
  for (const idx of schema.indexes || []) {
    const uniqueClause = idx.unique ? 'UNIQUE ' : '';
    const name = idx.name || `idx_${schema.table}_${idx.columns.join('_')}`;

    indexes.push(
      `CREATE ${uniqueClause}INDEX IF NOT EXISTS ${name} ON ${schema.table}(${idx.columns.join(', ')});`
    );
  }

  return indexes;
}
```

---

### 6.3 Dependency Resolver

File: runners/dependency-resolver.js

```javascript
export function resolveDependencies(schemas) {
  /**
   * Order tables by foreign key dependencies
   *
   * @param {object[]} schemas - All table schemas
   * @returns {object[]} Ordered schemas
   */

  const graph = {};

  // Build dependency graph
  for (const schema of schemas) {
    graph[schema.table] = [];

    for (const fk of schema.foreignKeys || []) {
      const referencedTable = fk.references.split('.')[0];
      graph[schema.table].push(referencedTable);
    }
  }

  // Topological sort
  return topologicalSort(graph, schemas);
}
```

**Example:**
```javascript
// Input schemas (unordered):
[leads, prospects, composed_emails, campaigns]

// Output (ordered by dependencies):
[prospects, campaigns, leads, composed_emails]
// Because:
// - prospects has no dependencies
// - campaigns has no dependencies
// - leads depends on prospects
// - composed_emails depends on leads, campaigns
```

═══════════════════════════════════════════════════════════════════

## 7. SCHEMA DISCOVERY

### 7.1 Schema Loader

File: shared/schema-loader.js

```javascript
export async function loadAllSchemas() {
  /**
   * Scan all agent directories for schema files
   *
   * @returns {Promise<object[]>} All schemas found
   */

  const schemas = [];
  const agentDirs = [
    '../prospecting-engine',
    '../analysis-engine',
    '../outreach-engine',
    '../pipeline-orchestrator'
  ];

  for (const dir of agentDirs) {
    const schemaPath = path.join(dir, 'database/schemas');

    if (!fs.existsSync(schemaPath)) continue;

    const files = fs.readdirSync(schemaPath)
      .filter(f => f.endsWith('.json'));

    for (const file of files) {
      const schema = JSON.parse(
        fs.readFileSync(path.join(schemaPath, file), 'utf-8')
      );

      schemas.push({
        ...schema,
        source: dir,
        file: file
      });
    }
  }

  return schemas;
}
```

═══════════════════════════════════════════════════════════════════

## 8. VALIDATION

### 8.1 Schema Validator

File: validators/schema-validator.js

```javascript
export function validateSchema(schema) {
  /**
   * Validate JSON schema for errors
   *
   * @param {object} schema - Schema to validate
   * @returns {object} Validation result
   */

  const errors = [];
  const warnings = [];

  // Required fields
  if (!schema.table) {
    errors.push('Missing required field: table');
  }

  if (!schema.columns || schema.columns.length === 0) {
    errors.push('Table must have at least one column');
  }

  // Primary key check
  const hasPrimaryKey = schema.columns.some(c => c.primaryKey);
  if (!hasPrimaryKey) {
    warnings.push('No primary key defined');
  }

  // Foreign key validation
  for (const fk of schema.foreignKeys || []) {
    const [table, column] = fk.references.split('.');

    if (!table || !column) {
      errors.push(`Invalid foreign key reference: ${fk.references}`);
    }

    // Check if referenced table exists (in loaded schemas)
    // ... validation logic
  }

  // Index on foreign keys
  for (const col of schema.columns) {
    if (col.foreignKey && !col.index) {
      warnings.push(`Column ${col.name} is a foreign key but has no index`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}
```

═══════════════════════════════════════════════════════════════════

## 9. MIGRATION TRACKING

### History File

File: migrations/history.json

```json
{
  "migrations": [
    {
      "version": "001",
      "name": "initial_setup",
      "applied_at": "2025-01-15T10:30:00Z",
      "tables_created": [
        "prospects",
        "leads",
        "composed_emails"
      ]
    },
    {
      "version": "002",
      "name": "add_projects",
      "applied_at": "2025-01-16T14:20:00Z",
      "tables_created": [
        "projects"
      ]
    }
  ]
}
```

### Migration Runner

```javascript
export async function runMigrations() {
  const history = loadMigrationHistory();
  const files = fs.readdirSync('./migrations')
    .filter(f => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const version = file.split('_')[0];

    // Skip if already applied
    if (history.migrations.some(m => m.version === version)) {
      continue;
    }

    // Run migration
    const sql = fs.readFileSync(`./migrations/${file}`, 'utf-8');
    await supabase.rpc('exec_sql', { sql });

    // Record in history
    history.migrations.push({
      version,
      name: file,
      applied_at: new Date().toISOString()
    });
  }

  saveMigrationHistory(history);
}
```

═══════════════════════════════════════════════════════════════════

## 10. SEED DATA

### Example Seed

File: seeds/example-prospects.json

```json
{
  "table": "prospects",
  "data": [
    {
      "company_name": "Zahav Restaurant",
      "industry": "Restaurant",
      "website": "https://zahavrestaurant.com",
      "city": "Philadelphia, PA",
      "google_rating": 4.6,
      "google_review_count": 1847,
      "status": "ready_for_analysis"
    },
    {
      "company_name": "Vetri Cucina",
      "industry": "Restaurant",
      "website": "https://vetricucina.com",
      "city": "Philadelphia, PA",
      "google_rating": 4.7,
      "google_review_count": 892,
      "status": "ready_for_analysis"
    }
  ]
}
```

### Seed Runner

```javascript
export async function runSeeds() {
  const seedFiles = fs.readdirSync('./seeds')
    .filter(f => f.endsWith('.json'));

  for (const file of seedFiles) {
    const seed = JSON.parse(fs.readFileSync(`./seeds/${file}`));

    for (const row of seed.data) {
      await supabase
        .from(seed.table)
        .insert(row);
    }

    logger.info(`Inserted ${seed.data.length} rows into ${seed.table}`);
  }
}
```

═══════════════════════════════════════════════════════════════════

## 11. DEPENDENCIES

```json
{
  "name": "database-tools",
  "version": "1.0.0",
  "type": "module",
  "bin": {
    "db": "./cli.js"
  },
  "scripts": {
    "db:setup": "node cli.js setup",
    "db:migrate": "node cli.js migrate",
    "db:seed": "node cli.js seed",
    "db:validate": "node cli.js validate",
    "db:generate": "node cli.js generate"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.75.1",
    "dotenv": "^16.3.1",
    "commander": "^11.1.0",
    "inquirer": "^9.2.12",
    "chalk": "^5.3.0",
    "ora": "^8.0.1"
  }
}
```

═══════════════════════════════════════════════════════════════════

## 12. SUCCESS CRITERIA

✅ Scans all agents for schema files
✅ Validates JSON schemas
✅ Generates correct SQL
✅ Resolves table dependencies
✅ Creates tables in correct order
✅ Creates all indexes
✅ Creates all foreign keys
✅ Migration tracking works
✅ Seed data inserts successfully
✅ `--dry-run` shows SQL without executing
✅ Clear error messages
✅ All tests passing

═══════════════════════════════════════════════════════════════════

## 13. USAGE IN REAL WORLD

### First Time Setup (New Developer)

```bash
# 1. Clone repo
git clone https://github.com/you/MaxantAgency.git

# 2. Install dependencies
npm install

# 3. Configure Supabase
cp .env.template .env
# Edit .env with your Supabase credentials

# 4. Set up database (ONE COMMAND!)
npm run db:setup

# Done! Database ready with all tables.
```

### After Adding New Table

```bash
# Agent 2 added a new table schema:
# analysis-engine/database/schemas/screenshots.json

# Run migration
npm run db:migrate

# Done! New table created.
```

### Testing/Demo

```bash
# Reset database and add example data
npm run db:setup -- --force
npm run db:seed
```

═══════════════════════════════════════════════════════════════════

END OF SPECIFICATION - AGENT 5
