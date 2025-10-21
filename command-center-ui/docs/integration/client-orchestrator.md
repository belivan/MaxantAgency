# Client Orchestrator Integration Guide

**For Command Center UI Developers**

This guide explains how to integrate with the Client Orchestrator API for end-to-end prospect generation, analysis, and project tracking.

---

## System Overview

The Client Orchestrator generates **verified prospects** using AI and web search, then orchestrates the full pipeline:

```
Command Center UI (You)
    │
    ├─> POST /api/prospects → Generate prospects + Create project
    │   └─> Returns: project_id, companies, urls
    │
    ├─> POST /api/analyze → Analyze websites
    │   └─> Pass projectId through metadata
    │
    └─> Display project dashboard with stats
```

---

## Quick Start

### 1. Start the Client Orchestrator API

```bash
cd client-orchestrator
npm install
npm run server
```

**Runs on:** `http://localhost:3010`

### 2. Health Check

```bash
curl http://localhost:3010/health
```

**Response:**
```json
{
  "status": "ok",
  "service": "client-orchestrator"
}
```

---

## API Endpoints

### `POST /api/prospects` - Generate Prospects

**Purpose:** Generate verified prospect list from ICP brief, **automatically creates project**.

**URL:** `http://localhost:3010/api/prospects`

**Request:**
```json
{
  "brief": {
    "studio": {
      "name": "Maksant",
      "intro": "We build conversion-first sites for local services and SMBs",
      "offer": "Quick-Wins Package (5–7 days)",
      "price": { "quickWins": "$750–$950" },
      "strengths": ["Above-the-fold CTA", "Speed optimization"]
    },
    "icp": {
      "niches": ["home services", "local transport", "medical practices"],
      "triggers": ["no above-fold CTA", "slow hero image"],
      "exclusions": ["national chains"]
    },
    "geo": {
      "city": "Philadelphia, PA",
      "radiusMiles": 40
    }
  },
  "count": 20,
  "city": "Philadelphia, PA",
  "model": "grok-4-fast",
  "verify": true,
  "projectName": "Philadelphia Home Services - Oct 2025"
}
```

**Parameters:**
- `brief` (object, required) - ICP configuration
- `count` (number, optional) - Number of prospects to generate (default: 20)
- `city` (string, optional) - City to focus on
- `model` (string, optional) - AI model: `grok-4-fast` (web search, recommended), `gpt-4o-mini` (fast)
- `verify` (boolean, optional) - Verify URLs are live (default: true)
- `projectName` (string, optional) - Human-readable project name (auto-generated if omitted)

**Response:**
```json
{
  "success": true,
  "companies": [
    {
      "name": "Apex Plumbing Services",
      "website": "https://apexplumbingservices.com",
      "industry": "Home Services - Plumbing",
      "why_now": "Website has no above-the-fold CTA and slow hero image",
      "teaser": "Your plumbing site's hero loads slowly...",
      "social_profiles": {
        "instagram": "https://www.instagram.com/apexplumbingservices/",
        "facebook": "https://www.facebook.com/ApexPlumbingServices",
        "linkedin_company": "https://www.linkedin.com/company/apex-plumbing-services",
        "linkedin_person": "https://www.linkedin.com/in/john-doe-plumber-owner"
      }
    }
  ],
  "urls": [
    "https://apexplumbingservices.com",
    "https://swifthvac.com"
  ],
  "runId": "f10e751c-653c-495f-a946-a05efeea6bbd",
  "project": {
    "id": "f7c7f62b-4e0f-4277-bdc2-598af2396af2",
    "name": "Philadelphia Home Services - Oct 2025",
    "description": "Generated 13 prospects for home services in Philadelphia, PA"
  }
}
```

**What Gets Saved to Supabase:**
- **prospects table:** All verified companies with status `pending_analysis`, linked to `project_id`
- **projects table:** New project with auto-calculated stats

---

### `POST /api/analyze` - Analyze Websites

**Purpose:** Run website analyzer on prospect URLs.

**URL:** `http://localhost:3010/api/analyze`

**Request:**
```json
{
  "urls": [
    "https://apexplumbingservices.com",
    "https://swifthvac.com"
  ],
  "options": {
    "tier": "tier1",
    "emailType": "local",
    "modules": ["seo", "visual"],
    "metadata": {
      "projectId": "f7c7f62b-4e0f-4277-bdc2-598af2396af2",
      "campaignId": "fall-outreach-2025",
      "clientName": "Maksant"
    }
  }
}
```

**Parameters:**
- `urls` (string[], required) - URLs to analyze
- `options.tier` (string, optional) - Analysis depth: `tier1` (fast), `tier2` (deep), `tier3` (comprehensive)
- `options.modules` (string[], optional) - Modules: `seo`, `visual`, `industry`, `competitor`
- `options.emailType` (string, optional) - `local` or `national`
- `options.metadata.projectId` (string, **IMPORTANT**) - Link analysis to project
- `options.metadata.campaignId` (string, optional) - Campaign identifier
- `options.metadata.clientName` (string, optional) - Client name

**Response:**
```json
{
  "success": true,
  "results": [
    {
      "url": "https://apexplumbingservices.com",
      "company": "Apex Plumbing Services",
      "grade": "B",
      "score": 65,
      "email": "contact@apexplumbing.com",
      "phone": "(215) 555-1234",
      "analysis_cost": 0.08
    }
  ],
  "logs": []
}
```

**What Gets Saved to Supabase:**
- **leads table:** Analysis results with `project_id`, `campaign_id`, `client_name`
- **prospects table:** Status updated to `analyzed`

---

## Project Tracking System

### Why Projects Matter

Projects allow you to:
- Track multiple campaigns separately
- Calculate ROI per project
- Filter prospects/leads/emails by project
- Show project-specific dashboards

### Project Schema

```typescript
interface Project {
  id: string;              // UUID
  name: string;            // "Philadelphia Home Services - Oct 2025"
  description: string;     // "Generated 13 prospects for..."
  icp_data: object;        // The brief that was used
  status: string;          // "active" | "paused" | "completed"
  stats: {
    prospects_generated: number;
    leads_analyzed: number;
    leads_graded: {
      A: number,
      B: number,
      C: number,
      D: number,
      F: number
    },
    emails_sent: number
  };
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}
```

### Automatic Stats Updates

The `update_project_stats()` database function automatically calculates:
- Total prospects generated (from `prospects` table)
- Total leads analyzed (from `leads` table)
- Lead grade distribution (A/B/C/D/F counts)
- Total emails sent (from `composed_emails` table)

**Query in Supabase:**
```javascript
const { data } = await supabase.rpc('update_project_stats', {
  p_project_id: 'f7c7f62b-4e0f-4277-bdc2-598af2396af2'
});

console.log(data);
// {
//   prospects_generated: 13,
//   leads_analyzed: 13,
//   leads_graded: { A: 2, B: 5, C: 4, D: 2, F: 0 },
//   emails_sent: 8
// }
```

---

## Integration Workflow

### Complete Flow with Project Tracking

```javascript
// 1. GENERATE PROSPECTS (creates project automatically)
const prospectResponse = await fetch('http://localhost:3010/api/prospects', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    brief: yourBriefObject,
    count: 20,
    city: 'Philadelphia, PA',
    model: 'grok-4-fast',
    verify: true,
    projectName: 'Philadelphia Home Services - Oct 2025'
  })
});

const { project, urls, companies } = await prospectResponse.json();
const projectId = project.id; // Save this!

// 2. ANALYZE WEBSITES (link to project)
const analyzeResponse = await fetch('http://localhost:3010/api/analyze', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    urls: urls,
    options: {
      tier: 'tier1',
      modules: ['seo'],
      metadata: {
        projectId: projectId, // ← Pass project ID through!
        campaignId: 'fall-2025',
        clientName: 'Maksant'
      }
    }
  })
});

// 3. FETCH PROJECT STATS
const { data: stats } = await supabase.rpc('update_project_stats', {
  p_project_id: projectId
});

// 4. DISPLAY IN UI
console.log(`Project: ${project.name}`);
console.log(`Prospects: ${stats.prospects_generated}`);
console.log(`Analyzed: ${stats.leads_analyzed}`);
console.log(`Grades: A=${stats.leads_graded.A} B=${stats.leads_graded.B}`);
```

---

## Querying Data with Project Filter

### Get All Prospects for a Project

```javascript
const { data: prospects } = await supabase
  .from('prospects')
  .select('*')
  .eq('project_id', projectId)
  .order('created_at', { ascending: false });
```

### Get All Analyzed Leads for a Project

```javascript
const { data: leads } = await supabase
  .from('leads')
  .select('*')
  .eq('project_id', projectId)
  .order('lead_grade', { ascending: true });
```

### Get All Emails for a Project

```javascript
const { data: emails } = await supabase
  .from('composed_emails')
  .select('*')
  .eq('project_id', projectId)
  .eq('status', 'sent');
```

### List All Projects

```javascript
const { data: projects } = await supabase
  .from('projects')
  .select('*')
  .eq('status', 'active')
  .order('created_at', { ascending: false });
```

---

## UI Recommendations

### Project Dashboard View

Display in your UI:

```
📊 Project: Philadelphia Home Services - Oct 2025
Status: Active
Created: Oct 19, 2025

PIPELINE PROGRESS:
├─ Prospects Generated: 13 ✅
├─ Websites Analyzed: 13 ✅
├─ Lead Grades:
│  ├─ A (Hot): 2 leads
│  ├─ B (Warm): 5 leads
│  ├─ C (Cold): 4 leads
│  └─ D (Bad fit): 2 leads
└─ Emails Sent: 8

[View Prospects] [View Leads] [Compose More Emails]
```

### Project Selector

Add a dropdown to filter all tabs by project:

```javascript
const [selectedProject, setSelectedProject] = useState(null);

// Filter prospects/leads/emails by selectedProject.id
```

---

## Real-World Example

### What You Just Generated (Oct 19, 2025)

**Project:** Philadelphia Home Services & Medical - Oct 2025
**Project ID:** `f7c7f62b-4e0f-4277-bdc2-598af2396af2`

**Generated:**
- 13 verified prospects
- 3 industries: home services (7), local transport (3), medical (3)
- Social profiles: Instagram (9), Facebook (13), LinkedIn (13)

**Next Steps:**
1. Run analyzer on all 13 URLs → Creates 13 leads
2. Update project stats → Shows grade distribution
3. Compose emails for A/B leads → Track by project
4. Display in project dashboard

---

## Environment Variables

The Client Orchestrator reads from `website-audit-tool/.env`:

```bash
# Required
XAI_API_KEY=xai-...              # For Grok web search
OPENAI_API_KEY=sk-...            # For GPT models
SUPABASE_URL=https://...         # For database
SUPABASE_SERVICE_KEY=eyJ...      # For database

# Optional
ORCHESTRATOR_PORT=3010           # API port (default: 3010)
DEFAULT_TEXT_MODEL=gpt-5-mini    # Analyzer model
```

---

## Troubleshooting

### "Projects table not found"

Run the migration:
```sql
-- See: email-composer/supabase-migration-add-projects.sql
```

### "Social profiles not saving"

Run the migration:
```sql
-- See: client-orchestrator/supabase-migration-add-social-profiles.sql
```

### "API not responding on port 3010"

```bash
cd client-orchestrator
npm run server
```

Check logs for errors.

### "Grok not finding real companies"

Make sure `XAI_API_KEY` is set in `website-audit-tool/.env`.

If missing, prospect generation will fall back to GPT (which generates fictional companies).

---

## Data Schema Reference

### prospects table
```sql
CREATE TABLE prospects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  website TEXT UNIQUE NOT NULL,
  company_name TEXT,
  industry TEXT,
  why_now TEXT,
  teaser TEXT,
  social_profiles JSONB,           -- Instagram, Facebook, LinkedIn
  status TEXT DEFAULT 'pending_analysis',
  run_id UUID,
  source TEXT,
  city TEXT,
  brief_snapshot TEXT,
  project_id UUID,                 -- Links to projects table
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_status_change TIMESTAMPTZ
);
```

### projects table
```sql
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  icp_data JSONB,
  status TEXT DEFAULT 'active',
  stats JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);
```

### leads table
```sql
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url TEXT UNIQUE NOT NULL,
  company_name TEXT,
  industry TEXT,
  lead_grade TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  analysis_cost NUMERIC,
  analysis_time INTEGER,
  project_id UUID,                 -- Links to projects table
  campaign_id TEXT,
  client_name TEXT,
  source_app TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Cost Estimates

### Per Prospect (Grok with Web Search)
- **Generation:** ~$0.003 per company
- **URL Verification:** Free (HTTP HEAD requests)
- **Total per prospect:** ~$0.003

### Per Lead (Analysis)
- **Tier 1:** ~$0.04-0.08 per website
- **Tier 2:** ~$0.10-0.15 per website
- **Tier 3:** ~$0.15-0.25 per website

### Example: 20 Prospects → 13 Analyzed
- Prospect generation: 20 × $0.003 = **$0.06**
- Analysis (tier1): 13 × $0.06 = **$0.78**
- **Total:** ~$0.84 for full pipeline

---

## Support

**Built by:** Maksant
**Email:** maksantagency@gmail.com
**Docs:** See `client-orchestrator/README.md` for full CLI documentation

---

## Quick Reference

```bash
# Start API
cd client-orchestrator && npm run server

# Test endpoint
curl http://localhost:3010/health

# Generate prospects
curl -X POST http://localhost:3010/api/prospects \
  -H "Content-Type: application/json" \
  -d '{"brief": {...}, "count": 20}'

# Analyze websites
curl -X POST http://localhost:3010/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"urls": [...], "options": {...}}'
```

**Your job:** Call these endpoints from Command Center UI, pass `projectId` through the pipeline, and display beautiful project dashboards!
