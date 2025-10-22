# Multi-Page Analysis System - Current Status

## Problem Summary

The multi-page analysis infrastructure exists but is **NOT functional**. The crawler collects multiple pages but the analyzers fail to process them.

## Evidence from Recent Test (đậm coffee bar)

### What Worked ✅
- Crawler found 2 pages: homepage + /menu
- Business intelligence extraction across 2 pages
- Local backup saved successfully
- Lead data uploaded to Supabase

### What Failed ❌
- SEO Analyzer: "pages.map is not a function"
- Content Analyzer: "pages.map is not a function"
- Social Analyzer: "pages.forEach is not a function"
- Visual Analyzers: "Missing or invalid desktop screenshot for page: undefined"
- **0 records** in `page_analyses` table (should have 2 records)
- Only homepage screenshots captured (not /menu page)

## Root Causes

### 1. Parameter Mismatch in `analyzers/index.js`

**File**: `analysis-engine/analyzers/index.js:75-77`

```javascript
// CURRENT (WRONG):
analyzeSEO(url, html, context, customPrompts?.seo),
analyzeContent(url, html, context, customPrompts?.content),
analyzeSocial(url, socialProfiles, socialMetadata, context, customPrompts?.social)
```

**Expected by analyzers**:
```javascript
// seo-analyzer.js:27
export async function analyzeSEO(pages, context = {}, customPrompt = null)

// content-analyzer.js:27
export async function analyzeContent(pages, context = {}, customPrompt = null)

// social-analyzer.js:39
export async function analyzeSocial(pages, context = {}, customPrompt = null)
```

**Impact**: Analyzers expect an array of page objects, but receive single `url` + `html` strings instead.

### 2. Missing Multi-Page Screenshot Capture

**File**: `analysis-engine/orchestrator.js:97`

```javascript
// Only captures homepage screenshots
const dualScreenshots = await captureDualViewports(crawlResult.homepage.url);
```

**Should capture**: Screenshots for ALL crawled pages (homepage + /menu + others).

### 3. No Database Functions for page_analyses Table

**File**: `analysis-engine/database/supabase-client.js`

Contains only `leads` table functions:
- `saveLead()`
- `getLeads()`
- `updateLead()`
- `deleteLead()`

**Missing**:
- `savePageAnalysis(leadId, pageData)`
- `getPageAnalyses(leadId)`
- No code anywhere that inserts into `page_analyses` table

### 4. page_analyses Table Exists But Empty

**Supabase**:
- `page_analyses` table exists ✅
- Schema is valid ✅
- **0 records** in table (should have multi-page data)

## Data Flow (Current vs. Expected)

### Current Broken Flow:
```
Crawler → 2 pages with HTML
  ↓
Orchestrator → Only homepage screenshots
  ↓
runAllAnalyses() → Passes (url, html) instead of pages[]
  ↓
Analyzers → ERROR: pages.map is not a function
  ↓
formatLeadData() → Aggregated lead only
  ↓
Supabase → 1 record in leads table, 0 in page_analyses
```

### Expected Working Flow:
```
Crawler → 2 pages with HTML
  ↓
Orchestrator → Screenshots for ALL pages
  ↓
runAllAnalyses() → Passes pages[] array
  ↓
Analyzers → Process each page, return per-page + aggregated results
  ↓
saveLeadData() → Saves lead to leads table
  ↓
savePageAnalyses() → Saves 2 records to page_analyses table
  ↓
Supabase → 1 lead + 2 page_analyses records
```

## Files Needing Fixes

1. **`analysis-engine/analyzers/index.js`**
   - Update `runAllAnalyses()` to accept pages array
   - Pass `pages` to analyzers instead of `url, html`

2. **`analysis-engine/orchestrator.js`**
   - Capture screenshots for all pages (not just homepage)
   - Build pages array with screenshots
   - Pass pages array to `runAllAnalyses()`

3. **`analysis-engine/database/supabase-client.js`**
   - Add `savePageAnalysis(leadId, pageData)` function
   - Add `getPageAnalyses(leadId)` function
   - Add `savePageAnalysesBatch(leadId, pagesArray)` function

4. **`analysis-engine/orchestrator.js` (analyzeAndSave)**
   - After saving lead, extract per-page results
   - Call `savePageAnalysesBatch()` to store page_analyses records

## Test Case to Verify Fix

```bash
curl -X POST http://localhost:3001/api/analyze-url \
  -H "Content-Type: application/json" \
  -d '{"url":"https://damcoffee.hayven.ai/","company_name":"đậm coffee bar","industry":"Cafe"}'
```

**Expected Results After Fix**:
- ✅ Crawler finds 2 pages
- ✅ 4 screenshots captured (desktop + mobile for each page)
- ✅ SEO analyzer processes both pages (no errors)
- ✅ Content analyzer processes both pages (no errors)
- ✅ Social analyzer processes both pages (no errors)
- ✅ 1 lead record in `leads` table
- ✅ 2 page_analysis records in `page_analyses` table
- ✅ Aggregated scores in lead reflect both pages

## Priority

**HIGH** - This is a core feature that's completely broken. Multi-page analysis is essential for accurate website audits.

## Estimated Effort

- Fix parameter passing: 30 min
- Add multi-page screenshot capture: 1 hour
- Add page_analyses database functions: 45 min
- Update orchestrator to save page data: 30 min
- Testing: 30 min

**Total**: ~3 hours
