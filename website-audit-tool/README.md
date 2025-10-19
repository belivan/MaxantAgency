# Website Audit Tool

**AI-powered website analysis and prospect enrichment tool that collects comprehensive business data, analyzes websites, and prepares leads for outreach.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org/)

---

## 🎯 What Does This Tool Do?

The Website Audit Tool analyzes websites and enriches prospect data by:

1. **Extracts comprehensive business data** - Company info, contact details, services, social profiles
2. **Analyzes website quality** - Identifies specific issues, opportunities, and improvements
3. **Scrapes social media** - Instagram, Facebook, LinkedIn profiles and metadata
4. **Analyzes content** - Blog posts and news for personalization hooks
5. **Handles failures gracefully** - When websites fail, saves social profiles for social media outreach
6. **Saves to database** - All data stored in Supabase PostgreSQL for easy querying

**Cost:** ~$0.04 per lead (using cheap Grok AI model)
**Speed:** ~20-30 seconds per website

---

## ✨ Key Features

### 📊 Comprehensive Data Extraction

- **Company Information:** Name, industry, location, founding year, description
- **Contact Data:** Email, phone, contact person with confidence scoring
- **Services:** Automatically extracted service offerings
- **Social Profiles:** Instagram, Facebook, LinkedIn, Twitter URLs
- **Value Proposition:** Target audience and positioning
- **Tech Stack:** Platform detection (WordPress, Shopify, etc.)

### 🔍 Website Analysis

- **Quality Grading:** A-F scoring based on data completeness
- **Critiques:** Specific, actionable recommendations
- **SEO Analysis:** Meta tags, structure, performance issues
- **Content Analysis:** Blog posts and news for engagement hooks

### 📱 Social Media Enrichment

**Three-source data merging:**
1. Social profiles from prospects table (input data)
2. Social profile URLs scraped from website
3. Profile metadata scraped from social platforms

**Platforms supported:**
- Instagram (name, bio, username)
- Facebook (page name, description)
- LinkedIn (company + personal profiles)

### 🚨 Social Outreach Fallback (NEW!)

When a website fails to load (SSL error, timeout, DNS error):
- Saves partial lead with social profiles
- Flags as `requires_social_outreach = true`
- Records error type and message
- **Perfect for:** "Hey, noticed your website is down - we can fix it!" outreach

### 📝 Content Insights Analysis (NEW!)

Analyzes blog posts and news articles to extract:
- **Content themes** - Topics the company writes about
- **Expertise signals** - Areas of demonstrated knowledge
- **Engagement hooks** - Recent posts to reference in outreach
- **Content gaps** - Missing topics for value proposition
- **Writing style** - Professional, casual, technical, etc.

### 💾 Database Integration

Auto-saves all data to Supabase PostgreSQL:
- Full prospect and company information
- Social profiles (JSONB)
- Website critiques and analysis
- Content insights
- Social outreach flags
- Cost and time tracking

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd website-audit-tool
npm install
npx playwright install chromium
```

### 2. Configure Environment

Copy `.env.example` to `.env` and add your API keys:

```bash
# Required API Keys
XAI_API_KEY=xai-xxxxxx           # Grok AI (cheap! $5 per 1M tokens)
OPENAI_API_KEY=sk-xxxxxx          # OpenAI (for critiques)

# Database (Required)
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGc...

# Models (Recommended cheap options)
TEXT_MODEL=grok-4-fast
VISION_MODEL=grok-4-fast
```

### 3. Set Up Database

Run the migrations in Supabase SQL Editor:

```bash
migrations/add-content-insights.sql
migrations/add-social-outreach-flag.sql
```

### 4. Start the Server

```bash
npm start
```

Open browser at: **http://localhost:3000**

---

## 📡 API Endpoints

### Analyze Websites

```javascript
POST /api/analyze

{
  "urls": ["https://example.com"],
  "enrichSocial": true,          // Scrape social media profiles
  "analyzeSocial": true,          // Analyze social presence
  "analyzeContent": true,         // Extract blog/news insights
  "textModel": "grok-4-fast",     // AI model for analysis
  "saveToSupabase": true
}
```

**Response:** Server-Sent Events (real-time progress)

### Analyze Prospects from Database

```javascript
POST /api/analyze-prospects

{
  "limit": 10,                    // Number of prospects to analyze
  "industry": "Restaurant",       // Optional: filter by industry
  "city": "Philadelphia, PA",     // Optional: filter by location
  "enrichSocial": true,
  "analyzeSocial": true,
  "analyzeContent": true
}
```

**What it does:**
1. Fetches prospects from `prospects` table where `status = 'pending_analysis'`
2. Analyzes each website
3. Scrapes social media profiles
4. Analyzes content for insights
5. Saves enriched data to `leads` table
6. Updates prospect `status` to 'analyzed'
7. Links prospect to lead

**Response:** Server-Sent Events with progress

---

## 💾 Database Schema

### Prospects Table

**Input data** (from client-orchestrator or other sources):

```javascript
{
  id: "uuid",
  company_name: "Apex Plumbing Services",
  industry: "Home Services - Plumbing",
  website: "https://apexplumbingservices.com",
  city: "Philadelphia, PA",
  social_profiles: {
    instagram: "https://instagram.com/apex...",
    facebook: "https://facebook.com/Apex...",
    linkedin_person: "https://linkedin.com/in/john-doe..."
  },
  status: "pending_analysis",
  why_now: "Just opened, needs web presence",
  teaser: "Get more customers with better website"
}
```

### Leads Table

**Output data** (enriched and analyzed):

```javascript
{
  // Basic Info
  url: "https://example.com",
  company_name: "Apex Plumbing Services",
  industry: "Home Services - Plumbing",
  location: "Philadelphia, PA",

  // Grading
  website_grade: "F",
  website_score: 30,

  // Contact
  contact_email: "john@apex.com",
  contact_phone: "(555) 123-4567",
  contact_name: "John Doe",

  // Company Details
  company_description: "Full-service plumbing...",
  value_proposition: "24/7 emergency service",
  target_audience: "Homeowners in Philadelphia",
  services: ["Drain cleaning", "Water heaters", ...],

  // Social Profiles (JSONB - merged from 3 sources)
  social_profiles: {
    instagram: {
      url: "https://instagram.com/apex...",
      username: "apexplumbing",
      name: "Apex Plumbing Services",
      bio: "24/7 Emergency Plumbing...",
      scraped: true
    },
    facebook: { ... },
    linkedin_person: { ... }
  },

  // Analysis
  critiques_basic: ["No contact info...", ...],
  critiques_industry: ["Missing service area map...", ...],
  analysis_summary: "Solid business but website needs...",

  // Content Insights (JSONB - NEW!)
  content_insights: {
    analyzed: true,
    hasActiveBlog: true,
    contentThemes: ["water heater maintenance", "emergency plumbing"],
    expertiseSignals: ["Licensed master plumber", "20 years experience"],
    engagementHook: "I saw your recent post about tankless water heaters",
    contentGaps: ["Pricing transparency", "Customer reviews"],
    writingStyle: "professional",
    contentFrequency: "active"
  },

  // Social Outreach (NEW!)
  requires_social_outreach: false,  // true if website failed
  website_status: "active",         // or "timeout", "ssl_error", etc.
  website_error: null,

  // Metadata
  analyzed_at: "2025-10-19T12:00:00Z",
  analysis_cost: 0.04,
  analysis_time: 22
}
```

---

## 🎮 Usage Examples

### Example 1: Analyze Single Website

```bash
curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "urls": ["https://zahavrestaurant.com"],
    "enrichSocial": true,
    "analyzeContent": true,
    "textModel": "grok-4-fast"
  }'
```

### Example 2: Analyze Prospects from Database

```bash
curl -X POST http://localhost:3000/api/analyze-prospects \
  -H "Content-Type: application/json" \
  -d '{
    "limit": 10,
    "industry": "Restaurant",
    "city": "Philadelphia, PA"
  }'
```

### Example 3: Query Leads

```sql
-- Get all leads ready for email outreach
SELECT company_name, contact_email, website_grade
FROM leads
WHERE requires_social_outreach = false
AND contact_email IS NOT NULL
ORDER BY website_grade DESC;

-- Get leads that need social media outreach
SELECT company_name, social_profiles, website_status
FROM leads
WHERE requires_social_outreach = true
ORDER BY analyzed_at DESC;

-- Get leads with active blogs for content-based outreach
SELECT company_name, content_insights->>'engagementHook' as hook
FROM leads
WHERE content_insights->>'hasActiveBlog' = 'true';
```

---

## 📊 Cost Breakdown

Using **grok-4-fast** (cheapest model):

| Operation | Cost per Lead | Notes |
|-----------|---------------|-------|
| Grok data extraction | $0.03-0.04 | Main extraction |
| Website critique | $0.0003 | Basic analysis |
| Content analysis | $0.0002 | Blog/news (if found) |
| Social analysis | $0.0001 | Social presence (optional) |
| **Total** | **~$0.04** | Per successful lead |

**Budget examples:**
- 100 leads/month: ~$4
- 500 leads/month: ~$20
- 1000 leads/month: ~$40

---

## 🔧 Advanced Features

### Social Outreach Fallback

When a website fails (timeout, SSL error, DNS error):

1. System saves partial lead with:
   - Company name from prospect
   - Social profiles from prospect
   - Error type and message
   - Flag: `requires_social_outreach = true`

2. Email composer can query these leads for social media outreach:
   - Instagram DMs
   - Facebook Messenger
   - LinkedIn Messages
   - Message: "Hey, noticed your website is down - we can help!"

### Content Insights for Personalization

Analyzes blog posts and news to generate:

```javascript
{
  contentThemes: ["plumbing tips", "water conservation"],
  expertiseSignals: ["Licensed", "20 years experience"],
  engagementHook: "I saw your recent article on tankless water heaters",
  contentGaps: ["pricing", "service area"],
  writingStyle: "professional"
}
```

Use in outreach emails:
- Reference recent blog posts
- Mention their expertise areas
- Suggest content they're missing
- Match their communication style

---

## 📁 File Structure

```
website-audit-tool/
├── analyzer.js                   # Main analysis orchestrator
├── server.js                     # Express API server
├── ai-providers.js               # AI model configurations
│
├── modules/
│   ├── grok-extractor.js         # Company data extraction
│   ├── social-scraper.js         # Social media scraping (NEW!)
│   ├── content-analyzer.js       # Blog/news analysis (NEW!)
│   ├── supabase-client.js        # Database operations
│   ├── prompt-builder.js         # AI critique generation
│   └── cost-tracker.js           # Cost/time tracking
│
├── migrations/
│   ├── add-content-insights.sql          # Content analysis schema
│   └── add-social-outreach-flag.sql      # Social outreach schema
│
├── scripts/
│   ├── test-prospect-analysis.js         # Test prospect pipeline
│   ├── test-real-business.js             # Test with real site
│   ├── check-social-outreach-leads.js    # Verify social outreach
│   └── reset-prospect-status.js          # Reset for re-testing
│
└── public/                       # Web UI
    ├── index.html
    ├── app.js
    └── styles.css
```

---

## 🧪 Testing

### Test with Real Philadelphia Business

```bash
node test-real-business.js
```

Tests full pipeline with real working website.

### Test Prospect Analysis

```bash
node scripts/test-prospect-analysis.js
```

Fetches prospects from database and analyzes them.

### Check Social Outreach Leads

```bash
node scripts/check-social-outreach-leads.js
```

Shows all leads flagged for social media outreach.

---

## 🔗 Integration with Other Services

### Client Orchestrator → Website Audit Tool

Client orchestrator creates prospects:

```javascript
// client-orchestrator creates prospects
await supabase.from('prospects').insert({
  company_name: "Apex Plumbing",
  website: "https://apexplumbing.com",
  industry: "Plumbing",
  city: "Philadelphia, PA",
  status: "pending_analysis",
  social_profiles: { instagram: "..." }
});

// Website audit tool analyzes
POST /api/analyze-prospects { limit: 10 }
```

### Website Audit Tool → Email Composer

Email composer reads enriched leads:

```javascript
// Get leads ready for email
const { data } = await supabase
  .from('leads')
  .select('*')
  .eq('requires_social_outreach', false)
  .not('contact_email', 'is', null);

// Get leads for social outreach
const { data: socialLeads } = await supabase
  .from('leads')
  .select('*')
  .eq('requires_social_outreach', true);
```

See `email-composer/SOCIAL-OUTREACH-INTEGRATION.md` for details.

---

## 🛠 Troubleshooting

### Playwright Errors

```bash
npx playwright install chromium
```

### Supabase Connection Issues

1. Verify `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` in `.env`
2. Use service_role key (not anon key)
3. Run migrations in Supabase SQL Editor

### Port Already in Use

Change port in `.env`:
```
PORT=3001
```

---

## 📄 License

MIT License

---

## 📞 Support

- **Documentation:** See API.md for endpoint details
- **Email:** maksantagency@gmail.com
- **Website:** [maksant.com](https://maksant.com)

---

**Built by Maksant** - Helping agencies scale their outreach.
