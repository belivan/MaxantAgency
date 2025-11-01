# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## System Architecture

MaxantAgency is a **microservices-based lead generation pipeline** with 4 independent engines, a UI, and centralized database tools. All engines are Express.js servers that communicate via REST APIs and share a common Supabase PostgreSQL database.

### Microservices Pattern

```
Command Center UI (Next.js:3000)
    ↓
┌────────────┬────────────┬────────────┐
│ Prospect   │ Analysis   │ Outreach   │
│ Engine     │ Engine     │ Engine     │
│ :3010      │ :3001      │ :3002      │
└────────────┴────────────┴────────────┘
    ↓
Pipeline Orchestrator (:3020)
    ↓
Supabase PostgreSQL
```

Each engine is **autonomous** with its own:
- `server.js` - Express server with REST endpoints
- `database/supabase-client.js` - Database CRUD operations
- `database/schemas/*.json` - JSON schema definitions
- `config/prompts/**/*.json` - AI prompt templates (if applicable)
- `tests/` - Unit and integration tests

### Database Architecture

**Centralized Schema Management**: All database schemas live in JSON files within each engine, but setup is centralized through `database-tools/`:

```bash
# Validate all schemas across all engines
npm run db:validate

# Preview SQL that will be generated
npm run db:setup -- --dry-run

# Create/update all tables
npm run db:setup
```

**Schema Location Pattern**: `{engine}/database/schemas/{table}.json`

**Key Tables**:
- `prospects` - Raw company data from discovery (Prospecting Engine)
- `leads` - Analyzed websites with A-F grades (Analysis Engine)
- `composed_emails` - Generated email outreach (Outreach Engine)
- `social_outreach` - Social media DMs (Outreach Engine)
- `campaigns` - Scheduled automation (Pipeline Orchestrator)
- `campaign_runs` - Execution history (Pipeline Orchestrator)
- `projects` - Shared table for organizing work (database-tools/shared/schemas/)

**Critical Pattern**: All engines use the **same environment variable** for database access:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
```

## Development Commands

### Running Services

```bash
# Start all services (recommended for development)
npm run dev

# Or run individually:
npm run dev:prospecting    # Port 3010
npm run dev:analysis       # Port 3001
npm run dev:outreach       # Port 3002
npm run dev:pipeline       # Port 3020
npm run dev:ui            # Port 3000

# Install all dependencies (first time setup)
npm run install:all
```

### Testing

Each engine has its own test suite:

```bash
# Analysis Engine tests (most comprehensive)
cd analysis-engine
node tests/test-analyzers.js          # 29 tests - AI analyzer modules
node tests/test-grading-system.js     # 31 tests - Letter grading
node tests/test-prompt-loader.js      # 5 tests - Prompt loading
node tests/test-phase3-integration.js # Full integration test

# Database validation (important before schema changes)
cd database-tools
npm run db:validate        # Check all schemas
npm run db:setup -- --dry-run  # Preview SQL
```

### Database Operations

```bash
cd database-tools

# First time setup or schema changes
npm run db:validate         # Always run first
npm run db:setup           # Create/update tables

# Options
npm run db:setup -- --dry-run          # Preview only
npm run db:setup -- --force            # Drop and recreate
npm run db:setup -- --verbose          # Detailed logging
npm run db:setup -- --skip-constraints # Skip foreign keys
```

## Key Architectural Patterns

### 1. Dual-Format Database Schema (Analysis Engine)

The Analysis Engine populates **both old and new schema formats** for backward compatibility:

```javascript
function extractLeadData(result) {
  return {
    // Old format (website-audit-tool compatibility)
    website_score: Math.round(result.overall_score),
    website_grade: result.grade,
    critiques_basic: [...],
    critiques_seo: [...],

    // New format (structured data for Outreach Engine)
    design_score: Math.round(result.design_score),
    seo_score: Math.round(result.seo_score),
    design_issues: result.design_issues || [],
    quick_wins: result.quick_wins || [],
    top_issue: result.top_issue || null,
    one_liner: result.one_liner || null,
  };
}
```

**Critical**: Always use `Math.round()` on scores before database save. PostgreSQL columns are `INTEGER`, not `DECIMAL`.

### 2. Externalized Prompt Management

AI prompts are **not hardcoded**. They live in JSON files and are loaded dynamically:

**Analysis Engine** (`config/prompts/web-design/*.json`):
- `design-critique.json` - GPT-5 Vision for screenshot analysis
- `seo-analysis.json` - Grok-4-fast for SEO
- `content-analysis.json` - Grok-4-fast for content
- `social-analysis.json` - Grok-4-fast for social media

**Outreach Engine** (`config/prompts/email-strategies/*.json`):
- `compliment-sandwich.json`
- `problem-first.json`
- `achievement-focused.json`
- `question-based.json`

**Loading Pattern**:
```javascript
import { loadPrompt } from './shared/prompt-loader.js';

const prompt = loadPrompt('web-design', 'design-critique', {
  company_name: 'Example Co',
  industry: 'restaurant',
  url: 'https://example.com'
});
```

Prompts include:
- `model` - AI model to use (gpt-5, grok-4-fast, claude-4-5-haiku)
- `temperature` - Sampling temperature
- `systemPrompt` - System instructions
- `userPrompt` - User message with `{{variables}}`
- `schema` - Expected JSON output format (for structured responses)

### 3. Grading System (Analysis Engine)

Letter grades (A-F) are calculated from **weighted scores**:
- Design: 30%
- SEO: 30%
- Content: 20%
- Social: 20%

**Thresholds**:
- A: 85-100
- B: 70-84
- C: 55-69
- D: 40-54
- F: 0-39

**Bonuses/Penalties**:
- +5 points for 5+ quick wins
- -10 points for no mobile optimization
- -10 points for no HTTPS

Located in: `analysis-engine/grading/grading-system.js`

### 4. Database Client Pattern

Every engine follows the same Supabase client pattern:

```javascript
// database/supabase-client.js
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

export async function saveRecord(data) {
  const { data, error } = await supabase
    .from('table_name')
    .insert(data)
    .select()
    .single();

  if (error) throw error;
  return data;
}
```

### 5. Server-Sent Events (SSE) for Progress

Long-running operations (batch analysis, pipeline runs) use SSE:

```javascript
// Server side
res.setHeader('Content-Type', 'text/event-stream');
res.setHeader('Cache-Control', 'no-cache');
res.setHeader('Connection', 'keep-alive');

function sendProgress(data) {
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

sendProgress({ step: 'analyzing', progress: 50, message: 'Analyzing website 5/10' });

// Client side (Next.js UI)
const eventSource = new EventSource('/api/analyze');
eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log(data.message);
};
```

### 6. AI Report Synthesis Pipeline (Analysis Engine)

**NEW in v2.1**: Intelligent report generation with AI-powered synthesis.

The Analysis Engine now includes a 2-stage AI synthesis pipeline that runs **after** analysis but **before** report generation:

```
Analysis Complete → Synthesis Pipeline → Report Generation
                    ↓
          Stage 1: Issue Deduplication (GPT-5, ~35s)
                    - Consolidates redundant findings
                    - Reduces issues by 40-70%
                    - Merges cross-module observations
                    ↓
          Stage 2: Executive Insights (GPT-5, ~140s)
                    - Business-friendly summary
                    - 30/60/90 strategic roadmap
                    - ROI statements
                    - Screenshot evidence linking
```

**Cost**: ~$0.06 per lead | **Duration**: ~3.5 minutes additional processing

**Configuration**:
```bash
# .env
USE_AI_SYNTHESIS=true  # Enable synthesis (default: false)
```

**Location**: `analysis-engine/reports/synthesis/report-synthesis.js`

**Prompts**:
- `config/prompts/report-synthesis/issue-deduplication.json`
- `config/prompts/report-synthesis/executive-insights-generator.json`

**Integration Point**: `reports/auto-report-generator.js` (lines 45-96)

**How It Works**:

1. Analysis completes with raw data from 6 analyzers
2. If `USE_AI_SYNTHESIS=true`, synthesis pipeline runs:
   - **Issue Deduplication**: Identifies duplicate/overlapping issues across analyzers
     - Example: "CTA too small" (desktop) + "CTA not prominent" (mobile) → "CTA lacks prominence across devices"
   - **Executive Insights**: Generates client-ready summary with:
     - One-sentence headline assessing site health
     - 2-3 sentence overview positioning as opportunity
     - 3-5 critical findings with business impact + evidence
     - 30/60/90 day strategic roadmap
     - ROI projection statement
3. Synthesis data passed to report templates:
   - **Executive Summary**: Uses AI-generated insights
   - **Desktop/Mobile Analysis**: Shows consolidated issues only
   - **Action Plan**: Groups deduplicated recommendations

**Backward Compatibility**:
- Synthesis is OFF by default (`USE_AI_SYNTHESIS=false`)
- Templates work with or without synthesis data
- Graceful fallback if synthesis fails
- Zero breaking changes to existing functionality

**Testing**:
```bash
cd analysis-engine
node tests/integration/test-synthesis-integration.js  # Compare with/without
node reports/synthesis/test-pipeline.js              # Test synthesis alone
```

**Quality Metrics**:
- Issue reduction: 40-70% fewer redundant findings
- Report size: +135% more content with synthesis
- Executive summary: 500-word limit, business language
- Screenshot references: 100% linked to evidence

**When to Use**:
- ✅ Client-facing reports (professional executive summaries)
- ✅ High-value leads (justify the $0.06 cost)
- ✅ Batch report generation (automated workflows)
- ❌ Internal testing (unnecessary overhead)
- ❌ Cost-sensitive high-volume operations

**Monitoring**:
Synthesis metadata tracked in report config:
```json
{
  "config": {
    "used_ai_synthesis": true,
    "synthesis_errors": 0,
    "consolidated_issues_count": 4
  }
}
```

**Documentation**: See `analysis-engine/reports/synthesis/SYNTHESIS-INTEGRATION-GUIDE.md` for complete guide.

### 7. Centralized AI Client & Cost Tracking

All engines use a **single consolidated AI client** located at `database-tools/shared/ai-client.js`.

**Key Features:**
- Unified interface for OpenAI, Anthropic (Claude), and xAI (Grok)
- Automatic cost calculation per API call
- Response caching for development
- Centralized logging to `ai_calls` table

**Import Pattern:**
```javascript
// All engines import from the same location
import { callAI, parseJSONResponse } from '../../database-tools/shared/ai-client.js';
```

**Cost Tracking via `ai_calls` Table:**

When `LOG_AI_CALLS_TO_DB=true` in `.env`, every AI call is automatically logged to the `ai_calls` table:

```sql
-- ai_calls table schema
CREATE TABLE ai_calls (
  id uuid PRIMARY KEY,
  engine text,              -- prospecting, analysis, outreach, report
  module text,              -- Which file made the call
  model text,               -- gpt-5, claude-4-5-haiku, grok-4
  provider text,            -- openai, anthropic, xai
  prompt_tokens integer,
  completion_tokens integer,
  total_tokens integer,
  cost decimal(10,6),       -- USD cost calculated automatically
  duration_ms integer,
  cached boolean,           -- Was response cached?
  request_data jsonb,       -- Full prompt for debugging
  response_content jsonb,   -- AI response
  error text,
  created_at timestamptz
);
```

**Usage:**
```javascript
// Enable in .env
LOG_AI_CALLS_TO_DB=true

// Every callAI() is automatically logged
const response = await callAI({
  model: 'gpt-5',
  systemPrompt: 'You are a design expert',
  userPrompt: 'Analyze this website...',
  jsonMode: true
});
// ✅ Logged to ai_calls table with cost, tokens, duration
```

**Benefits:**
- Track AI costs per engine/module
- Debug failed AI calls with full prompts
- Analyze token usage patterns
- Cost optimization insights
- Audit trail for all AI usage

**Query Examples:**
```sql
-- Total cost by engine
SELECT engine, SUM(cost) as total_cost, COUNT(*) as calls
FROM ai_calls
GROUP BY engine
ORDER BY total_cost DESC;

-- Most expensive modules
SELECT engine, module, SUM(cost) as cost
FROM ai_calls
GROUP BY engine, module
ORDER BY cost DESC
LIMIT 10;

-- Failed calls for debugging
SELECT engine, module, model, error, request_data
FROM ai_calls
WHERE error IS NOT NULL
ORDER BY created_at DESC;
```

**Important:**
- Logging adds ~50ms overhead per AI call (non-blocking)
- Errors in logging don't block AI operations
- For production, consider pruning old ai_calls records periodically

## Important Gotchas

### Database Schema Alignment

When modifying database schemas:

1. **Update the JSON schema first**: `{engine}/database/schemas/{table}.json`
2. **Validate**: `cd database-tools && npm run db:validate`
3. **Preview SQL**: `npm run db:setup -- --dry-run`
4. **Update the code**: Modify `database/supabase-client.js` to use new columns
5. **Run setup**: `npm run db:setup`

**Common Issue**: Forgetting to add `Math.round()` when inserting scores into INTEGER columns.

### Foreign Key Format

Foreign keys must be in the `foreignKeys` array, not inline:

**Correct**:
```json
{
  "columns": [
    { "name": "lead_id", "type": "uuid" }
  ],
  "foreignKeys": [
    {
      "column": "lead_id",
      "references": "leads.id",
      "onDelete": "SET NULL"
    }
  ]
}
```

**Incorrect**:
```json
{
  "columns": [
    { "name": "lead_id", "type": "uuid", "foreignKey": "leads.id" }
  ]
}
```

### Environment Variables

All engines and database-tools use: `SUPABASE_SERVICE_KEY` (not `SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_KEY`)

### Prompt Schema Requirements

AI analyzer prompts must include **explicit JSON schemas** in the system prompt to prevent field name inconsistencies:

```json
{
  "systemPrompt": "You are a design expert.\n\nIMPORTANT: Return valid JSON in this EXACT format:\n{\n  \"issues\": [...],\n  \"overallDesignScore\": 75,\n  \"positives\": [...],\n  \"quickWinCount\": 3\n}\n\nDo NOT change field names."
}
```

Without this, AI models may return `overall_design_score` instead of `overallDesignScore`, breaking the parser.

## Common Development Workflows

### Adding a New Table

1. Create schema: `{engine}/database/schemas/new_table.json`
2. Validate: `cd database-tools && npm run db:validate`
3. Create database client functions in `{engine}/database/supabase-client.js`
4. Preview: `npm run db:setup -- --dry-run`
5. Execute: `npm run db:setup`
6. Write tests: `{engine}/tests/test-new-feature.js`

### Testing Analysis Engine Changes

```bash
cd analysis-engine

# Test specific URL
curl -X POST http://localhost:3001/api/analyze-url \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com","company_name":"Example Co"}'

# Run test suite
node tests/test-analyzers.js
node tests/test-grading-system.js

# Check database
node -e "
const { getLeads } = require('./database/supabase-client.js');
getLeads({ limit: 5 }).then(console.log);
"
```

### Debugging Pipeline Issues

```bash
# Check health of all services
curl http://localhost:3010/health  # Prospecting
curl http://localhost:3001/health  # Analysis
curl http://localhost:3002/health  # Outreach
curl http://localhost:3020/health  # Pipeline

# View running processes
pm2 status                    # Production
ps aux | grep "node server"   # Development

# Check database connection
cd database-tools
node -e "
import { testConnection } from './runners/supabase-runner.js';
testConnection().then(result => console.log('Connected:', result));
"
```

## File Structure Conventions

### Engine Structure
```
{engine-name}/
├── server.js                     # Express server (always port in README)
├── orchestrator.js              # Main business logic (optional)
├── database/
│   ├── supabase-client.js       # CRUD operations
│   └── schemas/
│       └── {table}.json         # Schema definitions
├── config/
│   └── prompts/                 # AI prompt templates
│       └── {category}/
│           └── {prompt}.json
├── tests/
│   ├── test-{feature}.js        # Unit tests
│   └── test-phase{N}-integration.js  # Integration tests
├── package.json
└── README.md                    # API documentation
```

### Shared Database Schemas

Place in `database-tools/shared/schemas/` for tables used by multiple engines:
- `projects.json` - Referenced by prospects, leads, composed_emails, social_outreach, campaigns

## API Standards

All engines follow the same API patterns:

**Health Check**: `GET /health`
```json
{
  "status": "ok",
  "service": "engine-name",
  "version": "2.0.0",
  "timestamp": "2025-10-20T..."
}
```

**Error Responses**:
```json
{
  "error": "Human-readable error message",
  "code": "ERROR_CODE",
  "details": { /* optional */ }
}
```

**Success Responses**:
```json
{
  "success": true,
  "data": { /* result */ },
  "meta": { /* optional metadata */ }
}
```

## Important Files to Reference

- `README.md` - System overview, deployment guides
- `database-tools/README.md` - Database setup and schema format
- `SCHEMA-CODE-ALIGNMENT-REPORT.md` - Current schema status across engines
- `DEPLOYMENT.md` - VPS deployment with PM2
- `DOCKER-DEPLOY.md` - Docker containerization guide
- `package.json` - Root-level npm scripts for dev workflow

## Testing Philosophy

- **Unit tests** test individual modules in isolation
- **Integration tests** test entire workflows (e.g., prospect → analyze → compose → send)
- **Validation tests** check schema definitions and configurations
- All test files are named `test-*.js`
- Tests output clear pass/fail counts: `✅ Passed: N`, `❌ Failed: N`

### Test File Organization

**Standard Pattern**: Place tests in `{engine}/tests/test-*.js`

Examples:
- `prospecting-engine/tests/test-google-maps.js` - Unit tests for Google Maps discoverer
- `analysis-engine/tests/test-analyzers.js` - Unit tests for AI analyzers
- `outreach-engine/tests/test-phase1-integration.js` - Integration tests

**Outreach Engine Exception**: The outreach engine includes convenience test runners in its root directory for quick validation:
- `test-batch-generation.js` - Quick batch testing
- `test-end-to-end.js` - Full workflow test
- `test-notion-sync.js` - Notion integration test

These root-level test files complement (not replace) the `tests/` directory and provide easy access to common testing scenarios during development.
