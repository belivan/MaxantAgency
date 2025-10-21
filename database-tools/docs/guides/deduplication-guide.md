# Deduplication & Feedback Loop Guide

## The Problem

Without deduplication, your system wastes money and time:

- **Re-prospecting**: Finding the same company twice ($0.005 Google Maps API cost)
- **Re-analyzing**: Analyzing the same website twice ($0.03 OpenAI/Playwright cost)
- **Re-contacting**: Emailing the same lead twice (damages reputation + spam)

## The Solution

The deduplication service creates a **feedback loop** - each stage checks if work has already been done before proceeding.

---

## How It Works

```
NEW COMPANY SEARCH
       ↓
   [Check: Does this company exist anywhere?]
       ↓
   ├─ In composed_emails? → SKIP (already contacted)
       ↓
   ├─ In leads? → Use existing analysis (don't re-analyze)
       ↓
   ├─ In prospects? → Link to existing record
       ↓
   └─ Not found? → Proceed with prospecting
```

---

## Integration Examples

### 1. Prospecting Engine

**Before discovering new companies**, check if they already exist:

```javascript
// prospecting-engine/orchestrator.js

import { checkCompanyExists, batchCheckCompanies } from '../../database-tools/shared/deduplication.js';

export async function runProspectingPipeline(brief, options = {}, onProgress = null) {
  // ... existing code ...

  // After Google Maps Discovery (Step 2)
  const companies = await discoverCompanies(query, { ... });

  // NEW: Batch check for duplicates
  const duplicationChecks = await batchCheckCompanies(
    companies.map(c => ({
      company_name: c.name,
      website: c.website,
      google_place_id: c.place_id
    }))
  );

  // Filter and categorize results
  const newCompanies = [];
  const skippedCompanies = [];
  const existingCompanies = [];

  companies.forEach((company, index) => {
    const check = duplicationChecks[index];

    if (check.shouldSkip) {
      // Already contacted - definitely skip
      skippedCompanies.push({
        company,
        reason: check.message
      });
      logWarn('Skipping company', { company: company.name, reason: check.message });
    } else if (check.exists && check.where === 'leads') {
      // Already analyzed - use existing data
      existingCompanies.push({
        company,
        existing_data: check.details
      });
      logInfo('Using existing analysis', {
        company: company.name,
        grade: check.details.grade
      });
    } else if (check.exists && check.where === 'prospects') {
      // Already in prospects - link to existing record
      existingCompanies.push({
        company,
        existing_data: check.details
      });
      logInfo('Linking to existing prospect', { company: company.name });
    } else {
      // New company - proceed normally
      newCompanies.push(company);
    }
  });

  if (onProgress) {
    onProgress({
      type: 'deduplication',
      total: companies.length,
      new: newCompanies.length,
      existing: existingCompanies.length,
      skipped: skippedCompanies.length
    });
  }

  // Continue pipeline only with new companies
  // ... rest of pipeline ...
}
```

### 2. Analysis Engine

**Before analyzing a website**, check if it's already been analyzed:

```javascript
// analysis-engine/orchestrator.js

import { checkWebsiteAnalyzed } from '../../database-tools/shared/deduplication.js';

export async function analyzeProspects(filters = {}, onProgress = null) {
  // Fetch prospects to analyze
  const prospects = await getProspectsForAnalysis(filters);

  const results = {
    analyzed: 0,
    skipped: 0,
    failed: 0,
    used_existing: 0
  };

  for (const prospect of prospects) {
    // NEW: Check if website already analyzed
    const analysisCheck = await checkWebsiteAnalyzed(prospect.website);

    if (analysisCheck.analyzed) {
      // Use existing analysis instead of re-analyzing
      logInfo('Using existing analysis', {
        url: prospect.website,
        grade: analysisCheck.grade,
        score: analysisCheck.overall_score
      });

      results.used_existing++;

      if (onProgress) {
        onProgress({
          type: 'existing_analysis',
          url: prospect.website,
          grade: analysisCheck.grade,
          score: analysisCheck.overall_score,
          saved_cost: 0.03 // Cost we saved by not re-analyzing
        });
      }

      continue; // Skip to next prospect
    }

    // Not analyzed yet - proceed with analysis
    try {
      const analysis = await analyzeWebsite(prospect);
      results.analyzed++;
      // ... save to leads table ...
    } catch (error) {
      results.failed++;
      logError('Analysis failed', error, { url: prospect.website });
    }
  }

  return results;
}
```

### 3. Outreach Engine

**Before composing an email**, check if we've already contacted them:

```javascript
// outreach-engine/generators/email-generator.js

import { checkLeadContacted } from '../../database-tools/shared/deduplication.js';

export async function composeEmail(lead, strategy = 'compliment-sandwich') {
  // NEW: Check if already contacted
  const contactCheck = await checkLeadContacted(lead.url, 'email');

  if (contactCheck.contacted) {
    if (contactCheck.status === 'sent') {
      throw new Error(
        `Already sent email to ${lead.company_name} on ${new Date(contactCheck.sent_at).toLocaleDateString()}`
      );
    } else if (contactCheck.status === 'ready' || contactCheck.status === 'approved') {
      // Email composed but not sent - return existing email
      logWarn('Email already composed', {
        company: lead.company_name,
        status: contactCheck.status
      });
      return contactCheck.data;
    }
  }

  // Not contacted yet - compose new email
  const email = await generateEmail(lead, strategy);
  return email;
}

// Similarly for social outreach
export async function composeSocialDM(lead, platform = 'instagram') {
  const contactCheck = await checkLeadContacted(lead.url, platform);

  if (contactCheck.contacted) {
    throw new Error(
      `Already contacted via ${platform}: ${contactCheck.message}`
    );
  }

  const dm = await generateSocialMessage(lead, platform);
  return dm;
}
```

---

## Usage Examples

### Check Single Company

```javascript
import { checkCompanyExists } from './database-tools/shared/deduplication.js';

const result = await checkCompanyExists({
  company_name: 'Joe\'s Pizza',
  website: 'https://joespizza.com',
  google_place_id: 'ChIJ...'
});

console.log(result);
/*
{
  exists: true,
  reason: 'already_contacted',
  where: 'composed_emails',
  shouldSkip: true,
  message: '✋ Already contacted Joe\'s Pizza on 1/15/2025'
}
*/
```

### Batch Check Multiple Companies

```javascript
import { batchCheckCompanies } from './database-tools/shared/deduplication.js';

const companies = [
  { company_name: 'Pizza Shop 1', website: 'https://pizza1.com' },
  { company_name: 'Pizza Shop 2', website: 'https://pizza2.com' },
  { company_name: 'Pizza Shop 3', website: 'https://pizza3.com' }
];

const results = await batchCheckCompanies(companies);

results.forEach((result, i) => {
  console.log(`${companies[i].company_name}: ${result.message}`);
});

/*
Pizza Shop 1: ✋ Already contacted Pizza Shop 1 on 1/10/2025
Pizza Shop 2: ✅ Already analyzed Pizza Shop 2 (Grade: B, Score: 75)
Pizza Shop 3: ✨ New company - safe to prospect
*/
```

### Get Company's Full History

```javascript
import { getCompanyPresence } from './database-tools/shared/deduplication.js';

const presence = await getCompanyPresence({
  website: 'https://joespizza.com'
});

console.log(presence);
/*
{
  in_prospects: true,
  in_leads: true,
  in_outreach: true,
  timeline: [
    { stage: 'Prospecting', date: '2025-01-10T10:30:00Z', status: 'analyzed' },
    { stage: 'Analysis', date: '2025-01-10T11:45:00Z', status: 'Grade B', score: 75 },
    { stage: 'Outreach (email)', date: '2025-01-10T14:20:00Z', status: 'sent' }
  ]
}
*/
```

### Check Deduplication Stats

```javascript
import { getDeduplicationStats } from './database-tools/shared/deduplication.js';

const stats = await getDeduplicationStats();

console.log(stats);
/*
{
  total_prospects: 150,
  total_leads: 120,
  total_contacted: 85,
  conversion_rate: {
    prospect_to_lead: '80.00',  // 80% of prospects got analyzed
    lead_to_outreach: '70.83',  // 71% of leads got contacted
    outreach_to_sent: '94.12'   // 94% of emails were sent
  }
}
*/
```

---

## Best Practices

### 1. Check Early, Save Money

Always check for duplicates BEFORE doing expensive operations:

```javascript
// ❌ BAD: Analyze first, then check
const analysis = await analyzeWebsite(url); // Costs $0.03
const check = await checkWebsiteAnalyzed(url); // Already too late!

// ✅ GOOD: Check first, then analyze
const check = await checkWebsiteAnalyzed(url);
if (!check.analyzed) {
  const analysis = await analyzeWebsite(url);
}
```

### 2. Handle Different Duplicate Types

```javascript
const check = await checkCompanyExists(company);

if (check.shouldSkip) {
  // Already contacted - NEVER proceed
  return { skipped: true, reason: check.message };
}

if (check.exists && check.where === 'leads') {
  // Already analyzed - use existing data
  return { existing: check.details };
}

if (check.exists && check.where === 'prospects') {
  // Already prospected - link to existing record
  await linkToExisting(check.details.id);
}
```

### 3. Log Skipped Work for Reporting

```javascript
const check = await checkCompanyExists(company);

if (check.shouldSkip) {
  await logSkippedWork({
    company_name: company.company_name,
    reason: check.reason,
    saved_cost: 0.03, // Analysis cost we saved
    timestamp: new Date()
  });
}
```

### 4. Batch Checks for Performance

```javascript
// ❌ BAD: Check one by one
for (const company of companies) {
  const check = await checkCompanyExists(company); // Slow!
}

// ✅ GOOD: Batch check all at once
const checks = await batchCheckCompanies(companies); // Fast!
```

---

## Cost Savings

With deduplication, you save:

| Operation | Cost per item | 100 duplicates | 1000 duplicates |
|-----------|---------------|----------------|-----------------|
| Skip prospecting | $0.005 | $0.50 | $5.00 |
| Skip analysis | $0.03 | $3.00 | $30.00 |
| **Total savings** | **$0.035** | **$3.50** | **$35.00** |

Plus you avoid:
- Annoying prospects with duplicate emails
- Spam complaints
- Reputation damage
- Wasted processing time

---

## Testing

Test the deduplication service:

```javascript
// database-tools/tests/test-deduplication.js

import { checkCompanyExists, checkWebsiteAnalyzed, checkLeadContacted } from '../shared/deduplication.js';

async function testDeduplication() {
  console.log('Testing deduplication service...\n');

  // Test 1: Check new company (should not exist)
  const newCompany = await checkCompanyExists({
    company_name: 'Totally New Pizza Shop',
    website: 'https://newpizza123.com',
    google_place_id: 'ChIJnew123'
  });
  console.log('Test 1 - New company:', newCompany.message);

  // Test 2: Check existing company (if you have data)
  const existingCompany = await checkCompanyExists({
    website: 'https://example.com' // Replace with real URL from your DB
  });
  console.log('Test 2 - Existing company:', existingCompany.message);

  // Test 3: Check analyzed website
  const analysisCheck = await checkWebsiteAnalyzed('https://example.com');
  console.log('Test 3 - Analysis check:', analysisCheck.message);

  // Test 4: Check contacted lead
  const contactCheck = await checkLeadContacted('https://example.com', 'email');
  console.log('Test 4 - Contact check:', contactCheck.message);
}

testDeduplication().catch(console.error);
```

---

## API Reference

### `checkCompanyExists(company)`

**Parameters:**
- `company.company_name` - Company name
- `company.website` - Website URL
- `company.google_place_id` - Google Place ID

**Returns:**
```javascript
{
  exists: boolean,
  reason: 'already_contacted' | 'already_analyzed' | 'already_in_prospects' | 'fuzzy_match' | null,
  where: 'composed_emails' | 'leads' | 'prospects' | null,
  shouldSkip: boolean,  // true = definitely skip, false = can proceed
  message: string,
  details: object | null
}
```

### `checkWebsiteAnalyzed(url)`

**Parameters:**
- `url` - Website URL

**Returns:**
```javascript
{
  analyzed: boolean,
  lead_id: string | undefined,
  grade: string | undefined,
  overall_score: number | undefined,
  analyzed_at: timestamp | undefined,
  message: string,
  data: object | undefined  // Full lead record if analyzed
}
```

### `checkLeadContacted(url, platform)`

**Parameters:**
- `url` - Website URL
- `platform` - 'email' | 'instagram' | 'linkedin' | 'facebook' | 'twitter'

**Returns:**
```javascript
{
  contacted: boolean,
  email_id: string | undefined,
  status: string | undefined,
  sent_at: timestamp | undefined,
  platform: string | undefined,
  message: string,
  data: object | undefined  // Full email record if contacted
}
```

---

## Summary

The deduplication service gives your system **memory** - it remembers what work has been done and prevents duplicate effort.

**Key benefits:**
- ✅ Save money (avoid re-analyzing, re-prospecting)
- ✅ Save time (skip work that's already done)
- ✅ Avoid spam (don't email same person twice)
- ✅ Better UX (show "Already contacted" in UI)
- ✅ Analytics (track conversion rates across pipeline)

**Next steps:**
1. Copy the deduplication.js file to your project
2. Import it in each engine
3. Add checks before expensive operations
4. Test with real data
5. Monitor cost savings!
