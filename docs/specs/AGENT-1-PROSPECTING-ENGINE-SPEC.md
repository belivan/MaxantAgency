# PROSPECTING ENGINE - Technical Specification
Version: 2.0
Agent Assignment: Agent 1
Status: COMPLETE REFACTOR REQUIRED

═══════════════════════════════════════════════════════════════════

## 1. PURPOSE & SCOPE

### What This Service Does:
The Prospecting Engine is a UNIVERSAL company discovery and enrichment system.
It finds real companies, verifies they exist, extracts basic data, discovers
social profiles, and prepares them for business-specific analysis.

### What This Service Does NOT Do:
- Does NOT analyze websites for quality/issues (that's the Analysis Engine)
- Does NOT generate outreach emails (that's the Outreach Engine)
- Does NOT care about your business type (web design, HVAC, etc.)

### Core Philosophy:
"Find real companies and gather all available data - same process for everyone"

═══════════════════════════════════════════════════════════════════

## 2. PIPELINE STEPS

```
STEP 1: LLM Query Understanding
→ Convert ICP brief to Google Maps search query

STEP 2: Google Maps Discovery
→ Query Google Places API for real companies

STEP 3: Website Verification
→ Check if website loads (HTTP check)

STEP 4: Website Data Extraction
→ Playwright screenshot + Grok AI vision extraction

STEP 5: Social Profile Discovery
→ Find Instagram/Facebook/LinkedIn URLs

STEP 6: Social Media Scraping
→ Scrape profile metadata

STEP 7: ICP Relevance Check
→ LLM scores how well company matches brief

OUTPUT: Save to prospects table, status: "ready_for_analysis"
```

═══════════════════════════════════════════════════════════════════

## 3. REQUIRED FILE STRUCTURE

```
prospecting-engine/
├── server.js
├── config/
│   └── prompts/
│       ├── 01-query-understanding.json
│       ├── 04-website-extraction.json
│       └── 07-relevance-check.json
├── discoverers/
│   ├── google-maps.js (PRIMARY)
│   └── index.js
├── extractors/
│   ├── website-scraper.js
│   ├── grok-extractor.js
│   └── index.js
├── enrichers/
│   ├── social-finder.js
│   ├── social-scraper.js
│   └── index.js
├── validators/
│   ├── website-verifier.js
│   ├── relevance-checker.js
│   └── index.js
├── orchestrator.js (main pipeline)
├── database/
│   ├── supabase-client.js
│   └── schemas/
│       └── prospects.json
└── shared/
    ├── prompt-loader.js
    ├── logger.js
    └── cost-tracker.js
```

═══════════════════════════════════════════════════════════════════

## 4. API ENDPOINTS

**POST /api/prospect**
- Generate prospects from ICP brief
- Response: Server-Sent Events with real-time progress

**GET /api/prospects**
- Get prospects from database with filters
- Query params: status, city, industry, minRating, limit

**GET /api/health**
- Health check

═══════════════════════════════════════════════════════════════════

## 5. DATABASE SCHEMA

Table: **prospects**

Required columns:
- id (uuid, primary key)
- company_name (text, required)
- industry (text, required)
- website (text)
- website_status (enum: active, timeout, ssl_error, not_found)
- city, address, contact_email, contact_phone, contact_name
- description, services (jsonb)
- google_place_id (text, unique)
- google_rating, google_review_count
- social_profiles (jsonb)
- social_metadata (jsonb)
- icp_match_score (integer 0-100)
- is_relevant (boolean)
- status (enum: ready_for_analysis, queued, analyzed, error)
- project_id, run_id, source
- discovery_cost, discovery_time_ms
- created_at, updated_at

═══════════════════════════════════════════════════════════════════

## 6. PROMPT CONFIGURATION EXAMPLES

**config/prompts/01-query-understanding.json:**
```json
{
  "name": "query-understanding",
  "model": "grok-4-fast",
  "temperature": 0.3,
  "systemPrompt": "Convert ICP briefs into Google Maps search queries.",
  "userPromptTemplate": "Industry: {{industry}}\nCity: {{city}}\n\nReturn ONLY the search query.",
  "variables": ["industry", "city"]
}
```

**config/prompts/04-website-extraction.json:**
```json
{
  "name": "website-extraction",
  "model": "grok-4-fast",
  "systemPrompt": "Extract contact info from website screenshots.",
  "userPromptTemplate": "Extract: company name, email, phone, services from this screenshot.",
  "outputFormat": {
    "contactEmail": "string",
    "contactPhone": "string",
    "services": ["array"]
  }
}
```

═══════════════════════════════════════════════════════════════════

## 7. KEY MODULE SIGNATURES

**discoverers/google-maps.js:**
```javascript
export async function discoverCompanies(query, options) {
  // Use @googlemaps/google-maps-services-js
  // Return array of real companies with verified data
  return [{
    name, website, phone, address, city,
    rating, reviewCount, googlePlaceId, types
  }];
}
```

**extractors/grok-extractor.js:**
```javascript
export async function extractWebsiteData(url, screenshot) {
  // Load prompt, send to Grok Vision
  return {
    contactEmail, contactPhone, contactName,
    description, services, socialLinks
  };
}
```

**enrichers/social-finder.js:**
```javascript
export async function findSocialProfiles(company) {
  // Check website, Google Maps, Google Search
  return {
    instagram: "url",
    facebook: "url",
    linkedin: "url"
  };
}
```

**shared/prompt-loader.js:**
```javascript
export function loadPrompt(promptPath, variables) {
  // Read from config/prompts/{promptPath}.json
  // Replace {{variable}} placeholders
  return { model, systemPrompt, userPrompt };
}
```

═══════════════════════════════════════════════════════════════════

## 8. SUCCESS CRITERIA

✅ All prompts externalized to JSON
✅ Google Maps API integration working
✅ 7-step pipeline completes successfully
✅ Server-Sent Events for progress
✅ Database schema auto-generates
✅ Find 20 companies in under 3 minutes
✅ Graceful error handling
✅ Cost tracking
✅ Works for any industry
✅ All tests passing

═══════════════════════════════════════════════════════════════════

## 9. MIGRATION FROM client-orchestrator/

1. Extract prompts from grok-prospector.js → config/prompts/
2. Refactor index.js → orchestrator.js
3. Move Supabase code → database/
4. Create discoverers/google-maps.js
5. Keep verification in validators/
6. Update server.js
7. Create database/setup.js
8. Test with real brief

═══════════════════════════════════════════════════════════════════

END OF SPECIFICATION
