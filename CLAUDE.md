# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## AI Model Context (November 2025)

**Current Date**: November 2025

**Available AI Models**: This project uses state-of-the-art AI models that are currently available and fully operational:
- **GPT-5** (OpenAI) - Latest GPT model with vision capabilities
- **Claude 4.5** (Anthropic) - Latest Claude model (claude-4-5-haiku, claude-sonnet-4-5)
- **Grok-4** (xAI) - Latest Grok model (grok-4, grok-4-fast)

**Important Assumptions**:
- These models exist and are in active use throughout the codebase
- Any assumptions that these models don't exist or aren't available are incorrect
- Unless explicitly stated otherwise, assume the user is using the correct and current models
- Model references in configuration files (e.g., `config/prompts/**/*.json`) reflect actual, available models

## System Architecture

MaxantAgency is a **microservices-based lead generation pipeline** with 5 independent engines, a UI, and centralized database tools. All engines are Express.js servers that communicate via REST APIs and share a common Supabase PostgreSQL database.

### Microservices Pattern

```
Command Center UI (Next.js:3000)
    ↓
┌────────────┬────────────┬────────────┬────────────┐
│ Prospect   │ Analysis   │ Report     │ Outreach   │
│ Engine     │ Engine     │ Engine     │ Engine     │
│ :3010      │ :3001      │ :3003      │ :3002      │
└────────────┴────────────┴────────────┴────────────┘
    ↓
Pipeline Orchestrator (:3020)
    ↓
Supabase PostgreSQL
```

### Production Deployment

**Frontend (UI)**: Deployed to Vercel at `app.mintydesign.xyz`

**Backend (All Engines)**: Deployed to Hetzner VPS at `api.mintydesign.xyz`

#### Hetzner VPS Access

SSH into the production server:
```bash
ssh -i ~/.ssh/minty_key root@46.62.217.176
```

The backend services are located at `/opt/MaxantAgency` and managed via Docker Compose:
```bash
cd /opt/MaxantAgency

# View running containers
docker compose ps

# View logs
docker compose logs -f [service-name]

# Restart services
docker compose restart

# Rebuild and restart (after code updates)
git pull
docker compose down
docker compose build --no-cache
docker compose up -d
```

**Caddy Reverse Proxy**: Routes API requests from `api.mintydesign.xyz` to the appropriate engine:
- `/prospecting/*` → prospecting-engine:3010
- `/analysis/*` → analysis-engine:3001
- `/reports/*` → report-engine:3003
- `/outreach/*` → outreach-engine:3002
- `/pipeline/*` → pipeline-orchestrator:3020

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
- `composed_outreach` - Generated outreach (email + social) variations (Outreach Engine)
- `campaigns` - Scheduled automation (Pipeline Orchestrator)
- `campaign_runs` - Execution history (Pipeline Orchestrator)
- `reports` - Generated PDF reports with metadata (Report Engine)
- `benchmarks` - Competitive analysis data (Analysis Engine)
- `page_analyses` - Multi-page crawl results (Analysis Engine)
- `project_prospects` - Junction table linking projects to prospects (Prospecting Engine)
- `projects` - Shared table for organizing work (database-tools/shared/schemas/)
- `ai_calls` - AI API call logging and cost tracking (database-tools/shared/schemas/)

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
npm run dev:reports        # Port 3003
npm run dev:outreach       # Port 3002
npm run dev:pipeline       # Port 3020
npm run dev:ui            # Port 3000

# Install all dependencies (first time setup)
npm run install:all
```

### Testing

**Note**: Test coverage varies by engine. The Outreach Engine has the most comprehensive test suite.

```bash
# Outreach Engine tests
cd outreach-engine
node tests/test-phase1-integration.js  # Full workflow test
node tests/test-prompt-loading.js      # Prompt loader tests

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

**Analysis Engine** - Multiple prompt categories:

`config/prompts/web-design/*.json` (Visual & Technical Analysis):
- `desktop-visual-analysis.json` - GPT-5 Vision for desktop screenshot analysis
- `mobile-visual-analysis.json` - GPT-5 Vision for mobile screenshot analysis
- `unified-visual-analysis.json` - Combined visual analysis
- `unified-technical-analysis.json` - Combined SEO + content analysis
- `seo-analysis.json` - Grok-4-fast for SEO
- `content-analysis.json` - Grok-4-fast for content
- `social-analysis.json` - Grok-4-fast for social media
- `accessibility-analysis.json` - Accessibility checker

`config/prompts/benchmarking/*.json` (Competitive Analysis):
- 7 industry-specific benchmark analysis prompts

`config/prompts/grading/*.json`:
- `ai-comparative-grader.json` - AI-powered grading

`config/prompts/lead-qualification/*.json`:
- `lead-priority-scorer.json` - Lead scoring system

`config/prompts/report-synthesis/*.json`:
- `issue-deduplication.json` - Consolidates redundant findings
- `executive-insights-generator.json` - Business-friendly summaries

**Outreach Engine** - Multiple prompt categories:

`config/prompts/email-strategies/*.json` (Current Active Strategies):
- `free-value-delivery.json` - Offer free value upfront
- `portfolio-building.json` - Win-win portfolio building approach
- `problem-first-urgent.json` - Urgent problem-first messaging
- `subject-line-generator.json` - Dynamic subject line generation

`config/prompts/social-strategies/*.json`:
- 13 platform-specific strategies (Facebook, LinkedIn, Instagram, etc.)

**Note**: Older email strategies (`compliment-sandwich.json`, `problem-first.json`, `achievement-focused.json`, `question-based.json`) have been archived to `_archive/` directories.

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

Located in: `analysis-engine/grading/grader.js`

**Additional Grading Features**:
- **AI-Powered Grading**: `grading/ai-grader.js` uses GPT-5 for comparative grading alongside rule-based scoring
- **Critique Generation**: `grading/critique-generator.js` generates actionable critiques

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

### 6. AI Report Synthesis Pipeline (Report Engine)

**NEW in v2.1**: Intelligent report generation with AI-powered synthesis.

The Report Engine includes a 2-stage AI synthesis pipeline that runs **after** analysis but **before** report generation:

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

**Location**: `report-engine/reports/synthesis/report-synthesis.js`

**Prompts**:
- `analysis-engine/config/prompts/report-synthesis/issue-deduplication.json`
- `analysis-engine/config/prompts/report-synthesis/executive-insights-generator.json`

**Integration Point**: `report-engine/reports/auto-report-generator.js`

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
cd report-engine
node reports/synthesis/test-pipeline.js  # Test synthesis pipeline
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

**Documentation**: See `report-engine/reports/synthesis/SYNTHESIS-INTEGRATION-GUIDE.md` for complete guide.

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

### 8. Rate Limit Management System

**Documentation**: `RATE-LIMIT-SYSTEM-GUIDE.md`

All AI API calls go through a centralized rate limiting system that prevents hitting provider rate limits.

**Location**: `database-tools/shared/rate-limit-tracker.js`

**Key Features**:
- Token bucket algorithm for rate limit tracking
- Automatic retry with exponential backoff
- Respect for Retry-After headers
- 90% safety margin before hitting limits
- Real-time rate limit tracking per provider/model
- Environment-driven model selection (overrides JSON configs)

**Integration**: Automatically integrated into `ai-client.js`. No additional code required.

**Environment Variables for Model Overrides**:
```env
# Override specific analyzer models
DESKTOP_VISUAL_MODEL=gpt-5
SEO_MODEL=grok-4-fast
CONTENT_MODEL=grok-4-fast
```

**Benefits**:
- Prevents API rate limit errors
- Automatic fallback and retry logic
- Cost optimization through intelligent model selection
- Centralized rate limit state across all engines

### 9. Benchmarking & Competitive Analysis System (Analysis Engine)

The Analysis Engine includes a sophisticated competitive analysis system for comparing leads against industry benchmarks.

**Tables**:
- `benchmarks` - Stores competitor/industry benchmark data
  - Schema: `analysis-engine/database/schemas/benchmarks.json`

**Key Files**:
- `services/benchmark-analyzer.js` - Analyzes competitor websites
- `services/benchmark-matcher.js` - Matches leads to relevant benchmarks
- `scripts/populate-benchmarks.js` - Batch populate benchmark data
- `scripts/backfill-benchmark-strengths.js` - Enhance existing benchmarks

**Prompts**: `config/prompts/benchmarking/*.json` (7 industry-specific prompts)

**How It Works**:
1. System maintains a database of analyzed competitor websites (benchmarks)
2. When analyzing a lead, the system finds relevant competitors in the same industry
3. AI compares the lead against top performers to identify gaps
4. Generates competitive insights: "Your competitor X has Y feature that you lack"

**Usage**:
```javascript
import { analyzeBenchmark } from './services/benchmark-analyzer.js';
import { findBenchmarks } from './services/benchmark-matcher.js';

// Find relevant benchmarks
const benchmarks = await findBenchmarks(industry, limit);

// Analyze a competitor
const analysis = await analyzeBenchmark(url, companyName, industry);
```

### 10. Multi-Page Crawling System (Analysis Engine)

**Documentation**: `analysis-engine/scrapers/CRAWLER-ARCHITECTURE.md`

The Analysis Engine can crawl multiple pages of a website for comprehensive analysis beyond just the homepage.

**Tables**:
- `page_analyses` - Stores per-page analysis results
  - Schema: `analysis-engine/database/schemas/page_analyses.json`

**Key Files**:
- `scrapers/multi-page-crawler.js` - Main crawler implementation
- `services/page-analyzer.js` - Per-page analysis logic

**Environment Variable**:
```env
ENABLE_MULTI_PAGE_CRAWL=true  # Enable multi-page crawling
MAX_PAGES_TO_CRAWL=5          # Limit pages per site
```

**How It Works**:
1. Crawler discovers internal links from the homepage
2. Intelligently selects important pages (About, Services, Contact, etc.)
3. Analyzes each page individually for content, SEO, design
4. Aggregates findings into the overall lead analysis
5. Stores per-page results in `page_analyses` table

**Benefits**:
- More comprehensive analysis beyond homepage
- Discover hidden issues on interior pages
- Better understanding of site structure and navigation
- Enhanced SEO analysis across multiple pages

### 11. Unified Analyzers (Analysis Engine)

The Analysis Engine has evolved to use "unified" analyzers that combine multiple analysis types for efficiency.

**Unified Visual Analyzer**: `analyzers/unified-visual-analyzer.js`
- Combines desktop and mobile screenshot analysis
- Single AI call analyzes both device types
- Uses prompt: `config/prompts/web-design/unified-visual-analysis.json`
- Replaces separate desktop-visual and mobile-visual analyzers

**Unified Technical Analyzer**: `analyzers/unified-technical-analyzer.js`
- Combines SEO and content analysis
- Single AI call for technical assessment
- Uses prompt: `config/prompts/web-design/unified-technical-analysis.json`
- Replaces separate seo and content analyzers

**Benefits**:
- Reduced AI API calls (50% fewer calls)
- Lower cost per analysis
- Faster analysis completion
- Maintains same quality and detail

**Original Analyzers** (still available):
- `analyzers/desktop-visual-analyzer.js`
- `analyzers/mobile-visual-analyzer.js`
- `analyzers/seo-analyzer.js`
- `analyzers/content-analyzer.js`

### 12. Issue Deduplication System (Analysis Engine)

The Analysis Engine includes an AI-powered deduplication system that identifies and merges duplicate issues across all analyzers.

**Location**: `analysis-engine/services/issue-deduplication-service.js`

**How It Works**:
- Uses AI (GPT-5-mini) to identify semantic duplicates
- Merges issues that describe the same underlying problem from different perspectives
- Preserves ALL metadata including screenshot references
- Runs BEFORE top issues selection to ensure clean issue pool

**Configuration**:
```env
ENABLE_ISSUE_DEDUPLICATION=false     # Default off for backward compatibility
DEDUPLICATION_MODEL=gpt-5-mini       # Can use different model if needed
```

**Cost**: ~$0.036 per analysis | **Reduction**: 40-60% fewer issues

**Preservation Rules**:
- Keeps most specific/quantified title
- Merges descriptions from all perspectives
- Preserves ALL screenshot references and metadata
- Uses highest severity/priority from merged issues

### 13. Top Issues Selection System (Analysis Engine)

The Analysis Engine includes an AI-powered system to select the most compelling issues for cold outreach.

**Location**: `analysis-engine/services/top-issues-selector.js`

**How It Works**:

```
All Issues (20-40) → [Optional: AI Dedup] → Severity Filter → AI Selection → Post-Dedup → Top N Issues
                     (if enabled)            (critical, high)   (GPT-5-mini)   (similarity)  (default: 5)
```

**Selection Criteria**:
1. **Business Impact**: Issues affecting revenue, conversions, or customer trust
2. **Outreach Appeal**: Issues that make compelling email hooks
3. **Credibility**: Issues backed by data/screenshots
4. **Quick Win Balance**: Mix of easy fixes and major improvements
5. **Non-Technical Language**: Business owner-friendly descriptions

**Deduplication**:
- AI prompt includes explicit instructions to avoid duplicates
- Post-processing uses Levenshtein distance (70% similarity threshold)
- Prefers quantified versions: "280 of 856 images missing alt text (33%)" over "Many images missing alt text"
- Automatically selects more specific/actionable versions

**Configuration**:
```env
TOP_ISSUES_LIMIT=5                        # Number of issues to select (default: 5)
TOP_ISSUES_SEVERITY_FILTER=critical,high  # Severities to include (default: critical,high)
```

**Cost**: ~$0.0015 per analysis (GPT-5-mini)

**Integration**: Called by `services/results-aggregator.js` after all analyzers complete, before grading

**Output**: Stored in `leads.top_issues` (JSONB array) with metadata:
- `top_issues_summary`: Comma-separated titles
- `top_issues_selection_strategy`: AI's selection approach
- `top_issues_selection_cost`: API call cost
- `total_issues_count`: Total issues before filtering
- `high_critical_issues_count`: Issues after severity filter

**Fallback**: If AI fails, uses rule-based sorting by severity + priority with deduplication

### 14. Work Queue System (All Engines)

**Documentation**: `WORK-QUEUE-SYSTEM-GUIDE.md`

MaxantAgency uses a universal work queue system for async job-based architecture across all engines.

**Location**: `database-tools/shared/work-queue.js`

**Integrated Engines**:
- ✅ Analysis Engine - `analysis-engine/routes/analysis-queue-endpoints.js`
- ✅ Prospecting Engine - `prospecting-engine/routes/prospecting-queue-endpoints.js`
- ✅ Report Engine - `report-engine/routes/report-queue-endpoints.js`
- ✅ Outreach Engine - `outreach-engine/routes/outreach-queue-endpoints.js`

**Key Features**:
- Priority-based job scheduling (small batches = high priority)
- Per-work-type concurrency limits
- Redis-backed persistence with in-memory fallback
- Job states: queued, running, completed, failed, cancelled
- Cross-engine coordination and visibility
- Cancellation support for queued jobs
- 24-hour automatic cleanup

**API Pattern** (consistent across all engines):
```javascript
// Queue job
POST /api/{work-type}-queue
Response: { success: true, job_id: "uuid" }

// Check status
GET /api/{work-type}-status?job_ids=uuid1,uuid2
Response: { success: true, jobs: [...], summary: {...} }

// Cancel job
POST /api/cancel-{work-type}
Body: { job_ids: ["uuid1", "uuid2"] }

// Overall queue status (all engines)
GET /api/queue-status
Response: { types: { analysis: {...}, prospecting: {...}, report: {...} } }
```

**Work Types & Concurrency**:
```javascript
{
  analysis: 2,      // Max 2 concurrent analyses
  prospecting: 1,   // Max 1 concurrent prospecting
  report: 1,        // Max 1 concurrent report
  outreach: 2       // Max 2 concurrent outreach
}
```

**Configuration**:
```env
USE_WORK_QUEUE=true                    # Enable work queue system
REDIS_URL=redis://localhost:6379       # Redis connection
MAX_CONCURRENT_ANALYSES=2
MAX_CONCURRENT_PROSPECTING=1
MAX_CONCURRENT_REPORTS=1
MAX_CONCURRENT_OUTREACH=2
```

**Priority Calculation**:
- Small batches (1-5 items) = Priority 1 (high)
- Medium batches (6-20 items) = Priority 2 (medium)
- Large batches (21+ items) = Priority 3 (low)

**Benefits**:
- No SSE timeout issues with long-running jobs
- Poll for status instead of maintaining persistent connections
- Cancel jobs before they start (testing, debugging, cost savings)
- Unified monitoring across all engines
- Resource protection via concurrency limits
- Cross-engine coordination prevents resource contention

**Backward Compatibility**:
- Existing endpoints remain fully functional
- Analysis: `/api/analyze-url` (old) + `/api/analyze` (new queue-based)
- Prospecting: `/api/prospect` (SSE) + `/api/prospect-queue` (queue-based)
- Report: `/api/generate` (sync) + `/api/generate-queue` (queue-based)
- Outreach: `/api/compose-all-variations` (SSE) + `/api/compose-queue` (queue-based)

**Usage Example - Analysis Engine**:
```javascript
// Queue analysis job
const { job_id } = await fetch('/api/analyze', {
  method: 'POST',
  body: JSON.stringify({ prospect_ids: [...], project_id: 'uuid' })
}).then(r => r.json());

// Poll for status
const checkStatus = async () => {
  const { jobs } = await fetch(`/api/analysis-status?job_ids=${job_id}`)
    .then(r => r.json());

  if (jobs[0].state === 'completed') {
    console.log('Result:', jobs[0].result);
  } else if (jobs[0].state === 'failed') {
    console.error('Failed:', jobs[0].error);
  } else {
    setTimeout(checkStatus, 5000); // Check again in 5 seconds
  }
};
```

**Usage Example - Outreach Engine**:
```javascript
// Queue outreach composition (12 variations per lead)
const { job_id } = await fetch('http://localhost:3002/api/compose-queue', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    lead_ids: ['uuid1', 'uuid2', 'uuid3'],
    options: { forceRegenerate: false }
  })
}).then(r => r.json());

// Poll for status
const { jobs } = await fetch(`http://localhost:3002/api/compose-status?job_ids=${job_id}`)
  .then(r => r.json());

console.log(jobs[0].result);
// { success: true, processed_leads: 3, total_variations: 36, total_cost: 0.24, ... }
```

**Monitoring**:
```bash
# Live queue monitoring
node database-tools/shared/rate-limit-monitor.js --watch

# Check queue status (any engine)
curl http://localhost:3001/api/queue-status  # Analysis Engine
curl http://localhost:3010/api/queue-status  # Prospecting Engine
curl http://localhost:3003/api/queue-status  # Report Engine
curl http://localhost:3002/api/queue-status  # Outreach Engine
```

**System Architecture**:
```
Work Queue (Layer 4) - Job scheduling & prioritization
    ↓
Request Queue (Layer 3) - Per-engine AI concurrency (10 concurrent)
    ↓
Distributed Rate Limiter (Layer 2) - Cross-engine coordination via Redis
    ↓
Local Rate Limiter (Layer 1) - Per-process token buckets
    ↓
AI Providers (OpenAI, Anthropic, xAI)
```

## Environment Variables

All engines use environment variables for configuration. Create a `.env` file in each engine's root directory (or use a shared `.env` at the project root).

### Required Variables (All Engines)

```env
# Supabase Database
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
```

**IMPORTANT**: Use `SUPABASE_SERVICE_KEY` (not `SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_KEY`)

### AI Provider API Keys

```env
# OpenAI (GPT models)
OPENAI_API_KEY=sk-...

# Anthropic (Claude models)
ANTHROPIC_API_KEY=sk-ant-...

# xAI (Grok models)
XAI_API_KEY=xai-...
```

### Feature Toggles

```env
# AI Call Logging
LOG_AI_CALLS_TO_DB=true              # Enable AI cost tracking

# Context-Aware Analysis (Analysis Engine) - DEFAULT: ENABLED
ENABLE_CROSS_PAGE_CONTEXT=true       # Enable context sharing across pages (default: true)
                                      # Reduces redundant issues by ~45%, 30% cost savings, 6% faster
                                      # Set to 'false' to disable
ENABLE_CROSS_ANALYZER_CONTEXT=false  # Enable context sharing between analyzers (default: false)

# Report Synthesis (Report Engine)
USE_AI_SYNTHESIS=true                # Enable AI-powered report synthesis

# Multi-Page Crawling (Analysis Engine)
ENABLE_MULTI_PAGE_CRAWL=true         # Enable multi-page website crawling
MAX_PAGES_TO_CRAWL=5                 # Limit pages per site

# Top Issues Selection (Analysis Engine)
TOP_ISSUES_LIMIT=5                   # Number of top issues to select for outreach (default: 5)
TOP_ISSUES_SEVERITY_FILTER=critical,high  # Severity levels to include (default: critical,high)
                                          # Options: critical, high, medium, low (comma-separated)

# Issue Deduplication (Analysis Engine)
ENABLE_ISSUE_DEDUPLICATION=false     # Enable AI deduplication before top issues selection (default: false)
DEDUPLICATION_MODEL=gpt-5-mini       # AI model for deduplication (default: gpt-5-mini)

# Individual Analyzer Toggles (Analysis Engine)
ENABLE_DESKTOP_VISUAL_ANALYZER=true
ENABLE_MOBILE_VISUAL_ANALYZER=true
ENABLE_SEO_ANALYZER=true
ENABLE_CONTENT_ANALYZER=true
ENABLE_SOCIAL_ANALYZER=true
ENABLE_ACCESSIBILITY_ANALYZER=true
```

### AI Model Overrides

Override models specified in JSON prompt configs:

```env
# Analysis Engine Model Overrides
DESKTOP_VISUAL_MODEL=gpt-5
MOBILE_VISUAL_MODEL=gpt-5
SEO_MODEL=grok-4-fast
CONTENT_MODEL=grok-4-fast
SOCIAL_MODEL=grok-4-fast
ACCESSIBILITY_MODEL=claude-4-5-haiku

# Report Synthesis Model Overrides
SYNTHESIS_MODEL=gpt-5
EXECUTIVE_INSIGHTS_MODEL=gpt-5

# Outreach Engine Model Overrides
EMAIL_COMPOSER_MODEL=grok-4-fast
SUBJECT_LINE_MODEL=grok-4-fast
```

### Server Ports

```env
# Engine Ports (optional, defaults shown)
PORT=3010  # Prospecting Engine
PORT=3001  # Analysis Engine
PORT=3003  # Report Engine
PORT=3002  # Outreach Engine
PORT=3020  # Pipeline Orchestrator
PORT=3000  # Command Center UI
```

### Work Queue System

```env
# Enable/Disable Work Queue
USE_WORK_QUEUE=true                    # Enable universal work queue (default: true)

# Redis Configuration (required for cross-engine coordination)
REDIS_URL=redis://localhost:6379       # Redis connection URL
# Or use individual fields:
# REDIS_HOST=localhost
# REDIS_PORT=6379
# REDIS_PASSWORD=your-password

# Per-Type Concurrency Limits
MAX_CONCURRENT_ANALYSES=2              # Max concurrent analysis jobs
MAX_CONCURRENT_OUTREACH=2              # Max concurrent outreach jobs
MAX_CONCURRENT_REPORTS=1               # Max concurrent report jobs
MAX_CONCURRENT_PROSPECTING=1           # Max concurrent prospecting jobs

# Request Queue (Per-Engine AI Concurrency)
MAX_CONCURRENT_AI_CALLS=10             # Max concurrent AI calls per engine process
MIN_DELAY_BETWEEN_AI_CALLS_MS=150      # Minimum delay between AI calls (traffic spreading)
USE_REQUEST_QUEUE=true                 # Enable request queue (default: true)

# Distributed Rate Limiting
USE_DISTRIBUTED_RATE_LIMITING=true     # Enable cross-engine rate limit coordination
FALLBACK_TO_LOCAL_LIMITING=true        # Fall back to local if Redis fails
```

### Other Configuration

```env
# Node Environment
NODE_ENV=development  # or production

# API Rate Limiting (handled automatically by rate-limit-tracker)
# No configuration needed - system auto-manages rate limits

# Supabase Storage (Report Engine)
SUPABASE_STORAGE_BUCKET=reports  # Bucket name for PDF storage
```

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

### Consolidated Outreach Table

The Outreach Engine uses a single `composed_outreach` table to store all outreach variations (email + social) for each lead. This consolidates what used to be separate `composed_emails` and `social_outreach` tables.

**Table Structure**:
```sql
composed_outreach (
  id uuid PRIMARY KEY,
  lead_id uuid REFERENCES leads(id),
  email_variations jsonb,      -- Array of email strategy variations
  social_variations jsonb,      -- Array of social strategy variations
  selected_email_index integer,
  selected_social_index integer,
  created_at timestamptz,
  updated_at timestamptz
)
```

**Benefits**:
- Single source of truth per lead
- Easier to manage variations together
- Simpler foreign key relationships
- Atomic updates for both email and social content

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

# Test specific URL via API
curl -X POST http://localhost:3001/api/analyze-url \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com","company_name":"Example Co"}'

# Check database results
node -e "
import { getLeads } from './database/supabase-client.js';
getLeads({ limit: 5 }).then(console.log);
"
```

**Note**: Automated test suite is not yet implemented for Analysis Engine.

### Debugging Pipeline Issues

```bash
# Check health of all services
curl http://localhost:3010/health  # Prospecting
curl http://localhost:3001/health  # Analysis
curl http://localhost:3003/health  # Report
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

**Root Level**:
- `README.md` - System overview and architecture
- `SETUP.md` - Setup instructions and first-time configuration
- `RATE-LIMIT-SYSTEM-GUIDE.md` - Complete rate limiting documentation
- `WORK-QUEUE-SYSTEM-GUIDE.md` - Complete work queue system documentation
- `package.json` - Root-level npm scripts for dev workflow

**Database Tools**:
- `database-tools/README.md` - Database setup and schema format

**Analysis Engine**:
- `analysis-engine/scrapers/CRAWLER-ARCHITECTURE.md` - Multi-page crawling system
- `analysis-engine/analyzers/VISUAL-ANALYZERS-README.md` - Visual analyzer documentation

**Report Engine**:
- `report-engine/reports/synthesis/SYNTHESIS-INTEGRATION-GUIDE.md` - AI synthesis pipeline

**QA Supervisor**:
- `qa-supervisor/QA-REFACTOR-SUMMARY.md` - QA system documentation

**Validation Kit**:
- `validation-kit/README.md` - Marketing and positioning materials

## Testing Philosophy

- **Unit tests** test individual modules in isolation
- **Integration tests** test entire workflows (e.g., prospect → analyze → compose → send)
- **Validation tests** check schema definitions and configurations
- All test files are named `test-*.js`
- Tests output clear pass/fail counts: `✅ Passed: N`, `❌ Failed: N`

**Note**: Test coverage varies across engines. The Outreach Engine has the most comprehensive test suite, while other engines have limited or no tests currently.

### Test File Organization

**Standard Pattern**: Place tests in `{engine}/tests/test-*.js`

**Outreach Engine** (most complete):
- `outreach-engine/tests/test-phase1-integration.js` - Full workflow integration test
- `outreach-engine/tests/test-prompt-loading.js` - Prompt loader tests
- 15+ additional test files in `outreach-engine/tests/`

**Root-Level Test Runners** (Outreach Engine convenience):
- `test-batch-generation.js` - Quick batch testing
- `test-end-to-end.js` - Full workflow test
- `test-notion-sync.js` - Notion integration test

**Database Validation Tests**:
- `database-tools/` - Schema validation via `npm run db:validate`

**Other Engines**: Test suites are planned but not yet implemented for Prospecting, Analysis, Report, and Pipeline engines.
