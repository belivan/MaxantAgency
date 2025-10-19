# Client Orchestrator Utilities

## Debug and Admin Tools

### Show Prospects in Database

View all prospects saved to Supabase:

```bash
node show-prospects.js
```

**Output:**
- Table schema and column types
- Last 10 prospects with full details
- Company names, industries, URLs
- Social profiles (Instagram, Facebook, LinkedIn)
- Status, city, why_now, teaser
- Creation timestamps

**Use Case:** Quickly inspect what's in the database after running prospect generation.

---

## API Server

Start the HTTP API server for integration with Command Center UI:

```bash
npm run server
```

**Port:** `3010`
**Health Check:** `http://localhost:3010/health`

### Endpoints

#### POST /api/prospects
Generate prospects and automatically create project in Supabase.

**See:** [../command-center-ui/CLIENT-ORCHESTRATOR-INTEGRATION.md](../command-center-ui/CLIENT-ORCHESTRATOR-INTEGRATION.md#post-apiprospects---generate-prospects)

#### POST /api/analyze
Analyze websites using website-audit-tool.

**See:** [../command-center-ui/CLIENT-ORCHESTRATOR-INTEGRATION.md](../command-center-ui/CLIENT-ORCHESTRATOR-INTEGRATION.md#post-apianalyze---analyze-websites)

---

## Model Recommendations

### For Real Companies (Recommended)

```bash
--model grok-4-fast
```

- Uses web search to find actual businesses
- Returns real URLs, contact info, and social profiles
- Higher accuracy, slower (~30-60 seconds for 20 companies)
- Requires `XAI_API_KEY` in environment

### For Fast Generation

```bash
--model gpt-4o-mini
```

- Fast generation (~5-10 seconds for 20 companies)
- May generate fictional companies
- Good for testing workflows
- Requires `OPENAI_API_KEY` in environment

---

## Environment Setup

The client-orchestrator reads from `../website-audit-tool/.env`:

```bash
# Required for Grok
XAI_API_KEY=xai-...

# Required for GPT
OPENAI_API_KEY=sk-...

# Required for Supabase
SUPABASE_URL=https://...
SUPABASE_SERVICE_KEY=eyJ...

# Optional
ORCHESTRATOR_PORT=3010
```

---

## Quick Commands Reference

```bash
# View prospects in database
node show-prospects.js

# Start API server
npm run server

# Generate prospects (CLI)
node index.js --brief brief.json --count 20 --model grok-4-fast --verify

# Generate prospects (API - requires server running)
curl -X POST http://localhost:3010/api/prospects \
  -H "Content-Type: application/json" \
  -d '{"brief": {...}, "count": 20, "model": "grok-4-fast"}'
```
