# Website Audit Tool - API Documentation

Complete API reference for integrating the Website Audit Tool with Command Center UI and other services.

**Base URL:** `http://localhost:3000` (configurable via `PORT` in `.env`)

---

## Table of Contents

- [Authentication](#authentication)
- [Endpoints](#endpoints)
  - [POST /api/analyze](#post-apianalyze)
  - [POST /api/analyze-prospects](#post-apianalyze-prospects)
- [Data Structures](#data-structures)
- [Server-Sent Events](#server-sent-events)
- [Error Handling](#error-handling)
- [Integration Examples](#integration-examples)

---

## Authentication

Currently no authentication required. All endpoints are open.

**Future:** Will add API key authentication via header:
```
Authorization: Bearer your-api-key-here
```

---

## Endpoints

### POST /api/analyze

Analyzes one or more websites and returns comprehensive data.

**Endpoint:** `POST /api/analyze`

**Content-Type:** `application/json`

**Request Body:**

```javascript
{
  // Required
  "urls": ["https://example.com", "https://another.com"],

  // Optional analysis options
  "enrichSocial": true,          // Scrape social media profiles (default: false)
  "analyzeSocial": true,          // AI analysis of social presence (default: false)
  "analyzeContent": true,         // Extract blog/news insights (default: false)

  // Optional AI models
  "textModel": "grok-4-fast",     // Text analysis model (default: from .env)
  "visionModel": "grok-4-fast",   // Vision analysis model (default: from .env)
  "socialModel": "grok-4-fast",   // Social analysis model (default: from .env)
  "contentModel": "grok-4-fast",  // Content analysis model (default: from .env)

  // Optional modules
  "modules": {
    "basic": true,                // Always enabled
    "industry": true,             // Industry-specific analysis
    "seo": false,                 // SEO analysis
    "visual": false,              // Visual design analysis
    "competitor": false           // Competitor discovery
  },

  // Optional database
  "saveToSupabase": true,         // Save to database (default: false)

  // Optional legacy options
  "emailType": "local",           // "local" or "national" (deprecated)
  "depthTier": "tier1"            // "tier1", "tier2", "tier3" (deprecated)
}
```

**Response:** Server-Sent Events (see [Server-Sent Events](#server-sent-events))

**Example:**

```bash
curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "urls": ["https://zahavrestaurant.com"],
    "enrichSocial": true,
    "analyzeContent": true,
    "textModel": "grok-4-fast",
    "saveToSupabase": true
  }'
```

---

### POST /api/analyze-prospects

Analyzes prospects from the database (`prospects` table) and saves enriched data to `leads` table.

**Endpoint:** `POST /api/analyze-prospects`

**Content-Type:** `application/json`

**Request Body:**

```javascript
{
  // Required
  "limit": 10,                    // Number of prospects to analyze

  // Optional filters
  "industry": "Restaurant",       // Filter by industry
  "city": "Philadelphia, PA",     // Filter by city/location
  "runId": "batch-001",           // Filter by run ID (for tracking batches)

  // Optional analysis options (same as /api/analyze)
  "enrichSocial": true,           // Scrape social media profiles
  "analyzeSocial": true,          // AI analysis of social presence
  "analyzeContent": true,         // Extract blog/news insights

  // Optional AI models
  "textModel": "grok-4-fast",
  "socialModel": "grok-4-fast",
  "contentModel": "grok-4-fast"
}
```

**What it does:**

1. Fetches prospects from `prospects` table where `status = 'pending_analysis'`
2. Applies optional filters (industry, city, runId)
3. Analyzes each prospect's website
4. Enriches data with social media scraping (if enabled)
5. Analyzes content for insights (if enabled)
6. Saves enriched data to `leads` table
7. Updates prospect `status` to 'analyzed'
8. Links prospect to lead via `prospect_id` foreign key

**Response:** Server-Sent Events (see [Server-Sent Events](#server-sent-events))

**Example:**

```bash
curl -X POST http://localhost:3000/api/analyze-prospects \
  -H "Content-Type: application/json" \
  -d '{
    "limit": 10,
    "industry": "Restaurant",
    "city": "Philadelphia, PA",
    "enrichSocial": true,
    "analyzeContent": true
  }'
```

---

## Data Structures

### Prospect (Input)

From `prospects` table (created by client-orchestrator):

```javascript
{
  id: "uuid",
  company_name: "Apex Plumbing Services",
  industry: "Home Services - Plumbing",
  website: "https://apexplumbingservices.com",
  city: "Philadelphia, PA",
  state: "PA",
  social_profiles: {
    instagram: "https://instagram.com/apexplumbing",
    facebook: "https://facebook.com/ApexPlumbing",
    linkedin_person: "https://linkedin.com/in/john-doe",
    linkedin_company: "https://linkedin.com/company/apex-plumbing"
  },
  status: "pending_analysis",  // or "analyzed", "failed"
  why_now: "Just opened, needs better web presence",
  teaser: "Get 3x more customers with optimized website",
  run_id: "batch-001",
  created_at: "2025-10-19T12:00:00Z"
}
```

### Lead (Output)

Saved to `leads` table (enriched data):

```javascript
{
  // Basic Info
  id: "uuid",
  url: "https://apexplumbingservices.com",
  company_name: "Apex Plumbing Services",
  industry: "Home Services - Plumbing",
  location: "Philadelphia, PA",

  // Grading
  website_grade: "F",              // A-F based on data completeness
  website_score: 30,               // 0-100 numeric score

  // Contact Information
  contact_email: "john@apex.com",
  contact_email_source: "grok",    // "grok", "website", "manual"
  contact_phone: "(555) 123-4567",
  contact_name: "John Doe",
  contact_title: "Owner",
  contact_page: "/contact",
  contact_confidence: 0.85,

  // Company Details
  company_description: "Full-service plumbing...",
  founding_year: 2015,
  value_proposition: "24/7 emergency service",
  target_audience: "Homeowners in Philadelphia area",

  // Services (Array)
  services: [
    "Drain cleaning",
    "Water heater repair",
    "Emergency plumbing",
    "Pipe replacement"
  ],

  // Social Profiles (JSONB - merged from 3 sources)
  social_profiles: {
    sources: ["prospects_table", "website", "scraped"],  // Data sources
    mergedAt: "2025-10-19T12:00:00Z",

    instagram: {
      url: "https://instagram.com/apexplumbing",
      username: "apexplumbing",
      name: "Apex Plumbing Services",
      bio: "24/7 Emergency Plumbing in Philadelphia",
      followers: "1.2K",
      scraped: true
    },
    facebook: {
      url: "https://facebook.com/ApexPlumbing",
      name: "Apex Plumbing Services",
      description: "Your trusted plumber since 2015",
      scraped: true
    },
    linkedin: {
      company: "https://linkedin.com/company/apex-plumbing",
      personal: ["https://linkedin.com/in/john-doe"]
    },
    twitter: {
      url: null,
      handle: null
    }
  },

  // Team Info (JSONB)
  team_info: {
    founder: {
      name: "John Doe",
      title: "Owner & Master Plumber",
      bio: "20 years experience...",
      linkedIn: "https://linkedin.com/in/john-doe"
    },
    keyPeople: []
  },

  // Tech Stack (JSONB)
  tech_stack: {
    platform: "WordPress",
    platformVersion: "6.3",
    framework: "None",
    cssFramework: "Bootstrap",
    hosting: "GoDaddy"
  },

  // Blog/Content Info
  has_active_blog: true,
  recent_blog_posts: [
    {
      title: "10 Signs You Need a New Water Heater",
      date: "2025-10-01",
      url: "/blog/water-heater-signs"
    }
  ],
  last_content_update: "2025-10-01",

  // Priority 3 & 4: Rich Content for Social Media
  achievements: {
    awards: ["Best of Philly 2024"],
    certifications: ["Master Plumber License", "EPA Certified"],
    yearsInBusiness: 10,
    notableAccomplishments: ["Served 5000+ customers"]
  },

  testimonials: [
    {
      quote: "Best plumber in Philly!",
      author: "Jane Smith",
      company: "Homeowner",
      rating: 5
    }
  ],

  community_involvement: [
    "Sponsors local little league",
    "Free plumbing for veterans program"
  ],

  brand_voice: "professional",  // professional | casual | friendly | technical

  offerings_detail: "Complete plumbing services including emergency repairs...",

  // Content Insights (JSONB - NEW!)
  content_insights: {
    analyzed: true,
    model: "grok-4-fast",
    analyzedAt: "2025-10-19T12:00:00Z",
    hasActiveBlog: true,
    postCount: 12,
    newsCount: 2,
    contentThemes: [
      "water heater maintenance",
      "emergency plumbing",
      "DIY plumbing tips"
    ],
    expertiseSignals: [
      "20 years experience",
      "Licensed master plumber",
      "EPA certified"
    ],
    recentAchievements: [
      "Best of Philly 2024",
      "Reached 5000 customers"
    ],
    engagementHook: "I saw your recent post about tankless water heaters",
    contentGaps: [
      "Pricing transparency",
      "Service area information",
      "Emergency response time"
    ],
    writingStyle: "professional",
    contentFrequency: "active"  // active | occasional | inactive
  },

  // Website Analysis
  critiques_basic: [
    "No contact methods such as phone numbers...",
    "The site lacks a mobile menu...",
    "Missing meta description..."
  ],
  critiques_industry: [
    "No emergency contact button above fold...",
    "Missing service area map..."
  ],
  critiques_seo: [
    "Title tag missing...",
    "H1 tag not descriptive..."
  ],
  critiques_visual: [],
  critiques_competitor: [],

  analysis_summary: "Solid business with good services but website needs modernization...",

  // Social Outreach Flags (NEW!)
  requires_social_outreach: false,   // true if website failed
  website_status: "active",           // active | timeout | ssl_error | dns_error | failed
  website_error: null,                // Error message if failed

  // Performance & Cost
  load_time: 2500,                   // milliseconds
  pages_analyzed: 1,
  analysis_cost: 0.04,               // dollars
  analysis_time: 22,                 // seconds
  cost_breakdown: {
    grok_extraction: 0.035,
    basic_analysis: 0.003,
    content_analysis: 0.002
  },

  // Multi-tenant Tracking
  project_id: null,
  campaign_id: null,
  client_name: null,
  source_app: "website-audit-tool",

  // Timestamps
  analyzed_at: "2025-10-19T12:00:00Z",
  created_at: "2025-10-19T12:00:00Z",
  updated_at: "2025-10-19T12:00:00Z"
}
```

### Social Outreach Lead (Partial - Failed Website)

When a website fails, a partial lead is saved:

```javascript
{
  url: "https://brokensite.com",
  company_name: "Broken Site LLC",
  industry: "Services",
  location: "Philadelphia, PA",

  // Grading (low because website failed)
  website_grade: "F",
  website_score: 0,

  // Social Profiles (from prospects table)
  social_profiles: {
    instagram: "https://instagram.com/brokensite",
    facebook: "https://facebook.com/BrokenSite"
  },

  // Social Outreach Flags
  requires_social_outreach: true,    // FLAG FOR SOCIAL OUTREACH!
  website_status: "timeout",          // Error type
  website_error: "page.goto: Timeout 30000ms exceeded...",

  analyzed_at: "2025-10-19T12:00:00Z"
}
```

---

## Server-Sent Events

Both endpoints return real-time progress via Server-Sent Events (SSE).

### Event Types

**1. Progress Events**

```javascript
{
  type: "progress",
  step: "loading_homepage",
  url: "https://example.com",
  message: "⏳ Loading homepage...",
  siteNumber: 1,
  totalSites: 10
}
```

**Step values:**
- `loading_homepage` - Loading the website
- `extracting_data` - Running Grok AI extraction
- `analyzing_website` - Running critiques
- `enriching_social` - Scraping social media
- `analyzing_social` - AI analyzing social presence
- `analyzing_content` - AI analyzing blog/news
- `saving_database` - Saving to Supabase

**2. Result Events**

```javascript
{
  type: "result",
  url: "https://example.com",
  companyName: "Example Company",
  websiteGrade: "B",
  websiteScore: 65,
  cost: 0.04,
  analysisTime: 22,
  requiresSocialOutreach: false
}
```

**3. Complete Event**

```javascript
{
  type: "complete",
  totalSites: 10,
  successful: 8,
  failed: 2,
  totalCost: 0.32,
  totalTime: 180
}
```

**4. Error Events**

```javascript
{
  type: "error",
  url: "https://example.com",
  error: "page.goto: Timeout 30000ms exceeded",
  websiteStatus: "timeout"
}
```

**5. Social Outreach Flagged Event**

```javascript
{
  type: "social_outreach_flagged",
  url: "https://brokensite.com",
  companyName: "Broken Site LLC",
  message: "💡 Broken Site LLC → Flagged for social outreach (website broken)",
  socialPlatforms: ["instagram", "facebook", "linkedin_person"]
}
```

### Client-Side Example

```javascript
const eventSource = new EventSource('/api/analyze-prospects');

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);

  switch(data.type) {
    case 'progress':
      console.log(`${data.message} (${data.siteNumber}/${data.totalSites})`);
      break;

    case 'result':
      console.log(`✅ ${data.companyName} - Grade ${data.websiteGrade} ($${data.cost})`);
      break;

    case 'social_outreach_flagged':
      console.log(`📱 ${data.companyName} → Social outreach (${data.socialPlatforms.join(', ')})`);
      break;

    case 'complete':
      console.log(`✅ Complete! ${data.successful}/${data.totalSites} successful ($${data.totalCost})`);
      eventSource.close();
      break;

    case 'error':
      console.error(`❌ ${data.url}: ${data.error}`);
      break;
  }
};

eventSource.onerror = (error) => {
  console.error('SSE Error:', error);
  eventSource.close();
};
```

---

## Error Handling

### HTTP Error Codes

| Code | Meaning | Example |
|------|---------|---------|
| 200 | Success | Analysis started (SSE stream) |
| 400 | Bad Request | Missing required fields |
| 500 | Server Error | AI API failure, database error |

### Website Analysis Errors

When individual websites fail, they're handled gracefully:

**Error Types:**
- `timeout` - Website took too long to load
- `ssl_error` - SSL certificate issues
- `dns_error` - Domain doesn't resolve
- `failed` - Generic failure

**Behavior:**
1. If social profiles exist → Save as social outreach lead
2. If no social profiles → Skip entirely
3. Continue analyzing other websites
4. Report error in SSE stream

---

## Integration Examples

### React Hook

```typescript
import { useState, useEffect } from 'react';

function useWebsiteAnalysis() {
  const [progress, setProgress] = useState([]);
  const [results, setResults] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const analyzeProspects = async (options) => {
    setIsAnalyzing(true);
    setProgress([]);
    setResults([]);

    const response = await fetch('/api/analyze-prospects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options)
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = JSON.parse(line.slice(6));

          if (data.type === 'progress') {
            setProgress(prev => [...prev, data.message]);
          } else if (data.type === 'result') {
            setResults(prev => [...prev, data]);
          } else if (data.type === 'complete') {
            setIsAnalyzing(false);
          }
        }
      }
    }
  };

  return { progress, results, isAnalyzing, analyzeProspects };
}

// Usage:
function Dashboard() {
  const { progress, results, isAnalyzing, analyzeProspects } = useWebsiteAnalysis();

  return (
    <div>
      <button
        onClick={() => analyzeProspects({ limit: 10, industry: 'Restaurant' })}
        disabled={isAnalyzing}
      >
        Analyze Prospects
      </button>

      <div>
        {progress.map((msg, i) => <p key={i}>{msg}</p>)}
      </div>

      <div>
        {results.map(result => (
          <div key={result.url}>
            {result.companyName} - Grade {result.websiteGrade}
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Node.js Integration

```javascript
import fetch from 'node-fetch';

async function analyzeProspects() {
  const response = await fetch('http://localhost:3000/api/analyze-prospects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      limit: 10,
      industry: 'Restaurant',
      enrichSocial: true,
      analyzeContent: true
    })
  });

  const reader = response.body;

  for await (const chunk of reader) {
    const lines = chunk.toString().split('\n');

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = JSON.parse(line.slice(6));
        console.log(data);
      }
    }
  }
}
```

---

## Database Queries

### Get Leads for Email Outreach

```sql
-- Leads with working websites and contact info
SELECT
  company_name,
  contact_email,
  website_grade,
  analysis_summary,
  content_insights->>'engagementHook' as hook
FROM leads
WHERE requires_social_outreach = false
  AND contact_email IS NOT NULL
  AND website_grade IN ('A', 'B', 'C')
ORDER BY website_grade DESC, analyzed_at DESC;
```

### Get Leads for Social Media Outreach

```sql
-- Leads with broken websites but social profiles
SELECT
  company_name,
  social_profiles,
  website_status,
  website_error
FROM leads
WHERE requires_social_outreach = true
  AND social_profiles IS NOT NULL
ORDER BY analyzed_at DESC;
```

### Get Content-Rich Leads

```sql
-- Leads with active blogs for content-based outreach
SELECT
  company_name,
  contact_email,
  content_insights->>'contentThemes' as themes,
  content_insights->>'engagementHook' as hook,
  content_insights->>'expertiseSignals' as expertise
FROM leads
WHERE content_insights->>'hasActiveBlog' = 'true'
  AND requires_social_outreach = false
ORDER BY analyzed_at DESC;
```

---

## Rate Limiting

Currently no rate limiting.

**Recommendation:** Implement at application level:
- Max 10 concurrent analyses
- Max 100 analyses per hour
- Max 1000 analyses per day

---

## Support

- **Issues:** Report bugs or feature requests
- **Email:** maksantagency@gmail.com
- **Docs:** See README.md for general documentation

---

**Last Updated:** October 19, 2025
