# Supabase Database Setup - Complete Guide

## Overview

This database will store ALL data from website analysis:
- Company & contact info
- Grok AI extracted data
- Analysis results (basic, industry, SEO, visual, competitor)
- Email content
- QA review results
- Platform/tech stack detection (NEW)

---

## Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Click "Start your project"
3. Create new organization (or use existing)
4. Create new project:
   - **Name:** maksant-lead-management
   - **Database Password:** (save this securely!)
   - **Region:** Choose closest to you
5. Wait ~2 minutes for project to provision

---

## Step 2: Create Database Schema

Go to SQL Editor in Supabase dashboard and run this SQL:

```sql
-- ═══════════════════════════════════════════════════════════════
-- LEADS TABLE - Main table with ALL analysis data
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE leads (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Basic Info
  url TEXT NOT NULL UNIQUE,
  company_name TEXT,
  industry TEXT,

  -- Grading (DUAL SYSTEM)
  website_score INTEGER,  -- 0-100
  website_grade TEXT CHECK (website_grade IN ('A','B','C','D','F')),
  lead_grade TEXT CHECK (lead_grade IN ('A','B','C','D','F')),

  -- Contact Info
  contact_email TEXT,
  contact_email_source TEXT,  -- 'grok', 'traditional', 'manual'
  contact_phone TEXT,
  contact_name TEXT,
  contact_title TEXT,
  contact_page TEXT,
  contact_confidence DECIMAL(3,2),  -- 0.00 to 1.00

  -- Company Info (from Grok)
  founding_year INTEGER,
  location TEXT,
  company_description TEXT,
  target_audience TEXT,
  value_proposition TEXT,

  -- Social Profiles (JSONB for flexibility)
  social_profiles JSONB,
  -- Structure:
  -- {
  --   "linkedIn": {"company": "url", "personal": ["url1", "url2"]},
  --   "instagram": {"handle": "@example", "url": "url"},
  --   "twitter": {"handle": "@example", "url": "url"},
  --   "facebook": "url",
  --   "youtube": "url"
  -- }

  -- Team Info (JSONB)
  team_info JSONB,
  -- Structure:
  -- {
  --   "founder": {"name": "...", "title": "...", "bio": "...", "linkedIn": "..."},
  --   "keyPeople": [{"name": "...", "title": "...", "linkedIn": "..."}]
  -- }

  -- Services (Array)
  services TEXT[],

  -- Content/Blog Info
  has_active_blog BOOLEAN,
  recent_blog_posts JSONB,
  -- Structure:
  -- [
  --   {"title": "...", "date": "...", "url": "...", "summary": "..."}
  -- ]
  last_content_update TIMESTAMPTZ,

  -- Tech Stack (NEW - from Grok AI)
  tech_stack JSONB,
  -- Structure:
  -- {
  --   "platform": "WordPress",
  --   "platformVersion": "6.4.2",
  --   "framework": "React",
  --   "cssFramework": "Tailwind",
  --   "hosting": "Vercel",
  --   "tools": ["Google Tag Manager", "Hotjar"],
  --   "confidence": 0.8,
  --   "detectionMethod": "meta-tags | class-conventions | script-urls"
  -- }

  -- Analysis Results (JSONB for each module)
  critiques_basic JSONB,
  critiques_industry JSONB,
  critiques_seo JSONB,
  critiques_visual JSONB,
  critiques_competitor JSONB,

  -- SEO Data (if module enabled)
  seo_data JSONB,

  -- Visual Data (if module enabled)
  visual_data JSONB,

  -- Competitor Data (if module enabled)
  competitor_data JSONB,

  -- Summary
  analysis_summary TEXT,

  -- Performance
  load_time INTEGER,  -- milliseconds
  pages_analyzed INTEGER,
  modules_used TEXT[],  -- ['basic', 'industry', 'seo', 'visual', 'competitor']

  -- Cost & Time Tracking (NEW)
  analysis_cost DECIMAL(10, 4),  -- Dollar amount ($0.0234)
  analysis_time INTEGER,  -- Seconds elapsed
  cost_breakdown JSONB,  -- Detailed cost per operation
  -- Structure:
  -- {
  --   "grokExtraction": 0.015,
  --   "basicAnalysis": 0.003,
  --   "emailWriting": 0.001,
  --   "qaReview": 0.001,
  --   etc...
  -- }

  -- Email Content
  email_subject TEXT,
  email_body TEXT,

  -- QA Review (from QA Agent)
  qa_review JSONB,
  -- Structure:
  -- {
  --   "passed": true,
  --   "leadGrade": "A",
  --   "issues": ["..."],
  --   "warnings": ["..."],
  --   "suggestions": ["..."],
  --   "summary": "..."
  -- }

  -- Critique Reasoning
  critique_reasoning TEXT,

  -- Multi-Tenant Tracking (NEW - for orchestrator apps)
  project_id TEXT,          -- Project identifier (e.g., "philly-coffee-2025")
  campaign_id TEXT,         -- Campaign identifier (e.g., "week-1-outreach")
  client_name TEXT,         -- Client/company name (e.g., "Maksant")
  source_app TEXT,          -- Source application (e.g., "client-orchestrator")

  -- Outreach Status (for tracking)
  outreach_status TEXT DEFAULT 'not_contacted' CHECK (
    outreach_status IN ('not_contacted', 'email_sent', 'replied', 'meeting_scheduled', 'converted', 'not_interested', 'do_not_contact')
  ),
  outreach_date TIMESTAMPTZ,
  reply_date TIMESTAMPTZ,
  conversion_date TIMESTAMPTZ,

  -- Notes (for manual input)
  notes TEXT,

  -- Timestamps
  analyzed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════
-- INDEXES (for fast queries)
-- ═══════════════════════════════════════════════════════════════

CREATE INDEX idx_leads_lead_grade ON leads(lead_grade);
CREATE INDEX idx_leads_website_grade ON leads(website_grade);
CREATE INDEX idx_leads_outreach_status ON leads(outreach_status);
CREATE INDEX idx_leads_company_name ON leads(company_name);
CREATE INDEX idx_leads_location ON leads(location);
CREATE INDEX idx_leads_industry ON leads(industry);
CREATE INDEX idx_leads_analyzed_at ON leads(analyzed_at DESC);
CREATE INDEX idx_leads_contact_email ON leads(contact_email);

-- Multi-Tenant Tracking Indexes (NEW)
CREATE INDEX idx_leads_project_id ON leads(project_id);
CREATE INDEX idx_leads_campaign_id ON leads(campaign_id);
CREATE INDEX idx_leads_client_name ON leads(client_name);
CREATE INDEX idx_leads_source_app ON leads(source_app);
CREATE INDEX idx_leads_project_campaign ON leads(project_id, campaign_id);  -- Composite index

-- GIN index for JSONB columns (for fast JSON queries)
CREATE INDEX idx_leads_services ON leads USING GIN (services);
CREATE INDEX idx_leads_social_profiles ON leads USING GIN (social_profiles);
CREATE INDEX idx_leads_tech_stack ON leads USING GIN (tech_stack);

-- ═══════════════════════════════════════════════════════════════
-- AUTO-UPDATE updated_at TRIGGER
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ═══════════════════════════════════════════════════════════════
-- ENABLE ROW LEVEL SECURITY (Optional - for multi-user access)
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all operations for authenticated users
CREATE POLICY "Allow full access to authenticated users"
  ON leads
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy: Allow read access to service role (for server-side operations)
CREATE POLICY "Allow service role full access"
  ON leads
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
```

---

## Step 3: Get API Credentials

1. In Supabase dashboard, go to **Settings** → **API**
2. Copy these values (you'll need them):
   - **Project URL:** `https://xxxxx.supabase.co`
   - **anon public key:** `eyJhbGc...` (for client-side)
   - **service_role secret:** `eyJhbGc...` (for server-side - KEEP SECRET!)

3. Add to your `.env` file:

```bash
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGc...your-service-role-key...
```

---

## Step 4: Install Supabase Client

```bash
npm install @supabase/supabase-js
```

---

## Step 5: Integration Code

Create `modules/supabase-client.js`:

```javascript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase credentials in .env file');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Save analysis result to Supabase
 * @param {Object} result - Full analysis result object
 * @returns {Object} - Supabase response
 */
export async function saveLeadToSupabase(result) {
  const grokData = result.grokData || {};
  const contact = result.contact || {};
  const grokContact = grokData.contactInfo || {};
  const companyInfo = grokData.companyInfo || {};
  const socialProfiles = grokData.socialProfiles || {};
  const teamInfo = grokData.teamInfo || {};
  const contentInfo = grokData.contentInfo || {};
  const businessIntel = grokData.businessIntel || {};

  // Prepare the data object
  const leadData = {
    // Basic Info
    url: result.url,
    company_name: result.companyName || companyInfo.name,
    industry: result.industry?.specific || companyInfo.industry,

    // Grading
    website_score: result.websiteScore,
    website_grade: result.websiteGrade,
    lead_grade: result.leadGrade,

    // Contact Info
    contact_email: contact.email || grokContact.email,
    contact_email_source: contact.emailSource || 'grok',
    contact_phone: grokContact.phone,
    contact_name: contact.name || teamInfo.founder?.name,
    contact_title: contact.title || teamInfo.founder?.title,
    contact_page: contact.contactPage,
    contact_confidence: contact.confidence,

    // Company Info
    founding_year: companyInfo.foundingYear,
    location: companyInfo.location,
    company_description: companyInfo.description,
    target_audience: businessIntel.targetAudience,
    value_proposition: businessIntel.valueProposition,

    // Social Profiles (JSONB)
    social_profiles: socialProfiles,

    // Team Info (JSONB)
    team_info: teamInfo,

    // Services (Array)
    services: businessIntel.services || [],

    // Content/Blog Info
    has_active_blog: contentInfo.hasActiveBlog,
    recent_blog_posts: contentInfo.recentPosts || [],
    last_content_update: contentInfo.lastContentUpdate,

    // Tech Stack (NEW - will be populated after Grok implementation)
    tech_stack: grokData.techStack || null,

    // Analysis Results (JSONB)
    critiques_basic: result.critiques?.basic || [],
    critiques_industry: result.critiques?.industry || [],
    critiques_seo: result.critiques?.seo || [],
    critiques_visual: result.critiques?.visual || [],
    critiques_competitor: result.critiques?.competitor || [],

    // Module Data
    seo_data: result.seo,
    visual_data: result.visual,
    competitor_data: result.competitor,

    // Summary
    analysis_summary: result.summary,

    // Performance
    load_time: result.loadTime,
    pages_analyzed: result.pagesAnalyzed,
    modules_used: result.modulesUsed || [],

    // Email Content
    email_subject: result.email?.subject,
    email_body: result.email?.body,

    // QA Review
    qa_review: result.emailQA,

    // Critique Reasoning
    critique_reasoning: result.critiqueReasoning,

    // Timestamps
    analyzed_at: result.timestamp || new Date().toISOString(),
  };

  // Insert or update (upsert based on URL)
  const { data, error } = await supabase
    .from('leads')
    .upsert(leadData, {
      onConflict: 'url',  // If URL exists, update it
      ignoreDuplicates: false
    })
    .select()
    .single();

  if (error) {
    console.error('❌ Supabase error:', error);
    throw error;
  }

  console.log('✅ Lead saved to Supabase:', data.company_name);
  return data;
}

/**
 * Query leads by grade
 * @param {string} leadGrade - 'A', 'B', 'C', 'D', or 'F'
 * @returns {Array} - Array of leads
 */
export async function getLeadsByGrade(leadGrade) {
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .eq('lead_grade', leadGrade)
    .order('analyzed_at', { ascending: false });

  if (error) throw error;
  return data;
}

/**
 * Get leads ready to contact (Grade A or B, not contacted yet)
 * @returns {Array} - Array of leads
 */
export async function getLeadsReadyToContact() {
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .in('lead_grade', ['A', 'B'])
    .eq('outreach_status', 'not_contacted')
    .not('contact_email', 'is', null)  // Must have email
    .order('lead_grade', { ascending: true })  // A first, then B
    .order('analyzed_at', { ascending: false });

  if (error) throw error;
  return data;
}

/**
 * Update outreach status
 * @param {string} url - Lead URL
 * @param {string} status - New outreach status
 * @returns {Object} - Updated lead
 */
export async function updateOutreachStatus(url, status) {
  const updateData = {
    outreach_status: status
  };

  // Add timestamp based on status
  if (status === 'email_sent') {
    updateData.outreach_date = new Date().toISOString();
  } else if (status === 'replied') {
    updateData.reply_date = new Date().toISOString();
  } else if (status === 'converted') {
    updateData.conversion_date = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('leads')
    .update(updateData)
    .eq('url', url)
    .select()
    .single();

  if (error) throw error;
  return data;
}
```

---

## Step 6: Update analyzer.js to Save to Supabase

Add this to `analyzer.js` after saving files:

```javascript
import { saveLeadToSupabase } from './modules/supabase-client.js';

// In analyzeWebsites function, after saveAnalysisResults():
try {
  await saveLeadToSupabase(result);
  console.log(`✅ ${result.companyName} saved to Supabase`);
} catch (error) {
  console.error(`❌ Failed to save to Supabase:`, error.message);
  // Don't fail the whole analysis if Supabase is down
}
```

---

## Step 7: Useful Queries

### Get all Grade A leads:
```javascript
const gradeALeads = await getLeadsByGrade('A');
console.log(`Found ${gradeALeads.length} Grade A leads`);
```

### Get leads ready to contact:
```javascript
const readyToContact = await getLeadsReadyToContact();
console.log(`${readyToContact.length} leads ready to contact`);
```

### Mark lead as contacted:
```javascript
await updateOutreachStatus('https://maksant.com', 'email_sent');
```

### SQL Query in Supabase Dashboard:
```sql
-- Get all Grade A leads in Philadelphia not yet contacted
SELECT
  company_name,
  contact_email,
  contact_phone,
  location,
  services,
  analyzed_at
FROM leads
WHERE lead_grade = 'A'
  AND location LIKE '%Philadelphia%'
  AND outreach_status = 'not_contacted'
  AND contact_email IS NOT NULL
ORDER BY analyzed_at DESC;
```

### Query leads by platform:
```sql
-- Get all WordPress sites
SELECT
  company_name,
  url,
  tech_stack->>'platform' as platform,
  tech_stack->>'platformVersion' as version
FROM leads
WHERE tech_stack->>'platform' = 'WordPress'
ORDER BY analyzed_at DESC;
```

### Query leads by service:
```sql
-- Get all businesses offering web design
SELECT company_name, services, contact_email
FROM leads
WHERE 'Web Design' = ANY(services)
  AND lead_grade IN ('A', 'B')
ORDER BY lead_grade, analyzed_at DESC;
```

---

## Step 8: Optional - Create Views for Common Queries

```sql
-- View: Hot Leads (Grade A, not contacted, has email)
CREATE VIEW hot_leads AS
SELECT
  company_name,
  url,
  contact_email,
  contact_phone,
  location,
  industry,
  services,
  lead_grade,
  website_grade,
  analyzed_at
FROM leads
WHERE lead_grade = 'A'
  AND outreach_status = 'not_contacted'
  AND contact_email IS NOT NULL
ORDER BY analyzed_at DESC;

-- View: Response Pipeline (all contacted leads)
CREATE VIEW response_pipeline AS
SELECT
  company_name,
  url,
  contact_email,
  outreach_status,
  outreach_date,
  reply_date,
  conversion_date,
  lead_grade,
  location,
  industry
FROM leads
WHERE outreach_status != 'not_contacted'
ORDER BY
  CASE outreach_status
    WHEN 'converted' THEN 1
    WHEN 'meeting_scheduled' THEN 2
    WHEN 'replied' THEN 3
    WHEN 'email_sent' THEN 4
  END,
  outreach_date DESC;
```

---

## Data Security

- ✅ All data stored in Supabase's secure PostgreSQL database
- ✅ Row-level security enabled (only authenticated users can access)
- ✅ Service role key kept secret in .env file
- ✅ HTTPS encryption for all API requests
- ✅ Automatic backups (daily on free tier, configurable on Pro)

---

## Cost

- **Free Tier:** Up to 500 MB database, 2 GB file storage, 50,000 monthly active users
- **Pro Tier:** $25/month - 8 GB database, 100 GB file storage, 100,000 monthly active users

For lead management, free tier should be plenty (500 MB = ~50,000+ leads).

---

## Next Steps

1. Create Supabase project
2. Run SQL schema
3. Add credentials to .env
4. Install @supabase/supabase-js
5. Create modules/supabase-client.js
6. Update analyzer.js to call saveLeadToSupabase()
7. Test with one analysis
8. Query your data!

Ready to implement?
